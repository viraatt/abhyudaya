import { useState, useRef } from "react";
import PropTypes from "prop-types";
import { processTemplateFile } from "../../../utils/pdfTemplateHelper";
import { uploadCertificateTemplate } from "../../../Firebase/certificateStorageService";

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
        originalWidth: processed.originalWidth,
        originalHeight: processed.originalHeight,
        previewUrl: processed.previewUrl,
        storageUrl: storageResult.downloadURL,
        storagePath: storageResult.storagePath,
        blob: processed.blob,
      });
    } catch (err) {
      console.error("Template load error:", err);
      setError(err.message || "Failed to process template file.");
    } finally {
      setLoading(false);
    }
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
          Dynamic text fields will be positioned directly on top of this background.
        </p>
      </div>

      {error && (
        <div className="cert-alert cert-alert--error" role="alert">
          <span>⚠️ {error}</span>
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
          accept=".png,.jpg,.jpeg,.webp,.pdf,application/pdf,image/*"
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
            <img
              src={template.previewUrl}
              alt="Uploaded Certificate Template"
              className="template-preview-img"
            />
            <div className="template-preview-meta">
              <span className="template-badge">
                {template.fileType === "pdf" ? "📄 PDF Template" : "🖼️ Image Template"}
              </span>
              <span className="template-dims">
                {template.originalWidth} × {template.originalHeight} px
              </span>
              <span className="template-filename">{template.name}</span>
              <button
                type="button"
                className="cert-btn-text"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Replace Template
              </button>
            </div>
          </div>
        ) : (
          <div className="cert-dropzone-empty">
            <div className="cert-dropzone-icon">📜</div>
            <h4>Drag & drop certificate template here</h4>
            <p>or click to browse files</p>
            <div className="cert-dropzone-formats">
              <span>Supports: PNG, JPG, JPEG, WEBP, PDF</span>
              <small>Recommended: 1920×1080 px or A4 Landscape (3508×2480 px @ 300 DPI)</small>
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
            </span>
          )}
        </div>
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={!template?.previewUrl || loading}
          onClick={onContinue}
        >
          Next: Design Text Fields →
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
