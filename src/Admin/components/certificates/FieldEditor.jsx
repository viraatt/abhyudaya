import { useState } from "react";
import PropTypes from "prop-types";

const STANDARD_VARIABLES = [
  { variable: "{{name}}", label: "Participant Name", defaultSize: 48, defaultWeight: "700" },
  { variable: "{{event}}", label: "Event Name", defaultSize: 32, defaultWeight: "600" },
  { variable: "{{position}}", label: "Position / Award", defaultSize: 28, defaultWeight: "600" },
  { variable: "{{date}}", label: "Event Date", defaultSize: 24, defaultWeight: "400" },
  { variable: "{{rollNo}}", label: "Roll Number", defaultSize: 22, defaultWeight: "500" },
  { variable: "{{certificateId}}", label: "Certificate ID", defaultSize: 18, defaultWeight: "400" },
  { variable: "{{qrCode}}", label: "Verification QR Code", isQr: true, defaultSize: 130, defaultWeight: "400" },
];

const GOOGLE_FONTS = [
  { name: "Cinzel (Classic/Formal)", value: "'Cinzel', serif" },
  { name: "Playfair Display (Serif)", value: "'Playfair Display', serif" },
  { name: "Montserrat (Clean Sans)", value: "'Montserrat', sans-serif" },
  { name: "Inter (Modern Sans)", value: "'Inter', sans-serif" },
  { name: "Alex Brush (Script/Calligraphy)", value: "'Alex Brush', cursive" },
  { name: "Great Vibes (Flourished Script)", value: "'Great Vibes', cursive" },
  { name: "Cinzel Decorative (Ornate)", value: "'Cinzel Decorative', cursive" },
  { name: "Roboto (Universal)", value: "'Roboto', sans-serif" },
];

let fieldCounter = 0;
function createFieldId(prefix = "field") {
  fieldCounter += 1;
  return `${prefix}_${fieldCounter}`;
}

