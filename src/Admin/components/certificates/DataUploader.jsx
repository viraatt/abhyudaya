import { useState, useRef } from "react";
import PropTypes from "prop-types";
import { parseSpreadsheetFile } from "../../../utils/csvUtils";

export default function DataUploader({
  dataset,
  onDataParsed,
  onClearData,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileProcess = async (file) => {
    if (!file) return;
    setLoading(true);
    setError("");

    try {
      const parsed = await parseSpreadsheetFile(file);
      onDataParsed(parsed);
    } catch (err) {
      console.error("Spreadsheet parsing failed:", err);
      setError(err.message || "Failed to read spreadsheet.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDownloadSampleCsv = (e) => {
    e.stopPropagation();
    const sampleHeaders = "Name,RollNo,Event,Position,Date,College\n";
    const sampleRows = "Ishan Shukla,230101,Abhyudaya 2026,Winner,09-09-2026,GLA University\nPriya Sharma,230102,Abhyudaya 2026,Runner Up,09-09-2026,GLA University\n";
    const blob = new Blob([sampleHeaders + sampleRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sample_participant_data.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="data-uploader-section">
      {error && (
        <div className="cert-alert cert-alert--error" role="alert">
          <span>⚠️ {error}</span>
          <button
            type="button"
            className="cert-alert-close"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      {!dataset ? (
        <div
          className={`cert-dropzone cert-dropzone--data ${
            dragOver ? "drag-over" : ""
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !loading && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload participant data spreadsheet"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileProcess(file);
            }}
            disabled={loading}
          />

          {loading ? (
            <div className="cert-dropzone-loading">
              <div className="cert-spinner" />
              <p>Reading spreadsheet, detecting headers & validating rows...</p>
            </div>
          ) : (
            <div className="cert-dropzone-empty">
              <div className="cert-dropzone-icon">📊</div>
              <h4>Upload Participant Spreadsheet</h4>
              <p>Drag & drop your CSV or Excel file here, or click to browse</p>
              <div className="cert-dropzone-formats">
                <span className="file-badge">.CSV</span>
                <span className="file-badge">.XLSX</span>
                <span className="file-badge">.XLS</span>
              </div>
              <div className="cert-dropzone-sample-action">
                <button
                  type="button"
                  className="cert-btn-sample-download"
                  onClick={handleDownloadSampleCsv}
                  title="Download a formatted sample CSV file"
                >
                  📥 Download Sample CSV Template
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="data-file-summary-card">
          <div className="data-file-info">
            <span className="data-file-icon">📄</span>
            <div>
              <h4 className="data-file-name">{dataset.fileName}</h4>
              <div className="data-file-meta-pills">
                <span className="data-pill data-pill--type">
                  {dataset.fileType.toUpperCase()}
                </span>
                <span className="data-pill data-pill--size">
                  {(dataset.fileSize / 1024).toFixed(1)} KB
                </span>
                <span className="data-pill data-pill--count">
                  {dataset.totalRows || dataset.rows?.length || 0} Participants
                </span>
                <span className="data-pill data-pill--cols">
                  {dataset.columns?.length || 0} Columns
                </span>
              </div>
            </div>
          </div>

          <div className="data-file-actions">
            <button
              type="button"
              className="cert-btn-text"
              onClick={handleDownloadSampleCsv}
            >
              📥 Sample Template
            </button>
            <button
              type="button"
              className="cert-btn-text cert-btn-text--danger"
              onClick={onClearData}
            >
              🔄 Change File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

DataUploader.propTypes = {
  dataset: PropTypes.object,
  onDataParsed: PropTypes.func.isRequired,
  onClearData: PropTypes.func.isRequired,
};
