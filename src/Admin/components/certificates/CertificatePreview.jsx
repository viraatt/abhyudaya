import { useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { resolveFieldValue } from "../../../utils/fieldMappingHelper";

export default function CertificatePreview({
  template,
  fields,
  dataset,
  mapping,
  onBack,
  eventName = "",
  eventDate = "",
}) {
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
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
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [updateScale]);

  const originalWidth = template?.originalWidth || 1920;
  const originalHeight = template?.originalHeight || 1080;
  const scale = containerWidth / originalWidth;
  const displayHeight = originalHeight * scale;

  return (
    <div className="cert-preview-wrapper">
      <div className="cp-header">
        <div>
          <h3>Step 4: Live Certificate Preview</h3>
          <p>
            Verify that your mapped participant data renders accurately with the chosen
            fonts, alignments, and colors on top of the certificate template.
          </p>
        </div>

        {/* Participant Switcher */}
        {totalParticipants > 1 && (
          <div className="cp-switcher">
            <button
              type="button"
              className="cp-nav-btn"
              disabled={currentRowIndex === 0}
              onClick={() => setCurrentRowIndex((prev) => Math.max(0, prev - 1))}
            >
              ← Previous
            </button>

            <span className="cp-page-label">
              Participant {currentRowIndex + 1} of {totalParticipants}
            </span>

            <button
              type="button"
              className="cp-nav-btn"
              disabled={currentRowIndex === totalParticipants - 1}
              onClick={() =>
                setCurrentRowIndex((prev) =>
                  Math.min(totalParticipants - 1, prev + 1)
                )
              }
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Part 3 Success Milestone Alert */}
      <div className="cert-alert cert-alert--success cp-milestone-banner">
        <span className="cert-alert-icon">🎉</span>
        <div>
          <strong>Part 3 Milestone Complete!</strong>
          <p>
            Participant data successfully parsed and mapped across {totalParticipants}{" "}
            participants and {fields.length} dynamic template variables. Generation will be
            unlocked in the upcoming generation phase.
          </p>
        </div>
      </div>

      {/* Visual Live Certificate Preview Canvas */}
      <div className="cp-canvas-wrapper">
        <div
          ref={canvasContainerRef}
          className="cp-canvas-stage"
          style={{ height: `${displayHeight}px` }}
        >
          <img
            src={template?.previewUrl}
            alt="Certificate Background"
            className="cp-canvas-bg"
            onLoad={updateScale}
            draggable={false}
          />

          {fields.map((field) => {
            const left = field.x * scale;
            const top = field.y * scale;
            const width = field.width * scale;
            const height = field.height * scale;
            const fontSize = Math.max(9, (field.fontSize || 32) * scale);

            const resolvedText = resolveFieldValue(
              field,
              mapping,
              currentRow,
              {
                eventName,
                eventDate,
                rowIndex: currentRowIndex,
              }
            );

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
      </div>

      {/* Active Participant Data Chips */}
      <div className="cp-data-summary">
        <h4>Data Snapshot for Participant #{currentRowIndex + 1}</h4>
        <div className="cp-data-chips">
          {Object.entries(currentRow).map(([col, val]) => (
            <div key={col} className="cp-data-chip">
              <span className="cp-chip-col">{col}:</span>
              <span className="cp-chip-val">{val || "—"}</span>
            </div>
          ))}
        </div>
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
  eventName: PropTypes.string,
  eventDate: PropTypes.string,
};
