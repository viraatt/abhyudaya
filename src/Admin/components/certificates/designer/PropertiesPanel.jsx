import PropTypes from "prop-types";
import { ELEMENT_TYPES, GOOGLE_FONTS, STANDARD_VARIABLES } from "./elementSchema";

function Row({ children, gap = "8px" }) {
  return <div style={{ display: "flex", gap, alignItems: "flex-end" }}>{children}</div>;
}
Row.propTypes = { children: PropTypes.node, gap: PropTypes.string };

function FieldGroup({ label, children, style = {} }) {
  return (
    <div className="cprop-field-group" style={style}>
      <label className="cprop-label">{label}</label>
      {children}
    </div>
  );
}
FieldGroup.propTypes = { label: PropTypes.string, children: PropTypes.node, style: PropTypes.object };

function NumInput({ value, onChange, min, max, step = 1, style = {} }) {
  return (
    <input
      type="number"
      className="cprop-input"
      value={Math.round(value * 100) / 100}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      style={style}
    />
  );
}
NumInput.propTypes = { value: PropTypes.number, onChange: PropTypes.func, min: PropTypes.number, max: PropTypes.number, step: PropTypes.number, style: PropTypes.object };

const COLOR_PRESETS = [
  "#ffffff", "#000000", "#1e293b", "#334155", "#64748b",
  "#c0a060", "#d4af37", "#b8860b", "#6366f1", "#8b5cf6",
  "#3b82f6", "#10b981", "#ef4444", "#f59e0b",
];

function ColorInput({ value, onChange }) {
  return (
    <div className="cprop-color-wrap">
      <input type="color" className="cprop-color-swatch" value={value || "#000000"} onChange={(e) => onChange(e.target.value)} />
      <input
        type="text"
        className="cprop-input cprop-color-hex"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        maxLength={7}
      />
      <div className="cprop-color-presets">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            className={`cprop-preset-swatch ${value === c ? "active" : ""}`}
            style={{ background: c, border: value === c ? "2px solid #6366f1" : "2px solid transparent" }}
            title={c}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
    </div>
  );
}
ColorInput.propTypes = { value: PropTypes.string, onChange: PropTypes.func };

