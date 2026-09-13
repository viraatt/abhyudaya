import { useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import FieldEditor from "./FieldEditor";

export default function TemplateEditor({
  template,
  fields,
  onFieldsChange,
  onBack,
  onContinue,
  onSaveTemplate,
}) {
  const [selectedFieldId, setSelectedFieldId] = useState(
    fields[0]?.id || null
  );
  const canvasContainerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Active interaction state
  const dragRef = useRef(null);

  // Measure container width dynamically using ResizeObserver for precision
  const updateScale = useCallback(() => {
    if (canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        setContainerWidth(rect.width);
      }
    }
  }, []);

  useEffect(() => {
    updateScale();
    if (!canvasContainerRef.current) return;

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect && entry.contentRect.width > 0) {
            setContainerWidth(entry.contentRect.width);
          }
        }
      });
      resizeObserver.observe(canvasContainerRef.current);
    }

    window.addEventListener("resize", updateScale);
    return () => {
      window.removeEventListener("resize", updateScale);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [updateScale]);

  const originalWidth = Number(template?.originalWidth) || 1920;
  const originalHeight = Number(template?.originalHeight) || 1080;

  // Scale: 1 original pixel = scale screen pixels
  const scale = containerWidth > 0 ? containerWidth / originalWidth : 1;
  const displayHeight = Math.round(originalHeight * scale);

  const activeFieldId = selectedFieldId || fields[0]?.id || null;

  // Field manipulation handlers
  const handleAddField = (newField) => {
    onFieldsChange([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const handleUpdateField = useCallback((fieldId, updates) => {
    onFieldsChange(
      fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
  }, [fields, onFieldsChange]);

  const handleDeleteField = (fieldId) => {
    const remaining = fields.filter((f) => f.id !== fieldId);
    onFieldsChange(remaining);
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(remaining[0]?.id || null);
    }
  };

  // Keyboard navigation / nudging for active field
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!activeFieldId) return;
      // Don't intercept if user is typing in an input/textarea/select
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

      const curField = fields.find((f) => f.id === activeFieldId);
      if (!curField) return;

      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleUpdateField(activeFieldId, { x: Math.max(0, Math.round(curField.x - step)) });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleUpdateField(activeFieldId, {
          x: Math.min(originalWidth - curField.width, Math.round(curField.x + step)),
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        handleUpdateField(activeFieldId, { y: Math.max(0, Math.round(curField.y - step)) });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleUpdateField(activeFieldId, {
          y: Math.min(originalHeight - curField.height, Math.round(curField.y + step)),
        });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (!e.target.closest(".field-editor-sidebar")) {
          e.preventDefault();
          handleDeleteField(activeFieldId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFieldId, fields, handleUpdateField, originalWidth, originalHeight]);

  // Pointer drag / resize handlers (handles Mouse, Pen, and Touch)
  const handlePointerDown = (e, field, mode = "drag") => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedFieldId(field.id);

    dragRef.current = {
      fieldId: field.id,
      mode, // 'drag' | 'resize'
      startX: e.clientX,
      startY: e.clientY,
      initialX: field.x,
      initialY: field.y,
      initialWidth: field.width,
      initialHeight: field.height,
    };

    const handlePointerMove = (moveEvent) => {
      if (!dragRef.current) return;
      const {
        fieldId,
        mode: curMode,
        startX,
        startY,
        initialX,
        initialY,
        initialWidth,
        initialHeight,
      } = dragRef.current;

      const deltaScreenX = moveEvent.clientX - startX;
      const deltaScreenY = moveEvent.clientY - startY;

      // Convert screen deltas back to original template coordinates
      const currentScale = scale || 1;
      const deltaOrigX = deltaScreenX / currentScale;
      const deltaOrigY = deltaScreenY / currentScale;

      if (curMode === "drag") {
        const newX = Math.max(
          0,
          Math.min(originalWidth - initialWidth, Math.round(initialX + deltaOrigX))
        );
        const newY = Math.max(
          0,
          Math.min(originalHeight - initialHeight, Math.round(initialY + deltaOrigY))
        );
        handleUpdateField(fieldId, { x: newX, y: newY });
      } else if (curMode === "resize") {
        const newWidth = Math.max(60, Math.round(initialWidth + deltaOrigX));
        const newHeight = Math.max(25, Math.round(initialHeight + deltaOrigY));
        handleUpdateField(fieldId, { width: newWidth, height: newHeight });
      }
    };

    const handlePointerUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  return (
    <div className="template-editor-wrapper">
      <div className="te-header">
        <div>
          <h3>Step 2: Position Certificate Text Fields</h3>
          <p>
            Drag and resize text boxes directly on the certificate. Use the sidebar
            to adjust fonts, weights, colors, and variables like <code>{"{{name}}"}</code> or <code>{"{{position}}"}</code>.
          </p>
        </div>
        <div className="te-header-actions">
          <span className="te-scale-badge">
            Zoom: {Math.round(scale * 100)}% | Native: {originalWidth} × {originalHeight}px
          </span>
        </div>
      </div>

      <div className="te-body-grid">
        {/* Visual Template Canvas */}
        <div className="te-canvas-col">
          <div
            ref={canvasContainerRef}
            className="te-canvas-stage"
            style={{
              height: `${displayHeight}px`,
              aspectRatio: `${originalWidth} / ${originalHeight}`,
            }}
            onClick={() => setSelectedFieldId(null)}
          >
            {/* Background Template Image */}
            <img
              src={template?.previewUrl}
              alt="Certificate Background"
              className="te-canvas-bg"
              onLoad={updateScale}
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />

            {/* Draggable Dynamic Fields */}
            {fields.map((field) => {
              const isSelected = field.id === activeFieldId;
              const left = field.x * scale;
              const top = field.y * scale;
              const width = field.width * scale;
              const height = field.height * scale;
              const fontSize = Math.max(9, (field.fontSize || 32) * scale);

              return (
                <div
                  key={field.id}
                  className={`te-field-box ${isSelected ? "selected" : ""}`}
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    fontFamily: field.fontFamily || "'Cinzel', serif",
                    fontSize: `${fontSize}px`,
                    fontWeight: field.fontWeight || "600",
                    color: field.color || "#1e293b",
                    textAlign: field.align || "center",
                    touchAction: "none",
                  }}
                  onPointerDown={(e) => handlePointerDown(e, field, "drag")}
                  title={`Click and drag to position ${field.variable} (Use arrow keys to nudge)`}
                >
                  <span className="te-field-tag">{field.variable}</span>
                  {field.isQr || field.variable === "{{qrCode}}" ? (
                    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.85)", border: "1px dashed #6366f1", borderRadius: "4px" }}>
                      <span style={{ fontSize: `${Math.max(12, height * 0.35)}px` }}>📱</span>
                      <span style={{ fontSize: `${Math.max(8, height * 0.16)}px`, fontWeight: "600", color: "#4338ca", textAlign: "center" }}>QR CODE</span>
                    </div>
                  ) : (
                    <div className="te-field-text-content">
                      {field.defaultValue || field.variable}
                    </div>
                  )}

                  {/* Resize Handle */}
                  {isSelected && (
                    <div
                      className="te-resize-handle"
                      onPointerDown={(e) => handlePointerDown(e, field, "resize")}
                      title="Drag to resize box"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Configuration Sidebar */}
        <div className="te-sidebar-col">
          <FieldEditor
            fields={fields}
            selectedFieldId={activeFieldId}
            onSelectField={setSelectedFieldId}
            onAddField={handleAddField}
            onUpdateField={handleUpdateField}
            onDeleteField={handleDeleteField}
            templateWidth={originalWidth}
            templateHeight={originalHeight}
          />
        </div>
      </div>

      {/* Step Actions */}
      <div className="cert-step-footer">
        <button
          type="button"
          className="admin-btn admin-btn--outline"
          onClick={onBack}
        >
          ← Back to Template
        </button>

        {onSaveTemplate && (
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={onSaveTemplate}
            title="Save template layout to Cloud Firestore"
          >
            💾 Save Template
          </button>
        )}

        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={fields.length === 0}
          onClick={onContinue}
        >
          Next: Upload Participant Data ({fields.length} fields) →
        </button>
      </div>
    </div>
  );
}

TemplateEditor.propTypes = {
  template: PropTypes.object.isRequired,
  fields: PropTypes.array.isRequired,
  onFieldsChange: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onContinue: PropTypes.func.isRequired,
  onSaveTemplate: PropTypes.func,
};
