import PropTypes from "prop-types";
import { ELEMENT_TYPES } from "./elementSchema";

const TYPE_ICONS = {
  [ELEMENT_TYPES.TEXT]: "T",
  [ELEMENT_TYPES.DYNAMIC_TEXT]: "{}",
  [ELEMENT_TYPES.PARAGRAPH]: "¶",
  [ELEMENT_TYPES.IMAGE]: "⊞",
  [ELEMENT_TYPES.QR]: "▣",
  [ELEMENT_TYPES.SIGNATURE]: "✒",
  [ELEMENT_TYPES.SHAPE]: "◻",
  [ELEMENT_TYPES.LINE]: "─",
};

function getElementLabel(el) {
  switch (el.type) {
    case ELEMENT_TYPES.TEXT:
      return el.content ? el.content.slice(0, 24) + (el.content.length > 24 ? "…" : "") : "Text";
    case ELEMENT_TYPES.DYNAMIC_TEXT:
      return el.variable || "Dynamic Text";
    case ELEMENT_TYPES.PARAGRAPH:
      return el.content ? el.content.slice(0, 24) + "…" : "Paragraph";
    case ELEMENT_TYPES.IMAGE:
      return "Image";
    case ELEMENT_TYPES.QR:
      return "QR Code";
    case ELEMENT_TYPES.SIGNATURE:
      return "Signature";
    case ELEMENT_TYPES.SHAPE:
      return el.shape
        ? el.shape.charAt(0).toUpperCase() + el.shape.slice(1)
        : "Shape";
    case ELEMENT_TYPES.LINE:
      return "Line";
    default:
      return el.type || "Element";
  }
}

export default function LayersPanel({
  elements,
  selectedIds,
  onSelect,
  onToggleVisibility,
  onDelete,
  onReorder,
}) {
  // Layers displayed in reverse order (top layer first)
  const reversed = [...elements].reverse();

  const handleDragStart = (e, idx) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    const srcIdx = Number(e.dataTransfer.getData("text/plain"));
    if (srcIdx === targetIdx) return;

    // Convert reversed indices back to original order
    const origSrc = elements.length - 1 - srcIdx;
    const origTarget = elements.length - 1 - targetIdx;

    const next = [...elements];
    const [moved] = next.splice(origSrc, 1);
    next.splice(origTarget, 0, moved);
    onReorder(next);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <div className="cdes-layers-panel">
      <div className="cdes-layers-title">
        Layers
        <span className="cdes-layers-count">{elements.length}</span>
      </div>

      {elements.length === 0 ? (
        <div className="cdes-layers-empty">
          No elements yet.
          <br />
          Use Add Element above.
        </div>
      ) : (
        <div className="cdes-layers-list">
          {reversed.map((el, revIdx) => {
            const isSelected = selectedIds.includes(el.id);
            const icon = TYPE_ICONS[el.type] || "·";
            const label = getElementLabel(el);

            return (
              <div
                key={el.id}
                className={`cdes-layer-item ${isSelected ? "selected" : ""} ${el.visible === false ? "hidden" : ""}`}
                draggable
                onDragStart={(e) => handleDragStart(e, revIdx)}
                onDrop={(e) => handleDrop(e, revIdx)}
                onDragOver={handleDragOver}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    // Multi-select
                    onSelect(
                      isSelected
                        ? selectedIds.filter((id) => id !== el.id)
                        : [...selectedIds, el.id]
                    );
                  } else {
                    onSelect([el.id]);
                  }
                }}
                title={`Click to select. Drag to reorder. ${el.type}`}
              >
                {/* Drag handle */}
                <span className="cdes-layer-drag" title="Drag to reorder">⋮⋮</span>

                {/* Type icon */}
                <span className="cdes-layer-icon">{icon}</span>

                {/* Label */}
                <span className="cdes-layer-label" title={label}>{label}</span>

                {/* Visibility toggle */}
                <button
                  className={`cdes-layer-vis-btn ${el.visible === false ? "hidden" : ""}`}
                  title={el.visible === false ? "Show element" : "Hide element"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(el.id);
                  }}
                >
                  {el.visible === false ? "◌" : "●"}
                </button>

                {/* Delete */}
                <button
                  className="cdes-layer-del-btn"
                  title="Delete element"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(el.id);
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

LayersPanel.propTypes = {
  elements: PropTypes.array.isRequired,
  selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSelect: PropTypes.func.isRequired,
  onToggleVisibility: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onReorder: PropTypes.func.isRequired,
};
