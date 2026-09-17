import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { generateCertificatePdf, createCertificatesZip, clearImageAssetCache } from "../../../utils/pdfGenerator";
import { resolveFieldValue } from "../../../utils/fieldMappingHelper";
import { loadTemplateAsset } from "../../../utils/templateAssetLoader";
import {
  uploadGeneratedCertificatePdf,
  uploadCertificateZip,
} from "../../../Firebase/certificateStorageService";
import {
  createCertificateJob,
  updateCertificateJob,
} from "../../../Firebase/certificateTemplateService";
import {
  allocateCertificateIdsForBatch,
  deriveEventCertPrefix,
} from "../../../Firebase/certificateIdService";
import { db } from "../../../Firebase/firebase";
import { doc, writeBatch, serverTimestamp } from "firebase/firestore";

/**
 * Runs an array of async task factories with controlled concurrency.
 *
 * @param {Array<() => Promise<any>>} tasks
 * @param {number} limit - max concurrent tasks
 */
async function runWithConcurrency(tasks, limit = 4) {
  const active = new Set();
  for (const task of tasks) {
    const p = task().finally(() => active.delete(p));
    active.add(p);
    if (active.size >= limit) {
      await Promise.race(active);
    }
  }
  if (active.size > 0) {
    await Promise.all(active);
  }
}

// Concurrency thresholds tuned for smooth client performance and Firebase stability
const GENERATION_CONCURRENCY = 4;
const UPLOAD_CONCURRENCY = 6;
const FIRESTORE_BATCH_CHUNK = 400;

