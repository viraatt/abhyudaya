import { useState } from "react";
import PropTypes from "prop-types";
import {
  createTextElement,
  createDynamicTextElement,
  createParagraphElement,
  createImageElement,
  createQrElement,
  createSignatureElement,
  createShapeElement,
  createLineElement,
} from "./elementSchema";

const SHAPE_OPTIONS = [
  { value: "rectangle", label: "Rectangle" },
  { value: "roundedRect", label: "Rounded Rect" },
  { value: "circle", label: "Circle" },
];

const LINE_OPTIONS = [
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
];

export default function ElementToolbar({
  canvasWidth,
  canvasHeight,
  elementCount,
  customVariables = [],
  onAddElement,
}) {
  const [staticText, setStaticText] = useState("");
  const [showMoreVars, setShowMoreVars] = useState(false);
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [showLinePicker, setShowLinePicker] = useState(false);
  const [customVar, setCustomVar] = useState("");

  const quickVariables = [
    { variable: "{{name}}", label: "Name" },
    { variable: "{{event}}", label: "Event" },
    { variable: "{{date}}", label: "Date" },
    { variable: "{{position}}", label: "Position" },
    { variable: "{{rollNo}}", label: "Roll No" },
    { variable: "{{certificateId}}", label: "Cert ID" },
    { variable: "{{qrCode}}", label: "QR Code", isQr: true },
  ];

  const customVarList = customVariables.map((v) => ({
    variable: v.startsWith("{{") ? v : `{{${v}}}`,
    label: v.replace(/^\{\{|\}\}$/g, ""),
  }));

  const add = (el) => {
    onAddElement(el);
    setShowMoreVars(false);
    setShowShapePicker(false);
    setShowLinePicker(false);
  };

  const handleAddStaticText = (e) => {
    if (e) e.preventDefault();
    const textToAdd = staticText.trim() || "Custom Text";
    add(createTextElement(canvasWidth, canvasHeight, elementCount, textToAdd));
    setStaticText("");
  };

  const handleAddCustomVar = (e) => {
    e.preventDefault();
    const clean = customVar.trim().replace(/^\{\{|\}\}$/g, "");
    if (!clean) return;
    const variable = `{{${clean}}}`;
    add(createDynamicTextElement(variable, canvasWidth, canvasHeight, elementCount));
    setCustomVar("");
  };

  return (
    <div className="cdes-toolbar">
      {/* ── SECTION 1: ADD ELEMENT (QUICK VARIABLES & QR) ── */}
      <div className="cdes-toolbar-title">Add Element</div>
      <div className="cdes-quick-vars-grid">
        {quickVariables.map((item) => (
          <button
            key={item.variable}
            type="button"
            className="cdes-quick-chip"
            onClick={() => {
              if (item.isQr) {
                add(createQrElement(canvasWidth, canvasHeight));
              } else {
                add(createDynamicTextElement(item.variable, canvasWidth, canvasHeight, elementCount));
              }
            }}
            title={`Add ${item.label} (${item.variable})`}
          >
            <span className="cdes-quick-chip-code">{item.variable}</span>
          </button>
        ))}

        {/* Display custom CSV columns if available */}
        {customVarList.map((item) => (
          <button
            key={item.variable}
            type="button"
            className="cdes-quick-chip cdes-quick-chip--custom"
            onClick={() => add(createDynamicTextElement(item.variable, canvasWidth, canvasHeight, elementCount))}
            title={`Add ${item.label} (${item.variable}) from CSV`}
          >
            <span className="cdes-quick-chip-code">{item.variable}</span>
          </button>
        ))}
      </div>

      {/* Dynamic Variable Input Form */}
      <form className="cdes-custom-var-form" onSubmit={handleAddCustomVar} style={{ marginTop: "4px" }}>
        <input
          className="cdes-custom-var-input"
          type="text"
          placeholder="New variable (e.g. college)..."
          value={customVar}
          onChange={(e) => setCustomVar(e.target.value)}
        />
        <button type="submit" className="cdes-custom-var-add" disabled={!customVar.trim()} title="Add custom variable">
          +
        </button>
      </form>

      <div className="cdes-toolbar-divider" />

      {/* ── SECTION 2: ADD STATIC TEXT ── */}
      <div className="cdes-toolbar-title">Add Static Text</div>
      <form className="cdes-static-text-form" onSubmit={handleAddStaticText}>
        <input
          type="text"
          className="cdes-static-text-input"
          placeholder="Enter custom text..."
          value={staticText}
          onChange={(e) => setStaticText(e.target.value)}
        />
        <button
          type="submit"
          className="cdes-static-text-add-btn"
          title="Add this text to canvas"
        >
          + Add Text
        </button>
      </form>

      <div className="cdes-toolbar-divider" />

      {/* ── SECTION 3: OTHER ELEMENTS ── */}
      <div className="cdes-toolbar-title">Other Elements</div>

      {/* Paragraph */}
      <button
        className="cdes-tool-btn"
        title="Add a multi-line paragraph with variable interpolation"
        onClick={() => add(createParagraphElement(canvasWidth, canvasHeight))}
      >
        <span className="cdes-tool-icon">¶</span>
        <span className="cdes-tool-label">Paragraph</span>
      </button>

      <div className="cdes-toolbar-divider" />

      {/* Image */}
      <label className="cdes-tool-btn" title="Upload an image or logo" style={{ cursor: "pointer" }}>
        <span className="cdes-tool-icon">⊞</span>
        <span className="cdes-tool-label">Image</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const src = URL.createObjectURL(file);
            const el = createImageElement(canvasWidth, canvasHeight);
            el.src = src;
            el._pendingFile = file;
            add(el);
            e.target.value = "";
          }}
        />
      </label>

      {/* QR Code */}
      <button
        className="cdes-tool-btn"
        title="Add a QR code linking to certificate verification"
        onClick={() => add(createQrElement(canvasWidth, canvasHeight))}
      >
        <span className="cdes-tool-icon">▣</span>
        <span className="cdes-tool-label">QR Code</span>
      </button>

      {/* Signature */}
      <label className="cdes-tool-btn" title="Upload a signature image" style={{ cursor: "pointer" }}>
        <span className="cdes-tool-icon">✒</span>
        <span className="cdes-tool-label">Signature</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const src = URL.createObjectURL(file);
            const el = createSignatureElement(canvasWidth, canvasHeight);
            el.src = src;
            el._pendingFile = file;
            add(el);
            e.target.value = "";
          }}
        />
      </label>

      <div className="cdes-toolbar-divider" />

      {/* Shape */}
      <div className="cdes-tool-group">
        <button
          className={`cdes-tool-btn ${showShapePicker ? "active" : ""}`}
          title="Add a shape (rectangle, circle)"
          onClick={() => {
            setShowShapePicker(!showShapePicker);
            setShowMoreVars(false);
            setShowLinePicker(false);
          }}
        >
          <span className="cdes-tool-icon">◻</span>
          <span className="cdes-tool-label">Shape</span>
          <span className="cdes-tool-chevron">{showShapePicker ? "▲" : "▼"}</span>
        </button>
        {showShapePicker && (
          <div className="cdes-var-picker">
            {SHAPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className="cdes-var-chip"
                onClick={() => add(createShapeElement(opt.value, canvasWidth, canvasHeight))}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Line */}
      <div className="cdes-tool-group">
        <button
          className={`cdes-tool-btn ${showLinePicker ? "active" : ""}`}
          title="Add a decorative line"
          onClick={() => {
            setShowLinePicker(!showLinePicker);
            setShowMoreVars(false);
            setShowShapePicker(false);
          }}
        >
          <span className="cdes-tool-icon">─</span>
          <span className="cdes-tool-label">Line</span>
          <span className="cdes-tool-chevron">{showLinePicker ? "▲" : "▼"}</span>
        </button>
        {showLinePicker && (
          <div className="cdes-var-picker">
            {LINE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className="cdes-var-chip"
                onClick={() => add(createLineElement(opt.value, canvasWidth, canvasHeight))}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

ElementToolbar.propTypes = {
  canvasWidth: PropTypes.number.isRequired,
  canvasHeight: PropTypes.number.isRequired,
  elementCount: PropTypes.number,
  customVariables: PropTypes.arrayOf(PropTypes.string),
  onAddElement: PropTypes.func.isRequired,
};
