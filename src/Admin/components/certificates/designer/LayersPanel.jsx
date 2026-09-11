import PropTypes from "prop-types";
import { ELEMENT_TYPES } from "./elementSchema";

function getElementDetails(el) {
  if (el.type === ELEMENT_TYPES.DYNAMIC_TEXT) {
    const rawVar = String(el.variable || "").replace(/^\{\{|\}\}$/g, "").toLowerCase();
    if (rawVar === "name") return { icon: "👤", title: "Participant Name", subtitle: el.variable };
    if (rawVar === "event") return { icon: "🏆", title: "Event Name", subtitle: el.variable };
    if (rawVar === "date") return { icon: "📅", title: "Event Date", subtitle: el.variable };
    if (rawVar === "position") return { icon: "🎖️", title: "Position / Award", subtitle: el.variable };
    if (rawVar === "rollno") return { icon: "🆔", title: "Roll Number", subtitle: el.variable };
    if (rawVar.includes("id")) return { icon: "🏷️", title: "Certificate ID", subtitle: el.variable };
    return { icon: "{}", title: rawVar.charAt(0).toUpperCase() + rawVar.slice(1), subtitle: el.variable };
  }

  if (el.type === ELEMENT_TYPES.TEXT) {
    const text = String(el.content || "").trim();
    const lower = text.toLowerCase();
    let icon = "📝";
    let title = "Static Text";

    if (lower.includes("college") || lower.includes("university") || lower.includes("institute")) {
      icon = "🏫";
      title = "College Name";
    } else if (lower.includes("organizer") || lower.includes("organized") || lower.includes("club")) {
      icon = "📢";
      title = "Organizer";
    } else if (lower.includes("department")) {
      icon = "🎓";
      title = "Department";
    } else if (lower.includes("certificate") || lower.includes("participation") || lower.includes("merit")) {
      icon = "📜";
      title = "Certificate Title";
    }

    const sub = text.length > 28 ? text.slice(0, 26) + "…" : (text || "Custom Text");
    return { icon, title, subtitle: sub };
  }

  if (el.type === ELEMENT_TYPES.PARAGRAPH) {
    const text = String(el.content || "").trim();
    const sub = text.length > 28 ? text.slice(0, 26) + "…" : (text || "Paragraph");
    return { icon: "¶", title: "Paragraph", subtitle: sub };
  }

  if (el.type === ELEMENT_TYPES.QR) {
    return { icon: "▣", title: "QR Code", subtitle: "Verification Link" };
  }

  if (el.type === ELEMENT_TYPES.IMAGE) {
    return { icon: "⊞", title: "Image Asset", subtitle: "Logo / Graphic" };
  }

  if (el.type === ELEMENT_TYPES.SIGNATURE) {
    return { icon: "✒", title: "Signature", subtitle: "Authority Sign-off" };
  }

  if (el.type === ELEMENT_TYPES.SHAPE) {
    const shapeName = el.shape ? el.shape.charAt(0).toUpperCase() + el.shape.slice(1) : "Shape";
    return { icon: "◻", title: shapeName, subtitle: "Vector Shape" };
  }

  if (el.type === ELEMENT_TYPES.LINE) {
    return { icon: "─", title: "Decorative Line", subtitle: "Divider" };
  }

  return { icon: "·", title: el.type || "Element", subtitle: "" };
}

export default function LayersPanel({
  elements,
  selectedIds,
  onSelect,
  onToggleVisibility,
  onToggleLock,
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
        Elements & Layers
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
            const { icon, title, subtitle } = getElementDetails(el);

            return (
              <div
                key={el.id}
                className={`cdes-layer-item ${isSelected ? "selected" : ""} ${el.visible === false ? "hidden" : ""} ${el.locked ? "locked" : ""}`}
                draggable
                onDragStart={(e) => handleDragStart(e, revIdx)}
                onDrop={(e) => handleDrop(e, revIdx)}
                onDragOver={handleDragOver}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    onSelect(
                      isSelected
                        ? selectedIds.filter((id) => id !== el.id)
                        : [...selectedIds, el.id]
                    );
                  } else {
                    onSelect([el.id]);
                  }
                }}
                title={`Click to select · ${title}: ${subtitle}`}
              >
                {/* Drag handle */}
                <span className="cdes-layer-drag" title="Drag to reorder">⋮⋮</span>

                {/* Type icon */}
                <span className="cdes-layer-icon">{icon}</span>

                {/* Info */}
                <div className="cdes-layer-info">
                  <div className="cdes-layer-name">{title}</div>
                  {subtitle && <div className="cdes-layer-sub">{subtitle}</div>}
                </div>

                {/* Lock toggle */}
                {onToggleLock && (
                  <button
                    type="button"
                    className={`cdes-layer-lock-btn ${el.locked ? "locked" : ""}`}
                    title={el.locked ? "Unlock element" : "Lock element"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLock(el.id);
                    }}
                  >
                    {el.locked ? "🔒" : "🔓"}
                  </button>
                )}

                {/* Visibility toggle */}
                <button
                  type="button"
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
                  type="button"
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
  onToggleLock: PropTypes.func,
  onDelete: PropTypes.func.isRequired,
  onReorder: PropTypes.func.isRequired,
};
