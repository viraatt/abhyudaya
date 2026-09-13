import { useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import QRCode from "qrcode";
import { resolveFieldValue, resolveParagraphContent, parseTemplateText } from "../../../utils/fieldMappingHelper";
import { ELEMENT_TYPES } from "./designer/elementSchema";

function QrPreviewImage({ certId }) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://www.abhyudayaclub.in";
    const url = `${origin}/verify/${certId}`;
    QRCode.toDataURL(url, { margin: 1, width: 256 })
      .then(setDataUrl)
      .catch((err) => console.warn("QR preview error:", err));
  }, [certId]);

  return dataUrl ? (
    <img src={dataUrl} alt={`Verification QR for ${certId}`} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
  ) : (
    <div style={{ width: "100%", height: "100%", background: "rgba(255,255,255,0.9)", display: "grid", placeItems: "center", fontSize: "10px", color: "#6366f1" }}>QR</div>
  );
}
QrPreviewImage.propTypes = { certId: PropTypes.string.isRequired };

/**
 * Renders a single element for the preview canvas.
 * Supports all v2 element types + backward-compat field objects.
 */
function PreviewElement({ field, scale, mapping, currentRow, options }) {
  const left = field.x * scale;
  const top = field.y * scale;
  const width = field.width * scale;
  const height = field.height * scale;
  const opacity = field.opacity !== undefined ? field.opacity : 1;
  const rotation = field.rotation || 0;

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
    overflow: "hidden",
    pointerEvents: "none",
  };

  // ── QR ──
  const isQr = field.isQr || field.variable === "{{qrCode}}" || field.type === ELEMENT_TYPES.QR;
  if (isQr) {
    const certId = resolveFieldValue({ variable: "{{certificateId}}" }, mapping, currentRow, options) ||
      `ABH-CERT${new Date().getFullYear().toString().slice(-2)}-${String((options.rowIndex || 0) + 1).padStart(4, "0")}`;
    return (
      <div key={field.id} style={{ ...baseStyle, padding: 0 }}>
        <QrPreviewImage certId={certId} />
      </div>
    );
  }

  // ── PARAGRAPH ──
  if (field.type === ELEMENT_TYPES.PARAGRAPH) {
    const fontSize = Math.max(6, (field.fontSize || 26) * scale);
    const lineHeight = field.lineHeight || 1.6;
    const runs = parseTemplateText(field.content || "", {
      mapping,
      row: currentRow,
      options,
      autoBoldVariables: field.autoBoldVariables !== false,
      isPreview: true,
      baseFontWeight: field.fontWeight || "400",
    });
    const vertAlign = field.verticalAlign || "middle";
    return (
      <div
        key={field.id}
        style={{
          ...baseStyle,
          fontFamily: field.fontFamily || "'Inter', sans-serif",
          fontSize: `${fontSize}px`,
          fontWeight: field.fontWeight || "400",
          fontStyle: field.fontStyle || "normal",
          textDecoration: field.textDecoration || "none",
          color: field.color || "#334155",
          textAlign: field.align || "center",
          lineHeight,
          letterSpacing: `${(field.letterSpacing || 0) * scale}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: vertAlign === "top" ? "flex-start" : vertAlign === "bottom" ? "flex-end" : "center",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        <span>
          {runs.map((run, rIdx) => (
            <span
              key={rIdx}
              style={{
                fontWeight: run.bold ? "700" : (field.fontWeight || "400"),
              }}
            >
              {run.value}
            </span>
          ))}
        </span>
      </div>
    );
  }

  // ── IMAGE / SIGNATURE ──
  if (field.type === ELEMENT_TYPES.IMAGE || field.type === ELEMENT_TYPES.SIGNATURE) {
    const src = field.src || field.storageUrl;
    return (
      <div key={field.id} style={baseStyle}>
        {src ? (
          <img src={src} alt={field.type} draggable={false} style={{ width: "100%", height: "100%", objectFit: field.objectFit || "contain" }} />
        ) : null}
      </div>
    );
  }

  // ── SHAPE ──
  if (field.type === ELEMENT_TYPES.SHAPE) {
    const fill = field.fillColor && field.fillColor !== "transparent" ? field.fillColor : "transparent";
    const border = field.borderWidth > 0 ? `${field.borderWidth * scale}px solid ${field.borderColor || "#c0a060"}` : "none";
    const isCircle = field.shape === "circle";
    return (
      <div
        key={field.id}
        style={{
          ...baseStyle,
          background: fill,
          border,
          borderRadius: isCircle ? "50%" : `${(field.borderRadius || 0) * scale}px`,
        }}
      />
    );
  }

  // ── LINE ──
  if (field.type === ELEMENT_TYPES.LINE) {
    const thickness = (field.thickness || 3) * scale;
    return (
      <div
        key={field.id}
        style={{
          ...baseStyle,
          height: `${Math.max(thickness, height)}px`,
          background: field.color || "#c0a060",
        }}
      />
    );
  }

  // ── STATIC TEXT ──
  if (field.type === ELEMENT_TYPES.TEXT) {
    const fontSize = Math.max(6, (field.fontSize || 32) * scale);
    const runs = parseTemplateText(field.content || "", {
      mapping,
      row: currentRow,
      options,
      autoBoldVariables: field.autoBoldVariables !== false,
      isPreview: true,
      baseFontWeight: field.fontWeight || "400",
    });
    return (
      <div
        key={field.id}
        style={{
          ...baseStyle,
          fontFamily: field.fontFamily || "'Inter', sans-serif",
          fontSize: `${fontSize}px`,
          fontWeight: field.fontWeight || "400",
          fontStyle: field.fontStyle || "normal",
          textDecoration: field.textDecoration || "none",
          color: field.color || "#1e293b",
          textAlign: field.align || "center",
          display: "flex",
          alignItems: "center",
          justifyContent: field.align === "left" ? "flex-start" : field.align === "right" ? "flex-end" : "center",
        }}
      >
        <span>
          {runs.map((run, rIdx) => (
            <span
              key={rIdx}
              style={{
                fontWeight: run.bold ? "700" : (field.fontWeight || "400"),
              }}
            >
              {run.value}
            </span>
          ))}
        </span>
      </div>
    );
  }

  // ── DYNAMIC TEXT / legacy field ──
  const fontSize = Math.max(6, (field.fontSize || 32) * scale);
  const rawVar = field.variable || field.defaultValue || "";
  const runs = parseTemplateText(rawVar, {
    mapping,
    row: currentRow,
    options,
    autoBoldVariables: field.autoBoldVariables !== false,
    isPreview: true,
    baseFontWeight: field.fontWeight || "700",
  });
  return (
    <div
      key={field.id}
      className="cp-field-rendered"
      style={{
        ...baseStyle,
        fontFamily: field.fontFamily || "'Cinzel', serif",
        fontSize: `${fontSize}px`,
        fontWeight: field.fontWeight || "600",
        fontStyle: field.fontStyle || "normal",
        color: field.color || "#1e293b",
        textAlign: field.align || "center",
        display: "flex",
        alignItems: "center",
        justifyContent: field.align === "left" ? "flex-start" : field.align === "right" ? "flex-end" : "center",
      }}
    >
      <span>
        {runs.map((run, rIdx) => (
          <span
            key={rIdx}
            style={{
              fontWeight: run.bold ? "700" : (field.fontWeight || "600"),
            }}
          >
            {run.value}
          </span>
        ))}
      </span>
    </div>
  );
}

PreviewElement.propTypes = {
  field: PropTypes.object.isRequired,
  scale: PropTypes.number.isRequired,
  mapping: PropTypes.object.isRequired,
  currentRow: PropTypes.object.isRequired,
  options: PropTypes.object.isRequired,
};

export default function CertificatePreview({
  template,
  fields,
  elements,
  dataset,
  mapping,
  onBack,
  onContinue,
  eventName = "",
  eventDate = "",
}) {
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const canvasContainerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);

  const rows = dataset?.rows || [];
  const totalParticipants = rows.length;
  const currentRow = rows[currentRowIndex] || {};

  const updateScale = useCallback(() => {
    if (canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      if (rect.width > 0) setContainerWidth(rect.width);
    }
  }, []);

  useEffect(() => {
    updateScale();
    if (!canvasContainerRef.current) return;
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect?.width > 0) setContainerWidth(entry.contentRect.width);
        }
      });
      ro.observe(canvasContainerRef.current);
    }
    window.addEventListener("resize", updateScale);
    return () => {
      window.removeEventListener("resize", updateScale);
      if (ro) ro.disconnect();
    };
  }, [updateScale]);

  const originalWidth = Number(template?.originalWidth) || 1920;
  const originalHeight = Number(template?.originalHeight) || 1080;
  const scale = containerWidth > 0 ? containerWidth / originalWidth : 1;
  const displayHeight = Math.round(originalHeight * scale);

  // Use elements[] if available (v2), otherwise fall back to fields[]
  const renderItems = (Array.isArray(elements) && elements.length > 0)
    ? elements.filter((el) => el.visible !== false)
    : (fields || []);

  const previewOptions = {
    eventName,
    eventDate,
    rowIndex: currentRowIndex,
    certificateId: resolveFieldValue({ variable: "{{certificateId}}" }, mapping, currentRow, { rowIndex: currentRowIndex }) ||
      `ABH-CERT${new Date().getFullYear().toString().slice(-2)}-${String(currentRowIndex + 1).padStart(4, "0")}`,
  };

  return (
    <div className="cert-preview-wrapper">
      <div className="cp-header">
        <div>
          <h3>Step 4: Live Certificate Preview & Inspection</h3>
          <p>
            Verify that your mapped participant data renders accurately with the exact
            positioning, fonts, alignments, and dimensions that will be produced in the final PDF.
          </p>
        </div>

        <div className="cp-controls-bar">
          <div className="cp-selector-wrap">
            <label htmlFor="participantSelector" className="cp-selector-label">Participant:</label>
            <select
              id="participantSelector"
              className="cp-participant-select"
              value={currentRowIndex}
              onChange={(e) => setCurrentRowIndex(Number(e.target.value))}
            >
              {rows.map((r, idx) => {
                const name =
                  resolveFieldValue({ variable: "{{name}}" }, mapping, r, { rowIndex: idx }) ||
                  r.Name || `Participant ${idx + 1}`;
                const roll =
                  resolveFieldValue({ variable: "{{rollNo}}" }, mapping, r, { rowIndex: idx }) ||
                  r.RollNo || "";
                return (
                  <option key={idx} value={idx}>
                    {name} {roll ? `(${roll})` : `(Row ${idx + 1})`}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="cp-switcher">
            <button type="button" className="cp-nav-btn" disabled={currentRowIndex === 0} onClick={() => setCurrentRowIndex((p) => Math.max(0, p - 1))}>← Previous</button>
            <span className="cp-page-label">{currentRowIndex + 1} / {totalParticipants}</span>
            <button type="button" className="cp-nav-btn" disabled={currentRowIndex === totalParticipants - 1} onClick={() => setCurrentRowIndex((p) => Math.min(totalParticipants - 1, p + 1))}>Next →</button>
          </div>
        </div>
      </div>

      <div className="cp-main-grid">
        <div className="cp-canvas-col">
          <div
            ref={canvasContainerRef}
            className="cp-canvas-stage"
            style={{ height: `${displayHeight}px`, aspectRatio: `${originalWidth} / ${originalHeight}` }}
          >
            <img
              src={template?.previewUrl}
              alt="Certificate Background"
              className="cp-canvas-bg"
              onLoad={updateScale}
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />

            {renderItems.map((field) => (
              <PreviewElement
                key={field.id}
                field={field}
                scale={scale}
                mapping={mapping}
                currentRow={currentRow}
                options={previewOptions}
              />
            ))}
          </div>

          <div className="cp-canvas-footer-info">
            <span>Preview scaled to {Math.round(scale * 100)}% · Master output: {originalWidth} × {originalHeight}px (PDF 1:1 match)</span>
          </div>
        </div>

        <div className="cp-side-col">
          <div className="cp-batch-card">
            <h4>Batch Summary</h4>
            <div className="cp-summary-stats">
              <div className="cp-stat-item"><span className="cp-stat-label">Participants</span><span className="cp-stat-value">{totalParticipants}</span></div>
              <div className="cp-stat-item"><span className="cp-stat-label">Template</span><span className="cp-stat-value">{originalWidth}×{originalHeight}</span></div>
              <div className="cp-stat-item"><span className="cp-stat-label">Elements</span><span className="cp-stat-value">{renderItems.length}</span></div>
              <div className="cp-stat-item"><span className="cp-stat-label">Event</span><span className="cp-stat-value" title={eventName || "Abhyudaya Event"}>{eventName || "Standard"}</span></div>
            </div>
          </div>

          <div className="cp-variables-card">
            <h4>Live Variable Substitutions</h4>
            <p className="cp-variables-desc">Values dynamically replaced for participant #{currentRowIndex + 1}:</p>
            <div className="cp-substitution-list">
              {(fields || []).map((field) => {
                if (field.isQr || field.type === "qr") return null;
                const resolvedVal = resolveFieldValue(field, mapping, currentRow, previewOptions);
                return (
                  <div key={field.id} className="cp-sub-item">
                    <span className="cp-sub-var">{field.variable || field.type}</span>
                    <span className="cp-sub-arrow">→</span>
                    <span className="cp-sub-val" title={resolvedVal}>{resolvedVal || <em className="cp-empty-dash">(empty)</em>}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="cp-data-summary">
            <h4>Spreadsheet Record</h4>
            <div className="cp-data-chips">
              {Object.entries(currentRow).map(([col, val]) => (
                <div key={col} className="cp-data-chip">
                  <span className="cp-chip-col">{col}:</span>
                  <span className="cp-chip-val">{val || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="cp-confirmation-bar">
        <label className="cp-confirm-label">
          <input type="checkbox" className="cp-confirm-checkbox" checked={isConfirmed} onChange={(e) => setIsConfirmed(e.target.checked)} />
          <span>I have inspected the certificate layout and verified that text placement and spreadsheet mappings are accurate for all {totalParticipants} participant(s).</span>
        </label>
      </div>

      <div className="cert-step-footer">
        <button type="button" className="admin-btn admin-btn--outline" onClick={onBack}>← Back to Field Mapping</button>
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          style={{
            background: isConfirmed ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : undefined,
            boxShadow: isConfirmed ? "0 4px 14px rgba(16, 185, 129, 0.4)" : undefined,
            opacity: isConfirmed ? 1 : 0.65,
          }}
          disabled={!isConfirmed || totalParticipants === 0}
          onClick={onContinue}
        >
          Generate All Certificates ({totalParticipants}) →
        </button>
      </div>
    </div>
  );
}

CertificatePreview.propTypes = {
  template: PropTypes.object.isRequired,
  fields: PropTypes.array,
  elements: PropTypes.array,
  dataset: PropTypes.object.isRequired,
  mapping: PropTypes.object.isRequired,
  onBack: PropTypes.func.isRequired,
  onContinue: PropTypes.func.isRequired,
  eventName: PropTypes.string,
  eventDate: PropTypes.string,
};
