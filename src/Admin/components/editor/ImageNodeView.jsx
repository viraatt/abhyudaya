import { NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";
import {
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
  FaTrash,
  FaExpandAlt,
  FaCompressAlt,
} from "react-icons/fa";

export default function ImageNodeView(props) {
  const { node, updateAttributes, deleteNode, selected } = props;
  const { src, alt, width = "100%", alignment = "center", caption = "" } = node.attrs;

  const handleAlign = (alignMode) => {
    updateAttributes({ alignment: alignMode });
  };

  const handleResize = (newWidth) => {
    updateAttributes({ width: newWidth });
  };

  const handleCaptionChange = (e) => {
    updateAttributes({ caption: e.target.value });
  };

  return (
    <NodeViewWrapper
      className={`editor-image-wrapper align-${alignment}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems:
          alignment === "left"
            ? "flex-start"
            : alignment === "right"
            ? "flex-end"
            : "center",
        margin: "1.5rem 0",
        position: "relative",
      }}
    >
      <div
        className={`editor-image-container ${selected ? "is-selected" : ""}`}
        style={{
          width: width || "100%",
          maxWidth: "100%",
          position: "relative",
          transition: "width 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        {/* Hover / Selection Toolbar for Image Actions */}
        {selected && (
          <div className="image-controls-toolbar">
            <div className="img-toolbar-group">
              <button
                type="button"
                className={`img-btn ${alignment === "left" ? "active" : ""}`}
                onClick={() => handleAlign("left")}
                title="Align Left"
              >
                <FaAlignLeft />
              </button>
              <button
                type="button"
                className={`img-btn ${alignment === "center" ? "active" : ""}`}
                onClick={() => handleAlign("center")}
                title="Align Center"
              >
                <FaAlignCenter />
              </button>
              <button
                type="button"
                className={`img-btn ${alignment === "right" ? "active" : ""}`}
                onClick={() => handleAlign("right")}
                title="Align Right"
              >
                <FaAlignRight />
              </button>
            </div>

            <span className="img-toolbar-divider" />

            <div className="img-toolbar-group">
              <button
                type="button"
                className={`img-btn ${width === "25%" ? "active" : ""}`}
                onClick={() => handleResize("25%")}
              >
                25%
              </button>
              <button
                type="button"
                className={`img-btn ${width === "50%" ? "active" : ""}`}
                onClick={() => handleResize("50%")}
              >
                50%
              </button>
              <button
                type="button"
                className={`img-btn ${width === "75%" ? "active" : ""}`}
                onClick={() => handleResize("75%")}
              >
                75%
              </button>
              <button
                type="button"
                className={`img-btn ${width === "100%" ? "active" : ""}`}
                onClick={() => handleResize("100%")}
              >
                100%
              </button>
            </div>

            <span className="img-toolbar-divider" />

            <button
              type="button"
              className="img-btn danger"
              onClick={deleteNode}
              title="Delete Image"
            >
              <FaTrash />
            </button>
          </div>
        )}

        {/* Image Element */}
        <img
          src={src}
          alt={alt || caption || "Uploaded Blog Image"}
          className="editor-img-element"
          style={{
            width: "100%",
            display: "block",
            borderRadius: "12px",
            border: selected ? "2px solid #2563eb" : "1px solid transparent",
          }}
        />

        {/* Caption Editor */}
        <div className="editor-caption-wrapper">
          <input
            type="text"
            className="editor-caption-input"
            placeholder="Type image caption (optional)..."
            value={caption || ""}
            onChange={handleCaptionChange}
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
