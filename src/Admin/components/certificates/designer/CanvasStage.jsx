import { useRef, useEffect, useCallback, useState } from "react";
import PropTypes from "prop-types";
import QRCode from "qrcode";
import { ELEMENT_TYPES } from "./elementSchema";
import { resolveParagraphContent, resolveFieldValue, parseTemplateText } from "../../../../utils/fieldMappingHelper";

// ── QR Code Preview Image ─────────────────────────────────────────────────────
function QrPreview({ certId, width, height }) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://www.abhyudayaclub.in";
    const url = `${origin}/verify/${certId || "PREVIEW"}`;
    QRCode.toDataURL(url, { margin: 1, width: Math.max(64, Math.round(width)), errorCorrectionLevel: "M" })
      .then(setDataUrl)
      .catch(() => {});
  }, [certId, width]);

  if (!dataUrl) {
    return (
      <div style={{ width: "100%", height: "100%", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#6366f1" }}>
        QR
      </div>
    );
  }
  return <img src={dataUrl} alt="QR" style={{ width: "100%", height: "100%", objectFit: "contain" }} draggable={false} />;
}
QrPreview.propTypes = { certId: PropTypes.string, width: PropTypes.number, height: PropTypes.number };

// ── Word-wrap helper (for paragraph preview in editor) ───────────────────────
function wrapText(text, containerPxWidth, fontSize, lineHeight) {
  // Simple character-estimation wrap (can't measure actual font)
  const avgCharWidth = fontSize * 0.55;
  const charsPerLine = Math.max(1, Math.floor(containerPxWidth / avgCharWidth));
  const words = (text || "").split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length > charsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ── Single Element Renderer ───────────────────────────────────────────────────
function RenderElement({
  el,
  scale,
  isSelected,
  isPreview,
  previewRow,
  mapping,
  previewOptions,
  onPointerDown,
  onResizePointerDown,
}) {
  const left = el.x * scale;
  const top = el.y * scale;
  const width = el.width * scale;
  const height = el.height * scale;
  const opacity = el.opacity !== undefined ? el.opacity : 1;
  const rotation = el.rotation || 0;

  const baseStyle = {
    position: "absolute",
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    opacity,
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
    transformOrigin: "top left",
    boxSizing: "border-box",
    pointerEvents: "all",
    cursor: el.locked ? "not-allowed" : "move",
    touchAction: "none",
    userSelect: "none",
  };

  const selectionStyle = isSelected ? {
    outline: "2px solid #6366f1",
    outlineOffset: "1px",
  } : {};

  // ── TEXT / DYNAMIC TEXT ─────────────────────────────────────────────────
  if (el.type === ELEMENT_TYPES.TEXT || el.type === ELEMENT_TYPES.DYNAMIC_TEXT) {
    const fontSize = Math.max(6, (el.fontSize || 32) * scale);
    const rawContent = el.type === ELEMENT_TYPES.TEXT ? (el.content || "Text") : (el.variable || "{{variable}}");
    const runs = parseTemplateText(rawContent, {
      mapping,
      row: isPreview ? previewRow : null,
      options: previewOptions,
      autoBoldVariables: el.autoBoldVariables !== false,
      isPreview,
      baseFontWeight: el.fontWeight || (el.type === ELEMENT_TYPES.DYNAMIC_TEXT ? "700" : "400"),
    });

    return (
      <div
        className={`cdes-element-box ${isSelected ? "selected" : ""}`}
        style={{
          ...baseStyle,
          ...selectionStyle,
          fontFamily: el.fontFamily || "'Inter', sans-serif",
          fontSize: `${fontSize}px`,
          fontWeight: el.fontWeight || "400",
          fontStyle: el.fontStyle || "normal",
          textDecoration: el.textDecoration || "none",
          color: el.color || "#1e293b",
          textAlign: el.align || "center",
          letterSpacing: `${(el.letterSpacing || 0) * scale}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: el.align === "left" ? "flex-start" : el.align === "right" ? "flex-end" : "center",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
        onPointerDown={(e) => onPointerDown(e, el.id, "drag")}
      >
        {!isSelected && !isPreview && el.type === ELEMENT_TYPES.DYNAMIC_TEXT && (
          <span className="cdes-element-type-tag">{el.type === ELEMENT_TYPES.DYNAMIC_TEXT ? "{}" : "T"}</span>
        )}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {runs.map((run, rIdx) => (
            <span
              key={rIdx}
              style={{
                fontWeight: run.bold ? "700" : (el.fontWeight || "400"),
              }}
            >
              {run.value}
            </span>
          ))}
        </span>
        {isSelected && !el.locked && (
          <div className="cdes-resize-handle" onPointerDown={(e) => onResizePointerDown(e, el.id)} />
        )}
      </div>
    );
  }

  // ── PARAGRAPH ─────────────────────────────────────────────────────────────
  if (el.type === ELEMENT_TYPES.PARAGRAPH) {
    const fontSize = Math.max(6, (el.fontSize || 26) * scale);
    const rawContent = el.content || "";
    const runs = parseTemplateText(rawContent, {
      mapping,
      row: isPreview ? previewRow : null,
      options: previewOptions,
      autoBoldVariables: el.autoBoldVariables !== false,
      isPreview,
      baseFontWeight: el.fontWeight || "400",
    });

    const fullResolvedText = runs.map((r) => r.value).join("");
    const lineHeight = el.lineHeight || 1.6;
    const lineHeightPx = fontSize * lineHeight;
    const totalTextHeight = wrapText(fullResolvedText, width, fontSize, lineHeight).length * lineHeightPx;
    const overflowing = totalTextHeight > height;

    const vertAlign = el.verticalAlign || "middle";
    const justifyContent = vertAlign === "top" ? "flex-start" : vertAlign === "bottom" ? "flex-end" : "center";

    return (
      <div
        className={`cdes-element-box cdes-para-box ${isSelected ? "selected" : ""}`}
        style={{
          ...baseStyle,
          ...selectionStyle,
          fontFamily: el.fontFamily || "'Inter', sans-serif",
          fontSize: `${fontSize}px`,
          fontWeight: el.fontWeight || "400",
          fontStyle: el.fontStyle || "normal",
          textDecoration: el.textDecoration || "none",
          color: el.color || "#1e293b",
          textAlign: el.align || "center",
          lineHeight: lineHeight,
          letterSpacing: `${(el.letterSpacing || 0) * scale}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent,
          overflow: "hidden",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
        onPointerDown={(e) => onPointerDown(e, el.id, "drag")}
      >
        {!isSelected && !isPreview && (
          <span className="cdes-element-type-tag">¶</span>
        )}
        <span>
          {runs.map((run, rIdx) => (
            <span
              key={rIdx}
              style={{
                fontWeight: run.bold ? "700" : (el.fontWeight || "400"),
              }}
            >
              {run.value}
            </span>
          ))}
        </span>
        {overflowing && !isPreview && (
          <div className="cdes-overflow-warn" title="Text overflows the box">⚠ Overflow</div>
        )}
        {isSelected && !el.locked && (
          <div className="cdes-resize-handle" onPointerDown={(e) => onResizePointerDown(e, el.id)} />
        )}
      </div>
    );
  }

  // ── IMAGE / SIGNATURE ────────────────────────────────────────────────────
  if (el.type === ELEMENT_TYPES.IMAGE || el.type === ELEMENT_TYPES.SIGNATURE) {
    const imgSrc = el.src || el.storageUrl;
    return (
      <div
        className={`cdes-element-box ${isSelected ? "selected" : ""}`}
        style={{ ...baseStyle, ...selectionStyle }}
        onPointerDown={(e) => onPointerDown(e, el.id, "drag")}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={el.type}
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: el.objectFit || "contain", display: "block" }}
          />
        ) : (
          <div className="cdes-img-placeholder">
            {el.type === ELEMENT_TYPES.SIGNATURE ? "✒ Signature" : "⊞ Image"}
          </div>
        )}
        {isSelected && !el.locked && (
          <div className="cdes-resize-handle" onPointerDown={(e) => onResizePointerDown(e, el.id)} />
        )}
      </div>
    );
  }

  // ── QR CODE ──────────────────────────────────────────────────────────────
  if (el.type === ELEMENT_TYPES.QR) {
    const certId = isPreview && previewOptions?.certificateId
      ? previewOptions.certificateId
      : "PREVIEW";

    return (
      <div
        className={`cdes-element-box ${isSelected ? "selected" : ""}`}
        style={{ ...baseStyle, ...selectionStyle, padding: 0 }}
        onPointerDown={(e) => onPointerDown(e, el.id, "drag")}
      >
        <QrPreview certId={certId} width={width} height={height} />
        {isSelected && !el.locked && (
          <div className="cdes-resize-handle cdes-resize-square" onPointerDown={(e) => onResizePointerDown(e, el.id)} />
        )}
      </div>
    );
  }

  // ── SHAPE ─────────────────────────────────────────────────────────────────
  if (el.type === ELEMENT_TYPES.SHAPE) {
    const fill = !el.fillColor || el.fillColor === "transparent" ? "transparent" : el.fillColor;
    const border = el.borderWidth > 0 ? `${el.borderWidth * scale}px solid ${el.borderColor || "#c0a060"}` : "none";
    const isCircle = el.shape === "circle";
    const radius = isCircle ? "50%" : `${(el.borderRadius || 0) * scale}px`;

    return (
      <div
        className={`cdes-element-box ${isSelected ? "selected" : ""}`}
        style={{
          ...baseStyle,
          ...selectionStyle,
          background: fill,
          border,
          borderRadius: radius,
        }}
        onPointerDown={(e) => onPointerDown(e, el.id, "drag")}
      >
        {isSelected && !el.locked && (
          <div className="cdes-resize-handle" onPointerDown={(e) => onResizePointerDown(e, el.id)} />
        )}
      </div>
    );
  }

  // ── LINE ─────────────────────────────────────────────────────────────────
  if (el.type === ELEMENT_TYPES.LINE) {
    const thickness = (el.thickness || 3) * scale;
    return (
      <div
        className={`cdes-element-box ${isSelected ? "selected" : ""}`}
        style={{
          ...baseStyle,
          ...selectionStyle,
          height: `${Math.max(thickness, height)}px`,
          background: el.color || "#c0a060",
        }}
        onPointerDown={(e) => onPointerDown(e, el.id, "drag")}
      >
        {isSelected && !el.locked && (
          <div className="cdes-resize-handle" onPointerDown={(e) => onResizePointerDown(e, el.id)} />
        )}
      </div>
    );
  }

  return null;
}

