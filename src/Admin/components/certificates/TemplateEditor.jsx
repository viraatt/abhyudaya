import { useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import FieldEditor from "./FieldEditor";

export default function TemplateEditor({
  template,
  fields,
  onFieldsChange,
  onBack,
  onContinue,
}) {
  const [selectedFieldId, setSelectedFieldId] = useState(
    fields[0]?.id || null
  );
  const canvasContainerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Active interaction state
  const dragRef = useRef(null);

  // Measure container width dynamically to compute accurate scale factor
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
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [updateScale]);

  const originalWidth = template?.originalWidth || 1920;
  const originalHeight = template?.originalHeight || 1080;

  // Scale: 1 original pixel = scale screen pixels
  const scale = containerWidth / originalWidth;
  const displayHeight = originalHeight * scale;

  const activeFieldId = selectedFieldId || fields[0]?.id || null;

  // Field manipulation handlers
  const handleAddField = (newField) => {
    onFieldsChange([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const handleUpdateField = (fieldId, updates) => {
    onFieldsChange(
      fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
  };

  const handleDeleteField = (fieldId) => {
    const remaining = fields.filter((f) => f.id !== fieldId);
    onFieldsChange(remaining);
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(remaining[0]?.id || null);
    }
  };

  // Drag / Resize mouse handlers
  const handleMouseDown = (e, field, mode = "drag") => {
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

    const handleMouseMove = (moveEvent) => {
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
      const deltaOrigX = deltaScreenX / scale;
      const deltaOrigY = deltaScreenY / scale;

      if (curMode === "drag") {
        const newX = Math.max(
          0,
          Math.min(originalWidth - initialWidth, initialX + deltaOrigX)
        );
        const newY = Math.max(
          0,
          Math.min(originalHeight - initialHeight, initialY + deltaOrigY)
        );
        handleUpdateField(fieldId, { x: newX, y: newY });
      } else if (curMode === "resize") {
        const newWidth = Math.max(60, initialWidth + deltaOrigX);
        const newHeight = Math.max(25, initialHeight + deltaOrigY);
        handleUpdateField(fieldId, { width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="template-editor-wrapper">
      <div className="te-header">
        <div>
          <h3>Step 2: Position Certificate Text Fields</h3>
          <p>
            Drag and resize text boxes directly on the certificate. Use the right panel
            to adjust fonts, colors, and add variables like <code>{"{{name}}"}</code> or <code>{"{{college}}"}</code>.
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
            style={{ height: `${displayHeight}px` }}
            onClick={() => setSelectedFieldId(null)}
          >
            {/* Background Template Image */}
            <img
              src={template?.previewUrl}
              alt="Certificate Background"
              className="te-canvas-bg"
              onLoad={updateScale}
              draggable={false}
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
                  }}
                  onMouseDown={(e) => handleMouseDown(e, field, "drag")}
                  title={`Click and drag to position ${field.variable}`}
                >
                  <span className="te-field-tag">{field.variable}</span>
                  <div className="te-field-text-content">
                    {field.defaultValue || field.variable}
                  </div>

                  {/* Resize Handle */}
                  {isSelected && (
                    <div
                      className="te-resize-handle"
                      onMouseDown={(e) => handleMouseDown(e, field, "resize")}
                      title="Drag to resize"
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
};