export default function FieldEditor({
  fields = [],
  selectedFieldId,
  onSelectField,
  onAddField,
  onUpdateField,
  onDeleteField,
  templateWidth = 1920,
  templateHeight = 1080,
}) {
  const [customVarName, setCustomVarName] = useState("");
  const selectedField = fields.find((f) => f.id === selectedFieldId) || fields[0];

  const handleAddPreset = (preset) => {
    const rawVar = preset.variable;

    if (preset.isQr) {
      const qrDim = Math.round(templateHeight * 0.14) || 140;
      const newField = {
        id: createFieldId("qr"),
        label: preset.label,
        variable: "{{qrCode}}",
        isQr: true,
        x: Math.round(templateWidth * 0.82),
        y: Math.round(templateHeight * 0.72),
        width: qrDim,
        height: qrDim,
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        fontWeight: "400",
        color: "#000000",
        align: "center",
        letterSpacing: 0,
        textTransform: "none",
        required: false,
        defaultValue: "[QR Code]",
      };
      onAddField(newField);
      return;
    }

    // Calculate reasonable default centered coordinates
    const defaultW = Math.round(templateWidth * 0.6);
    const defaultH = Math.round(templateHeight * 0.08);
    const defaultX = Math.round((templateWidth - defaultW) / 2);
    const defaultY = Math.round(templateHeight * (0.3 + fields.length * 0.1));

    const newField = {
      id: createFieldId(rawVar.replace(/[^a-zA-Z0-9]/g, "")),
      label: preset.label,
      variable: rawVar,
      isQr: false,
      x: defaultX,
      y: defaultY,
      width: defaultW,
      height: defaultH,
      fontFamily: preset.fontFamily || "'Cinzel', serif",
      fontSize: preset.defaultSize || 36,
      fontWeight: preset.defaultWeight || "600",
      color: "#1e293b",
      align: "center",
      letterSpacing: 0,
      textTransform: "none",
      required: true,
      defaultValue: preset.label,
    };

    onAddField(newField);
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    const clean = customVarName.trim().replace(/^\{\{|\}\}$/g, "");
    if (!clean) return;

    const formattedVar = `{{${clean}}}`;
    const defaultW = Math.round(templateWidth * 0.5);
    const defaultH = Math.round(templateHeight * 0.06);
    const defaultX = Math.round((templateWidth - defaultW) / 2);
    const defaultY = Math.round(templateHeight * (0.4 + fields.length * 0.08));

    const newField = {
      id: createFieldId(clean.replace(/[^a-zA-Z0-9]/g, "")),
      label: clean.charAt(0).toUpperCase() + clean.slice(1),
      variable: formattedVar,
      x: defaultX,
      y: defaultY,
      width: defaultW,
      height: defaultH,
      fontFamily: "'Inter', sans-serif",
      fontSize: 28,
      fontWeight: "500",
      color: "#1e293b",
      align: "center",
      letterSpacing: 0,
      textTransform: "none",
      required: true,
      defaultValue: clean,
    };

    onAddField(newField);
    setCustomVarName("");
  };

  return (
    <div className="field-editor-sidebar">
      {/* Quick Add Section */}
      <div className="fe-section">
        <h4 className="fe-title">Add Certificate Fields</h4>
        <div className="fe-presets-grid">
          {STANDARD_VARIABLES.map((p) => {
            const alreadyAdded = fields.some((f) => f.variable === p.variable);
            return (
              <button
                key={p.variable}
                type="button"
                className={`fe-preset-btn ${alreadyAdded ? "already-added" : ""}`}
                onClick={() => handleAddPreset(p)}
                title={alreadyAdded ? "Variable already present" : `Add ${p.variable}`}
              >
                <span className="fe-preset-var">{p.variable}</span>
                <span className="fe-preset-lbl">{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Variable Form */}
        <form onSubmit={handleAddCustom} className="fe-custom-form">
          <input
            type="text"
            className="fe-input"
            placeholder="e.g. college, department"
            value={customVarName}
            onChange={(e) => setCustomVarName(e.target.value)}
          />
          <button
            type="submit"
            className="fe-add-btn"
            disabled={!customVarName.trim()}
          >
            + Add Custom
          </button>
        </form>
      </div>

      {/* Field List */}
      <div className="fe-section">
        <h4 className="fe-title">Configured Fields ({fields.length})</h4>
        {fields.length === 0 ? (
          <p className="fe-empty-hint">
            No fields placed yet. Click a preset above (e.g. <code>{"{{name}}"}</code>) to add.
          </p>
        ) : (
          <div className="fe-field-chips">
            {fields.map((f) => {
              const isSelected = f.id === selectedField?.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`fe-chip ${isSelected ? "selected" : ""}`}
                  onClick={() => onSelectField(f.id)}
                >
                  <span className="fe-chip-var">{f.variable}</span>
                  <span
                    className="fe-chip-del"
                    title="Remove field"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteField(f.id);
                    }}
                  >
                    ×
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Field Style Controls */}
      {selectedField && (
        <div className="fe-section fe-controls">
          <div className="fe-header-row">
            <h4>Style: <code>{selectedField.variable}</code></h4>
            <button
              type="button"
              className="fe-delete-link"
              onClick={() => onDeleteField(selectedField.id)}
            >
              Delete Field
            </button>
          </div>

          <div className="fe-grid">
            {selectedField.isQr ? (
              <div className="fe-qr-info-card" style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.25)", borderRadius: "8px", padding: "12px", marginBottom: "8px" }}>
                <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "var(--color-text-secondary, #cbd5e1)" }}>
                  📱 <strong>Official Verification QR Code</strong>: Automatically generates scannable codes linking to <code>/verify/[certId]</code> for public credentials verification.
                </p>
                <div className="fe-field-group">
                  <label>QR Dimension (Width & Height px)</label>
                  <input
                    type="number"
                    className="fe-input"
                    min="60"
                    max="400"
                    value={Math.round(selectedField.width) || 130}
                    onChange={(e) => {
                      const val = Math.max(50, Number(e.target.value));
                      onUpdateField(selectedField.id, { width: val, height: val });
                    }}
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Font Family */}
                <div className="fe-field-group">
                  <label>Font Family</label>
                  <select
                    className="fe-select"
                    value={selectedField.fontFamily || "'Inter', sans-serif"}
                    onChange={(e) =>
                      onUpdateField(selectedField.id, { fontFamily: e.target.value })
                    }
                  >
                    {GOOGLE_FONTS.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font Size & Weight */}
                <div className="fe-field-row">
                  <div className="fe-field-group">
                    <label>Size (px)</label>
                    <input
                      type="number"
                      className="fe-input"
                      min="12"
                      max="160"
                      value={selectedField.fontSize || 32}
                      onChange={(e) =>
                        onUpdateField(selectedField.id, {
                          fontSize: Math.max(10, Number(e.target.value)),
                        })
                      }
                    />
                  </div>

                  <div className="fe-field-group">
                    <label>Weight</label>
                    <select
                      className="fe-select"
                      value={selectedField.fontWeight || "600"}
                      onChange={(e) =>
                        onUpdateField(selectedField.id, { fontWeight: e.target.value })
                      }
                    >
                      <option value="400">Regular (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="600">Semi-Bold (600)</option>
                      <option value="700">Bold (700)</option>
                      <option value="800">Extra-Bold (800)</option>
                    </select>
                  </div>
                </div>

                {/* Color & Alignment */}
                <div className="fe-field-row">
                  <div className="fe-field-group">
                    <label>Color</label>
                    <div className="fe-color-picker-wrap">
                      <input
                        type="color"
                        className="fe-color-input"
                        value={selectedField.color || "#1e293b"}
                        onChange={(e) =>
                          onUpdateField(selectedField.id, { color: e.target.value })
                        }
                      />
                      <input
                        type="text"
                        className="fe-input fe-color-text"
                        value={selectedField.color || "#1e293b"}
                        onChange={(e) =>
                          onUpdateField(selectedField.id, { color: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="fe-field-group">
                    <label>Alignment</label>
                    <div className="fe-align-group">
                      {["left", "center", "right"].map((al) => (
                        <button
                          key={al}
                          type="button"
                          className={`fe-align-btn ${
                            (selectedField.align || "center") === al ? "active" : ""
                          }`}
                          onClick={() =>
                            onUpdateField(selectedField.id, { align: al })
                          }
                          title={`Align ${al}`}
                        >
                          {al === "left" ? "⇤" : al === "center" ? "⇥⇤" : "⇥"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Position & Dimension Fine Tuning */}
            <div className="fe-coords-section">
              <div className="fe-coords-header">
                <label>Manual Position & Size (px)</label>
                <div className="fe-align-tools">
                  <button
                    type="button"
                    className="fe-tool-btn"
                    onClick={() =>
                      onUpdateField(selectedField.id, {
                        x: Math.round((templateWidth - selectedField.width) / 2),
                      })
                    }
                    title="Center horizontally on template"
                  >
                    ↔ Center Horiz
                  </button>
                  <button
                    type="button"
                    className="fe-tool-btn"
                    onClick={() =>
                      onUpdateField(selectedField.id, {
                        y: Math.round((templateHeight - selectedField.height) / 2),
                      })
                    }
                    title="Center vertically on template"
                  >
                    ↕ Center Vert
                  </button>
                </div>
              </div>

              <div className="fe-coords-grid">
                <div className="fe-coord-field">
                  <span className="fe-coord-label">X</span>
                  <input
                    type="number"
                    className="fe-input fe-coord-input"
                    value={Math.round(selectedField.x)}
                    min="0"
                    max={templateWidth}
                    onChange={(e) =>
                      onUpdateField(selectedField.id, { x: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="fe-coord-field">
                  <span className="fe-coord-label">Y</span>
                  <input
                    type="number"
                    className="fe-input fe-coord-input"
                    value={Math.round(selectedField.y)}
                    min="0"
                    max={templateHeight}
                    onChange={(e) =>
                      onUpdateField(selectedField.id, { y: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="fe-coord-field">
                  <span className="fe-coord-label">W</span>
                  <input
                    type="number"
                    className="fe-input fe-coord-input"
                    value={Math.round(selectedField.width)}
                    min="20"
                    max={templateWidth}
                    onChange={(e) =>
                      onUpdateField(selectedField.id, {
                        width: Math.max(20, Number(e.target.value)),
                      })
                    }
                  />
                </div>
                <div className="fe-coord-field">
                  <span className="fe-coord-label">H</span>
                  <input
                    type="number"
                    className="fe-input fe-coord-input"
                    value={Math.round(selectedField.height)}
                    min="15"
                    max={templateHeight}
                    onChange={(e) =>
                      onUpdateField(selectedField.id, {
                        height: Math.max(15, Number(e.target.value)),
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

FieldEditor.propTypes = {
  fields: PropTypes.array.isRequired,
  selectedFieldId: PropTypes.string,
  onSelectField: PropTypes.func.isRequired,
  onAddField: PropTypes.func.isRequired,
  onUpdateField: PropTypes.func.isRequired,
  onDeleteField: PropTypes.func.isRequired,
  templateWidth: PropTypes.number,
  templateHeight: PropTypes.number,
};
