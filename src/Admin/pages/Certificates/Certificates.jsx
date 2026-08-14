import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import {
  getCertificates,
  deleteCertificate,
  createCertificate,
} from "../../../Firebase/certificateService";
import { uploadPdfToCloudinary } from "../../../services/cloudinaryService";
import { parseCSV } from "../../../utils/csvUtils";
import "../style/admin.css";
import "./Certificates.css";

export default function Certificates() {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Bulk Upload State
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkResults, setBulkResults] = useState(null);

  const csvInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  // Load certificates from Firestore
  const loadCertificates = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getCertificates();
      setCertificates(data);
    } catch (err) {
      console.error("Failed to load certificates:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  // Derived stats
  const stats = useMemo(() => {
    const total = certificates.length;
    const eventsSet = new Set(certificates.map((c) => c.eventName));
    return {
      total,
      uniqueEvents: eventsSet.size,
    };
  }, [certificates]);

  // Filtered list
  const filteredCertificates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return certificates.filter((c) => {
      if (typeFilter !== "all" && c.certificateType !== typeFilter) return false;
      if (!q) return true;
      return (
        (c.name || "").toLowerCase().includes(q) ||
        (c.rollNo || "").toLowerCase().includes(q) ||
        (c.certificateId || "").toLowerCase().includes(q) ||
        (c.eventName || "").toLowerCase().includes(q)
      );
    });
  }, [certificates, searchQuery, typeFilter]);

  // Handle single deletion
  const handleDelete = async (cert) => {
    if (
      !window.confirm(
        `Are you sure you want to delete certificate "${cert.certificateId}" for ${cert.name}?`
      )
    ) {
      return;
    }

    try {
      await deleteCertificate(cert.id);
      setCertificates((prev) => prev.filter((c) => c.id !== cert.id));
    } catch (err) {
      console.error("Failed to delete certificate:", err);
      alert("Failed to delete certificate. Please try again.");
    }
  };

  // Process Bulk CSV + PDFs upload
  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      alert("Please select a CSV metadata file.");
      return;
    }
    if (pdfFiles.length === 0) {
      alert("Please select PDF certificate files.");
      return;
    }

    setBulkProcessing(true);
    setBulkProgress(0);
    setBulkStatus("Reading CSV file...");
    setBulkResults(null);

    const pdfMap = new Map();
    Array.from(pdfFiles).forEach((file) => {
      pdfMap.set(file.name.toLowerCase(), file);
    });

    try {
      const csvText = await csvFile.text();
      const rows = parseCSV(csvText);

      if (rows.length === 0) {
        throw new Error("CSV file is empty or invalid format.");
      }

      // Format expected: rollNo,name,eventName,eventDate,certificateType,certificateId,fileName
      const successes = [];
      const failures = [];

      setBulkStatus(`Found ${rows.length} records. Processing...`);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const progress = Math.round(((i + 1) / rows.length) * 100);
        setBulkProgress(progress);

        const rollNo = (row.rollNo || row.rollno || row["roll no"] || "").trim();
        const name = (row.name || row["student name"] || "").trim();
        const eventName = (row.eventName || row.eventname || row.event || "").trim();
        const eventDate = (row.eventDate || row.eventdate || row.date || "").trim();
        const certificateType = (row.certificateType || row.certificatetype || row.type || "Participation").trim();
        const certificateId = (row.certificateId || row.certificateid || row.id || "").trim();
        const fileName = (row.fileName || row.filename || row.file || "").trim();

        if (!rollNo || !name || !eventName || !certificateId || !fileName) {
          failures.push({
            row: i + 1,
            certificateId: certificateId || "N/A",
            name: name || "N/A",
            reason: "Missing required fields (rollNo, name, eventName, certificateId, fileName)",
          });
          continue;
        }

        const pdfFile = pdfMap.get(fileName.toLowerCase());
        if (!pdfFile) {
          failures.push({
            row: i + 1,
            certificateId,
            name,
            reason: `Matching PDF file "${fileName}" not provided in selected files.`,
          });
          continue;
        }

        setBulkStatus(
          `Uploading PDF [${i + 1}/${rows.length}]: ${fileName} (${certificateId})...`
        );

        try {
          // Step 1: Upload to Cloudinary
          const uploadRes = await uploadPdfToCloudinary(pdfFile);

          // Step 2: Save metadata to Firestore
          await createCertificate({
            certificateId,
            rollNo,
            name,
            eventName,
            eventDate,
            certificateType,
            certificateUrl: uploadRes.secure_url,
          });

          successes.push({
            certificateId,
            name,
            eventName,
            url: uploadRes.secure_url,
          });
        } catch (err) {
          failures.push({
            row: i + 1,
            certificateId,
            name,
            reason: err.message || "Failed to process certificate.",
          });
        }
      }

      setBulkResults({ successes, failures });
      setBulkStatus("Bulk upload complete!");
      await loadCertificates();
    } catch (err) {
      console.error("Bulk upload error:", err);
      alert(`Bulk upload error: ${err.message}`);
    } finally {
      setBulkProcessing(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div className="certs-page">
            {/* Header */}
            <div className="page-header">
              <div className="page-title">
                <h2>📜 Certificate Management</h2>
                <p>Upload, search, verify, and manage student certificates</p>
              </div>

              <div className="header-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setShowBulkUpload(!showBulkUpload)}
                >
                  {showBulkUpload ? "Close Bulk Upload" : "📥 Bulk Upload (CSV + PDFs)"}
                </button>

                <Link
                  to="/admin/certificates/add"
                  className="admin-btn admin-btn--primary"
                >
                  + Add Single Certificate
                </Link>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="ro-error-box">
                <p>⚠️ Failed to load certificates.</p>
                <button type="button" className="admin-btn" onClick={loadCertificates}>
                  Retry
                </button>
              </div>
            )}

            {/* Stats */}
            <div className="certs-stats">
              <div className="certs-stat-card">
                <span className="certs-stat-value">{stats.total}</span>
                <span className="certs-stat-label">Total Certificates</span>
              </div>
              <div className="certs-stat-card">
                <span className="certs-stat-value">{stats.uniqueEvents}</span>
                <span className="certs-stat-label">Events Covered</span>
              </div>
            </div>

            {/* Bulk Upload Section */}
            {showBulkUpload && (
              <div className="admin-card bulk-card">
                <h3 className="bulk-title">📥 Bulk Certificate Upload</h3>
                <p className="bulk-desc">
                  Upload multiple PDF certificates at once using a matching CSV metadata file.
                </p>

                <div className="bulk-template-box">
                  <strong>CSV Template Header Format:</strong>
                  <code>rollNo,name,eventName,eventDate,certificateType,certificateId,fileName</code>
                  <div className="bulk-template-example">
                    Example: <code>2301234567,Ishan Shukla,Techbloom 2026,2026-08-15,Participation,ABH-TB26-0001,2301234567.pdf</code>
                  </div>
                </div>

                <form onSubmit={handleBulkUpload} className="bulk-form">
                  <div className="bulk-form-grid">
                    <div className="bulk-field">
                      <label htmlFor="csvUpload" className="bulk-label">
                        1. Select CSV Metadata File (.csv) <span className="req">*</span>
                      </label>
                      <input
                        id="csvUpload"
                        type="file"
                        accept=".csv,text/csv"
                        ref={csvInputRef}
                        className="admin-input"
                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                        disabled={bulkProcessing}
                        required
                      />
                    </div>

                    <div className="bulk-field">
                      <label htmlFor="pdfUpload" className="bulk-label">
                        2. Select All Certificate PDF Files (.pdf) <span className="req">*</span>
                      </label>
                      <input
                        id="pdfUpload"
                        type="file"
                        accept=".pdf,application/pdf"
                        multiple
                        ref={pdfInputRef}
                        className="admin-input"
                        onChange={(e) => setPdfFiles(Array.from(e.target.files || []))}
                        disabled={bulkProcessing}
                        required
                      />
                      {pdfFiles.length > 0 && (
                        <span className="bulk-file-count">
                          {pdfFiles.length} PDF file(s) selected
                        </span>
                      )}
                    </div>
                  </div>

                  {bulkProcessing && (
                    <div className="bulk-progress-box">
                      <div className="bulk-progress-bar">
                        <div
                          className="bulk-progress-fill"
                          style={{ width: `${bulkProgress}%` }}
                        />
                      </div>
                      <span className="bulk-status-text">{bulkStatus}</span>
                    </div>
                  )}

                  <div className="bulk-actions">
                    <button
                      type="submit"
                      className="admin-btn admin-btn--primary"
                      disabled={bulkProcessing || !csvFile || pdfFiles.length === 0}
                    >
                      {bulkProcessing ? "Processing Batch..." : "Start Bulk Upload →"}
                    </button>

                    <button
                      type="button"
                      className="admin-btn admin-btn--outline"
                      onClick={() => {
                        setShowBulkUpload(false);
                        setCsvFile(null);
                        setPdfFiles([]);
                        setBulkResults(null);
                      }}
                      disabled={bulkProcessing}
                    >
                      Cancel
                    </button>
                  </div>
                </form>

                {/* Bulk Results Summary */}
                {bulkResults && (
                  <div className="bulk-results-box">
                    <h4>Batch Upload Report</h4>
                    <div className="bulk-results-summary">
                      <span className="res-tag res-tag--success">
                        ✅ Successes: {bulkResults.successes.length}
                      </span>
                      <span className="res-tag res-tag--error">
                        ⚠️ Failures: {bulkResults.failures.length}
                      </span>
                    </div>

                    {bulkResults.failures.length > 0 && (
                      <div className="bulk-failures-list">
                        <h5>Failed Rows</h5>
                        <ul>
                          {bulkResults.failures.map((f, idx) => (
                            <li key={idx}>
                              Row {f.row} ({f.certificateId} - {f.name}): {f.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Search & Toolbar */}
            <div className="certs-toolbar">
              <input
                type="text"
                className="admin-input certs-search"
                placeholder="Search by Roll No, Name, Event, Certificate ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search certificates"
              />

              <div className="certs-filter-pills">
                {["all", "Participation", "Winner", "Runner-Up", "Organizer"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`certs-pill ${typeFilter === t ? "active" : ""}`}
                    onClick={() => setTypeFilter(t)}
                  >
                    {t === "all" ? "All Types" : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="empty-card">
                <h3>Loading Certificates...</h3>
              </div>
            ) : filteredCertificates.length === 0 ? (
              <div className="empty-card">
                <div style={{ fontSize: "60px" }}>📜</div>
                <h3>
                  {certificates.length === 0
                    ? "No Certificates Created Yet"
                    : "No Matching Certificates"}
                </h3>
                <p>
                  {certificates.length === 0
                    ? "Click '+ Add Single Certificate' or 'Bulk Upload' to add certificates."
                    : "Try adjusting your search query or filter."}
                </p>
              </div>
            ) : (
              <div className="certs-table-wrap">
                <table className="certs-table">
                  <thead>
                    <tr>
                      <th>Cert ID</th>
                      <th>Student Name</th>
                      <th>Roll Number</th>
                      <th>Event</th>
                      <th>Type</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCertificates.map((cert) => (
                      <tr key={cert.id}>
                        <td>
                          <span className="cert-code">{cert.certificateId}</span>
                        </td>
                        <td>
                          <strong>{cert.name}</strong>
                        </td>
                        <td>{cert.rollNo}</td>
                        <td>
                          <div>{cert.eventName}</div>
                          {cert.eventDate && (
                            <small className="muted-text">{cert.eventDate}</small>
                          )}
                        </td>
                        <td>
                          <span className="cert-type-pill">{cert.certificateType}</span>
                        </td>
                        <td>
                          <div className="certs-actions flex-wrap">
                            <a
                              href={cert.certificateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="tbl-btn tbl-btn--view"
                              title="View PDF"
                            >
                              📄 PDF
                            </a>

                            <Link
                              to={`/verify/${cert.certificateId}`}
                              target="_blank"
                              className="tbl-btn tbl-btn--verify"
                              title="Verification Link"
                            >
                              🔍 Verify
                            </Link>

                            <button
                              type="button"
                              className="tbl-btn tbl-btn--delete"
                              onClick={() => handleDelete(cert)}
                              title="Delete Certificate"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
