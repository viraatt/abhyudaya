import { useState, useRef } from "react";
import PropTypes from "prop-types";
import { processTemplateFile, revokeTemplatePreview } from "../../../utils/pdfTemplateHelper";
import { uploadCertificateTemplate } from "../../../Firebase/certificateStorageService";

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAspectRatioLabel(w, h) {
  if (!w || !h) return "";
  const ratio = (w / h).toFixed(2);
  if (Math.abs(ratio - 1.78) < 0.05) return "16:9 Landscape";
  if (Math.abs(ratio - 1.41) < 0.05) return "A4 Landscape (1.41:1)";
  if (Math.abs(ratio - 1.33) < 0.05) return "4:3 Standard";
  return `${ratio}:1 Ratio`;
}

export default function TemplateUploader({
  template,
  onTemplateLoaded,
  onContinue,
  selectedEventId = "",
  selectedEvent = null,
  eventTemplates = [],
  onSelectExistingTemplate = () => {},
  templatesLoading = false,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;
    setLoading(true);
    setError("");

    try {
      // 1. Process template locally to determine dimensions and generate preview URL
      const processed = await processTemplateFile(file);

      // 2. Immediately notify parent component so designer/preview is instant
      const initialTemplateData = {
        name: file.name,
        fileType: processed.isPdf ? "pdf" : "image",
        format: processed.format,
        mimeType: processed.mimeType,
        fileSize: processed.fileSize || file.size,
        originalWidth: processed.originalWidth,
        originalHeight: processed.originalHeight,
        previewUrl: processed.previewUrl,
        storageUrl: processed.previewUrl,
        storagePath: "",
        blob: processed.blob || file,
        arrayBuffer: processed.arrayBuffer || null,
      };
      onTemplateLoaded(initialTemplateData);

      // 3. Upload template asset to Firebase Storage asynchronously in background
      uploadCertificateTemplate(processed.blob || file, file.name)
        .then((storageResult) => {
          if (storageResult?.downloadURL) {
            onTemplateLoaded({
              ...initialTemplateData,
              storageUrl: storageResult.downloadURL,
              storagePath: storageResult.storagePath,
            });
          }
        })
        .catch((uploadErr) => {
          console.warn("Storage upload failed, continuing with local blob preview:", uploadErr);
        });
    } catch (err) {
      console.error("Template load error:", err);
      setError(err.message || "Failed to process template file.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTemplate = (e) => {
    e.stopPropagation();
    if (template?.previewUrl) {
      revokeTemplatePreview(template.previewUrl);
    }
    onTemplateLoaded(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  return (
    <div className="template-uploader-card">
      <div className="template-uploader-header">
        <h3>Step 1: Upload Certificate Background Template</h3>
        <p>
          Upload a high-resolution certificate design template (PNG, JPG, JPEG, or single-page PDF).
          Dynamic text fields and verification QR codes will be positioned directly on top of this background.
        </p>
      </div>

      {error && (
        <div className="cert-alert cert-alert--error" role="alert">
          <span>⚠️ {error}</span>
          <button
            type="button"
            className="cert-alert-close"
            onClick={() => setError("")}
            title="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {!selectedEventId && (
        <div className="cert-alert cert-alert--warning" role="alert" style={{ marginBottom: "1.25rem" }}>
          <span>⚠️ <strong>Select an event to continue.</strong> Please select an event from the dropdown above to load or upload certificates for that event.</span>
        </div>
      )}

      {selectedEventId && eventTemplates.length > 0 && (
        <div className="cert-event-templates-box" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#334155" }}>
              Saved Templates for: <strong>{selectedEvent?.title || "Selected Event"}</strong>
            </h4>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              {eventTemplates.length} template{eventTemplates.length === 1 ? "" : "s"} found
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "10px" }}>
            {eventTemplates.map((tpl) => {
              const isCurrent = template?.id === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => onSelectExistingTemplate(tpl)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelectExistingTemplate(tpl); }}
                  style={{
                    border: isCurrent ? "2px solid #6366f1" : "1px solid #e2e8f0",
                    background: isCurrent ? "#f5f7ff" : "#ffffff",
                    borderRadius: "8px",
                    padding: "8px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div style={{ height: "90px", borderRadius: "6px", overflow: "hidden", background: "#f8fafc", display: "grid", placeItems: "center" }}>
                    {tpl.templateUrl ? (
                      <img src={tpl.templateUrl} alt={tpl.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: "2rem" }}>📜</span>
                    )}
                  </div>
                  <strong style={{ fontSize: "0.85rem", color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {tpl.title || "Untitled Template"}
                  </strong>
                  <span style={{ fontSize: "0.75rem", color: isCurrent ? "#4f46e5" : "#64748b" }}>
                    {isCurrent ? "✓ Active Template" : "Click to use this layout"}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ margin: "14px 0 8px", fontSize: "0.82rem", color: "#64748b", textAlign: "center" }}>
            — OR upload a new template background for this event below —
          </div>
        </div>
      )}

      {/* Dropzone */}
      <div
        className={`cert-dropzone ${dragOver ? "drag-over" : ""} ${
          template?.previewUrl ? "has-file" : ""
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !loading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload certificate template"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.pdf,application/pdf,image/png,image/jpeg,image/webp"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
          disabled={loading}
        />

        {loading ? (
          <div className="cert-dropzone-loading">
            <div className="cert-spinner" />
            <p>Loading template...</p>
          </div>
        ) : template?.previewUrl ? (
          <div className="template-preview-box">
            <div className="template-preview-img-container">
              <img
                src={template.previewUrl}
                alt="Uploaded Certificate Template"
                className="template-preview-img"
              />
            </div>
            <div className="template-preview-meta">
              <span className="template-badge">
                {template.fileType === "pdf" ? "📄 PDF Template" : "🖼️ Image Template"}
              </span>
              <span className="template-dims">
                {template.originalWidth} × {template.originalHeight} px
              </span>
              {template.originalWidth && template.originalHeight && (
                <span className="template-ratio-tag">
                  {getAspectRatioLabel(template.originalWidth, template.originalHeight)}
                </span>
              )}
              {template.fileSize > 0 && (
                <span className="template-size-tag">
                  {formatBytes(template.fileSize)}
                </span>
              )}
              <span className="template-filename">{template.name}</span>

              <div className="template-preview-actions">
                <button
                  type="button"
                  className="cert-btn-text"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  title="Choose a different image file"
                >
                  🔄 Replace Template
                </button>
                <button
                  type="button"
                  className="cert-btn-text cert-btn-text--danger"
                  onClick={handleRemoveTemplate}
                  title="Remove uploaded template"
                >
                  🗑️ Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="cert-dropzone-empty">
            <div className="cert-dropzone-icon">📜</div>
            <h4>Drag & drop certificate template here</h4>
            <p>or click to browse files</p>
            <div className="cert-dropzone-formats">
              <span className="file-badge">PNG</span>
              <span className="file-badge">JPG / JPEG</span>
              <span className="file-badge">WEBP</span>
              <span className="file-badge">PDF (1 Page)</span>
            </div>
            <div className="cert-dropzone-specs">
              <div className="spec-item">
                <strong>Standard HD:</strong> 1920 × 1080 px (16:9)
              </div>
              <div className="spec-item">
                <strong>Print A4 Landscape:</strong> 3508 × 2480 px (300 DPI)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="cert-step-footer">
        <div className="cert-footer-info">
          {template?.originalWidth && (
            <span>
              ✓ Master template ready: {template.originalWidth} × {template.originalHeight} px
              {template.fileSize > 0 && ` (${formatBytes(template.fileSize)})`}
            </span>
          )}
        </div>
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={!template?.previewUrl || loading || !selectedEventId}
          onClick={onContinue}
          title={!selectedEventId ? "Select an event above first" : "Proceed to Certificate Designer"}
        >
          Next: Position Text Fields →
        </button>
      </div>
    </div>
  );
}

TemplateUploader.propTypes = {
  template: PropTypes.object,
  onTemplateLoaded: PropTypes.func.isRequired,
  onContinue: PropTypes.func.isRequired,
  selectedEventId: PropTypes.string,
  selectedEvent: PropTypes.object,
  eventTemplates: PropTypes.array,
  onSelectExistingTemplate: PropTypes.func,
  templatesLoading: PropTypes.bool,
};
