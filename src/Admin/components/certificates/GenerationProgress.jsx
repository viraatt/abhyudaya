import { useState, useEffect, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { generateCertificatePdf, createCertificatesZip, clearImageAssetCache } from "../../../utils/pdfGenerator";
import { loadTemplateAsset } from "../../../utils/templateAssetLoader";
import {
  uploadGeneratedCertificatePdf,
  uploadCertificateZip,
} from "../../../Firebase/certificateStorageService";
import {
  createCertificateJob,
  updateCertificateJob,
} from "../../../Firebase/certificateTemplateService";
import { db } from "../../../Firebase/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * Runs an array of async task factories with controlled concurrency.
 * No more than `limit` tasks run simultaneously.
 *
 * @param {Array<() => Promise<any>>} tasks
 * @param {number} limit - max concurrent tasks (default 5)
 */
async function runWithConcurrency(tasks, limit = 5) {
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

// Number of simultaneous Firebase Storage + Firestore upload tasks.
// 5 is a safe ceiling for browser performance without hitting Firebase rate limits.
const UPLOAD_CONCURRENCY = 5;

export default function GenerationProgress({
  template,
  fields,
  elements,
  dataset,
  mapping,
  metaInfo,
  onBack,
}) {
  // Phase tracking: 'idle' → 'loading_template' → 'generating' → 'uploading' → 'packaging_zip' → 'completed' | 'failed' | 'template_error'
  const [status, setStatus] = useState("idle");

  // Phase 1 counters (PDF generation)
  const [generatedCount, setGeneratedCount] = useState(0);
  const [currentParticipantName, setCurrentParticipantName] = useState("");

  // Phase 2 counters (Firebase upload)
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadFailedCount, setUploadFailedCount] = useState(0);

  // Final results
  const [zipDownloadUrl, setZipDownloadUrl] = useState("");
  const [zipSizeBytes, setZipSizeBytes] = useState(0);
  const [failedList, setFailedList] = useState([]);
  const [jobId, setJobId] = useState("");
  const [templateError, setTemplateError] = useState("");

  const isGeneratingRef = useRef(false);

  const rows = useMemo(() => dataset?.rows || [], [dataset]);
  const total = rows.length;

  const genPercent = total > 0 ? Math.min(100, Math.round((generatedCount / total) * 100)) : 0;
  const uploadPercent = total > 0 ? Math.min(100, Math.round(((uploadedCount + uploadFailedCount) / total) * 100)) : 0;

  useEffect(() => {
    if (isGeneratingRef.current || status !== "idle" || total === 0) return;
    isGeneratingRef.current = true;

    async function runGeneration() {
      // ── STEP 0: Load template asset ONCE before the batch loop ─────────────
      // The template image is fetched/decoded ONCE here, then reused for all
      // certificates without any further network requests.
      setStatus("loading_template");
      setCurrentParticipantName("Loading certificate template into memory...");

      console.log("[GENERATION] Starting batch:", total, "| Upload concurrency:", UPLOAD_CONCURRENCY);
      const _batchStart = performance.now();

      let templateAsset = null;
      try {
        templateAsset = await loadTemplateAsset(template);
        console.log("[GENERATION] Template MIME:", templateAsset.mimeType, "| Size:", `${(templateAsset.arrayBuffer.byteLength / 1024).toFixed(1)} KB`);
        console.log("[GENERATION] Template dimensions:", `${templateAsset.width}×${templateAsset.height}`);
      } catch (templateErr) {
        console.error("[GENERATION] Template load failed:", templateErr);
        setTemplateError(
          templateErr.message ||
          "Certificate template could not be loaded. Please replace the template or retry."
        );
        setStatus("template_error");
        isGeneratingRef.current = false;
        return;
      }

      // Clear per-batch image element cache so each batch starts fresh
      clearImageAssetCache();

      // ── PHASE 1: Generate all PDFs (CPU-only, no Firebase I/O) ─────────────
      // Progress counter increments immediately after each PDF is rendered.
      // The UI is never stuck at 0/N — users see real per-cert progress.
      setStatus("generating");
      const currentJobId = `job_${Date.now()}`;
      setJobId(currentJobId);

      // Initialize Firestore job record
      try {
        await createCertificateJob({
          jobId: currentJobId,
          templateId: template?.id || "custom_template",
          templateTitle: metaInfo?.title || "Certificate Batch",
          eventName: metaInfo?.eventName || "Abhyudaya Event",
          eventDate: metaInfo?.eventDate || "",
          total,
          status: "processing",
        });
      } catch (jobErr) {
        console.warn("[GENERATION] Could not create Firestore job record:", jobErr);
      }

      // Holds { fileName, pdfBytes, certificateId, metadata } for every successfully generated cert
      const generatedFiles = [];
      const renderFailures = [];

      // Duplicate name tracker for filename collision prevention
      const seenNames = new Map();

      const elementsToRender = (Array.isArray(elements) && elements.length > 0)
        ? elements.filter((el) => el.visible !== false)
        : (fields || []);

      const _phase1Start = performance.now();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const participantRawName =
          row.Name ||
          row["Full Name"] ||
          row["Participant Name"] ||
          `Participant ${i + 1}`;

        setCurrentParticipantName(participantRawName);

        // Track duplicates for safe filename indexing
        const normName = participantRawName.trim().toLowerCase();
        const dupIndex = (seenNames.get(normName) || 0) + 1;
        seenNames.set(normName, dupIndex);

        try {
          // Render certificate PDF — uses preloaded templateAsset (zero network calls)
          const result = await generateCertificatePdf({
            template,
            templateAsset,
            fields: elementsToRender,
            mapping,
            row,
            options: {
              rowIndex: i,
              eventName: metaInfo?.eventName,
              eventDate: metaInfo?.eventDate,
              templateId: template?.id,
              jobId: currentJobId,
              duplicateIndex: dupIndex,
            },
          });

          generatedFiles.push(result);
          setGeneratedCount((c) => c + 1);
        } catch (err) {
          console.error(`[GENERATION] PDF render failed for participant ${i + 1} (${participantRawName}):`, err);
          renderFailures.push({
            row: i + 1,
            name: participantRawName,
            reason: `PDF render: ${err.message || "Unknown error"}`,
          });
          setFailedList((prev) => [...prev, {
            row: i + 1,
            name: participantRawName,
            reason: `PDF render: ${err.message || "Unknown error"}`,
          }]);
        }

        // Yield to browser to keep UI responsive (0ms is sufficient — the async
        // PDF work already yields naturally, but this ensures a paint frame).
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const _phase1Duration = performance.now() - _phase1Start;
      console.log(`[GENERATION] Phase 1 complete — ${generatedFiles.length} PDFs in ${(_phase1Duration / 1000).toFixed(1)}s (avg ${(_phase1Duration / Math.max(1, generatedFiles.length)).toFixed(0)}ms/cert)`);

      if (generatedFiles.length === 0) {
        console.error("[GENERATION] No PDFs were generated. Aborting.");
        setStatus("failed");
        return;
      }

      // ── PHASE 2: Upload PDFs to Firebase Storage + Firestore ───────────────
      // Uses controlled concurrency (UPLOAD_CONCURRENCY = 5) instead of
      // sequential uploads. This is the primary speed improvement for large batches.
      // With 53 certs at 3s/upload: sequential = 159s, concurrency=5 = ~32s.
      setStatus("uploading");
      setCurrentParticipantName("Uploading certificates to Firebase Storage...");

      const uploadFailures = [];
      let _uploadedCounter = 0;
      const _phase2Start = performance.now();

      const uploadTasks = generatedFiles.map((cert) => async () => {
        const { pdfBytes, certificateId, fileName, metadata } = cert;
        let certUrl = "";

        // Step A: Upload PDF to Firebase Storage
        try {
          const uploadResult = await uploadGeneratedCertificatePdf(
            pdfBytes,
            currentJobId,
            fileName
          );
          certUrl = uploadResult.downloadURL;
        } catch (uploadErr) {
          console.warn(`[GENERATION] Storage upload failed for ${fileName}:`, uploadErr);
        }

        // Step B: Save metadata to Firestore certificates collection
        // Schema strictly preserves rollNoClean, nameLower for public verification
        try {
          const certDocRef = doc(db, "certificates", certificateId);
          await setDoc(certDocRef, {
            ...metadata,
            certificateUrl: certUrl,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          _uploadedCounter++;
          setUploadedCount(_uploadedCounter);
        } catch (firestoreErr) {
          const isPerm = firestoreErr.code === "permission-denied";
          console.warn(
            `[GENERATION] Firestore save failed for ${certificateId} [${firestoreErr.code}]:`,
            firestoreErr.message
          );
          const failureReason = isPerm
            ? "Firestore permission denied — check security rules."
            : `Firestore: ${firestoreErr.message}`;
          uploadFailures.push({
            row: metadata.rowIndex ?? "?",
            name: metadata.name,
            reason: failureReason,
          });
          setUploadFailedCount((c) => c + 1);
          setFailedList((prev) => [...prev, {
            row: metadata.rowIndex ?? "?",
            name: metadata.name,
            reason: failureReason,
          }]);
        }
      });

      await runWithConcurrency(uploadTasks, UPLOAD_CONCURRENCY);

      const _phase2Duration = performance.now() - _phase2Start;
      console.log(`[GENERATION] Phase 2 complete — ${_uploadedCounter} uploaded in ${(_phase2Duration / 1000).toFixed(1)}s`);

      const allFailures = [...renderFailures, ...uploadFailures];
      const successCounter = generatedFiles.length - uploadFailures.length;

      // ── PHASE 3: ZIP + finalize ─────────────────────────────────────────────
      setStatus("packaging_zip");
      setCurrentParticipantName("Compiling and compressing certificates into ZIP...");

      try {
        const { zipBlob, sizeBytes } = await createCertificatesZip(
          generatedFiles.map(({ fileName, pdfBytes }) => ({ fileName, pdfBytes }))
        );
        setZipSizeBytes(sizeBytes);

        let finalZipUrl = "";
        try {
          const zipUpload = await uploadCertificateZip(
            zipBlob,
            currentJobId,
            `${(metaInfo?.eventName || "Certificates").replace(/\s+/g, "_")}_Batch.zip`
          );
          finalZipUrl = zipUpload.downloadURL;
        } catch (zipUploadErr) {
          console.warn("[GENERATION] ZIP Storage upload failed — using local blob URL:", zipUploadErr);
          finalZipUrl = URL.createObjectURL(zipBlob);
        }

        setZipDownloadUrl(finalZipUrl);

        // Update Firestore job record with final stats
        try {
          await updateCertificateJob(currentJobId, {
            completed: successCounter,
            failed: allFailures.length,
            status: allFailures.length > 0 && successCounter === 0 ? "failed" : "completed",
            zipUrl: finalZipUrl,
            zipSizeBytes: sizeBytes,
            errors: allFailures,
          });
        } catch (jobUpdateErr) {
          console.warn("[GENERATION] Could not update Firestore job status:", jobUpdateErr);
        }

        const _totalDuration = (performance.now() - _batchStart) / 1000;
        console.log(
          `[GENERATION] Batch complete — ${successCounter}/${total} certs in ${_totalDuration.toFixed(1)}s`,
          `| ${allFailures.length} failures`
        );

        setStatus("completed");
      } catch (zipErr) {
        console.error("[GENERATION] ZIP creation failed:", zipErr);
        setStatus(successCounter > 0 ? "completed" : "failed");
      }
    }

    runGeneration();
  }, [rows, total, template, fields, elements, mapping, metaInfo, status]);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="gen-progress-wrapper">
      <div className="gen-progress-card">

        {/* ── Template loading ─────────────────────────────────────────────── */}
        {status === "loading_template" && (
          <div className="gen-progress-body">
            <div className="gen-progress-icon-wrap">
              <div className="cert-spinner" />
            </div>
            <h3 className="gen-progress-title">Loading Template...</h3>
            <p className="gen-progress-desc">
              Fetching and caching the certificate background template. This happens once — not for every participant.
            </p>
          </div>
        )}

        {/* ── Template load failure ─────────────────────────────────────────── */}
        {status === "template_error" && (
          <div className="gen-failed-body">
            <div className="gen-failed-icon">⚠️</div>
            <h3>Template Load Failed</h3>
            <p style={{ color: "#f87171", marginBottom: "1rem" }}>
              {templateError || "Certificate template could not be loaded. Please replace the template and try again."}
            </p>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
              Generation has been stopped. No certificates have been created.
            </p>
            <div className="gen-complete-actions">
              <button type="button" className="admin-btn admin-btn--outline" onClick={onBack}>
                ← Back to Preview
              </button>
            </div>
          </div>
        )}

        {/* ── Phase 1: Generating PDFs ─────────────────────────────────────── */}
        {status === "generating" && (
          <div className="gen-progress-body">
            <div className="gen-progress-icon-wrap">
              <div className="cert-spinner" />
            </div>

            <h3 className="gen-progress-title">Generating certificates...</h3>

            {/* Phase 1 counter */}
            <div className="gen-progress-count">
              <span className="gen-count-current">{generatedCount}</span>
              <span className="gen-count-sep">/</span>
              <span className="gen-count-total">{total}</span>
            </div>

            {/* Phase 1 progress bar */}
            <div className="gen-progress-bar-wrap">
              <div
                className="gen-progress-bar-fill"
                style={{ width: `${genPercent}%` }}
              />
            </div>

            <div className="gen-progress-meta">
              <span className="gen-progress-pct">{genPercent}%</span>
              <span className="gen-progress-sub">
                Rendering: <code>{currentParticipantName}</code>
              </span>
            </div>

            <p className="gen-progress-desc" style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#64748b" }}>
              PDF generation is CPU-only — uploads will begin after all PDFs are rendered.
            </p>
          </div>
        )}

        {/* ── Phase 2: Uploading to Firebase ───────────────────────────────── */}
        {status === "uploading" && (
          <div className="gen-progress-body">
            <div className="gen-progress-icon-wrap">
              <div className="cert-spinner" />
            </div>

            <h3 className="gen-progress-title">Uploading certificates...</h3>

            {/* Generation complete indicator */}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "0.75rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.82rem", color: "#22c55e", fontWeight: 600 }}>
                ✓ {generatedCount} PDFs generated
              </span>
            </div>

            {/* Phase 2 upload counter */}
            <div className="gen-progress-count">
              <span className="gen-count-current">{uploadedCount + uploadFailedCount}</span>
              <span className="gen-count-sep">/</span>
              <span className="gen-count-total">{generatedCount}</span>
            </div>

            {/* Phase 2 progress bar */}
            <div className="gen-progress-bar-wrap">
              <div
                className="gen-progress-bar-fill"
                style={{ width: `${uploadPercent}%`, background: "linear-gradient(90deg, #6366f1, #818cf8)" }}
              />
            </div>

            <div className="gen-progress-meta">
              <span className="gen-progress-pct">{uploadPercent}%</span>
              <span className="gen-progress-sub">
                {UPLOAD_CONCURRENCY} simultaneous uploads
              </span>
            </div>

            {uploadFailedCount > 0 && (
              <p style={{ color: "#f87171", fontSize: "0.82rem", marginTop: "0.5rem", textAlign: "center" }}>
                ⚠️ {uploadFailedCount} upload{uploadFailedCount !== 1 ? "s" : ""} failed
              </p>
            )}
          </div>
        )}

        {/* ── Phase 3: Creating ZIP ─────────────────────────────────────────── */}
        {status === "packaging_zip" && (
          <div className="gen-progress-body">
            <div className="gen-progress-icon-wrap">
              <div className="cert-spinner" />
            </div>

            <h3 className="gen-progress-title">Creating ZIP Archive...</h3>
            <p className="gen-progress-desc">
              Packaging {generatedCount} high-resolution PDF certificates into a compressed ZIP file.
            </p>
          </div>
        )}

        {/* ── Completed ────────────────────────────────────────────────────── */}
        {status === "completed" && (
          <div className="gen-complete-body">
            <div className="gen-complete-icon">✓</div>

            <h3 className="gen-complete-title">
              ✓ {uploadedCount} certificate{uploadedCount !== 1 ? "s" : ""} generated successfully
            </h3>

            <p className="gen-complete-desc">
              All certificates have been generated at full template resolution, saved with
              unique Certificate IDs, and archived for bulk download.
            </p>

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
                  📥 Download ZIP {zipSizeBytes > 0 && `(${formatFileSize(zipSizeBytes)})`}
                </a>
              ) : (
                <span className="gen-download-hint">
                  Preparing direct download link...
                </span>
              )}
            </div>

            {/* Failure Report if any rows failed */}
            {failedList.length > 0 && (
              <div className="cert-alert cert-alert--warning gen-failures-box">
                <strong>⚠️ {failedList.length} certificate(s) could not be completed:</strong>
                <ul className="gen-failures-list">
                  {failedList.map((f, idx) => (
                    <li key={idx}>
                      Row {f.row} ({f.name}): {f.reason}
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
              <span className="gen-job-id-text">
                Batch Job Reference: <code>{jobId}</code>
              </span>
            )}
          </div>
        )}

        {/* ── Failed ───────────────────────────────────────────────────────── */}
        {status === "failed" && (
          <div className="gen-failed-body">
            <div className="gen-failed-icon">⚠️</div>
            <h3>Generation Failed</h3>
            <p>Could not generate certificates for this batch.</p>

            {failedList.length > 0 && (
              <div className="cert-alert cert-alert--warning gen-failures-box" style={{ marginTop: "1rem", textAlign: "left" }}>
                <ul className="gen-failures-list">
                  {failedList.map((f, idx) => (
                    <li key={idx}>
                      Row {f.row} ({f.name}): {f.reason}
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
  onBack: PropTypes.func.isRequired,
};
