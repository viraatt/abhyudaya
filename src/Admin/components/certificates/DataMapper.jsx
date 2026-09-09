import { useMemo } from "react";
import PropTypes from "prop-types";
import { validateMapping, resolveFieldValue } from "../../../utils/fieldMappingHelper";

export default function DataMapper({
  fields = [],
  dataset,
  mapping = {},
  onMappingChange,
  onBack,
  onContinue,
  eventName = "",
  eventDate = "",
}) {
  const columns = dataset?.columns || [];
  const previewRows = dataset?.previewRows || [];
  const totalRows = dataset?.totalRows || 0;
  const duplicates = dataset?.duplicates || [];
  const emptyRowsSkipped = dataset?.emptyRowsSkipped || 0;

  // Real-time validation
  const validation = useMemo(() => {
    return validateMapping(fields, mapping);
  }, [fields, mapping]);

  const handleFieldChange = (variable, columnKey) => {
    const rawVar = String(variable).replace(/^\{\{|\}\}$/g, "").trim();
    onMappingChange({
      ...mapping,
      [rawVar]: columnKey,
    });
  };

  return (
    <div className="data-mapper-wrapper">
      <div className="dm-header">
        <div>
          <h3>Step 3: Map Certificate Variables to Columns</h3>
          <p>
            Verify that each certificate variable points to the corresponding column
            in your spreadsheet. Fields are auto-mapped based on column names.
          </p>
        </div>
      </div>

      {/* Ingestion & Validation Metrics Banner */}
      <div className="dm-metrics-container">
        <div className="dm-metric-pill dm-metric-pill--participants">
          <span className="dm-pill-icon">✓</span>
          <span>{totalRows} participants found</span>
        </div>

        <div className="dm-metric-pill dm-metric-pill--columns">
          <span className="dm-pill-icon">✓</span>
          <span>{columns.length} columns detected</span>
        </div>

        {validation.isValid ? (
          <div className="dm-metric-pill dm-metric-pill--success">
            <span className="dm-pill-icon">✓</span>
            <span>All required fields mapped</span>
          </div>
        ) : (
          <div className="dm-metric-pill dm-metric-pill--warning">
            <span className="dm-pill-icon">⚠️</span>
            <span>{validation.unmappedFields.length} unmapped field(s)</span>
          </div>
        )}
      </div>

      {/* Duplicate / Empty Row Intelligence Warnings */}
      {duplicates.length > 0 && (
        <div className="cert-alert cert-alert--warning" role="alert">
          <span className="cert-alert-icon">⚠️</span>
          <div>
            <strong>Notice: {duplicates.length} duplicate record(s) detected.</strong>
            <p>
              e.g. {duplicates[0].reason}
              {duplicates.length > 1 && ` and ${duplicates.length - 1} more.`}
            </p>
          </div>
        </div>
      )}

      {emptyRowsSkipped > 0 && (
        <div className="cert-alert cert-alert--info">
          <span>ℹ️ Automatically skipped {emptyRowsSkipped} completely empty row(s).</span>
        </div>
      )}

      {/* Validation Gate Errors Banner */}
      {!validation.isValid && (
        <div className="cert-alert cert-alert--error dm-validation-alert" role="alert">
          <span className="cert-alert-icon">🚫</span>
          <div className="dm-validation-content">
            <strong>Required fields are missing column mappings:</strong>
            <ul className="dm-errors-list">
              {validation.errors.map((errMsg, idx) => (
                <li key={idx} className="dm-error-item">
                  <strong>{errMsg}</strong>
                </li>
              ))}
            </ul>
            <p className="dm-error-hint">
              Select the matching spreadsheet column below before proceeding to preview.
            </p>
          </div>
        </div>
      )}

      {/* Variable Mapping Table */}
      <div className="dm-mapping-card">
        <div className="dm-card-header">
          <h4>Field Mapping Matrix</h4>
          <span className="dm-subtext">
            {fields.length} dynamic field(s) in certificate template
          </span>
        </div>

        <div className="dm-table-wrap">
          <table className="dm-mapping-table">
            <thead>
              <tr>
                <th>Certificate Variable</th>
                <th style={{ width: "40px", textAlign: "center" }}></th>
                <th>Spreadsheet Column</th>
                <th>Sample Value (Row 1)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => {
                const rawVar = String(field.variable || "").replace(/^\{\{|\}\}$/g, "").trim();
                const currentMapped = mapping[rawVar] || "";
                const isMapped = currentMapped && currentMapped !== "__none__";
                const isRequired = field.required !== false;
                const sampleRow = previewRows[0] || {};
                const resolvedSample = isMapped
                  ? resolveFieldValue(field, mapping, sampleRow, {
                      eventName,
                      eventDate,
                      rowIndex: 0,
                    })
                  : "";

                return (
                  <tr key={field.id} className={!isMapped && isRequired ? "row-unmapped" : ""}>
                    {/* Certificate Variable */}
                    <td className="dm-cell-var">
                      <div className="dm-var-badge">
                        <code>{field.variable}</code>
                      </div>
                      <span className="dm-var-label">{field.label}</span>
                      {isRequired && <span className="dm-required-tag">*Required</span>}
                    </td>

                    {/* Arrow */}
                    <td className="dm-cell-arrow">
                      <span>→</span>
                    </td>

                    {/* Spreadsheet Column Dropdown */}
                    <td className="dm-cell-select">
                      <select
                        className={`dm-select ${!isMapped && isRequired ? "dm-select--error" : ""}`}
                        value={currentMapped}
                        onChange={(e) => handleFieldChange(field.variable, e.target.value)}
                        aria-label={`Map column for ${field.variable}`}
                      >
                        <option value="">-- Select Spreadsheet Column --</option>
                        <optgroup label="Spreadsheet Columns">
                          {columns.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Special Values">
                          {rawVar.toLowerCase().includes("id") && (
                            <option value="__auto_id__">
                              ⚡ Auto-generate Certificate IDs (ABH-0001)
                            </option>
                          )}
                          <option value="__fixed_event__">📌 Use Event Name</option>
                          <option value="__fixed_date__">📅 Use Event Date</option>
                          <option value="__none__">🚫 Leave Blank / None</option>
                        </optgroup>
                      </select>
                    </td>

                    {/* Sample Value from Row 1 */}
                    <td className="dm-cell-sample">
                      {isMapped ? (
                        <span className="dm-sample-val" title={resolvedSample}>
                          {resolvedSample || <em className="dm-empty-val">(empty in row 1)</em>}
                        </span>
                      ) : (
                        <span className="dm-sample-unmapped">Unmapped</span>
                      )}
                    </td>

                    {/* Status indicator */}
                    <td className="dm-cell-status">
                      {isMapped ? (
                        <span className="dm-status-tag dm-status-tag--mapped">
                          ✓ Mapped
                        </span>
                      ) : isRequired ? (
                        <span className="dm-status-tag dm-status-tag--missing">
                          ⚠️ Required
                        </span>
                      ) : (
                        <span className="dm-status-tag dm-status-tag--optional">
                          Optional
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview First Several Rows Table */}
      <div className="dm-preview-card">
        <div className="dm-card-header">
          <h4>Spreadsheet Data Preview (First {previewRows.length} Rows)</h4>
          <span className="dm-subtext">Total {totalRows} participant rows parsed</span>
        </div>

        <div className="dm-preview-table-wrap">
          <table className="dm-preview-table">
            <thead>
              <tr>
                <th style={{ width: "50px" }}>#</th>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, rIdx) => (
                <tr key={rIdx}>
                  <td className="dm-row-index">{rIdx + 1}</td>
                  {columns.map((col) => (
                    <td key={col} className="dm-preview-cell">
                      {row[col] || <span className="dm-empty-dash">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step Footer Navigation */}
      <div className="cert-step-footer">
        <button
          type="button"
          className="admin-btn admin-btn--outline"
          onClick={onBack}
        >
          [ Back ]
        </button>

        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={!validation.isValid}
          onClick={onContinue}
          title={
            validation.isValid
              ? "Continue to Certificate Live Preview"
              : `Cannot continue: ${validation.errors.join("; ")}`
          }
        >
          [ Continue to Preview ]
        </button>
      </div>
    </div>
  );
}

DataMapper.propTypes = {
  fields: PropTypes.array.isRequired,
  dataset: PropTypes.object.isRequired,
  mapping: PropTypes.object.isRequired,
  onMappingChange: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onContinue: PropTypes.func.isRequired,
  eventName: PropTypes.string,
  eventDate: PropTypes.string,
};
