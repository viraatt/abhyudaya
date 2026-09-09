import { useEffect, useMemo, useRef, useState } from "react";
import FieldEditor from "./FieldEditor";
import { saveCertificateTemplate } from "../../../Firebase/certificateTemplateService";
import { uploadCertificateTemplate } from "../../../Firebase/certificateStorageService";

export default function TemplateEditor({
  templateConfig,
  onUpdateConfig,
  onNext,
  onBack,
}) {
  const containerRef = useRef(null);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 450 });
  const [selectedFieldId, setSelectedFieldId] = useState(
    templateConfig.fields?.[0]?.id || null
  );
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ msg: "", type: "" });

  // Drag & Resize tracking state
  // mode: null | 'move' | 'resize'
  // handle: null | 'se' | 'e' | 's' | 'sw' | 'nw' | 'ne' | 'n' | 'w'
  const [interaction, setInteraction] = useState({
    mode: null,
    fieldId: null,
    handle: null,
    startX: 0,
    startY: 0,
    origField: null,
  });

  const fields = useMemo(
    () => templateConfig.fields || [],
    [templateConfig.fields]
  );

  const origWidth = templateConfig.dimensions?.width || templateConfig.width || 1920;
  const origHeight = templateConfig.dimensions?.height || templateConfig.height || 1080;

  // Responsive scale factor (display screen pixels per original template pixel)
  const scale = viewportSize.width > 0 && origWidth > 0 ? viewportSize.width / origWidth : 1;

  // Track container dimensions on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          const computedHeight = (origHeight / origWidth) * rect.width;
          setViewportSize({ width: rect.width, height: computedHeight });
        }
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [origWidth, origHeight]);

  // Currently selected field
  const activeFieldId = selectedFieldId || fields[0]?.id || null;

  // Field manipulation helpers
  const handleUpdateField = (fieldId, updates) => {
    const updated = fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f));
    onUpdateConfig({ fields: updated });
  };

  const handleAddField = (newField) => {
    const updated = [...fields, newField];
    onUpdateConfig({ fields: updated });
    setSelectedFieldId(newField.id);
  };

  const handleDuplicateField = (fieldId) => {
    const target = fields.find((f) => f.id === fieldId);
    if (!target) return;

    const newField = {
      ...target,
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label: `${target.label || target.name} (Copy)`,
      name: `${target.label || target.name} (Copy)`,
      x: Math.min(origWidth - target.width, target.x + 40),
      y: Math.min(origHeight - target.height, target.y + 40),
    };

    onUpdateConfig({ fields: [...fields, newField] });
    setSelectedFieldId(newField.id);
  };

  const handleRemoveField = (fieldId) => {
    const remaining = fields.filter((f) => f.id !== fieldId);
    onUpdateConfig({ fields: remaining });
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(remaining[0]?.id || null);
    }
  };

  // Mouse interaction handlers (drag move and resize)
  const handleMouseDown = (e, field, handle = null) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedFieldId(field.id);

    setInteraction({
      mode: handle ? "resize" : "move",
      fieldId: field.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origField: { ...field },
    });
  };

  const handleMouseMove = (e) => {
    if (!interaction.mode || !interaction.origField) return;

    const deltaScreenX = e.clientX - interaction.startX;
    const deltaScreenY = e.clientY - interaction.startY;

    // Convert screen deltas to original template pixels
    const deltaOrigX = Math.round(deltaScreenX / scale);
    const deltaOrigY = Math.round(deltaScreenY / scale);

    const { origField, handle } = interaction;

    if (interaction.mode === "move") {
      const newX = Math.max(0, Math.min(origWidth - origField.width, origField.x + deltaOrigX));
      const newY = Math.max(0, Math.min(origHeight - origField.height, origField.y + deltaOrigY));

      handleUpdateField(origField.id, { x: newX, y: newY });
    } else if (interaction.mode === "resize") {
      let newX = origField.x;
      let newY = origField.y;
      let newWidth = origField.width;
      let newHeight = origField.height;

      if (handle.includes("e")) {
        newWidth = Math.max(40, origField.width + deltaOrigX);
      }
      if (handle.includes("s")) {
        newHeight = Math.max(20, origField.height + deltaOrigY);
      }
      if (handle.includes("w")) {
        const potentialWidth = origField.width - deltaOrigX;
        if (potentialWidth >= 40) {
          newWidth = potentialWidth;
          newX = origField.x + deltaOrigX;
        }
      }
      if (handle.includes("n")) {
        const potentialHeight = origField.height - deltaOrigY;
        if (potentialHeight >= 20) {
          newHeight = potentialHeight;
          newY = origField.y + deltaOrigY;
        }
      }

      handleUpdateField(origField.id, {
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      });
    }
  };

  const handleMouseUp = () => {
    if (interaction.mode) {
      setInteraction({ mode: null, fieldId: null, handle: null, startX: 0, startY: 0, origField: null });
    }
  };

  // Save operation to Firebase (published or draft)
  const handleSave = async (status = "published") => {
    setSavingTemplate(true);
    setSaveStatus({ msg: "", type: "" });

    try {
      let finalUrl = templateConfig.fileUrl || templateConfig.templateUrl;
      let storagePath = templateConfig.storagePath || "";

      // Upload template file to Firebase Storage if not already uploaded
      if (templateConfig.templateFile) {
        const uploadRes = await uploadCertificateTemplate(
          templateConfig.templateFile,
          templateConfig.templateId || templateConfig.savedTemplateId || `tpl_${Date.now()}`
        );
        finalUrl = uploadRes.downloadUrl;
        storagePath = uploadRes.storagePath;
      }

      const savedId = await saveCertificateTemplate({
        id: templateConfig.templateId || templateConfig.savedTemplateId || undefined,
        templateId: templateConfig.templateId || templateConfig.savedTemplateId || undefined,
        name: templateConfig.name || templateConfig.templateName,
        eventName: templateConfig.eventName,
        eventDate: templateConfig.eventDate,
        certificateType: templateConfig.certificateType,
        fileUrl: finalUrl,
        templateUrl: finalUrl,
        storagePath,
        width: origWidth,
        height: origHeight,
        dimensions: { width: origWidth, height: origHeight },
        fields,
        status, // 'published' | 'draft'
      });

      onUpdateConfig({
        templateId: savedId,
        savedTemplateId: savedId,
        fileUrl: finalUrl,
        templateUrl: finalUrl,
        storagePath,
        status,
      });

      const label = status === "draft" ? "Draft saved successfully!" : "Template saved & published!";
      setSaveStatus({ msg: `✅ ${label}`, type: "success" });
      setTimeout(() => setSaveStatus({ msg: "", type: "" }), 4000);
      return savedId;
    } catch (err) {
      console.error("Save template error:", err);
      setSaveStatus({ msg: `Failed to save template: ${err.message}`, type: "error" });
      return null;
    } finally {
      setSavingTemplate(false);
    }
  };

  // Save and continue to Step 3 Data Mapping
  const handleContinue = async () => {
    const saved = await handleSave("published");
    if (saved) {
      onNext();
    }
  };

  return (
    <div
      className="template-editor-step"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="wizard-step-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3>Step 2: Certificate Template Editor</h3>
            <p>
              Drag to move text boxes, drag resize handles to set boundaries. Coordinates are
              saved relative to original template dimensions (<strong>{origWidth} × {origHeight} px</strong>).
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <span className="editor-scale-pill">
              Display Scale: {Math.round(scale * 100)}%
            </span>

            <button
              type="button"
              className="admin-btn admin-btn--outline"
              style={{ fontSize: "0.82rem" }}
              onClick={() => handleSave("draft")}
              disabled={savingTemplate}
            >
              💾 Save as Draft
            </button>

            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              style={{ fontSize: "0.82rem" }}
              onClick={() => handleSave("published")}
              disabled={savingTemplate}
            >
              {savingTemplate ? "Saving..." : "✓ Save Template"}
            </button>
          </div>
        </div>
      </div>

      {saveStatus.msg && (
        <div
          className={`cert-alert cert-alert--${saveStatus.type === "success" ? "success" : "error"}`}
          style={{ marginBottom: "1.25rem" }}
        >
          <p>{saveStatus.msg}</p>
        </div>
      )}

      <div className="field-editor-layout">
        {/* Left Column: Visual Canvas with Draggable/Resizable Text Boxes */}
        <div className="canvas-wrapper">
          <div className="canvas-toolbar">
            <span>🖱️ Click a box to select. Drag to move, grab corner handles to resize.</span>
            <span>Target: {origWidth} × {origHeight} px</span>
          </div>

          <div
            ref={containerRef}
            className="canvas-inner-viewport"
            style={{
              height: viewportSize.height > 0 ? viewportSize.height : "auto",
              cursor: interaction.mode === "move" ? "grabbing" : "default",
            }}
            onClick={() => setSelectedFieldId(null)}
          >
            {/* Background Template Image */}
            <img
              src={templateConfig.fileUrl || templateConfig.templateUrl}
              alt="Certificate Background"
              className="editor-canvas-element"
              style={{ width: "100%", height: "100%", display: "block" }}
            />

            {/* Draggable & Resizable Field Boxes Overlay */}
            {fields.map((field) => {
              const isSelected = field.id === activeFieldId;

              // Scale original template coordinates to current viewport size
              const boxLeft = Math.round(field.x * scale);
              const boxTop = Math.round(field.y * scale);
              const boxWidth = Math.round(field.width * scale);
              const boxHeight = Math.round(field.height * scale);
              const boxFontSize = Math.round((field.fontSize || 32) * scale);

              return (
                <div
                  key={field.id}
                  className={`cert-field-box ${isSelected ? "active" : ""}`}
                  style={{
                    left: `${boxLeft}px`,
                    top: `${boxTop}px`,
                    width: `${boxWidth}px`,
                    height: `${boxHeight}px`,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, field, null)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Field Variable Tag Badge */}
                  {isSelected && (
                    <div className="cert-field-tag">
                      {field.variable || `{{${field.key || field.name}}}`}
                    </div>
                  )}

                  {/* Rendered Text Content */}
                  <div
                    className="cert-field-content"
                    style={{
                      fontFamily: field.fontFamily || "Inter, sans-serif",
                      fontSize: `${Math.max(10, boxFontSize)}px`,
                      fontWeight: field.fontWeight || "normal",
                      color: field.color || "#0f172a",
                      justifyContent:
                        field.alignment === "left"
                          ? "flex-start"
                          : field.alignment === "right"
                          ? "flex-end"
                          : "center",
                      textAlign: field.alignment || "center",
                      letterSpacing: `${(field.letterSpacing || 0) * scale}px`,
                      lineHeight: field.lineHeight || 1.2,
                    }}
                  >
                    {field.variable || `{{${field.key || field.label || "field"}}}`}
                  </div>

                  {/* 8-Point Resize Handles (only shown when selected) */}
                  {isSelected && (
                    <>
                      <div
                        className="resize-handle nw"
                        onMouseDown={(e) => handleMouseDown(e, field, "nw")}
                      />
                      <div
                        className="resize-handle n"
                        onMouseDown={(e) => handleMouseDown(e, field, "n")}
                      />
                      <div
                        className="resize-handle ne"
                        onMouseDown={(e) => handleMouseDown(e, field, "ne")}
                      />
                      <div
                        className="resize-handle e"
                        onMouseDown={(e) => handleMouseDown(e, field, "e")}
                      />
                      <div
                        className="resize-handle se"
                        onMouseDown={(e) => handleMouseDown(e, field, "se")}
                      />
                      <div
                        className="resize-handle s"
                        onMouseDown={(e) => handleMouseDown(e, field, "s")}
                      />
                      <div
                        className="resize-handle sw"
                        onMouseDown={(e) => handleMouseDown(e, field, "sw")}
                      />
                      <div
                        className="resize-handle w"
                        onMouseDown={(e) => handleMouseDown(e, field, "w")}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Field Controls & Inspector */}
        <FieldEditor
          fields={fields}
          selectedFieldId={selectedFieldId}
          onSelectField={setSelectedFieldId}
          onUpdateField={handleUpdateField}
          onAddField={handleAddField}
          onDuplicateField={handleDuplicateField}
          onRemoveField={handleRemoveField}
          templateWidth={origWidth}
          templateHeight={origHeight}
        />
      </div>

      <div className="wizard-footer">
        <button
          type="button"
          className="admin-btn admin-btn--outline"
          onClick={onBack}
        >
          ← Back to Upload
        </button>

        <button
          type="button"
          className="admin-btn admin-btn--primary"
          onClick={handleContinue}
          disabled={savingTemplate}
        >
          {savingTemplate ? "Saving..." : "Continue to Data Upload →"}
        </button>
      </div>
    </div>
  );
}
