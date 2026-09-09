import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FieldEditor from "./FieldEditor";
import { renderCertificateToCanvas, loadImage } from "../../../utils/certificateRenderer";
import { saveCertificateTemplate } from "../../../Firebase/certificateTemplateService";
import { uploadCertificateTemplate } from "../../../Firebase/certificateStorageService";

export default function TemplateEditor({
  templateConfig,
  onUpdateConfig,
  onNext,
  onBack,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [templateImg, setTemplateImg] = useState(null);
  const [selectedFieldId, setSelectedFieldId] = useState(
    templateConfig.fields?.[0]?.id || "field_name"
  );
  const [draggingFieldId, setDraggingFieldId] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  const fields = useMemo(
    () => templateConfig.fields || [],
    [templateConfig.fields]
  );

  // Load template image into memory
  useEffect(() => {
    let isMounted = true;
    if (templateConfig.templateUrl) {
      loadImage(templateConfig.templateUrl)
        .then((img) => {
          if (isMounted) setTemplateImg(img);
        })
        .catch((err) => console.error("Error loading template image:", err));
    }
    return () => {
      isMounted = false;
    };
  }, [templateConfig.templateUrl]);

  // Re-render canvas whenever fields or template image changes
  const redraw = useCallback(() => {
    if (!canvasRef.current || !templateImg) return;
    renderCertificateToCanvas(
      canvasRef.current,
      templateImg,
      fields,
      {
        eventName: templateConfig.eventName,
        eventDate: templateConfig.eventDate,
      },
      {
        width: templateConfig.dimensions?.width || 1920,
        height: templateConfig.dimensions?.height || 1080,
      }
    );
  }, [templateImg, fields, templateConfig.eventName, templateConfig.eventDate, templateConfig.dimensions]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Update a specific field's properties
  const handleUpdateField = (fieldId, updates) => {
    const updated = fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f));
    onUpdateConfig({ fields: updated });
  };

  // Add a new custom field
  const handleAddField = () => {
    const newId = `field_custom_${Date.now()}`;
    const newField = {
      id: newId,
      name: `Custom Text ${fields.length + 1}`,
      key: `custom_${fields.length + 1}`,
      sampleText: "Sample Text",
      x: 50,
      y: 70,
      fontSize: 22,
      fontFamily: "Inter, sans-serif",
      fontWeight: "normal",
      color: "#0f172a",
      textAlign: "center",
      isRequired: false,
    };
    onUpdateConfig({ fields: [...fields, newField] });
    setSelectedFieldId(newId);
  };

  // Remove a custom field
  const handleRemoveField = (fieldId) => {
    const remaining = fields.filter((f) => f.id !== fieldId);
    onUpdateConfig({ fields: remaining });
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(remaining[0]?.id || null);
    }
  };

  // Canvas click to reposition selected field
  const handleCanvasClick = (e) => {
    if (draggingFieldId || !containerRef.current || !selectedFieldId) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const percentX = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const percentY = Math.max(0, Math.min(100, (clickY / rect.height) * 100));

    handleUpdateField(selectedFieldId, {
      x: parseFloat(percentX.toFixed(1)),
      y: parseFloat(percentY.toFixed(1)),
    });
  };

  // Mouse drag handling for marker overlay
  const handleMarkerMouseDown = (e, fieldId) => {
    e.stopPropagation();
    setSelectedFieldId(fieldId);
    setDraggingFieldId(fieldId);
  };

  const handleMouseMove = (e) => {
    if (!draggingFieldId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const percentX = Math.max(0, Math.min(100, (mouseX / rect.width) * 100));
    const percentY = Math.max(0, Math.min(100, (mouseY / rect.height) * 100));

    handleUpdateField(draggingFieldId, {
      x: parseFloat(percentX.toFixed(1)),
      y: parseFloat(percentY.toFixed(1)),
    });
  };

  const handleMouseUp = () => {
    if (draggingFieldId) {
      setDraggingFieldId(null);
    }
  };

  // Save template configuration to Firestore and upload template file to Storage
  const handleSaveToTemplates = async () => {
    setSavingTemplate(true);
    setSaveSuccessMsg("");

    try {
      let finalUrl = templateConfig.templateUrl;
      let storagePath = templateConfig.storagePath || "";

      // If there is a local file that hasn't been uploaded to Firebase Storage yet
      if (templateConfig.templateFile) {
        const uploadResult = await uploadCertificateTemplate(
          templateConfig.templateFile,
          templateConfig.savedTemplateId || `tpl_${Date.now()}`
        );
        finalUrl = uploadResult.downloadUrl;
        storagePath = uploadResult.storagePath;
      }

      const savedId = await saveCertificateTemplate({
        id: templateConfig.savedTemplateId || undefined,
        name: templateConfig.templateName,
        eventName: templateConfig.eventName,
        eventDate: templateConfig.eventDate,
        certificateType: templateConfig.certificateType,
        templateUrl: finalUrl,
        storagePath,
        dimensions: templateConfig.dimensions,
        fields,
      });

      onUpdateConfig({
        savedTemplateId: savedId,
        templateUrl: finalUrl,
        storagePath,
      });

      setSaveSuccessMsg("✅ Template configuration saved to Firestore!");
      setTimeout(() => setSaveSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Failed to save template:", err);
      alert(`Failed to save template: ${err.message}`);
    } finally {
      setSavingTemplate(false);
    }
  };

  return (
    <div
      className="template-editor-step"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="wizard-step-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3>Step 2: Position Text Fields</h3>
            <p>
              Click on the canvas or drag field pins to place text. Customize
              fonts, sizes, colors, and alignments in the panel.
            </p>
          </div>

          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            style={{ fontSize: "0.82rem" }}
            onClick={handleSaveToTemplates}
            disabled={savingTemplate}
          >
            {savingTemplate ? "Saving..." : "💾 Save as Reusable Template"}
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="cert-alert cert-alert--success" style={{ marginBottom: "1.25rem" }}>
          <p>{saveSuccessMsg}</p>
        </div>
      )}

      <div className="field-editor-layout">
        {/* Left Column: Visual Canvas with Overlay Markers */}
        <div className="canvas-wrapper">
          <div className="canvas-toolbar">
            <span>🖱️ Click canvas to place selected field or drag pins directly</span>
            <span>Dimensions: {templateConfig.dimensions?.width} × {templateConfig.dimensions?.height}</span>
          </div>

          <div
            ref={containerRef}
            className="canvas-inner-viewport"
            onClick={handleCanvasClick}
          >
            <canvas ref={canvasRef} className="editor-canvas-element" />

            {/* Field Drag Pins Overlay */}
            {fields.map((field) => {
              const isSelected = field.id === selectedFieldId;
              return (
                <div
                  key={field.id}
                  className={`field-marker-overlay ${isSelected ? "selected" : ""}`}
                  style={{
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                  }}
                  onMouseDown={(e) => handleMarkerMouseDown(e, field.id)}
                >
                  <div className="field-marker-badge">
                    <span>{isSelected ? "📍" : "•"}</span>
                    <span>{field.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Field Property Controls */}
        <FieldEditor
          fields={fields}
          selectedFieldId={selectedFieldId}
          onSelectField={setSelectedFieldId}
          onUpdateField={handleUpdateField}
          onAddField={handleAddField}
          onRemoveField={handleRemoveField}
        />
      </div>

      <div className="wizard-footer">
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
          onClick={onNext}
        >
          Next: Upload & Map Data →
        </button>
      </div>
    </div>
  );
}
