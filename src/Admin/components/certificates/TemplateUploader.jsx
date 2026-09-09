import { useEffect, useRef, useState } from "react";
import { getEvents } from "../../../Firebase/eventService";
import { getCertificateTemplates } from "../../../Firebase/certificateTemplateService";
import { processTemplateFile } from "../../../utils/pdfTemplateHelper";

const CERTIFICATE_TYPES = [
  "Participation",
  "Winner",
  "Runner-Up",
  "Organizer",
  "Appreciation",
  "Special Mention",
];

export default function TemplateUploader({
  templateConfig,
  onUpdateConfig,
  onNext,
}) {
  const [events, setEvents] = useState([]);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [processingFile, setProcessingFile] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  // Load events and saved templates on mount
  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getEvents({ onlyPublished: false, pageSize: 50 }).catch(() => []),
      getCertificateTemplates().catch(() => []),
    ]).then(([eventsList, templatesList]) => {
      if (!isMounted) return;
      setEvents(eventsList || []);
      setSavedTemplates(templatesList || []);
      setLoadingResources(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Event selection
  const handleSelectEvent = (e) => {
    const selectedTitle = e.target.value;
    if (!selectedTitle) {
      onUpdateConfig({
        eventId: "",
        eventName: "",
        eventDate: "",
      });
      return;
    }

    const ev = events.find((item) => item.title === selectedTitle);
    if (ev) {
      onUpdateConfig({
        eventId: ev.id || "",
        eventName: ev.title || "",
        eventDate: ev.date || "",
        templateName: templateConfig.templateName || `${ev.title} Certificate`,
      });
    }
  };

  // Handle Saved Template selection
  const handleSelectSavedTemplate = (e) => {
    const tplId = e.target.value;
    if (!tplId) return;

    const tpl = savedTemplates.find((t) => t.id === tplId);
    if (tpl) {
      onUpdateConfig({
        templateId: tpl.id,
        savedTemplateId: tpl.id,
        templateName: tpl.name,
        name: tpl.name,
        eventName: tpl.eventName || templateConfig.eventName,
        eventDate: tpl.eventDate || templateConfig.eventDate,
        certificateType: tpl.certificateType || templateConfig.certificateType,
        templateUrl: tpl.fileUrl || tpl.templateUrl,
        fileUrl: tpl.fileUrl || tpl.templateUrl,
        storagePath: tpl.storagePath || "",
        templateFile: null,
        width: tpl.width || tpl.dimensions?.width || 1920,
        height: tpl.height || tpl.dimensions?.height || 1080,
        dimensions: tpl.dimensions || {
          width: tpl.width || 1920,
          height: tpl.height || 1080,
        },
        fields: tpl.fields && tpl.fields.length > 0 ? tpl.fields : templateConfig.fields,
      });
    }
  };

  // Drag & drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Process uploaded image or PDF
  const handleFile = async (file) => {
    if (!file) return;
    setErrorMsg("");

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const validImg = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ].includes(file.type);

    if (!isPdf && !validImg) {
      setErrorMsg("Please upload a valid template file (PNG, JPG, JPEG, or PDF).");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg("Template file size should not exceed 25MB.");
      return;
    }

    setProcessingFile(true);

    try {
      const res = await processTemplateFile(file);
      onUpdateConfig({
        templateFile: res.isPdf ? res.imageBlob : file,
        originalFile: file,
        templateUrl: res.previewUrl,
        fileUrl: res.previewUrl,
        savedTemplateId: "",
        templateId: "",
        width: res.originalWidth,
        height: res.originalHeight,
        dimensions: {
          width: res.originalWidth,
          height: res.originalHeight,
        },
      });
    } catch (err) {
      console.error("Template processing error:", err);
      setErrorMsg(err.message || "Failed to process template file.");
    } finally {
      setProcessingFile(false);
    }
  };

  // Validation before proceed
  const canProceed =
    (templateConfig.templateUrl || templateConfig.fileUrl || templateConfig.templateFile) &&
    (templateConfig.templateName || templateConfig.name) &&
    templateConfig.eventName;

  return (
    <div className="template-uploader-step">
      <div className="wizard-step-header">
        <h3>Step 1: Upload Certificate Template</h3>
        <p>
          Upload a high-resolution certificate background image (e.g. 1920x1080
          or A4) and link it to an Abhyudaya event.
        </p>
      </div>

      {savedTemplates.length > 0 && (
        <div className="saved-templates-row">
          <span>💡 Or load from a saved template:</span>
          <select
            className="admin-input"
            style={{ maxWidth: 300 }}
            onChange={handleSelectSavedTemplate}
            value={templateConfig.savedTemplateId || ""}
          >
            <option value="">-- Choose Existing Template --</option>
            {savedTemplates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name} ({tpl.certificateType || "Participation"})
              </option>
            ))}
          </select>
        </div>
      )}

      {errorMsg && (
        <div className="cert-alert cert-alert--error" style={{ marginBottom: "1.5rem" }}>
          <span className="cert-alert-icon">⚠️</span>
          <p>{errorMsg}</p>
        </div>
      )}

      <div className="uploader-grid">
        {/* Left Column: Form Controls */}
        <div className="uploader-form-col">
          <div className="form-group">
            <label className="form-label" htmlFor="templateNameInput">
              Template Title <span className="req">*</span>
            </label>
            <input
              id="templateNameInput"
              type="text"
              className="admin-input"
              placeholder="e.g. Techbloom 2026 Participation Certificate"
              value={templateConfig.templateName || ""}
              onChange={(e) => onUpdateConfig({ templateName: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="eventSelect">
              Select Event (From Database)
            </label>
            <select
              id="eventSelect"
              className="admin-input"
              value={templateConfig.eventName || ""}
              onChange={handleSelectEvent}
              disabled={loadingResources}
            >
              <option value="">-- Custom / Other Event --</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.title}>
                  {ev.title} {ev.date ? `(${ev.date})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="eventNameInput">
              Event Name <span className="req">*</span>
            </label>
            <input
              id="eventNameInput"
              type="text"
              className="admin-input"
              placeholder="e.g. Techbloom 2026"
              value={templateConfig.eventName || ""}
              onChange={(e) => onUpdateConfig({ eventName: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="eventDateInput">
              Event Date
            </label>
            <input
              id="eventDateInput"
              type="text"
              className="admin-input"
              placeholder="e.g. September 15, 2026"
              value={templateConfig.eventDate || ""}
              onChange={(e) => onUpdateConfig({ eventDate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="certTypeSelect">
              Certificate Category / Type <span className="req">*</span>
            </label>
            <select
              id="certTypeSelect"
              className="admin-input"
              value={templateConfig.certificateType || "Participation"}
              onChange={(e) =>
                onUpdateConfig({ certificateType: e.target.value })
              }
            >
              {CERTIFICATE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Column: Upload Box & Preview */}
        <div className="uploader-upload-col">
          {!templateConfig.templateUrl ? (
            <div
              className={`template-dropzone ${dragActive ? "active" : ""}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <span className="template-dropzone-icon">
                {processingFile ? "⏳" : "🖼️"}
              </span>
              <div className="template-dropzone-title">
                {processingFile
                  ? "Processing & rendering template..."
                  : "Click to upload certificate template"}
              </div>
              <div className="template-dropzone-desc">
                or drag and drop your PNG, JPG, or PDF file here
              </div>
              <span className="template-dropzone-hint">
                Supported: PNG, JPG, JPEG, and PDF (Single page)
              </span>
            </div>
          ) : (
            <div className="template-preview-box">
              <div className="template-preview-img-wrap">
                <img
                  src={templateConfig.templateUrl}
                  alt="Template Preview"
                  className="template-preview-img"
                />
              </div>

              <div className="template-meta-pills">
                <span className="meta-pill">
                  📐 {templateConfig.dimensions?.width} ×{" "}
                  {templateConfig.dimensions?.height} px
                </span>
                <span className="meta-pill">
                  🏷️ {templateConfig.certificateType || "Participation"}
                </span>
                {templateConfig.templateFile && (
                  <span className="meta-pill">
                    📦 {(templateConfig.templateFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                )}
              </div>

              <button
                type="button"
                className="admin-btn admin-btn--outline"
                style={{ alignSelf: "flex-end" }}
                onClick={() => {
                  onUpdateConfig({
                    templateFile: null,
                    templateUrl: "",
                    savedTemplateId: "",
                  });
                }}
              >
                🔄 Replace Template Image
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="wizard-footer">
        <span style={{ fontSize: "0.86rem", color: "#64748b" }}>
          Step 1 of 5: Template & Event Setup
        </span>

        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={!canProceed}
          onClick={onNext}
        >
          Next: Set Text Fields →
        </button>
      </div>
    </div>
  );
}