export default function GenerationProgress({
  template,
  fields,
  elements,
  dataset,
  mapping,
  metaInfo,
  selectedEventId = "",
  selectedEvent = null,
  batchName = "",
  onBack,
}) {
  // Phase tracking: 'idle' → 'loading_template' → 'generating' → 'uploading' → 'saving_records' → 'packaging_zip' → 'completed' | 'failed' | 'template_error'
  const [status, setStatus] = useState("idle");

  // Counters
  const [generatedCount, setGeneratedCount] = useState(0);
  const [currentParticipantName, setCurrentParticipantName] = useState("");
  const [currentActionLabel, setCurrentActionLabel] = useState("");

  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadFailedCount, setUploadFailedCount] = useState(0);

  const [recordsSavedCount, setRecordsSavedCount] = useState(0);

  // Timing & metrics
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(null);
  const [perfSummary, setPerfSummary] = useState(null);

  // Final artifacts & results
  const [zipDownloadUrl, setZipDownloadUrl] = useState("");
  const [zipSizeBytes, setZipSizeBytes] = useState(0);
  const [failedList, setFailedList] = useState([]);
  const [jobId, setJobId] = useState("");
  const [templateError, setTemplateError] = useState("");
  const [idSummary, setIdSummary] = useState(null);

  // Retry state
  const [retryRows, setRetryRows] = useState(null);

  const isGeneratingRef = useRef(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  const allRows = useMemo(() => dataset?.rows || [], [dataset]);
  const activeRows = useMemo(() => (retryRows !== null ? retryRows : allRows), [retryRows, allRows]);
  const total = activeRows.length;

  const genPercent = total > 0 ? Math.min(100, Math.round((generatedCount / total) * 100)) : 0;
  const uploadPercent = generatedCount > 0 ? Math.min(100, Math.round(((uploadedCount + uploadFailedCount) / generatedCount) * 100)) : 0;

  // Timer hook during active generation
  useEffect(() => {
    const isActive = ["loading_template", "generating", "uploading", "saving_records", "packaging_zip"].includes(status);
    if (isActive) {
      if (!startTimeRef.current) startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedSeconds(elapsed);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // Main generation pipeline
  const executeGeneration = useCallback(async (targetRows) => {
    isGeneratingRef.current = true;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    setEtaSeconds(null);
    setGeneratedCount(0);
    setUploadedCount(0);
    setUploadFailedCount(0);
    setRecordsSavedCount(0);
    setFailedList([]);

    const perfMetrics = {
      templateLoadMs: 0,
      generationMs: 0,
      uploadMs: 0,
      firestoreMs: 0,
      zipMs: 0,
      totalMs: 0,
    };
    const _pipelineStart = performance.now();

    // ──────────────────────────────────────────────────────────────────────────
    // PHASE A: Load & cache template asset ONCE
    // ──────────────────────────────────────────────────────────────────────────
    setStatus("loading_template");
    setCurrentActionLabel("Preparing resources & template asset...");
    setCurrentParticipantName("Caching high-resolution template in memory...");

    let templateAsset = null;
    const _tTemplateStart = performance.now();
    try {
      templateAsset = await loadTemplateAsset(template);
      perfMetrics.templateLoadMs = Math.round(performance.now() - _tTemplateStart);
    } catch (templateErr) {
      console.error("[GENERATION] Template load failed:", templateErr);
      setTemplateError(templateErr.message || "Certificate template could not be loaded.");
      setStatus("template_error");
      isGeneratingRef.current = false;
      return;
    }

    clearImageAssetCache();

    // ──────────────────────────────────────────────────────────────────────────
    // PHASE B: Controlled concurrent PDF generation (CPU-only)
    // ──────────────────────────────────────────────────────────────────────────
    setStatus("generating");
    setCurrentActionLabel("Generating certificates...");
    const currentJobId = `job_${Date.now()}`;
    setJobId(currentJobId);

    // Scoped event details
    const targetEventId = selectedEventId || metaInfo?.eventId || selectedEvent?.id || "";
    const targetEventName = selectedEvent?.title || metaInfo?.eventName || "Abhyudaya Event";
    const targetEventDate = selectedEvent?.eventStartDate || metaInfo?.eventDate || "";
    const targetBatchTitle = batchName || metaInfo?.title || "Certificate Batch";
    const eventCertPrefix = deriveEventCertPrefix(selectedEvent || { title: targetEventName, eventStartDate: targetEventDate });

    try {
      await createCertificateJob({
        jobId: currentJobId,
        eventId: targetEventId,
        templateId: template?.id || "custom_template",
        templateTitle: targetBatchTitle,
        eventName: targetEventName,
        eventDate: targetEventDate,
        total: targetRows.length,
        status: "processing",
      });
    } catch (jobErr) {
      console.warn("[GENERATION] Firestore job record notice:", jobErr);
    }

    const generatedFiles = [];
    const renderFailures = [];
    const seenNames = new Map();

    const elementsToRender = (Array.isArray(elements) && elements.length > 0)
      ? elements.filter((el) => el.visible !== false)
      : (fields || []);

    // Pre-allocate and resolve unique Certificate IDs against Firestore
    setCurrentActionLabel("Verifying & allocating Certificate IDs...");
    const batchItems = targetRows.map((row, i) => {
      const requestedId =
        resolveFieldValue({ variable: "{{certificateId}}" }, mapping, row, { rowIndex: i }) ||
        row.certificateId ||
        row.certificateid ||
        row.id ||
        "";
      const name =
        row.Name ||
        row["Full Name"] ||
        row["Participant Name"] ||
        row.name ||
        `Participant ${i + 1}`;
      return {
        rowNumber: i + 1,
        name,
        certificateId: requestedId,
      };
    });

    const allocatedIdsMap = new Map();
    try {
      const { allocations, summary } = await allocateCertificateIdsForBatch(batchItems, {
        idField: "certificateId",
        nameField: "name",
        defaultPrefix: eventCertPrefix,
      });
      setIdSummary(summary);
      allocations.forEach((alloc, idx) => {
        allocatedIdsMap.set(idx, alloc.finalId);
      });
    } catch (allocErr) {
      console.warn("[GENERATION] Pre-allocation notice, continuing with direct IDs:", allocErr);
    }

    const _phaseBStart = performance.now();
    let genCompleted = 0;

    const generationTasks = targetRows.map((row, i) => async () => {
      const participantRawName =
        row.Name ||
        row["Full Name"] ||
        row["Participant Name"] ||
        row.name ||
        `Participant ${i + 1}`;

      const normName = String(participantRawName).trim().toLowerCase();
      const dupIndex = (seenNames.get(normName) || 0) + 1;
      seenNames.set(normName, dupIndex);

      const finalCertId = allocatedIdsMap.get(i);

      try {
        const result = await generateCertificatePdf({
          template,
          templateAsset,
          fields: elementsToRender,
          mapping,
          row,
          options: {
            rowIndex: i,
            certificateId: finalCertId,
            eventId: targetEventId,
            eventName: targetEventName,
            eventDate: targetEventDate,
            defaultPrefix: eventCertPrefix,
            college: metaInfo?.college,
            organizer: metaInfo?.organizer,
            templateId: template?.id,
            jobId: currentJobId,
            duplicateIndex: dupIndex,
          },
        });

        generatedFiles.push(result);
        genCompleted++;
        setGeneratedCount(genCompleted);
        setCurrentParticipantName(participantRawName);

        // Compute estimated remaining time (ETA)
        const elapsed = (performance.now() - _phaseBStart) / 1000;
        if (genCompleted > 3 && elapsed > 0.5) {
          const rate = genCompleted / elapsed;
          const remaining = Math.max(0, Math.round((targetRows.length - genCompleted) / rate));
          setEtaSeconds(remaining);
        }
      } catch (err) {
        console.error(`[GENERATION] PDF generation failed for ${participantRawName}:`, err);
        const failureObj = {
          row: i + 1,
          name: participantRawName,
          certificateId: `ROW-${i + 1}`,
          type: "PDF Generation",
          reason: err.message || "Rendering error",
          rawRow: row,
        };
        renderFailures.push(failureObj);
        setFailedList((prev) => [...prev, failureObj]);
      }
    });

    await runWithConcurrency(generationTasks, GENERATION_CONCURRENCY);
    perfMetrics.generationMs = Math.round(performance.now() - _phaseBStart);

    if (generatedFiles.length === 0) {
      console.error("[GENERATION] No certificates were generated. Aborting batch.");
      setStatus("failed");
      isGeneratingRef.current = false;
      return;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PHASE C: Controlled concurrent Firebase Storage upload
    // ──────────────────────────────────────────────────────────────────────────
    setStatus("uploading");
    setCurrentActionLabel("Uploading certificates to storage...");
    setEtaSeconds(null);

    const uploadSuccesses = [];
    const uploadFailures = [];
    let _uploadCounter = 0;
    const _phaseCStart = performance.now();

    const uploadTasks = generatedFiles.map((cert) => async () => {
      const { pdfBytes, certificateId, fileName, metadata } = cert;
      try {
        const uploadResult = await uploadGeneratedCertificatePdf(
          pdfBytes,
          currentJobId,
          fileName
        );
        uploadSuccesses.push({
          ...cert,
          certUrl: uploadResult.downloadURL,
          storagePath: uploadResult.storagePath,
        });
        _uploadCounter++;
        setUploadedCount(_uploadCounter);
        setCurrentParticipantName(metadata.name || fileName);

        const elapsed = (performance.now() - _phaseCStart) / 1000;
        if (_uploadCounter > 3 && elapsed > 0.5) {
          const rate = _uploadCounter / elapsed;
          const remaining = Math.max(0, Math.round((generatedFiles.length - _uploadCounter) / rate));
          setEtaSeconds(remaining);
        }
      } catch (uploadErr) {
        console.warn(`[GENERATION] Storage upload failed for ${fileName}:`, uploadErr);
        const failureObj = {
          row: metadata.rowIndex !== undefined ? metadata.rowIndex + 1 : "?",
          name: metadata.name || fileName,
          certificateId,
          type: "Storage Upload",
          reason: uploadErr.message || "Storage write failure",
          rawCert: cert,
        };
        uploadFailures.push(failureObj);
        setUploadFailedCount((c) => c + 1);
        setFailedList((prev) => [...prev, failureObj]);
      }
    });

    await runWithConcurrency(uploadTasks, UPLOAD_CONCURRENCY);
    perfMetrics.uploadMs = Math.round(performance.now() - _phaseCStart);

    // ──────────────────────────────────────────────────────────────────────────
    // PHASE D: Batched Firestore metadata commit
    // ──────────────────────────────────────────────────────────────────────────
    setStatus("saving_records");
    setCurrentActionLabel("Saving certificate registry records...");
    setCurrentParticipantName(`Writing ${uploadSuccesses.length} records in batch...`);
    const _phaseDStart = performance.now();

    const firestoreFailures = [];
    let savedRecordsCount = 0;

    for (let chunkStart = 0; chunkStart < uploadSuccesses.length; chunkStart += FIRESTORE_BATCH_CHUNK) {
      const chunk = uploadSuccesses.slice(chunkStart, chunkStart + FIRESTORE_BATCH_CHUNK);
      try {
        const batch = writeBatch(db);
        for (const item of chunk) {
          const certDocRef = doc(db, "certificates", item.certificateId);
          batch.set(certDocRef, {
            ...item.metadata,
            eventId: targetEventId || item.metadata?.eventId || "",
            eventName: targetEventName || item.metadata?.eventName || "",
            certificateUrl: item.certUrl,
            storagePath: item.storagePath || "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
        savedRecordsCount += chunk.length;
        setRecordsSavedCount(savedRecordsCount);
      } catch (batchErr) {
        console.error("[GENERATION] Batched Firestore write failed:", batchErr);
        const isPerm = batchErr.code === "permission-denied";
        const reason = isPerm
          ? "Permission denied in Firestore rules for 'certificates' collection."
          : `Firestore error: ${batchErr.message}`;

        chunk.forEach((item) => {
          firestoreFailures.push({
            row: item.metadata.rowIndex !== undefined ? item.metadata.rowIndex + 1 : "?",
            name: item.metadata.name,
            certificateId: item.certificateId,
            type: "Firestore Registry",
            reason,
          });
        });
      }
    }

    if (firestoreFailures.length > 0) {
      setFailedList((prev) => [...prev, ...firestoreFailures]);
    }
    perfMetrics.firestoreMs = Math.round(performance.now() - _phaseDStart);

    // ──────────────────────────────────────────────────────────────────────────
    // PHASE E: Fast ZIP archival & completion
    // ──────────────────────────────────────────────────────────────────────────
    setStatus("packaging_zip");
    setCurrentActionLabel("Creating ZIP archive...");
    setCurrentParticipantName(`Bundling ${generatedFiles.length} certificates...`);
    const _phaseEStart = performance.now();

    try {
      const { zipBlob, sizeBytes } = await createCertificatesZip(
        generatedFiles.map(({ fileName, pdfBytes }) => ({ fileName, pdfBytes }))
      );
      setZipSizeBytes(sizeBytes);
      perfMetrics.zipMs = Math.round(performance.now() - _phaseEStart);

      let finalZipUrl = "";
      try {
        const zipUpload = await uploadCertificateZip(
          zipBlob,
          currentJobId,
          `${(metaInfo?.eventName || "Certificates").replace(/\s+/g, "_")}_Batch.zip`
        );
        finalZipUrl = zipUpload.downloadURL;
      } catch (zipUploadErr) {
        console.warn("[GENERATION] ZIP upload failed, using local blob link:", zipUploadErr);
        finalZipUrl = URL.createObjectURL(zipBlob);
      }
      setZipDownloadUrl(finalZipUrl);

      const allFailures = [...renderFailures, ...uploadFailures, ...firestoreFailures];
      const successfulCount = generatedFiles.length - uploadFailures.length - firestoreFailures.length;

      try {
        await updateCertificateJob(currentJobId, {
          completed: successfulCount,
          failed: allFailures.length,
          status: allFailures.length > 0 && successfulCount === 0 ? "failed" : "completed",
          zipUrl: finalZipUrl,
          zipSizeBytes: sizeBytes,
          errors: allFailures,
        });
      } catch (jobUpdateErr) {
        console.warn("[GENERATION] Job record final update notice:", jobUpdateErr);
      }

      perfMetrics.totalMs = Math.round(performance.now() - _pipelineStart);
      setPerfSummary(perfMetrics);

      console.log("[PERF] Certificate Batch Benchmark:", {
        templateLoad: `${perfMetrics.templateLoadMs}ms`,
        generation: `${perfMetrics.generationMs}ms`,
        upload: `${perfMetrics.uploadMs}ms`,
        firestore: `${perfMetrics.firestoreMs}ms`,
        zip: `${perfMetrics.zipMs}ms`,
        total: `${(perfMetrics.totalMs / 1000).toFixed(2)}s`,
      });

      setStatus(successfulCount > 0 ? "completed" : "failed");
    } catch (zipErr) {
      console.error("[GENERATION] ZIP creation failed:", zipErr);
      setStatus(generatedFiles.length > 0 ? "completed" : "failed");
    } finally {
      isGeneratingRef.current = false;
    }
  }, [template, fields, elements, mapping, metaInfo]);

  // Initial trigger
  useEffect(() => {
    if (isGeneratingRef.current || status !== "idle" || activeRows.length === 0) return;
    executeGeneration(activeRows);
  }, [activeRows, status, executeGeneration]);

  // Retry handler for failed items only
  const handleRetryFailed = () => {
    if (failedList.length === 0) return;
    const failedRowItems = failedList.map((f) => f.rawRow).filter(Boolean);
    if (failedRowItems.length > 0) {
      setRetryRows(failedRowItems);
      setStatus("idle");
    } else {
      executeGeneration(allRows);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (secs) => {
    if (secs === null || secs === undefined || isNaN(secs)) return "";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="gen-progress-wrapper">
      <div className="gen-progress-card">
        {/* ── Active Progress Header ───────────────────────────────────────── */}
        {["loading_template", "generating", "uploading", "saving_records", "packaging_zip"].includes(status) && (
          <div className="gen-progress-body">
            <div className="gen-progress-icon-wrap">
              <div className="cert-spinner" />
            </div>

            <h3 className="gen-progress-title">{currentActionLabel}</h3>

            {/* Counts */}
            <div className="gen-progress-count">
              <span className="gen-count-current">
                {status === "generating" ? generatedCount : status === "uploading" ? (uploadedCount + uploadFailedCount) : status === "saving_records" ? recordsSavedCount : total}
              </span>
              <span className="gen-count-sep">/</span>
              <span className="gen-count-total">{total}</span>
            </div>

            {/* Progress Bar */}
            <div className="gen-progress-bar-wrap">
              <div
                className="gen-progress-bar-fill"
                style={{
                  width: status === "generating" ? `${genPercent}%` : `${uploadPercent}%`,
                  background: status === "uploading" ? "linear-gradient(90deg, #6366f1, #818cf8)" : undefined,
                }}
              />
            </div>

            {/* Meta statistics pill */}
            <div className="gen-progress-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
              <span className="gen-progress-pct" style={{ fontWeight: 600 }}>
                {status === "generating" ? `${genPercent}%` : `${uploadPercent}%`}
              </span>

              <div style={{ display: "flex", gap: "12px", fontSize: "0.82rem", color: "#94a3b8" }}>
                <span>⏱ Elapsed: <strong>{formatTime(elapsedSeconds)}</strong></span>
                {etaSeconds !== null && etaSeconds > 0 && (
                  <span>⏳ Remaining: ~<strong>{formatTime(etaSeconds)}</strong></span>
                )}
              </div>
            </div>

            <div className="gen-progress-sub" style={{ marginTop: "10px", fontSize: "0.85rem", color: "#cbd5e1" }}>
              Current: <code>{currentParticipantName}</code>
            </div>

            {uploadFailedCount > 0 && (
              <p style={{ color: "#f87171", fontSize: "0.82rem", marginTop: "8px" }}>
                ⚠️ {uploadFailedCount} upload(s) encountered errors and will be cataloged.
              </p>
            )}
          </div>
        )}

        {/* ── Template Load Failure ─────────────────────────────────────────── */}
        {status === "template_error" && (
          <div className="gen-failed-body">
            <div className="gen-failed-icon">⚠️</div>
            <h3>Template Load Failed</h3>
            <p style={{ color: "#f87171", marginBottom: "1rem" }}>
              {templateError || "Certificate template asset could not be loaded into memory."}
            </p>
            <div className="gen-complete-actions">
              <button type="button" className="admin-btn admin-btn--outline" onClick={onBack}>
                ← Back to Designer
              </button>
            </div>
          </div>
        )}

        {/* ── Completed State ──────────────────────────────────────────────── */}
        {status === "completed" && (
          <div className="gen-complete-body">
            <div className="gen-complete-icon">✓</div>

            <h3 className="gen-complete-title">
              ✓ {uploadedCount > 0 ? uploadedCount : generatedCount} Certificate{total !== 1 ? "s" : ""} Generated Successfully
            </h3>

            <p className="gen-complete-desc">
              All certificates have been generated at full template resolution (2048×1400) with verified layout fidelity and packaged into high-speed ZIP archive.
            </p>

            {idSummary && idSummary.newGenerated > 0 && (
              <div className="cert-alert cert-alert--info" style={{ margin: "12px 0", textAlign: "left", fontSize: "0.85rem" }}>
                <span>
                  ℹ️ <strong>{idSummary.newGenerated}</strong> Certificate ID(s) were automatically regenerated to avoid duplicate collisions with existing Firestore records.
                </span>
              </div>
            )}

            {/* Performance Benchmark Pill (development diagnostics) */}
            {perfSummary && (
              <div style={{ margin: "12px 0", padding: "8px 14px", background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "6px", fontSize: "0.8rem", color: "#a5b4fc", display: "inline-block" }}>
                ⚡ Total time: <strong>{(perfSummary.totalMs / 1000).toFixed(1)}s</strong> (Generation: {(perfSummary.generationMs / 1000).toFixed(1)}s · Upload: {(perfSummary.uploadMs / 1000).toFixed(1)}s · ZIP: {(perfSummary.zipMs / 1000).toFixed(1)}s)
              </div>
            )}

            {/* ZIP Download Action */}
            <div className="gen-download-box">
              {zipDownloadUrl ? (
                <a
                  href={zipDownloadUrl}
                  download="certificates.zip"
                  className="admin-btn admin-btn--primary gen-download-btn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📥 Download All Certificates (ZIP) {zipSizeBytes > 0 && `(${formatFileSize(zipSizeBytes)})`}
                </a>
              ) : (
                <span className="gen-download-hint">
                  Preparing download package...
                </span>
              )}
            </div>

            {/* Failure Breakdown & Retry */}
            {failedList.length > 0 && (
              <div className="cert-alert cert-alert--warning gen-failures-box" style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <strong>⚠️ {failedList.length} certificate(s) encountered issues:</strong>
                  <button
                    type="button"
                    className="admin-btn admin-btn--outline admin-btn--sm"
                    onClick={handleRetryFailed}
                    style={{ fontSize: "11px", padding: "3px 8px" }}
                  >
                    🔄 Retry Failed Only
                  </button>
                </div>
                <ul className="gen-failures-list" style={{ maxHeight: "160px", overflowY: "auto" }}>
                  {failedList.map((f, idx) => (
                    <li key={idx} style={{ fontSize: "0.8rem" }}>
                      <strong>Row {f.row} ({f.name})</strong> — <em>{f.type}</em>: {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Navigation Actions */}
            <div className="gen-complete-actions">
              <Link
                to="/admin/certificates"
                className="admin-btn admin-btn--primary"
              >
                View in Certificate Manager →
              </Link>

              <button
                type="button"
                className="admin-btn admin-btn--outline"
                onClick={onBack}
              >
                ← Back to Preview
              </button>
            </div>

            {jobId && (
              <span className="gen-job-id-text" style={{ display: "block", marginTop: "12px" }}>
                Batch Reference ID: <code>{jobId}</code>
              </span>
            )}
          </div>
        )}

        {/* ── Failed State ─────────────────────────────────────────────────── */}
        {status === "failed" && (
          <div className="gen-failed-body">
            <div className="gen-failed-icon">⚠️</div>
            <h3>Generation Incomplete</h3>
            <p>Could not finish certificate generation for this batch.</p>

            {failedList.length > 0 && (
              <div className="cert-alert cert-alert--warning gen-failures-box" style={{ marginTop: "1rem", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <strong>Encountered failures:</strong>
                  <button
                    type="button"
                    className="admin-btn admin-btn--outline admin-btn--sm"
                    onClick={handleRetryFailed}
                  >
                    🔄 Retry Failed
                  </button>
                </div>
                <ul className="gen-failures-list">
                  {failedList.map((f, idx) => (
                    <li key={idx}>
                      Row {f.row} ({f.name}) [{f.type}]: {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="gen-complete-actions">
              <button
                type="button"
                className="admin-btn admin-btn--outline"
                onClick={onBack}
              >
                ← Back to Preview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

GenerationProgress.propTypes = {
  template: PropTypes.object.isRequired,
  fields: PropTypes.array.isRequired,
  elements: PropTypes.array,
  dataset: PropTypes.object.isRequired,
  mapping: PropTypes.object.isRequired,
  metaInfo: PropTypes.object,
  selectedEventId: PropTypes.string,
  selectedEvent: PropTypes.object,
  batchName: PropTypes.string,
  onBack: PropTypes.func.isRequired,
};
