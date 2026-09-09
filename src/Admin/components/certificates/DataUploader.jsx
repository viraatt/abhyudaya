import { useRef, useState } from "react";
import { parseCSV, getCSVColumns } from "../../../utils/csvUtils";

export default function DataUploader({
  dataset,
  onDatasetParsed,
}) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = async (file) => {
    if (!file) return;
    setErrorMsg("");
    setFileName(file.name);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (!rows || rows.length === 0) {
        throw new Error("File is empty or could not be parsed. Please check the CSV format.");
      }

      const columns = getCSVColumns(rows);

      if (!columns || columns.length === 0) {
        throw new Error("No column headers found in the uploaded file.");
      }

      onDatasetParsed({
        fileName: file.name,
        totalRows: rows.length,
        columns,
        rows,
      });
    } catch (err) {
      console.error("Data parsing error:", err);
      setErrorMsg(err.message || "Failed to process data file.");
    }
  };

  // Download sample CSV template
  const handleDownloadSampleCsv = () => {
    const headers = "name,rollNo,eventName,eventDate,certificateType\n";
    const sampleRows =
      "Ishan Shukla,2301234567,Techbloom 2026,2026-09-15,Participation\n" +
      "Aarav Patel,2301234568,Techbloom 2026,2026-09-15,Winner\n" +
      "Riya Sharma,2301234569,Techbloom 2026,2026-09-15,Participation\n";

    const blob = new Blob([headers + sampleRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "abhyudaya_certificate_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="data-uploader-section">
      <div
        className={`data-dropzone-box ${dragActive ? "drag-active" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              fontSize: "2.5rem",
              background: "#eff6ff",
              padding: "0.8rem",
              borderRadius: "12px",
              lineHeight: 1,
            }}
          >
            📊
          </div>

          <div>
            <h4 style={{ margin: "0 0 0.25rem 0", color: "#0f172a", fontSize: "1.05rem" }}>
              Upload Participant Data (CSV / Excel)
            </h4>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem" }}>
              Upload your spreadsheet containing student names, roll numbers, and details.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="admin-btn admin-btn--outline"
            style={{ fontSize: "0.82rem" }}
            onClick={handleDownloadSampleCsv}
          >
            📥 Download Sample CSV
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,application/vnd.ms-excel"
            style={{ display: "none" }}
            onChange={(e) => processFile(e.target.files?.[0])}
          />

          <button
            type="button"
            className="admin-btn admin-btn--primary"
            style={{ fontSize: "0.85rem" }}
            onClick={() => fileInputRef.current?.click()}
          >
            Select CSV File 📂
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="cert-alert cert-alert--error" style={{ marginTop: "1rem" }}>
          <span className="cert-alert-icon">⚠️</span>
          <p>{errorMsg}</p>
        </div>
      )}

      {dataset?.rows && dataset.rows.length > 0 && (
        <div style={{ marginTop: "1.25rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <span className="data-stats-badge">
              ✅ Loaded {dataset.totalRows} student records from{" "}
              <strong>{fileName || dataset.fileName}</strong>
            </span>

            <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
              Detected columns: {dataset.columns.join(", ")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
