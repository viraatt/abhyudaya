import { useState } from "react";
import { AVAILABLE_FONTS } from "../../../utils/certificateRenderer";

const QUICK_VARIABLES = [
  { variable: "{{name}}", label: "Participant Name", defaultWidth: 800, defaultHeight: 90, fontSize: 56, fontWeight: "700" },
  { variable: "{{event}}", label: "Event Name", defaultWidth: 700, defaultHeight: 70, fontSize: 36, fontWeight: "600" },
  { variable: "{{date}}", label: "Event Date", defaultWidth: 400, defaultHeight: 50, fontSize: 24, fontWeight: "400" },
  { variable: "{{position}}", label: "Position / Award", defaultWidth: 500, defaultHeight: 60, fontSize: 32, fontWeight: "600" },
  { variable: "{{rollNo}}", label: "Roll Number", defaultWidth: 400, defaultHeight: 50, fontSize: 24, fontWeight: "500" },
  { variable: "{{certificateId}}", label: "Certificate ID", defaultWidth: 400, defaultHeight: 45, fontSize: 20, fontFamily: "'Courier New', monospace", fontWeight: "600" },
];

let counter = 0;
function makeFieldId(prefix = "field") {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

export default function FieldEditor({
  fields = [],
  selectedFieldId,
  onSelectField,
  onUpdateField,
  onAddField,
  onDuplicateField,
  onRemoveField,
  templateWidth = 1920,
  templateHeight = 1080,
}) {
  const [customVarName, setCustomVarName] = useState("");
  const [customLabel, setCustomLabel] = useState("");

  const activeField = fields.find((f) => f.id === selectedFieldId) || fields[0] || null;

  const handlePropertyChange = (prop, value) => {
    if (!activeField) return;
    onUpdateField(activeField.id, { [prop]: value });
  };

  const handleQuickAdd = (preset) => {
    // Position near center
    const x = Math.round((templateWidth - preset.defaultWidth) / 2);
    const y = Math.round(templateHeight * 0.45 + (fields.length % 5) * 60);

    const newField = {
      id: makeFieldId("field"),
      label: preset.label,
      name: preset.label,
      variable: preset.variable,
      key: preset.variable.replace(/[{}]/g, ""),
      x: Math.max(20, x),
      y: Math.max(20, y),
      width: preset.defaultWidth,
      height: preset.defaultHeight,
      fontFamily: preset.fontFamily || "Inter, sans-serif",
      fontSize: preset.fontSize || 32,
      fontWeight: preset.fontWeight || "600",
      color: "#0f172a",
      alignment: "center",
      letterSpacing: 0,
      lineHeight: 1.2,
      isRequired: true,
    };

    onAddField(newField);
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    const cleanVar = customVarName.trim().replace(/[{}]/g, "");
    if (!cleanVar) return;

    const formattedVar = `{{${cleanVar}}}`;
    const label = customLabel.trim() || cleanVar.charAt(0).toUpperCase() + cleanVar.slice(1);

    const x = Math.round((templateWidth - 500) / 2);
    const y = Math.round(templateHeight * 0.5 + (fields.length % 5) * 60);

    const newField = {
      id: makeFieldId("field"),
      label,
      name: label,
      variable: formattedVar,
      key: cleanVar,
      x: Math.max(20, x),
      y: Math.max(20, y),
      width: 500,
      height: 60,
      fontFamily: "Inter, sans-serif",
      fontSize: 28,
      fontWeight: "500",
      color: "#0f172a",
      alignment: "center",
      letterSpacing: 0,
      lineHeight: 1.2,
      isRequired: false,
    };

    onAddField(newField);
    setCustomVarName("");
    setCustomLabel("");
  };

  return (
    <div className="field-controls-panel">
      {/* Quick Add Section */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem" }}>
        <span className="quick-add-label">⚡ Quick-Add Preset Variables</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
          {QUICK_VARIABLES.map((preset) => (
            <button
              key={preset.variable}
              type="button"
              className="quick-add-btn"
              onClick={() => handleQuickAdd(preset)}
              title={`Add ${preset.label} field`}
            >
              <span>+</span>
              <code>{preset.variable}</code>
            </button>
          ))}
        </div>

        {/* Custom Variable Creator */}
        <form onSubmit={handleAddCustom} style={{ marginTop: "0.85rem", paddingTop: "0.75rem", borderTop: "1px dashed #cbd5e1" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
            Add Custom Variable
          </span>
          <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
            <input
              type="text"
              className="admin-input"
              style={{ fontSize: "0.82rem", padding: "0.35rem 0.6rem" }}
              placeholder="e.g. college"
              value={customVarName}
              onChange={(e) => setCustomVarName(e.target.value)}
            />
            <input
              type="text"
              className="admin-input"
              style={{ fontSize: "0.82rem", padding: "0.35rem 0.6rem" }}
              placeholder="Label (e.g. College Name)"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
            />
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              style={{ padding: "0.35rem 0.75rem", fontSize: "0.82rem", whiteSpace: "nowrap" }}
              disabled={!customVarName.trim()}
            >
              + Add
            </button>
          </div>
        </form>
      </div>

      {/* Fields List */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <label className="form-label" style={{ margin: 0 }}>
            Active Fields ({fields.length})
          </label>

          <button
            type="button"
            className="admin-btn admin-btn--outline"
            style={{ padding: "0.25rem 0.6rem", fontSize: "0.78rem" }}
            onClick={() =>
              handleQuickAdd({
                variable: `{{custom_${fields.length + 1}}}`,
                label: `Text Field ${fields.length + 1}`,
                defaultWidth: 500,
                defaultHeight: 60,
                fontSize: 28,
              })
            }
          >
            + Add Blank Field
          </button>
        </div>

        <div className="fields-list-box">
          {fields.length === 0 ? (
            <div style={{ padding: "1rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
              No fields added yet. Click a quick-add preset above.
            </div>
          ) : (
            fields.map((f) => {
              const isSelected = activeField?.id === f.id;
              return (
                <div
                  key={f.id}
                  className={`field-list-item ${isSelected ? "selected" : ""}`}
                  onClick={() => onSelectField(f.id)}
                >
                  <div style={{ overflow: "hidden" }}>
                    <div className="field-list-item-title">
                      {f.label || f.name}{" "}
                      <code style={{ fontSize: "0.75rem", color: "#2563eb", background: "#eff6ff", padding: "1px 4px", borderRadius: 3 }}>
                        {f.variable || `{{${f.key}}}`}
                      </code>
                    </div>
                    <div className="field-list-item-coords">
                      X: {f.x}px | Y: {f.y}px | W: {f.width}px × H: {f.height}px
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.3rem" }}>
                    <button
                      type="button"
                      style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "0.85rem" }}
                      title="Duplicate Field"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateField(f.id);
                      }}
                    >
                      📋
                    </button>
                    <button
                      type="button"
                      style={{ border: "none", background: "transparent", cursor: "pointer", color: "#ef4444", fontSize: "0.85rem" }}
                      title="Delete Field"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveField(f.id);
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Field Property Inspector */}
      {activeField && (
        <div className="field-inspector-card">
          <div className="inspector-header">
            <div>
              <span className="inspector-title">✏️ Format Field: {activeField.label || activeField.name}</span>
              <div style={{ fontSize: "0.78rem", color: "#2563eb", fontFamily: "monospace", marginTop: "0.15rem" }}>
                {activeField.variable || `{{${activeField.key}}}`}
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button
                type="button"
                className="admin-btn admin-btn--outline"
                style={{ padding: "0.2rem 0.5rem", fontSize: "0.74rem" }}
                onClick={() => onDuplicateField(activeField.id)}
                title="Duplicate Field"
              >
                Duplicate
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--outline"
                style={{ padding: "0.2rem 0.5rem", fontSize: "0.74rem", color: "#dc2626", borderColor: "#fca5a5" }}
                onClick={() => onRemoveField(activeField.id)}
                title="Delete Field"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="inspector-grid-2">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.76rem" }}>
                Field Label
              </label>
              <input
                type="text"
                className="admin-input"
                value={activeField.label || activeField.name || ""}
                onChange={(e) => handlePropertyChange("label", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.76rem" }}>
                Variable Tag
              </label>
              <input
                type="text"
                className="admin-input"
                style={{ fontFamily: "monospace", color: "#2563eb" }}
                value={activeField.variable || `{{${activeField.key}}}`}
                onChange={(e) => {
                  const val = e.target.value;
                  handlePropertyChange("variable", val);
                  handlePropertyChange("key", val.replace(/[{}]/g, ""));
                }}
              />
            </div>
          </div>

          {/* Coordinate Inputs in Original Resolution Pixels */}
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "0.65rem 0.85rem" }}>
            <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#1e40af", display: "block", marginBottom: "0.4rem" }}>
              📐 Original Template Coordinates ({templateWidth} × {templateHeight} px)
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.4rem" }}>
              <div>
                <label style={{ fontSize: "0.7rem", color: "#475569", fontWeight: 600 }}>X (px)</label>
                <input
                  type="number"
                  className="admin-input"
                  style={{ padding: "0.3rem 0.4rem", fontSize: "0.8rem" }}
                  value={activeField.x}
                  onChange={(e) => handlePropertyChange("x", Number(e.target.value))}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "#475569", fontWeight: 600 }}>Y (px)</label>
                <input
                  type="number"
                  className="admin-input"
                  style={{ padding: "0.3rem 0.4rem", fontSize: "0.8rem" }}
                  value={activeField.y}
                  onChange={(e) => handlePropertyChange("y", Number(e.target.value))}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "#475569", fontWeight: 600 }}>Width (px)</label>
                <input
                  type="number"
                  className="admin-input"
                  style={{ padding: "0.3rem 0.4rem", fontSize: "0.8rem" }}
                  value={activeField.width}
                  onChange={(e) => handlePropertyChange("width", Math.max(20, Number(e.target.value)))}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "#475569", fontWeight: 600 }}>Height (px)</label>
                <input
                  type="number"
                  className="admin-input"
                  style={{ padding: "0.3rem 0.4rem", fontSize: "0.8rem" }}
                  value={activeField.height}
                  onChange={(e) => handlePropertyChange("height", Math.max(15, Number(e.target.value)))}
                />
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="inspector-grid-2">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.76rem" }}>
                Font Family
              </label>
              <select
                className="admin-input"
                style={{ fontSize: "0.82rem" }}
                value={activeField.fontFamily || "Inter, sans-serif"}
                onChange={(e) => handlePropertyChange("fontFamily", e.target.value)}
              >
                {AVAILABLE_FONTS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.76rem" }}>
                Font Size ({activeField.fontSize}px)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="range"
                  min="12"
                  max="160"
                  value={activeField.fontSize || 32}
                  style={{ flex: 1 }}
                  onChange={(e) => handlePropertyChange("fontSize", Number(e.target.value))}
                />
                <input
                  type="number"
                  className="admin-input"
                  style={{ width: 60, padding: "0.2rem 0.4rem", fontSize: "0.8rem" }}
                  value={activeField.fontSize || 32}
                  onChange={(e) => handlePropertyChange("fontSize", Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="inspector-grid-2">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.76rem" }}>
                Font Weight
              </label>
              <select
                className="admin-input"
                value={activeField.fontWeight || "normal"}
                onChange={(e) => handlePropertyChange("fontWeight", e.target.value)}
              >
                <option value="400">Regular (400)</option>
                <option value="500">Medium (500)</option>
                <option value="600">Semi-Bold (600)</option>
                <option value="700">Bold (700)</option>
                <option value="800">Extra Bold (800)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.76rem" }}>
                Text Color
              </label>
              <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <input
                  type="color"
                  value={activeField.color || "#0f172a"}
                  style={{ width: 34, height: 34, border: "none", borderRadius: 6, cursor: "pointer" }}
                  onChange={(e) => handlePropertyChange("color", e.target.value)}
                />
                <input
                  type="text"
                  className="admin-input"
                  style={{ flex: 1, fontFamily: "monospace", fontSize: "0.82rem" }}
                  value={activeField.color || "#0f172a"}
                  onChange={(e) => handlePropertyChange("color", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Alignment */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: "0.76rem" }}>
              Text Alignment
            </label>
            <div className="align-btn-group">
              {["left", "center", "right"].map((align) => (
                <button
                  key={align}
                  type="button"
                  className={`align-btn ${
                    (activeField.alignment || activeField.textAlign || "center") === align ? "active" : ""
                  }`}
                  onClick={() => {
                    handlePropertyChange("alignment", align);
                    handlePropertyChange("textAlign", align);
                  }}
                >
                  {align.charAt(0).toUpperCase() + align.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Letter Spacing & Line Height */}
          <div className="inspector-grid-2">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.76rem" }}>
                Letter Spacing ({activeField.letterSpacing || 0}px)
              </label>
              <input
                type="number"
                step="0.5"
                className="admin-input"
                value={activeField.letterSpacing || 0}
                onChange={(e) => handlePropertyChange("letterSpacing", parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.76rem" }}>
                Line Height ({activeField.lineHeight || 1.2})
              </label>
              <input
                type="number"
                step="0.1"
                min="0.8"
                max="3.0"
                className="admin-input"
                value={activeField.lineHeight || 1.2}
                onChange={(e) => handlePropertyChange("lineHeight", parseFloat(e.target.value) || 1.2)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
