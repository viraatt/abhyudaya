import { AVAILABLE_FONTS } from "../../../utils/certificateRenderer";

export default function FieldEditor({
  fields = [],
  selectedFieldId,
  onSelectField,
  onUpdateField,
  onAddField,
  onRemoveField,
}) {
  const activeField = fields.find((f) => f.id === selectedFieldId) || fields[0];

  const handlePropertyChange = (prop, value) => {
    if (!activeField) return;
    onUpdateField(activeField.id, { [prop]: value });
  };

  return (
    <div className="field-controls-panel">
      {/* Field selector list */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <label className="form-label">Template Fields ({fields.length})</label>
          <button
            type="button"
            className="admin-btn admin-btn--outline"
            style={{ padding: "0.25rem 0.6rem", fontSize: "0.78rem" }}
            onClick={onAddField}
          >
            + Add Field
          </button>
        </div>

        <div className="fields-list-box">
          {fields.map((f) => {
            const isSelected = activeField?.id === f.id;
            return (
              <div
                key={f.id}
                className={`field-list-item ${isSelected ? "selected" : ""}`}
                onClick={() => onSelectField(f.id)}
              >
                <div>
                  <div className="field-list-item-title">{f.name}</div>
                  <div className="field-list-item-coords">
                    X: {Math.round(f.x)}% | Y: {Math.round(f.y)}% | {f.fontSize}px
                  </div>
                </div>

                {!f.isRequired && (
                  <button
                    type="button"
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "#ef4444",
                      fontSize: "0.85rem",
                    }}
                    title="Delete Field"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveField(f.id);
                    }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Field Property Inspector */}
      {activeField && (
        <div className="field-inspector-card">
          <div className="inspector-header">
            <span className="inspector-title">✏️ Format: {activeField.name}</span>
            <span style={{ fontSize: "0.76rem", color: "#64748b" }}>
              ID: {activeField.key || activeField.id}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: "0.76rem" }}>
              Field Label Name
            </label>
            <input
              type="text"
              className="admin-input"
              value={activeField.name || ""}
              onChange={(e) => handlePropertyChange("name", e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: "0.76rem" }}>
              Sample Preview Text
            </label>
            <input
              type="text"
              className="admin-input"
              value={activeField.sampleText || ""}
              onChange={(e) => handlePropertyChange("sampleText", e.target.value)}
            />
          </div>

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
              <input
                type="range"
                min="12"
                max="96"
                value={activeField.fontSize || 24}
                onChange={(e) =>
                  handlePropertyChange("fontSize", Number(e.target.value))
                }
              />
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
                  style={{
                    width: 36,
                    height: 36,
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
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
                    (activeField.textAlign || "center") === align ? "active" : ""
                  }`}
                  onClick={() => handlePropertyChange("textAlign", align)}
                >
                  {align.charAt(0).toUpperCase() + align.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="inspector-grid-2">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.76rem" }}>
                X Position: {Math.round(activeField.x)}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="0.5"
                value={activeField.x}
                onChange={(e) =>
                  handlePropertyChange("x", parseFloat(e.target.value))
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.76rem" }}>
                Y Position: {Math.round(activeField.y)}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="0.5"
                value={activeField.y}
                onChange={(e) =>
                  handlePropertyChange("y", parseFloat(e.target.value))
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
