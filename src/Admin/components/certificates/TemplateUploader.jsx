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
      // 1. Process template to determine dimensions and generate preview URL
      const processed = await processTemplateFile(file);

      // 2. Upload template asset to Firebase Storage in background
      let storageResult = { downloadURL: processed.previewUrl, storagePath: "" };
      try {
        storageResult = await uploadCertificateTemplate(processed.blob || file, file.name);
      } catch (uploadErr) {
        console.warn("Storage upload failed, continuing with local blob preview:", uploadErr);
      }

      onTemplateLoaded({
        name: file.name,
        fileType: processed.isPdf ? "pdf" : "image",
        format: processed.format,
        mimeType: processed.mimeType,
        fileSize: processed.fileSize || file.size,
        originalWidth: processed.originalWidth,
        originalHeight: processed.originalHeight,
        previewUrl: processed.previewUrl,
        storageUrl: storageResult.downloadURL,
        storagePath: storageResult.storagePath,
        blob: processed.blob || file,
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
            <p>Processing & rendering template (extracting high-DPI canvas)...</p>
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
          disabled={!template?.previewUrl || loading}
          onClick={onContinue}
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
};
