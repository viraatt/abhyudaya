import { useState } from "react";
import PropTypes from "prop-types";
import {
  STANDARD_VARIABLES,
  createTextElement,
  createDynamicTextElement,
  createParagraphElement,
  createImageElement,
  createQrElement,
  createSignatureElement,
  createShapeElement,
  createLineElement,
  ELEMENT_TYPES,
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
  const [showVarPicker, setShowVarPicker] = useState(false);
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [showLinePicker, setShowLinePicker] = useState(false);
  const [customVar, setCustomVar] = useState("");

  const allVariables = [
    ...STANDARD_VARIABLES,
    ...customVariables.map((v) => ({
      variable: v.startsWith("{{") ? v : `{{${v}}}`,
      label: v.replace(/^\{\{|\}\}$/g, ""),
      group: "Custom",
    })),
  ];

  const add = (el) => {
    onAddElement(el);
    setShowVarPicker(false);
    setShowShapePicker(false);
    setShowLinePicker(false);
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
      <div className="cdes-toolbar-title">Add Element</div>

      {/* Static Text */}
      <button
        className="cdes-tool-btn"
        title="Add a static text element"
        onClick={() => add(createTextElement(canvasWidth, canvasHeight, elementCount))}
      >
        <span className="cdes-tool-icon">T</span>
        <span className="cdes-tool-label">Text</span>
      </button>

      {/* Dynamic Text / Variable */}
      <div className="cdes-tool-group">
        <button
          className={`cdes-tool-btn ${showVarPicker ? "active" : ""}`}
          title="Add a dynamic text field with a variable"
          onClick={() => {
            setShowVarPicker(!showVarPicker);
            setShowShapePicker(false);
            setShowLinePicker(false);
          }}
        >
          <span className="cdes-tool-icon">{"{ }"}</span>
          <span className="cdes-tool-label">Dynamic Text</span>
          <span className="cdes-tool-chevron">{showVarPicker ? "▲" : "▼"}</span>
        </button>

        {showVarPicker && (
          <div className="cdes-var-picker">
            <div className="cdes-var-picker-title">Available Variables</div>

            {allVariables.filter(v => v.group === "Standard").map((v) => (
              <button
                key={v.variable}
                className="cdes-var-chip"
                title={v.label}
                onClick={() => add(createDynamicTextElement(v.variable, canvasWidth, canvasHeight, elementCount))}
              >
                <code className="cdes-var-code">{v.variable}</code>
                <span className="cdes-var-name">{v.label}</span>
              </button>
            ))}

            {allVariables.filter(v => v.group === "Custom").length > 0 && (
              <>
                <div className="cdes-var-picker-title" style={{ marginTop: "8px" }}>Custom Variables</div>
                {allVariables.filter(v => v.group === "Custom").map((v) => (
                  <button
                    key={v.variable}
                    className="cdes-var-chip"
                    title={v.label}
                    onClick={() => add(createDynamicTextElement(v.variable, canvasWidth, canvasHeight, elementCount))}
                  >
                    <code className="cdes-var-code">{v.variable}</code>
                    <span className="cdes-var-name">{v.label}</span>
                  </button>
                ))}
              </>
            )}

            <form className="cdes-custom-var-form" onSubmit={handleAddCustomVar}>
              <input
                className="cdes-custom-var-input"
                type="text"
                placeholder="e.g. college, department"
                value={customVar}
                onChange={(e) => setCustomVar(e.target.value)}
              />
              <button type="submit" className="cdes-custom-var-add" disabled={!customVar.trim()}>
                + Add
              </button>
            </form>
          </div>
        )}
      </div>

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
            setShowVarPicker(false);
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
            setShowVarPicker(false);
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
