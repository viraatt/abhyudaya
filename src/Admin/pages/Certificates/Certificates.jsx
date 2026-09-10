import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import {
  getCertificates,
  deleteCertificate,
  createCertificate,
} from "../../../Firebase/certificateService";
import {
  getCertificateTemplates,
  duplicateCertificateTemplate,
  renameCertificateTemplate,
  deleteCertificateTemplate,
  getCertificateJobs,
  deleteCertificateJob,
} from "../../../Firebase/certificateTemplateService";
import { uploadPdfToCloudinary } from "../../../services/cloudinaryService";
import { parseCSV } from "../../../utils/csvUtils";
import "../style/admin.css";
import "./Certificates.css";

export default function Certificates() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("certificates"); // 'certificates' | 'templates' | 'history'
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Templates Management State
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Generation History State
  const [historyJobs, setHistoryJobs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  // Load certificates helper
  const loadCertificates = useCallback(async () => {
    try {
      const data = await getCertificates();
      setCertificates(data);
      setError(false);
    } catch (err) {
      console.error("Failed to load certificates:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load templates helper
  const loadTemplates = useCallback(async () => {
    try {
      const data = await getCertificateTemplates();
      setTemplates(data);
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  // Load generation history helper
  const loadHistoryJobs = useCallback(async () => {
    try {
      const data = await getCertificateJobs();
      setHistoryJobs(data);
    } catch (err) {
      console.error("Failed to load generation history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    getCertificates()
      .then((data) => {
        if (isMounted) {
          setCertificates(data);
          setError(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load certificates:", err);
        if (isMounted) setError(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (activeTab === "templates") {
      getCertificateTemplates()
        .then((data) => {
          if (isMounted) setTemplates(data);
        })
        .catch((err) => console.error("Failed to load templates:", err))
        .finally(() => {
          if (isMounted) setTemplatesLoading(false);
        });
    } else if (activeTab === "history") {
      getCertificateJobs()
        .then((data) => {
          if (isMounted) setHistoryJobs(data);
        })
        .catch((err) => console.error("Failed to load history:", err))
        .finally(() => {
          if (isMounted) setHistoryLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [activeTab]);

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

  // Template Actions
  const handleDuplicateTpl = async (tpl) => {
    try {
      await duplicateCertificateTemplate(tpl.id);
      await loadTemplates();
    } catch (err) {
      console.error("Failed to duplicate template:", err);
      alert("Failed to duplicate template: " + (err.message || "Unknown error"));
    }
  };

  const handleRenameTpl = async (tpl) => {
    const newTitle = window.prompt("Enter new title for template:", tpl.title);
    if (!newTitle || newTitle.trim() === tpl.title) return;
    try {
      await renameCertificateTemplate(tpl.id, newTitle.trim());
      await loadTemplates();
    } catch (err) {
      console.error("Failed to rename template:", err);
      alert("Failed to rename template: " + (err.message || "Unknown error"));
    }
  };

  const handleDeleteTpl = async (tpl) => {
    if (!window.confirm(`Are you sure you want to delete template "${tpl.title}"?`)) return;
    try {
      await deleteCertificateTemplate(tpl.id);
      setTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
    } catch (err) {
      console.error("Failed to delete template:", err);
      alert("Failed to delete template: " + (err.message || "Unknown error"));
    }
  };

  // Generation History Actions
  const handleDeleteJob = async (job) => {
    if (!window.confirm(`Delete generation history entry for "${job.templateTitle || job.jobId}"?`)) return;
    try {
      await deleteCertificateJob(job.id);
      setHistoryJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch (err) {
      console.error("Failed to delete history record:", err);
      alert("Failed to delete history record: " + (err.message || "Unknown error"));
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
                <Link
                  to="/admin/certificates/create"
                  className="admin-btn admin-btn--primary"
                  style={{
                    background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                    boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
                  }}
                >
                  ✨ Create Certificates
                </Link>

                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setShowBulkUpload(!showBulkUpload)}
                >
                  {showBulkUpload ? "Close Bulk Upload" : "📥 Bulk Upload (CSV + PDFs)"}
                </button>

                <Link
                  to="/admin/certificates/add"
                  className="admin-btn admin-btn--outline"
                >
                  + Add Single
                </Link>
              </div>
            </div>

            {/* Tabs Switcher */}
            <div className="certs-nav-tabs">
              <button
                type="button"
                className={`certs-nav-tab ${activeTab === "certificates" ? "active" : ""}`}
                onClick={() => setActiveTab("certificates")}
              >
                📜 Issued Certificates
                <span className="certs-nav-badge">{certificates.length}</span>
              </button>

              <button
                type="button"
                className={`certs-nav-tab ${activeTab === "templates" ? "active" : ""}`}
                onClick={() => setActiveTab("templates")}
              >
                🎨 Saved Templates
                <span className="certs-nav-badge">{templates.length}</span>
              </button>

              <button
                type="button"
                className={`certs-nav-tab ${activeTab === "history" ? "active" : ""}`}
                onClick={() => setActiveTab("history")}
              >
                ⏱️ Generation History
                <span className="certs-nav-badge">{historyJobs.length}</span>
              </button>
            </div>

            {/* Tab 1: Issued Certificates */}
            {activeTab === "certificates" && (
              <>

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
                              title="View PDF on Cloudinary"
                            >
                              📄 PDF
                            </a>

                            <Link
                              to={`/admin/certificates/edit/${cert.id}`}
                              className="tbl-btn tbl-btn--verify"
                              title="Edit Certificate"
                            >
                              ✏️ Edit
                            </Link>

                            <Link
                              to={`/verify/${cert.certificateId}`}
                              target="_blank"
                              className="tbl-btn"
                              title="Public Verification Link"
                              style={{ background: "#e0f2fe", color: "#0369a1" }}
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
              </>
            )}

            {/* Tab 2: Saved Templates */}
            {activeTab === "templates" && (
              <div className="certs-templates-tab">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "1.2rem", color: "#0f172a" }}>
                      Certificate Templates
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.88rem", color: "#64748b" }}>
                      Manage background certificate designs, dynamic field positioning, and event associations.
                    </p>
                  </div>
                  <Link to="/admin/certificates/create" className="admin-btn admin-btn--primary">
                    + New Template
                  </Link>
                </div>

                {templatesLoading ? (
                  <div className="empty-card"><h3>Loading Templates...</h3></div>
                ) : templates.length === 0 ? (
                  <div className="empty-card">
                    <div style={{ fontSize: "60px" }}>🎨</div>
                    <h3>No Saved Templates Yet</h3>
                    <p>Create and save a certificate template layout with dynamic fields like name, event, and date.</p>
                    <Link to="/admin/certificates/create" className="admin-btn admin-btn--primary" style={{ marginTop: "1rem" }}>
                      ✨ Create First Template
                    </Link>
                  </div>
                ) : (
                  <div className="certs-templates-grid">
                    {templates.map((tpl) => (
                      <div key={tpl.id} className="cert-tpl-card">
                        <div className="cert-tpl-thumb-wrap">
                          {tpl.templateUrl ? (
                            <img src={tpl.templateUrl} alt={tpl.title} className="cert-tpl-thumb" />
                          ) : (
                            <span className="cert-tpl-thumb-fallback">📜</span>
                          )}
                          <span className="cert-tpl-fields-badge">
                            {(tpl.fields || []).length} field{(tpl.fields || []).length === 1 ? "" : "s"}
                          </span>
                        </div>

                        <div className="cert-tpl-body">
                          <h4 className="cert-tpl-title">{tpl.title || "Untitled Template"}</h4>
                          <div className="cert-tpl-meta-row">
                            <span>Event: <strong>{tpl.eventName || "General"}</strong></span>
                            <span>{tpl.createdAt ? new Date(tpl.createdAt).toLocaleDateString() : ""}</span>
                          </div>

                          <div className="cert-tpl-actions">
                            <button
                              type="button"
                              className="cert-tpl-btn cert-tpl-btn--primary"
                              onClick={() => navigate(`/admin/certificates/create?templateId=${tpl.id}&step=3`)}
                              title="Generate Certificates with this Template"
                            >
                              ⚡ Generate
                            </button>

                            <button
                              type="button"
                              className="cert-tpl-btn cert-tpl-btn--outline"
                              onClick={() => navigate(`/admin/certificates/create?templateId=${tpl.id}&step=2`)}
                              title="Edit Field Positions"
                            >
                              ✏️ Edit
                            </button>

                            <button
                              type="button"
                              className="cert-tpl-btn cert-tpl-btn--outline"
                              onClick={() => handleRenameTpl(tpl)}
                              title="Rename Template"
                            >
                              🏷️ Rename
                            </button>

                            <button
                              type="button"
                              className="cert-tpl-btn cert-tpl-btn--outline"
                              onClick={() => handleDuplicateTpl(tpl)}
                              title="Duplicate Template"
                            >
                              📋 Duplicate
                            </button>

                            <button
                              type="button"
                              className="cert-tpl-btn cert-tpl-btn--danger"
                              onClick={() => handleDeleteTpl(tpl)}
                              title="Delete Template"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Generation History */}
            {activeTab === "history" && (
              <div className="certs-history-tab">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "1.2rem", color: "#0f172a" }}>
                      Generation History
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.88rem", color: "#64748b" }}>
                      Track previous bulk certificate generation jobs and download full batch ZIP archives.
                    </p>
                  </div>
                  <button type="button" className="admin-btn admin-btn--outline" onClick={loadHistoryJobs}>
                    🔄 Refresh
                  </button>
                </div>

                {historyLoading ? (
                  <div className="empty-card"><h3>Loading History...</h3></div>
                ) : historyJobs.length === 0 ? (
                  <div className="empty-card">
                    <div style={{ fontSize: "60px" }}>⏱️</div>
                    <h3>No Generation Batches Yet</h3>
                    <p>When you generate certificates via the Bulk Generator, records and downloadable ZIP archives will appear here.</p>
                    <Link to="/admin/certificates/create" className="admin-btn admin-btn--primary" style={{ marginTop: "1rem" }}>
                      ✨ Generate Batch Now
                    </Link>
                  </div>
                ) : (
                  <div className="certs-history-table-wrap">
                    <table className="certs-history-table">
                      <thead>
                        <tr>
                          <th>Event / Template</th>
                          <th>Date</th>
                          <th>Total</th>
                          <th>Successful</th>
                          <th>Failed</th>
                          <th>Status</th>
                          <th>Download</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyJobs.map((job) => {
                          const dateStr = job.createdAt
                            ? new Date(job.createdAt).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Recent";

                          const isCompleted = job.status === "completed";
                          const isFailed = job.status === "failed";

                          return (
                            <tr key={job.id}>
                              <td>
                                <strong>{job.templateTitle || job.eventName || "Batch Job"}</strong>
                                {job.eventName && job.eventName !== job.templateTitle && (
                                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{job.eventName}</div>
                                )}
                              </td>
                              <td style={{ whiteSpace: "nowrap" }}>{dateStr}</td>
                              <td>{job.total || (job.completed || 0) + (job.failed || 0)}</td>
                              <td style={{ color: "#059669", fontWeight: "600" }}>{job.completed || 0}</td>
                              <td style={{ color: job.failed > 0 ? "#dc2626" : "#64748b" }}>{job.failed || 0}</td>
                              <td>
                                <span
                                  className={`certs-status-badge ${
                                    isCompleted
                                      ? "certs-status-badge--completed"
                                      : isFailed
                                      ? "certs-status-badge--failed"
                                      : "certs-status-badge--processing"
                                  }`}
                                >
                                  {isCompleted ? "✓ Completed" : isFailed ? "✕ Failed" : "⏳ Processing"}
                                </span>
                              </td>
                              <td>
                                {job.zipUrl ? (
                                  <a
                                    href={job.zipUrl}
                                    download={`${(job.templateTitle || "certificates").replace(/\s+/g, "_")}.zip`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="certs-dl-btn"
                                  >
                                    📦 Download ZIP
                                  </a>
                                ) : (
                                  <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>
                                )}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="tbl-btn tbl-btn--delete"
                                  onClick={() => handleDeleteJob(job)}
                                  title="Delete Record"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