RenderElement.propTypes = {
  el: PropTypes.object.isRequired,
  scale: PropTypes.number.isRequired,
  isSelected: PropTypes.bool,
  isPreview: PropTypes.bool,
  previewRow: PropTypes.object,
  mapping: PropTypes.object,
  previewOptions: PropTypes.object,
  onPointerDown: PropTypes.func.isRequired,
  onResizePointerDown: PropTypes.func.isRequired,
};

// ── Canvas Stage ─────────────────────────────────────────────────────────────
export default function CanvasStage({
  template,
  elements,
  selectedIds,
  isPreview,
  previewRow,
  mapping,
  previewOptions,
  onSelectIds,
  onUpdateElement,
}) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const dragRef = useRef(null);

  const originalWidth = Number(template?.originalWidth) || 1920;
  const originalHeight = Number(template?.originalHeight) || 1080;

  const updateSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0) setContainerWidth(rect.width);
    }
  }, []);

  useEffect(() => {
    updateSize();
    if (!containerRef.current) return;
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect?.width > 0) setContainerWidth(entry.contentRect.width);
        }
      });
      ro.observe(containerRef.current);
    }
    window.addEventListener("resize", updateSize);
    return () => {
      window.removeEventListener("resize", updateSize);
      if (ro) ro.disconnect();
    };
  }, [updateSize]);

  const scale = containerWidth > 0 ? containerWidth / originalWidth : 1;
  const displayHeight = Math.round(originalHeight * scale);

  const handlePointerDown = useCallback((e, elId, mode) => {
    if (e.button !== 0 && e.button !== undefined) return;
    e.stopPropagation();
    e.preventDefault();

    const el = elements.find((x) => x.id === elId);
    if (!el || el.locked) return;

    // Selection logic
    if (e.ctrlKey || e.metaKey) {
      // Multi-select toggle
      onSelectIds(
        selectedIds.includes(elId)
          ? selectedIds.filter((id) => id !== elId)
          : [...selectedIds, elId]
      );
    } else if (!selectedIds.includes(elId)) {
      onSelectIds([elId]);
    }

    dragRef.current = {
      elId,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      initialX: el.x,
      initialY: el.y,
      initialWidth: el.width,
      initialHeight: el.height,
    };

    const onMove = (moveEvt) => {
      if (!dragRef.current) return;
      const { elId: dId, mode: dMode, startX, startY, initialX, initialY, initialWidth, initialHeight } = dragRef.current;
      const dx = (moveEvt.clientX - startX) / scale;
      const dy = (moveEvt.clientY - startY) / scale;

      if (dMode === "drag") {
        onUpdateElement(dId, {
          x: Math.round(initialX + dx),
          y: Math.round(initialY + dy),
        });
      } else if (dMode === "resize") {
        onUpdateElement(dId, {
          width: Math.max(20, Math.round(initialWidth + dx)),
          height: Math.max(10, Math.round(initialHeight + dy)),
        });
      }
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, [elements, selectedIds, onSelectIds, onUpdateElement, scale]);

  const handleResizePointerDown = useCallback((e, elId) => {
    e.stopPropagation();
    handlePointerDown(e, elId, "resize");
  }, [handlePointerDown]);

  // Click on background to deselect
  const handleStageClick = (e) => {
    if (e.target === e.currentTarget || e.target.classList.contains("cdes-canvas-bg")) {
      onSelectIds([]);
    }
  };

  return (
    <div className="cdes-canvas-wrap" ref={containerRef}>
      <div
        className="cdes-canvas-stage"
        style={{ height: `${displayHeight}px`, width: "100%", position: "relative" }}
        onClick={handleStageClick}
      >
        {/* Background Image */}
        <img
          src={template?.previewUrl}
          alt="Certificate Background"
          className="cdes-canvas-bg"
          onLoad={updateSize}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", userSelect: "none" }}
        />

        {/* Elements rendered strictly by array order (layer order) */}
        {elements
          .filter((el) => el.visible !== false)
          .map((el) => (
            <RenderElement
              key={el.id}
              el={el}
              scale={scale}
              isSelected={selectedIds.includes(el.id)}
              isPreview={isPreview}
              previewRow={previewRow}
              mapping={mapping}
              previewOptions={previewOptions}
              onPointerDown={handlePointerDown}
              onResizePointerDown={handleResizePointerDown}
            />
          ))}
      </div>

      <div className="cdes-canvas-footer">
        <span>Zoom: {Math.round(scale * 100)}% · Canvas: {originalWidth} × {originalHeight}px</span>
      </div>
    </div>
  );
}

CanvasStage.propTypes = {
  template: PropTypes.object.isRequired,
  elements: PropTypes.array.isRequired,
  selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  isPreview: PropTypes.bool,
  previewRow: PropTypes.object,
  mapping: PropTypes.object,
  previewOptions: PropTypes.object,
  onSelectIds: PropTypes.func.isRequired,
  onUpdateElement: PropTypes.func.isRequired,
};
