import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  renderCertificateToCanvas,
  loadImage,
  generateCertificateId,
} from "../../../utils/certificateRenderer";

export default function CertificatePreview({
  templateConfig,
  dataset,
  dataMapping,
  onNext,
  onBack,
}) {
  const canvasRef = useRef(null);
  const [templateImg, setTemplateImg] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const totalRows = dataset?.rows?.length || 0;
  const currentRow = useMemo(
    () => dataset?.rows?.[currentIndex] || {},
    [dataset?.rows, currentIndex]
  );

  // Load template image
  useEffect(() => {
    let isMounted = true;
    if (templateConfig.templateUrl) {
      loadImage(templateConfig.templateUrl)
        .then((img) => {
          if (isMounted) setTemplateImg(img);
        })
        .catch((err) => console.error("Preview load image error:", err));
    }
    return () => {
      isMounted = false;
    };
  }, [templateConfig.templateUrl]);

  // Construct row data mapping for current student
  const resolveStudentData = useCallback(
    (rowIndex, row) => {
      const resolved = {};
      const fields = templateConfig.fields || [];

      fields.forEach((f) => {
        const mapping = dataMapping[f.id];
        if (mapping === "__auto_id__") {
          const code = (templateConfig.eventName || "CERT")
            .replace(/[^A-Za-z0-9]/g, "")
            .slice(0, 4)
            .toUpperCase();
          resolved[f.key || f.id] = generateCertificateId("ABH", code, rowIndex + 1);
        } else if (mapping === "__fixed_event__") {
          resolved[f.key || f.id] = templateConfig.eventName;
        } else if (mapping === "__fixed_date__") {
          resolved[f.key || f.id] = templateConfig.eventDate;
        } else if (mapping && mapping !== "__none__" && row[mapping] !== undefined) {
          resolved[f.key || f.id] = row[mapping];
        } else {
          resolved[f.key || f.id] = f.sampleText || "";
        }
      });

      return resolved;
    },
    [templateConfig, dataMapping]
  );

  // Render canvas whenever index, image, or config changes
  useEffect(() => {
    if (!canvasRef.current || !templateImg || !currentRow) return;

    const studentData = resolveStudentData(currentIndex, currentRow);
    renderCertificateToCanvas(
      canvasRef.current,
      templateImg,
      templateConfig.fields || [],
      studentData,
      {
        width: templateConfig.dimensions?.width || 1920,
        height: templateConfig.dimensions?.height || 1080,
      }
    );
  }, [templateImg, currentIndex, currentRow, templateConfig, resolveStudentData]);

  // Current student display values
  const studentData = resolveStudentData(currentIndex, currentRow);
  const studentName = studentData.name || studentData.field_name || "N/A";
  const studentRoll = studentData.rollNo || studentData.field_roll || "N/A";
  const certId = studentData.certificateId || studentData.field_id || "N/A";

  return (
    <div className="certificate-preview-step">
      <div className="wizard-step-header">
        <h3>Step 4: Live Certificate Preview</h3>
        <p>
          Inspect real rendered certificates using your uploaded dataset. Navigate
          through participants to verify typography, positioning, and data binding.
        </p>
      </div>

      <div className="preview-container">
        {/* Navigation Toolbar */}
        <div className="preview-toolbar">
          <div className="preview-student-info">
            <button
              type="button"
              className="admin-btn admin-btn--outline"
              style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}
              disabled={currentIndex <= 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            >
              ← Previous
            </button>

            <span className="preview-counter">
              Student {currentIndex + 1} of {totalRows}
            </span>

            <button
              type="button"
              className="admin-btn admin-btn--outline"
              style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}
              disabled={currentIndex >= totalRows - 1}
              onClick={() => setCurrentIndex((prev) => Math.min(totalRows - 1, prev + 1))}
            >
              Next →
            </button>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "#334155" }}>
              <strong>{studentName}</strong> ({studentRoll}) — <code>{certId}</code>
            </span>
          </div>
        </div>

        {/* Canvas Display */}
        <div className="preview-canvas-card">
          <canvas ref={canvasRef} className="preview-canvas-element" />
        </div>

        {/* Batch Stats Summary Cards */}
        <div className="preview-summary-card">
          <div className="summary-stat-box">
            <span className="stat-label">Total Ready to Generate</span>
            <span className="stat-val">{totalRows}</span>
          </div>

          <div className="summary-stat-box">
            <span className="stat-label">Target Event</span>
            <span className="stat-val" style={{ fontSize: "1.1rem" }}>
              {templateConfig.eventName || "General"}
            </span>
          </div>

          <div className="summary-stat-box">
            <span className="stat-label">Certificate Type</span>
            <span className="stat-val" style={{ fontSize: "1.1rem" }}>
              {templateConfig.certificateType || "Participation"}
            </span>
          </div>

          <div className="summary-stat-box">
            <span className="stat-label">Template Resolution</span>
            <span className="stat-val" style={{ fontSize: "1.1rem" }}>
              {templateConfig.dimensions?.width} × {templateConfig.dimensions?.height}
            </span>
          </div>
        </div>
      </div>

      <div className="wizard-footer">
        <button
          type="button"
          className="admin-btn admin-btn--outline"
          onClick={onBack}
        >
          ← Back to Data Mapping
        </button>

        <button
          type="button"
          className="admin-btn admin-btn--primary"
          onClick={onNext}
        >
          Proceed to Generate ({totalRows} Certificates) 🚀
        </button>
      </div>
    </div>
  );
}