export default function PropertiesPanel({
  element,
  selectedIds,
  elements,
  canvasWidth,
  canvasHeight,
  onUpdate,
  onUpdateMultiple,
  onDelete,
  onDuplicate,
  onAlignMultiple,
}) {
  if (!element) {
    if (selectedIds.length > 1) {
      return (
        <div className="cprop-panel">
          <div className="cprop-title">Multiple Selected ({selectedIds.length})</div>
          <div className="cprop-section">
            <div className="cprop-section-title">Align</div>
            <div className="cprop-align-grid">
              {["left", "hcenter", "right", "top", "vcenter", "bottom"].map((dir) => {
                const labels = { left: "Left", hcenter: "H Center", right: "Right", top: "Top", vcenter: "V Center", bottom: "Bottom" };
                return (
                  <button key={dir} className="cprop-align-btn" onClick={() => onAlignMultiple(dir)} title={`Align ${labels[dir]}`}>
                    {labels[dir]}
                  </button>
                );
              })}
            </div>
            <button className="cprop-del-btn" onClick={() => selectedIds.forEach(id => onDelete(id))}>
              Delete All Selected
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="cprop-panel">
        <div className="cprop-title">Properties</div>
        <div className="cprop-empty">Select an element to edit its properties.</div>
      </div>
    );
  }

  const upd = (patch) => onUpdate(element.id, patch);
  const { type } = element;

  const isText = type === ELEMENT_TYPES.TEXT || type === ELEMENT_TYPES.DYNAMIC_TEXT || type === ELEMENT_TYPES.PARAGRAPH;
  const isMedia = type === ELEMENT_TYPES.IMAGE || type === ELEMENT_TYPES.SIGNATURE;
  const isShape = type === ELEMENT_TYPES.SHAPE;
  const isLine = type === ELEMENT_TYPES.LINE;
  const isQr = type === ELEMENT_TYPES.QR;

  return (
    <div className="cprop-panel">
      <div className="cprop-title">
        {type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, " $1")}
        <div className="cprop-title-actions">
          <button className="cprop-action-btn" title="Duplicate (Ctrl+D)" onClick={() => onDuplicate(element.id)}>⧉</button>
          <button className="cprop-action-btn cprop-del-btn-sm" title="Delete" onClick={() => onDelete(element.id)}>×</button>
        </div>
      </div>

      {/* ── CONTENT SECTION ───────────────────────────── */}
      {type === ELEMENT_TYPES.TEXT && (
        <div className="cprop-section">
          <div className="cprop-section-title">Content</div>
          <textarea
            className="cprop-textarea"
            value={element.content || ""}
            onChange={(e) => upd({ content: e.target.value })}
            rows={3}
            placeholder="Enter text..."
          />
        </div>
      )}

      {type === ELEMENT_TYPES.DYNAMIC_TEXT && (
        <div className="cprop-section">
          <div className="cprop-section-title">Variable</div>
          <select
            className="cprop-select"
            value={element.variable || "{{name}}"}
            onChange={(e) => upd({ variable: e.target.value })}
          >
            {STANDARD_VARIABLES.map((v) => (
              <option key={v.variable} value={v.variable}>{v.variable} — {v.label}</option>
            ))}
          </select>
        </div>
      )}

      {type === ELEMENT_TYPES.PARAGRAPH && (
        <div className="cprop-section">
          <div className="cprop-section-title">Paragraph Content</div>
          <textarea
            className="cprop-textarea"
            value={element.content || ""}
            onChange={(e) => upd({ content: e.target.value })}
            rows={5}
            placeholder="Type your paragraph... Use {{name}}, {{event}}, etc."
          />
          <div className="cprop-hint">Use {"{{name}}, {{event}}"}, etc. for dynamic data.</div>
        </div>
      )}

      {/* ── TYPOGRAPHY SECTION ───────────────────────── */}
      {isText && (
        <div className="cprop-section">
          <div className="cprop-section-title">Typography</div>

          <FieldGroup label="Font Family">
            <select
              className="cprop-select"
              value={element.fontFamily || "'Inter', sans-serif"}
              onChange={(e) => upd({ fontFamily: e.target.value })}
            >
              {GOOGLE_FONTS.map((f) => (
                <option key={f.value} value={f.value}>{f.name}</option>
              ))}
            </select>
          </FieldGroup>

          <Row>
            <FieldGroup label="Size" style={{ flex: 1 }}>
              <NumInput
                value={element.fontSize || 32}
                min={6} max={300}
                onChange={(v) => upd({ fontSize: v })}
              />
            </FieldGroup>
            <FieldGroup label="Weight" style={{ flex: 1 }}>
              <select
                className="cprop-select"
                value={String(element.fontWeight || "400")}
                onChange={(e) => upd({ fontWeight: e.target.value })}
              >
                <option value="300">Light 300</option>
                <option value="400">Regular 400</option>
                <option value="500">Medium 500</option>
                <option value="600">Semi-Bold 600</option>
                <option value="700">Bold 700</option>
                <option value="800">Extra-Bold 800</option>
                <option value="900">Black 900</option>
              </select>
            </FieldGroup>
          </Row>

          <div className="cprop-style-row">
            <button
              className={`cprop-style-btn ${element.fontStyle === "italic" ? "active" : ""}`}
              title="Italic"
              onClick={() => upd({ fontStyle: element.fontStyle === "italic" ? "normal" : "italic" })}
            >I</button>
            <button
              className={`cprop-style-btn ${element.textDecoration === "underline" ? "active" : ""}`}
              title="Underline"
              onClick={() => upd({ textDecoration: element.textDecoration === "underline" ? "none" : "underline" })}
            >U</button>
          </div>

          <FieldGroup label="Text Color">
            <ColorInput value={element.color} onChange={(v) => upd({ color: v })} />
          </FieldGroup>

          <FieldGroup label="Alignment">
            <div className="cprop-align-btns">
              {["left", "center", "right"].map((a) => (
                <button
                  key={a}
                  className={`cprop-align-text-btn ${(element.align || "center") === a ? "active" : ""}`}
                  title={`Align ${a}`}
                  onClick={() => upd({ align: a })}
                >
                  {a === "left" ? "⇤" : a === "center" ? "⇥⇤" : "⇥"}
                </button>
              ))}
            </div>
          </FieldGroup>

          <Row>
            <FieldGroup label="Line Height" style={{ flex: 1 }}>
              <NumInput value={element.lineHeight || 1.4} min={0.8} max={4} step={0.1} onChange={(v) => upd({ lineHeight: v })} />
            </FieldGroup>
            <FieldGroup label="Letter Spacing" style={{ flex: 1 }}>
              <NumInput value={element.letterSpacing || 0} min={-10} max={50} step={0.5} onChange={(v) => upd({ letterSpacing: v })} />
            </FieldGroup>
          </Row>

          {type === ELEMENT_TYPES.PARAGRAPH && (
            <FieldGroup label="Vertical Align">
              <select
                className="cprop-select"
                value={element.verticalAlign || "middle"}
                onChange={(e) => upd({ verticalAlign: e.target.value })}
              >
                <option value="top">Top</option>
                <option value="middle">Middle</option>
                <option value="bottom">Bottom</option>
              </select>
            </FieldGroup>
          )}
        </div>
      )}

      {/* ── SHAPE SECTION ───────────────────────────── */}
      {isShape && (
        <div className="cprop-section">
          <div className="cprop-section-title">Shape</div>
          <FieldGroup label="Shape Type">
            <select className="cprop-select" value={element.shape || "rectangle"} onChange={(e) => upd({ shape: e.target.value })}>
              <option value="rectangle">Rectangle</option>
              <option value="roundedRect">Rounded Rectangle</option>
              <option value="circle">Circle / Ellipse</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Fill Color">
            <ColorInput value={element.fillColor || "transparent"} onChange={(v) => upd({ fillColor: v })} />
          </FieldGroup>
          <FieldGroup label="Border Color">
            <ColorInput value={element.borderColor || "#c0a060"} onChange={(v) => upd({ borderColor: v })} />
          </FieldGroup>
          <Row>
            <FieldGroup label="Border Width" style={{ flex: 1 }}>
              <NumInput value={element.borderWidth || 2} min={0} max={50} onChange={(v) => upd({ borderWidth: v })} />
            </FieldGroup>
            {element.shape !== "circle" && (
              <FieldGroup label="Radius" style={{ flex: 1 }}>
                <NumInput value={element.borderRadius || 0} min={0} max={500} onChange={(v) => upd({ borderRadius: v })} />
              </FieldGroup>
            )}
          </Row>
        </div>
      )}

      {/* ── LINE SECTION ────────────────────────────── */}
      {isLine && (
        <div className="cprop-section">
          <div className="cprop-section-title">Line</div>
          <FieldGroup label="Color">
            <ColorInput value={element.color || "#c0a060"} onChange={(v) => upd({ color: v })} />
          </FieldGroup>
          <FieldGroup label="Thickness (px)">
            <NumInput value={element.thickness || 3} min={1} max={100} onChange={(v) => upd({ thickness: v, height: v })} />
          </FieldGroup>
        </div>
      )}

      {/* ── IMAGE SECTION ───────────────────────────── */}
      {isMedia && (
        <div className="cprop-section">
          <div className="cprop-section-title">Image</div>
          {element.src ? (
            <div className="cprop-img-preview">
              <img src={element.src} alt="element" style={{ maxWidth: "100%", maxHeight: "80px", objectFit: "contain", borderRadius: "4px" }} />
            </div>
          ) : null}
          <label className="cprop-upload-btn" style={{ cursor: "pointer" }}>
            {element.src ? "Replace Image" : "Upload Image"}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                // Revoke old blob URL if any
                if (element.src && element.src.startsWith("blob:")) {
                  URL.revokeObjectURL(element.src);
                }
                const src = URL.createObjectURL(file);
                upd({ src, _pendingFile: file, storageUrl: null, storagePath: null });
                e.target.value = "";
              }}
            />
          </label>
          <FieldGroup label="Object Fit">
            <select className="cprop-select" value={element.objectFit || "contain"} onChange={(e) => upd({ objectFit: e.target.value })}>
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
              <option value="fill">Fill (Stretch)</option>
            </select>
          </FieldGroup>
        </div>
      )}

      {/* ── QR SECTION ──────────────────────────────── */}
      {isQr && (
        <div className="cprop-section">
          <div className="cprop-section-title">QR Code</div>
          <div className="cprop-hint">
            Generates a scannable QR code linking to the certificate verification URL.
            The QR content is set automatically from the Certificate ID.
          </div>
        </div>
      )}

      {/* ── POSITION & SIZE ─────────────────────────── */}
      <div className="cprop-section">
        <div className="cprop-section-title">Position & Size</div>

        <Row>
          <FieldGroup label="X" style={{ flex: 1 }}>
            <NumInput value={element.x || 0} min={-canvasWidth} max={canvasWidth * 2} onChange={(v) => upd({ x: v })} />
          </FieldGroup>
          <FieldGroup label="Y" style={{ flex: 1 }}>
            <NumInput value={element.y || 0} min={-canvasHeight} max={canvasHeight * 2} onChange={(v) => upd({ y: v })} />
          </FieldGroup>
        </Row>

        <Row>
          <FieldGroup label="W" style={{ flex: 1 }}>
            <NumInput value={element.width || 100} min={isLine ? 1 : 20} max={canvasWidth * 2} onChange={(v) => upd({ width: v })} />
          </FieldGroup>
          <FieldGroup label="H" style={{ flex: 1 }}>
            <NumInput value={element.height || 50} min={isLine ? 1 : 10} max={canvasHeight * 2} onChange={(v) => upd({ height: v })} />
          </FieldGroup>
        </Row>

        <FieldGroup label="Rotation (°)">
          <NumInput value={element.rotation || 0} min={-360} max={360} onChange={(v) => upd({ rotation: v })} />
        </FieldGroup>

        <FieldGroup label="Opacity">
          <input
            type="range"
            min={0} max={1} step={0.01}
            value={element.opacity !== undefined ? element.opacity : 1}
            onChange={(e) => upd({ opacity: Number(e.target.value) })}
            className="cprop-slider"
          />
          <span className="cprop-slider-val">{Math.round((element.opacity !== undefined ? element.opacity : 1) * 100)}%</span>
        </FieldGroup>

        {/* Center helpers */}
        <div className="cprop-center-btns">
          <button
            className="cprop-center-btn"
            title="Center horizontally"
            onClick={() => upd({ x: Math.round((canvasWidth - (element.width || 100)) / 2) })}
          >
            ↔ Center H
          </button>
          <button
            className="cprop-center-btn"
            title="Center vertically"
            onClick={() => upd({ y: Math.round((canvasHeight - (element.height || 50)) / 2) })}
          >
            ↕ Center V
          </button>
        </div>
      </div>
    </div>
  );
}

PropertiesPanel.propTypes = {
  element: PropTypes.object,
  selectedIds: PropTypes.arrayOf(PropTypes.string),
  elements: PropTypes.array,
  canvasWidth: PropTypes.number,
  canvasHeight: PropTypes.number,
  onUpdate: PropTypes.func.isRequired,
  onUpdateMultiple: PropTypes.func,
  onDelete: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func.isRequired,
  onAlignMultiple: PropTypes.func,
};
