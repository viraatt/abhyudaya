import { useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import QRCode from "qrcode";
import { resolveFieldValue } from "../../../utils/fieldMappingHelper";

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
    <img
      src={dataUrl}
      alt={`Verification QR Code for ${certId}`}
      style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
      title={`Scannable QR code linking to /verify/${certId}`}
    />
  ) : (
    <div style={{ width: "100%", height: "100%", background: "rgba(255,255,255,0.9)", display: "grid", placeItems: "center", fontSize: "10px", color: "#6366f1" }}>
      QR
    </div>
  );
}

QrPreviewImage.propTypes = {
  certId: PropTypes.string.isRequired,
};

export default function CertificatePreview({
  template,
  fields,
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
      if (rect.width > 0) {
        setContainerWidth(rect.width);
      }
    }
  }, []);

  useEffect(() => {
    updateScale();
    if (!canvasContainerRef.current) return;

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect && entry.contentRect.width > 0) {
            setContainerWidth(entry.contentRect.width);
          }
        }
      });
      resizeObserver.observe(canvasContainerRef.current);
    }

    window.addEventListener("resize", updateScale);
    return () => {
      window.removeEventListener("resize", updateScale);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [updateScale]);

  const originalWidth = Number(template?.originalWidth) || 1920;
  const originalHeight = Number(template?.originalHeight) || 1080;
  const scale = containerWidth > 0 ? containerWidth / originalWidth : 1;
  const displayHeight = Math.round(originalHeight * scale);

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

        {/* Participant Selector Dropdown & Previous / Next Controls */}
        <div className="cp-controls-bar">
          <div className="cp-selector-wrap">
            <label htmlFor="participantSelector" className="cp-selector-label">
              Participant:
            </label>
            <select
              id="participantSelector"
              className="cp-participant-select"
              value={currentRowIndex}
              onChange={(e) => setCurrentRowIndex(Number(e.target.value))}
              aria-label="Select participant to preview"
            >
              {rows.map((r, idx) => {
                const name =
                  resolveFieldValue({ variable: "{{name}}" }, mapping, r, { rowIndex: idx }) ||
                  r.Name ||
                  `Participant ${idx + 1}`;
                const roll =
                  resolveFieldValue({ variable: "{{rollNo}}" }, mapping, r, { rowIndex: idx }) ||
                  r.RollNo ||
                  "";
                return (
                  <option key={idx} value={idx}>
                    {name} {roll ? `(${roll})` : `(Row ${idx + 1})`}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="cp-switcher">
            <button
              type="button"
              className="cp-nav-btn"
              disabled={currentRowIndex === 0}
              onClick={() => setCurrentRowIndex((prev) => Math.max(0, prev - 1))}
              title="View previous participant"
            >
              ← Previous
            </button>

            <span className="cp-page-label">
              {currentRowIndex + 1} / {totalParticipants}
            </span>

            <button
              type="button"
              className="cp-nav-btn"
              disabled={currentRowIndex === totalParticipants - 1}
              onClick={() =>
                setCurrentRowIndex((prev) => Math.min(totalParticipants - 1, prev + 1))
              }
              title="View next participant"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      <div className="cp-main-grid">
        {/* Left Column: Visual Live Certificate Preview Canvas */}
        <div className="cp-canvas-col">
          <div
            ref={canvasContainerRef}
            className="cp-canvas-stage"
            style={{
              height: `${displayHeight}px`,
              aspectRatio: `${originalWidth} / ${originalHeight}`,
            }}
          >
            <img
              src={template?.previewUrl}
              alt="Certificate Background"
              className="cp-canvas-bg"
              onLoad={updateScale}
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />

            {fields.map((field) => {
              const left = field.x * scale;
              const top = field.y * scale;
              const width = field.width * scale;
              const height = field.height * scale;
              const fontSize = Math.max(9, (field.fontSize || 32) * scale);

              const activeCertId =
                resolveFieldValue({ variable: "{{certificateId}}" }, mapping, currentRow, { rowIndex: currentRowIndex }) ||
                `ABH-CERT${new Date().getFullYear().toString().slice(-2)}-${String(currentRowIndex + 1).padStart(4, "0")}`;

              const isQr = field.isQr || field.variable === "{{qrCode}}" || field.type === "qr";

              if (isQr) {
                return (
                  <div
                    key={field.id}
                    className="cp-field-rendered"
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                      padding: 0,
                    }}
                  >
                    <QrPreviewImage certId={activeCertId} />
                  </div>
                );
              }

              const resolvedText = resolveFieldValue(field, mapping, currentRow, {
                eventName,
                eventDate,
                rowIndex: currentRowIndex,
              });

              return (
                <div
                  key={field.id}
                  className="cp-field-rendered"
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    fontFamily: field.fontFamily || "'Cinzel', serif",
                    fontSize: `${fontSize}px`,
                    fontWeight: field.fontWeight || "600",
                    color: field.color || "#1e293b",
                    textAlign: field.align || "center",
                  }}
                >
                  {resolvedText}
                </div>
              );
            })}
          </div>

          <div className="cp-canvas-footer-info">
            <span>
              Preview scaled to {Math.round(scale * 100)}% • Master output: {originalWidth} × {originalHeight} px (PDF 1:1 match)
            </span>
          </div>
        </div>

        {/* Right Column: Live Variable Replacement Inspection Card */}
        <div className="cp-side-col">
          {/* Summary Info Card */}
          <div className="cp-batch-card">
            <h4>Batch Summary</h4>
            <div className="cp-summary-stats">
              <div className="cp-stat-item">
                <span className="cp-stat-label">Participants</span>
                <span className="cp-stat-value">{totalParticipants}</span>
              </div>
              <div className="cp-stat-item">
                <span className="cp-stat-label">Template</span>
                <span className="cp-stat-value">{originalWidth}×{originalHeight}</span>
              </div>
              <div className="cp-stat-item">
                <span className="cp-stat-label">Fields</span>
                <span className="cp-stat-value">{fields.length}</span>
              </div>
              <div className="cp-stat-item">
                <span className="cp-stat-label">Event</span>
                <span className="cp-stat-value" title={eventName || "Abhyudaya Event"}>
                  {eventName || "Standard"}
                </span>
              </div>
            </div>
          </div>

          <div className="cp-variables-card">
            <h4>Live Variable Substitutions</h4>
            <p className="cp-variables-desc">
              Values dynamically replaced for participant #{currentRowIndex + 1}:
            </p>

            <div className="cp-substitution-list">
              {fields.map((field) => {
                const resolvedVal = resolveFieldValue(field, mapping, currentRow, {
                  eventName,
                  eventDate,
                  rowIndex: currentRowIndex,
                });

                return (
                  <div key={field.id} className="cp-sub-item">
                    <span className="cp-sub-var">{field.variable}</span>
                    <span className="cp-sub-arrow">→</span>
                    <span className="cp-sub-val" title={resolvedVal}>
                      {resolvedVal || <em className="cp-empty-dash">(empty)</em>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Raw Participant Record Card */}
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

      {/* Confirmation Checkbox Bar */}
      <div className="cp-confirmation-bar">
        <label className="cp-confirm-label">
          <input
            type="checkbox"
            className="cp-confirm-checkbox"
            checked={isConfirmed}
            onChange={(e) => setIsConfirmed(e.target.checked)}
          />
          <span>
            I have inspected the certificate layout and verified that text placement and spreadsheet mappings are accurate for all {totalParticipants} participant(s).
          </span>
        </label>
      </div>

      {/* Action Footer */}
      <div className="cert-step-footer">
        <button
          type="button"
          className="admin-btn admin-btn--outline"
          onClick={onBack}
        >
          ← Back to Field Mapping
        </button>

        <button
          type="button"
          className="admin-btn admin-btn--primary"
          style={{
            background: isConfirmed
              ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
              : undefined,
            boxShadow: isConfirmed
              ? "0 4px 14px rgba(16, 185, 129, 0.4)"
              : undefined,
            opacity: isConfirmed ? 1 : 0.65,
          }}
          disabled={!isConfirmed || totalParticipants === 0}
          onClick={onContinue}
          title={
            !isConfirmed
              ? "Please check the confirmation box above to proceed"
              : "Generate All Certificates"
          }
        >
          Generate All Certificates ({totalParticipants}) →
        </button>
      </div>
    </div>
  );
}

CertificatePreview.propTypes = {
  template: PropTypes.object.isRequired,
  fields: PropTypes.array.isRequired,
  dataset: PropTypes.object.isRequired,
  mapping: PropTypes.object.isRequired,
  onBack: PropTypes.func.isRequired,
  onContinue: PropTypes.func.isRequired,
  eventName: PropTypes.string,
  eventDate: PropTypes.string,
};
