import { useState } from "react";
import PropTypes from "prop-types";

const STANDARD_VARIABLES = [
  { variable: "{{name}}", label: "Participant Name", defaultSize: 48, defaultWeight: "700" },
  { variable: "{{event}}", label: "Event Name", defaultSize: 32, defaultWeight: "600" },
  { variable: "{{position}}", label: "Position / Award", defaultSize: 28, defaultWeight: "600" },
  { variable: "{{date}}", label: "Event Date", defaultSize: 24, defaultWeight: "400" },
  { variable: "{{rollNo}}", label: "Roll Number", defaultSize: 22, defaultWeight: "500" },
  { variable: "{{certificateId}}", label: "Certificate ID", defaultSize: 18, defaultWeight: "400" },
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
    // Calculate reasonable default centered coordinates
    const defaultW = Math.round(templateWidth * 0.6);
    const defaultH = Math.round(templateHeight * 0.08);
    const defaultX = Math.round((templateWidth - defaultW) / 2);
    const defaultY = Math.round(templateHeight * (0.3 + fields.length * 0.1));

    const newField = {
      id: createFieldId(rawVar.replace(/[^a-zA-Z0-9]/g, "")),
      label: preset.label,
      variable: rawVar,
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

            {/* Position Coordinates (Read-only / Fine Tuning) */}
            <div className="fe-coords-box">
              <small>
                Position (Original Template Pixels): X: {Math.round(selectedField.x)}px, Y:{" "}
                {Math.round(selectedField.y)}px | W: {Math.round(selectedField.width)}px, H:{" "}
                {Math.round(selectedField.height)}px
              </small>
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
