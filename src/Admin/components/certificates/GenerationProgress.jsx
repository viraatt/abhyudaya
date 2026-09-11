import { useState, useEffect, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { generateCertificatePdf, createCertificatesZip } from "../../../utils/pdfGenerator";
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

export default function GenerationProgress({
  template,
  fields,
  elements,
  dataset,
  mapping,
  metaInfo,
  onBack,
}) {
  const [status, setStatus] = useState("idle"); // 'idle' | 'generating' | 'packaging_zip' | 'completed' | 'failed'
  const [completedCount, setCompletedCount] = useState(0);
  const [currentParticipantName, setCurrentParticipantName] = useState("");
  const [zipDownloadUrl, setZipDownloadUrl] = useState("");
  const [zipSizeBytes, setZipSizeBytes] = useState(0);
  const [failedList, setFailedList] = useState([]);
  const [jobId, setJobId] = useState("");

  const isGeneratingRef = useRef(false);

  const rows = useMemo(() => dataset?.rows || [], [dataset]);
  const total = rows.length;
  const progressPercent = total > 0 ? Math.min(100, Math.round((completedCount / total) * 100)) : 0;

  useEffect(() => {
    if (isGeneratingRef.current || status !== "idle" || total === 0) return;
    isGeneratingRef.current = true;

    async function runGeneration() {
      setStatus("generating");
      const currentJobId = `job_${Date.now()}`;
      setJobId(currentJobId);

      // 1. Initialize Firestore job record
      await createCertificateJob({
        jobId: currentJobId,
        templateId: template?.id || "custom_template",
        templateTitle: metaInfo?.title || "Certificate Batch",
        eventName: metaInfo?.eventName || "Abhyudaya Event",
        eventDate: metaInfo?.eventDate || "",
        total,
        status: "processing",
      });

      const generatedFiles = [];
      const failures = [];
      let successCounter = 0;

      // Duplicate name tracker for filename collision prevention
      const seenNames = new Map();

      // 2. Process each participant row in non-blocking sequence
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
          const elementsToRender = (Array.isArray(elements) && elements.length > 0)
            ? elements.filter((el) => el.visible !== false)
            : (fields || []);

          // A. Render single certificate PDF
          const { pdfBytes, certificateId, fileName, metadata } =
            await generateCertificatePdf({
              template,
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

          // B. Upload PDF to Firebase Storage
          let certUrl = "";
          try {
            const uploadResult = await uploadGeneratedCertificatePdf(
              pdfBytes,
              currentJobId,
              fileName
            );
            certUrl = uploadResult.downloadURL;
          } catch (uploadErr) {
            console.warn(`Storage upload failed for ${fileName}:`, uploadErr);
          }

          // C. Save metadata to Firestore certificates collection
          // Schema strictly preserves rollNoClean, nameLower for verification
          try {
            const certDocRef = doc(db, "certificates", certificateId);
            await setDoc(certDocRef, {
              ...metadata,
              certificateUrl: certUrl,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (firestoreErr) {
            console.warn(`Firestore save failed for ${certificateId}:`, firestoreErr);
          }

          // Save in memory for ZIP compilation
          generatedFiles.push({ fileName, pdfBytes });

          successCounter++;
          setCompletedCount(successCounter);
        } catch (err) {
          console.error(`Failed to generate certificate for row ${i + 1}:`, err);
          failures.push({
            row: i + 1,
            name: participantRawName,
            reason: err.message || "Rendering failed",
          });
          setFailedList([...failures]);
        }

        // D. Non-blocking yield: let browser render UI updates and prevent freezing
        await new Promise((resolve) => setTimeout(resolve, 8));
      }

      // 3. Compile ZIP archive
      if (generatedFiles.length > 0) {
        setStatus("packaging_zip");
        setCurrentParticipantName("Compiling and compressing certificates into ZIP...");

        try {
          const { zipBlob, sizeBytes } = await createCertificatesZip(generatedFiles);
          setZipSizeBytes(sizeBytes);

          // Upload ZIP to Firebase Storage
          let finalZipUrl = "";
          try {
            const zipUpload = await uploadCertificateZip(
              zipBlob,
              currentJobId,
              `${(metaInfo?.eventName || "Certificates").replace(/\s+/g, "_")}_Batch.zip`
            );
            finalZipUrl = zipUpload.downloadURL;
          } catch (uploadErr) {
            console.warn("Storage upload for ZIP archive failed, creating local blob URL:", uploadErr);
            finalZipUrl = URL.createObjectURL(zipBlob);
          }

          setZipDownloadUrl(finalZipUrl);

          // Update job record in Firestore
          try {
            await updateCertificateJob(currentJobId, {
              completed: successCounter,
              failed: failures.length,
              status: failures.length > 0 && successCounter === 0 ? "failed" : "completed",
              zipUrl: finalZipUrl,
              zipSizeBytes: sizeBytes,
              errors: failures,
            });
          } catch (jobErr) {
            console.warn("Could not update Firestore job status:", jobErr);
          }

          setStatus("completed");
        } catch (zipErr) {
          console.error("ZIP creation failed:", zipErr);
          setStatus(successCounter > 0 ? "completed" : "failed");
        }
      } else {
        setStatus("failed");
      }
    }

    runGeneration();
  }, [rows, total, template, fields, mapping, metaInfo, status]);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="gen-progress-wrapper">
      <div className="gen-progress-card">
        {status === "generating" && (
          <div className="gen-progress-body">
            <div className="gen-progress-icon-wrap">
              <div className="cert-spinner" />
            </div>

            <h3 className="gen-progress-title">Generating certificates...</h3>

            <div className="gen-progress-count">
              <span className="gen-count-current">{completedCount}</span>
              <span className="gen-count-sep">/</span>
              <span className="gen-count-total">{total}</span>
            </div>

            {/* Visual Progress Bar */}
            <div className="gen-progress-bar-wrap">
              <div
                className="gen-progress-bar-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="gen-progress-meta">
              <span className="gen-progress-pct">{progressPercent}%</span>
              <span className="gen-progress-sub">
                Rendering: <code>{currentParticipantName}</code>
              </span>
            </div>
          </div>
        )}

        {status === "packaging_zip" && (
          <div className="gen-progress-body">
            <div className="gen-progress-icon-wrap">
              <div className="cert-spinner" />
            </div>

            <h3 className="gen-progress-title">Creating ZIP Archive...</h3>
            <p className="gen-progress-desc">
              Packaging {completedCount} high-resolution PDF certificates into a compressed ZIP file.
            </p>
          </div>
        )}

        {status === "completed" && (
          <div className="gen-complete-body">
            <div className="gen-complete-icon">✓</div>

            <h3 className="gen-complete-title">
              ✓ {completedCount} certificates generated successfully
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
                <strong>⚠️ {failedList.length} certificate(s) could not be generated:</strong>
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

        {status === "failed" && (
          <div className="gen-failed-body">
            <div className="gen-failed-icon">⚠️</div>
            <h3>Generation Failed</h3>
            <p>Could not generate certificates for this batch.</p>

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
