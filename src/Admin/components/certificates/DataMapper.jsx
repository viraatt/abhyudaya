import { useEffect, useMemo } from "react";
import DataUploader from "./DataUploader";

export default function DataMapper({
  templateConfig,
  dataset,
  dataMapping,
  onDatasetParsed,
  onUpdateMapping,
  onNext,
  onBack,
}) {
  const fields = useMemo(() => templateConfig.fields || [], [templateConfig.fields]);
  const columns = useMemo(() => dataset?.columns || [], [dataset?.columns]);

  // Heuristic auto-matching when dataset is first uploaded
  useEffect(() => {
    if (!dataset?.columns || dataset.columns.length === 0) return;

    const colsLower = dataset.columns.map((c) => ({
      raw: c,
      lower: c.toLowerCase().replace(/[^a-z0-9]/g, ""),
    }));

    onUpdateMapping((prevMapping) => {
      const newMapping = { ...prevMapping };

      fields.forEach((field) => {
        // If already mapped and valid, keep it
        if (newMapping[field.id] && dataset.columns.includes(newMapping[field.id])) {
          return;
        }

        // Check heuristics
        const fKey = (field.key || field.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

        const match = colsLower.find((c) => {
          if (c.lower === fKey) return true;
          if (fKey.includes("name") && (c.lower.includes("name") || c.lower === "student")) return true;
          if (fKey.includes("roll") && (c.lower.includes("roll") || c.lower.includes("regno"))) return true;
          if (fKey.includes("event") && c.lower.includes("event")) return true;
          if (fKey.includes("date") && c.lower.includes("date")) return true;
          if (fKey.includes("cert") && c.lower.includes("cert")) return true;
          return false;
        });

        if (match) {
          newMapping[field.id] = match.raw;
        } else {
          // Fallback for special auto fields
          if (field.id === "field_id" || field.key === "certificateId") {
            newMapping[field.id] = "__auto_id__";
          } else if (field.id === "field_event" || field.key === "eventName") {
            newMapping[field.id] = "__fixed_event__";
          } else if (field.id === "field_date" || field.key === "eventDate") {
            newMapping[field.id] = "__fixed_date__";
          }
        }
      });

      return newMapping;
    });
  }, [dataset, fields, onUpdateMapping]);

  const handleSelectMapping = (fieldId, column) => {
    onUpdateMapping({
      ...dataMapping,
      [fieldId]: column,
    });
  };

  // Check validation
  const nameField = fields.find((f) => f.id === "field_name" || f.key === "name");
  const isNameMapped =
    nameField &&
    dataMapping[nameField.id] &&
    dataMapping[nameField.id] !== "" &&
    dataMapping[nameField.id] !== "__none__";

  const hasData = dataset?.rows && dataset.rows.length > 0;
  const canProceed = hasData && isNameMapped;

  // Sample row 1
  const firstRow = dataset?.rows?.[0] || {};

  return (
    <div className="data-mapper-step">
      <div className="wizard-step-header">
        <h3>Step 3: Upload Participant Data & Map Fields</h3>
        <p>
          Upload a participant CSV/Excel list, then map each certificate text field
          to the corresponding spreadsheet column.
        </p>
      </div>

      <div className="data-step-layout">
        {/* Data Uploader */}
        <DataUploader dataset={dataset} onDatasetParsed={onDatasetParsed} />

        {/* Column Mapping Table */}
        {hasData && (
          <div>
            <h4
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: "0.85rem",
              }}
            >
              Field Mapping Configuration
            </h4>

            <div className="mapping-table-wrap">
              <table className="mapping-table">
                <thead>
                  <tr>
                    <th>Certificate Field</th>
                    <th>Type / Key</th>
                    <th>Mapped Spreadsheet Column</th>
                    <th>Sample Value (Row 1)</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field) => {
                    const currentMapping = dataMapping[field.id] || "";
                    let sampleVal = "-";

                    if (currentMapping === "__auto_id__") {
                      sampleVal = `Auto-ID (e.g. ABH-${templateConfig.eventName?.slice(0, 4) || "EVNT"}-0001)`;
                    } else if (currentMapping === "__fixed_event__") {
                      sampleVal = templateConfig.eventName || "(Fixed Template Event)";
                    } else if (currentMapping === "__fixed_date__") {
                      sampleVal = templateConfig.eventDate || "(Fixed Template Date)";
                    } else if (currentMapping && firstRow[currentMapping] !== undefined) {
                      sampleVal = firstRow[currentMapping] || "(empty cell)";
                    }

                    return (
                      <tr key={field.id}>
                        <td>
                          <strong>{field.name}</strong>
                          {field.isRequired && (
                            <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>
                          )}
                        </td>
                        <td>
                          <span className="field-badge-tag">{field.key || field.id}</span>
                        </td>
                        <td>
                          <select
                            className="mapping-select"
                            value={currentMapping}
                            onChange={(e) =>
                              handleSelectMapping(field.id, e.target.value)
                            }
                          >
                            <option value="">-- Choose Column --</option>
                            {columns.map((col) => (
                              <option key={col} value={col}>
                                Column: {col}
                              </option>
                            ))}
                            <optgroup label="Special Values">
                              {(field.id === "field_id" ||
                                field.key === "certificateId") && (
                                <option value="__auto_id__">
                                  ⚡ Auto-generate Certificate ID
                                </option>
                              )}
                              <option value="__fixed_event__">
                                📌 Fixed Event Name ({templateConfig.eventName})
                              </option>
                              <option value="__fixed_date__">
                                📅 Fixed Event Date ({templateConfig.eventDate})
                              </option>
                              <option value="__none__">🚫 Leave Blank</option>
                            </optgroup>
                          </select>
                        </td>
                        <td>
                          <span className="sample-val-text">{sampleVal}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Preview of first 3 rows in data */}
            <div style={{ marginTop: "1.5rem" }}>
              <h5 style={{ fontSize: "0.9rem", color: "#475569", marginBottom: "0.5rem" }}>
                Data Preview (First {Math.min(3, dataset.rows.length)} of {dataset.totalRows} records):
              </h5>
              <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                <table className="mapping-table" style={{ fontSize: "0.82rem" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "0.5rem 0.75rem" }}>#</th>
                      {columns.map((col) => (
                        <th key={col} style={{ padding: "0.5rem 0.75rem" }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataset.rows.slice(0, 3).map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: "0.5rem 0.75rem" }}>{i + 1}</td>
                        {columns.map((col) => (
                          <td key={col} style={{ padding: "0.5rem 0.75rem" }}>
                            {r[col] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="wizard-footer">
        <button
          type="button"
          className="admin-btn admin-btn--outline"
          onClick={onBack}
        >
          ← Back to Fields
        </button>

        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={!canProceed}
          onClick={onNext}
        >
          Next: Live Preview ({dataset?.totalRows || 0} Certificates) →
        </button>
      </div>
    </div>
  );
}
