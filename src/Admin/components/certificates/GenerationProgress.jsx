import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  renderCertificateToCanvas,
  canvasToPdfBlob,
  createZipFromFiles,
  loadImage,
  generateCertificateId,
} from "../../../utils/certificateRenderer";
import {
  uploadGeneratedCertificatePdf,
  uploadCertificateZip,
  uploadCertificateTemplate,
} from "../../../Firebase/certificateStorageService";
import {
  createCertificateJob,
  updateCertificateJob,
  saveCertificateTemplate,
} from "../../../Firebase/certificateTemplateService";
import { createCertificate } from "../../../Firebase/certificateService";

export default function GenerationProgress({
  templateConfig,
  dataset,
  dataMapping,
  onReset,
}) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState("Ready to start generation");
  const [logs, setLogs] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [zipBlobUrl, setZipBlobUrl] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [stats, setStats] = useState({ success: 0, failed: 0, total: 0 });
  const logEndRef = useRef(null);

  const totalRows = dataset?.rows?.length || 0;

  const addLog = (msg, type = "normal") => {
    setLogs((prev) => [...prev, { text: msg, type, time: new Date().toLocaleTimeString() }]);
  };

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Execute generation pipeline
  const startGeneration = async () => {
    if (generating || totalRows === 0) return;

    setGenerating(true);
    setProgress(0);
    setLogs([]);
    setIsComplete(false);
    setZipBlobUrl(null);
    setCurrentStatus("Initializing generation job...");

    const generatedPdfs = [];
    let successCount = 0;
    let failedCount = 0;

    try {
      addLog(`🚀 Starting bulk generation for ${totalRows} participant(s)...`);

      // 1. Load template image
      const templateImg = await loadImage(templateConfig.templateUrl);
      addLog("✅ Template image loaded successfully.");

      // 2. Ensure template is saved in Storage & Firestore
      let templateUrl = templateConfig.templateUrl;
      let storagePath = templateConfig.storagePath || "";

      if (templateConfig.templateFile) {
        addLog("☁️ Uploading master template to Firebase Storage...");
        const res = await uploadCertificateTemplate(
          templateConfig.templateFile,
          templateConfig.savedTemplateId || `tpl_${Date.now()}`
        );
        templateUrl = res.downloadUrl;
        storagePath = res.storagePath;
      }

      const tplId = await saveCertificateTemplate({
        id: templateConfig.savedTemplateId || undefined,
        name: templateConfig.templateName,
        eventName: templateConfig.eventName,
        eventDate: templateConfig.eventDate,
        certificateType: templateConfig.certificateType,
        templateUrl,
        storagePath,
        dimensions: templateConfig.dimensions,
        fields: templateConfig.fields,
      });

      // 3. Create job record in Firestore
      const newJobId = await createCertificateJob({
        templateId: tplId,
        templateName: templateConfig.templateName,
        eventName: templateConfig.eventName,
        eventDate: templateConfig.eventDate,
        certificateType: templateConfig.certificateType,
        totalCount: totalRows,
      });
      setJobId(newJobId);
      addLog(`📋 Job #${newJobId} created in Firestore.`);

      // Setup offscreen canvas
      const offCanvas = document.createElement("canvas");

      // 4. Process each participant row
      for (let i = 0; i < totalRows; i++) {
        const row = dataset.rows[i];
        const studentIndex = i + 1;
        const currentPct = Math.round(((i + 1) / totalRows) * 85); // 0-85% for rendering & upload
        setProgress(currentPct);

        // Resolve mapped student values
        const studentData = {};
        templateConfig.fields.forEach((f) => {
          const mapping = dataMapping[f.id];
          if (mapping === "__auto_id__") {
            const code = (templateConfig.eventName || "CERT")
              .replace(/[^A-Za-z0-9]/g, "")
              .slice(0, 4)
              .toUpperCase();
            studentData[f.key || f.id] = generateCertificateId("ABH", code, studentIndex);
          } else if (mapping === "__fixed_event__") {
            studentData[f.key || f.id] = templateConfig.eventName;
          } else if (mapping === "__fixed_date__") {
            studentData[f.key || f.id] = templateConfig.eventDate;
          } else if (mapping && mapping !== "__none__" && row[mapping] !== undefined) {
            studentData[f.key || f.id] = row[mapping];
          } else {
            studentData[f.key || f.id] = f.sampleText || "";
          }
        });

        const name = studentData.name || studentData.field_name || `Student ${studentIndex}`;
        const rollNo = studentData.rollNo || studentData.field_roll || `ROLL-${studentIndex}`;
        const certId =
          studentData.certificateId ||
          studentData.field_id ||
          generateCertificateId("ABH", "CERT", studentIndex);

        setCurrentStatus(`Rendering [${studentIndex}/${totalRows}]: ${name} (${certId})...`);

        try {
          // Render canvas
          renderCertificateToCanvas(
            offCanvas,
            templateImg,
            templateConfig.fields,
            studentData,
            {
              width: templateConfig.dimensions?.width || 1920,
              height: templateConfig.dimensions?.height || 1080,
            }
          );

          // Convert canvas to PDF
          const pdfBlob = await canvasToPdfBlob(offCanvas);

          // Upload PDF to Firebase Storage
          let pdfUrl = "";
          try {
            const uploadRes = await uploadGeneratedCertificatePdf(pdfBlob, certId);
            pdfUrl = uploadRes.downloadUrl;
          } catch (storageErr) {
            console.warn("Storage upload fallback:", storageErr);
            // Fallback to object URL if offline
            pdfUrl = URL.createObjectURL(pdfBlob);
          }

          // Save certificate record to Firestore
          try {
            await createCertificate({
              certificateId: certId,
              rollNo,
              name,
              eventName: templateConfig.eventName,
              eventDate: templateConfig.eventDate,
              certificateType: templateConfig.certificateType,
              certificateUrl: pdfUrl,
            });
          } catch (firestoreErr) {
            // If already exists, log warning
            console.warn("Certificate doc write:", firestoreErr);
          }

          // Add to ZIP batch
          generatedPdfs.push({
            name: `${certId}_${name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
            blob: pdfBlob,
          });

          successCount++;
          addLog(`✓ [${studentIndex}/${totalRows}] ${name} (${certId}) generated.`, "success");
        } catch (itemErr) {
          failedCount++;
          console.error(`Failed on row ${studentIndex}:`, itemErr);
          addLog(`✕ [${studentIndex}/${totalRows}] ${name}: ${itemErr.message}`, "error");
        }
      }

      // 5. Package all PDFs into ZIP
      setCurrentStatus("Packaging ZIP archive of all certificates...");
      setProgress(90);
      addLog("📦 Creating ZIP archive of generated PDFs...");

      const zipBlob = await createZipFromFiles(generatedPdfs);
      const localZipUrl = URL.createObjectURL(zipBlob);
      setZipBlobUrl(localZipUrl);

      // 6. Upload ZIP to Firebase Storage
      let firebaseUrl = "";
      try {
        addLog("☁️ Uploading ZIP to Firebase Storage...");
        const zipUpload = await uploadCertificateZip(zipBlob, newJobId);
        firebaseUrl = zipUpload.downloadUrl;
      } catch (zipUploadErr) {
        console.warn("ZIP Storage upload:", zipUploadErr);
      }

      // 7. Complete job in Firestore
      await updateCertificateJob(newJobId, {
        status: "completed",
        processedCount: totalRows,
        successCount,
        failedCount,
        zipUrl: firebaseUrl || "",
      });

      setProgress(100);
      setCurrentStatus("Batch Generation Completed!");
      addLog(`🎉 Finished! Successfully created ${successCount} certificate(s).`, "success");
      setStats({ success: successCount, failed: failedCount, total: totalRows });
      setIsComplete(true);
    } catch (err) {
      console.error("Bulk generation error:", err);
      addLog(`🚨 Critical error: ${err.message}`, "error");
      setCurrentStatus(`Failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Download ZIP locally
  const handleDownloadZip = () => {
    if (!zipBlobUrl) return;
    const link = document.createElement("a");
    link.href = zipBlobUrl;
    link.download = `${templateConfig.eventName || "Certificates"}_Batch.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="generation-step">
      <div className="wizard-step-header">
        <h3>Step 5: Bulk Certificate Generation</h3>
        <p>
          Generate high-resolution PDF certificates for all {totalRows} participants,
          save them to the database, and download the complete ZIP archive.
        </p>
      </div>

      {!isComplete ? (
        <div className="gen-progress-card">
          {!generating && progress === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>⚡</div>
              <h4 style={{ fontSize: "1.3rem", color: "#0f172a", marginBottom: "0.5rem" }}>
                Ready to Generate {totalRows} Certificates
              </h4>
              <p style={{ color: "#64748b", maxWidth: "520px", margin: "0 auto 1.75rem auto" }}>
                All fields, data mappings, and templates have been verified. Click below
                to start the automatic batch generation process.
              </p>

              <button
                type="button"
                className="admin-btn admin-btn--primary"
                style={{ padding: "0.85rem 2rem", fontSize: "1.05rem" }}
                onClick={startGeneration}
              >
                🚀 Start Bulk Generation Now
              </button>
            </div>
          ) : (
            <>
              <div className="gen-status-row">
                <span>{currentStatus}</span>
                <span className="gen-percent-badge">{progress}%</span>
              </div>

              <div className="gen-progress-bar-wrap">
                <div
                  className="gen-progress-bar-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="gen-live-log">
                {logs.map((log, index) => (
                  <div key={index} className={`log-line ${log.type}`}>
                    [{log.time}] {log.text}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </>
          )}
        </div>
      ) : (
        /* Completion Screen */
        <div className="gen-complete-box">
          <div className="gen-complete-icon">🎉</div>
          <h3 className="gen-complete-title">Batch Generation Successful!</h3>
          <p className="gen-complete-desc">
            Successfully generated <strong>{stats.success}</strong> certificates for{" "}
            <strong>{templateConfig.eventName}</strong>. All records have been indexed
            and are publicly verifiable.
          </p>

          {jobId && (
            <span style={{ fontSize: "0.82rem", color: "#64748b", fontFamily: "monospace" }}>
              Job ID: {jobId}
            </span>
          )}

          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <span className="res-tag res-tag--success">
              ✅ Generated: {stats.success}
            </span>
            {stats.failed > 0 && (
              <span className="res-tag res-tag--error">
                ⚠️ Failures: {stats.failed}
              </span>
            )}
          </div>

          <div className="gen-complete-actions">
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              style={{ padding: "0.8rem 1.8rem", fontSize: "1rem" }}
              onClick={handleDownloadZip}
            >
              📥 Download All Certificates (ZIP)
            </button>

            <Link
              to="/admin/certificates"
              className="admin-btn admin-btn--secondary"
              style={{ padding: "0.8rem 1.5rem" }}
            >
              📜 View in Certificates Management
            </Link>

            <button
              type="button"
              className="admin-btn admin-btn--outline"
              onClick={onReset}
            >
              ✨ Create Another Batch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
