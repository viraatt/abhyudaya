import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getStudents,
  upsertStudent,
  setStudentActive,
  deleteStudent,
} from "../../Firebase/studentService";
import {
  getCSVColumns,
  mapCSVRows,
  parseCSV,
  validateStudents,
} from "../../utils/csvUtils";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import "./style/admin.css";
import "./Students.css";

const FIELD_OPTIONS = ["name", "email", "branch", "semester"];

export default function Students() {
  /* ── Students list ── */
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  /* ── Search / filter ── */
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive

  /* ── CSV import flow ── */
  const [csvFileName, setCsvFileName] = useState("");
  const [csvColumns, setCsvColumns] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [mapping, setMapping] = useState({ name: "", email: "", branch: "", semester: "" });
  const [preview, setPreview] = useState(null); // { valid, invalidCount, duplicateCount }
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  /* ── Load students ── */
  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (err) {
      console.error("Failed to load students:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  /* ── Derived stats ── */
  const stats = useMemo(() => {
    const active = students.filter((s) => s.active).length;
    return {
      total: students.length,
      active,
      inactive: students.length - active,
    };
  }, [students]);

  /* ── Filtered list ── */
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      if (statusFilter === "active" && !s.active) return false;
      if (statusFilter === "inactive" && s.active) return false;
      if (!q) return true;
      return (
        (s.name || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery, statusFilter]);

  /* ── CSV file selection ── */
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result || "";
      const rows = parseCSV(text);
      const columns = getCSVColumns(rows);

      setCsvFileName(file.name);
      setCsvRows(rows);
      setCsvColumns(columns);
      setPreview(null);
      setImportResult(null);

      // Auto-suggest mapping based on common column names
      const suggested = { name: "", email: "", branch: "", semester: "" };
      const lower = columns.map((c) => c.toLowerCase());

      const findCol = (keywords) => {
        const idx = lower.findIndex((c) => keywords.some((k) => c.includes(k)));
        return idx >= 0 ? columns[idx] : "";
      };

      suggested.email = findCol(["email", "e-mail", "mail"]);
      suggested.name = findCol(["name", "full name", "student name"]);
      suggested.branch = findCol(["branch", "department", "dept"]);
      suggested.semester = findCol(["semester", "sem", "year"]);

      setMapping(suggested);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  /* ── Build preview from current mapping ── */
  const handleBuildPreview = () => {
    if (!mapping.email) {
      alert("Please select a CSV column for Email.");
      return;
    }
    const mapped = mapCSVRows(csvRows, mapping);
    const result = validateStudents(mapped);
    setPreview(result);
    setImportResult(null);
  };

  /* ── Confirm & import ── */
  const handleImport = async () => {
    if (!preview || preview.valid.length === 0) return;
    setImporting(true);
    try {
      let created = 0;
      let updated = 0;
      for (const student of preview.valid) {
        const res = await upsertStudent(student);
        if (res.created) created += 1;
        else updated += 1;
      }
      setImportResult({ created, updated });
      setPreview(null);
      setCsvRows([]);
      setCsvColumns([]);
      setCsvFileName("");
      setMapping({ name: "", email: "", branch: "", semester: "" });
      await loadStudents();
    } catch (err) {
      console.error("Import failed:", err);
      alert("Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  /* ── Toggle active ── */
  const handleToggleActive = async (student) => {
    try {
      await setStudentActive(student.id, !student.active);
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, active: !s.active } : s))
      );
    } catch (err) {
      console.error("Failed to toggle status:", err);
      alert("Failed to update student status.");
    }
  };

  /* ── Delete student ── */
  const handleDelete = async (student) => {
    if (!window.confirm(`Delete student "${student.name || student.email}"?`)) return;
    try {
      await deleteStudent(student.id);
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
    } catch (err) {
      console.error("Failed to delete student:", err);
      alert("Failed to delete student.");
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div className="students-page">
            {/* ── Page Header ── */}
            <div className="page-header">
              <div className="page-title">
                <h2>👨‍🎓 Students</h2>
                <p>Manage student email recipients</p>
              </div>

              <button
                type="button"
                className="admin-btn students-import-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                📥 Import CSV
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: "none" }}
                onChange={handleFileSelect}
              />
            </div>

            {/* ── Error state ── */}
            {error && (
              <div className="ro-error-box">
                <p>⚠️ Failed to load students.</p>
                <button type="button" className="admin-btn" onClick={loadStudents}>
                  Retry
                </button>
              </div>
            )}

            {/* ── Stats ── */}
            <div className="students-stats">
              <div className="students-stat">
                <span className="students-stat-value">{stats.total}</span>
                <span className="students-stat-label">Total Students</span>
              </div>
              <div className="students-stat">
                <span className="students-stat-value">{stats.active}</span>
                <span className="students-stat-label">Active Students</span>
              </div>
              <div className="students-stat">
                <span className="students-stat-value">{stats.inactive}</span>
                <span className="students-stat-label">Inactive Students</span>
              </div>
            </div>

            {/* ── CSV Mapping & Preview ── */}
            {csvColumns.length > 0 && (
              <div className="admin-card students-csv-card">
                <h3 className="students-section-title">
                  CSV Import — {csvFileName}
                </h3>
                <p className="students-hint">
                  Map the CSV columns to student fields. Email is required.
                </p>

                <div className="students-mapping-grid">
                  {FIELD_OPTIONS.map((field) => (
                    <div className="students-mapping-field" key={field}>
                      <label className="students-label" htmlFor={`map-${field}`}>
                        {field.charAt(0).toUpperCase() + field.slice(1)}
                        {field === "email" && <span className="students-required"> *</span>}
                      </label>
                      <select
                        id={`map-${field}`}
                        className="admin-input"
                        value={mapping[field]}
                        onChange={(e) =>
                          setMapping((prev) => ({ ...prev, [field]: e.target.value }))
                        }
                      >
                        <option value="">— Select CSV Column —</option>
                        {csvColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="students-mapping-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setCsvRows([]);
                      setCsvColumns([]);
                      setCsvFileName("");
                      setPreview(null);
                      setMapping({ name: "", email: "", branch: "", semester: "" });
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleBuildPreview}
                    disabled={!mapping.email}
                  >
                    Preview Import
                  </button>
                </div>

                {/* ── Import Preview ── */}
                {preview && (
                  <div className="students-preview">
                    <h4>Import Preview</h4>
                    <div className="students-preview-stats">
                      <div>
                        <strong>{csvRows.length}</strong>
                        <span>Rows found</span>
                      </div>
                      <div>
                        <strong>{preview.valid.length}</strong>
                        <span>Valid</span>
                      </div>
                      <div>
                        <strong>{preview.invalidCount}</strong>
                        <span>Invalid</span>
                      </div>
                      <div>
                        <strong>{preview.duplicateCount}</strong>
                        <span>Duplicates</span>
                      </div>
                    </div>

                    <div className="students-preview-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setPreview(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleImport}
                        disabled={importing || preview.valid.length === 0}
                      >
                        {importing
                          ? "Importing..."
                          : `Import ${preview.valid.length} Students`}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Import result ── */}
                {importResult && (
                  <div className="students-import-result">
                    ✅ Import complete — {importResult.created} created,{" "}
                    {importResult.updated} updated.
                  </div>
                )}
              </div>
            )}

            {/* ── Search & Filter ── */}
            <div className="students-toolbar">
              <input
                type="text"
                className="admin-input students-search"
                placeholder="Search students by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search students"
              />

              <div className="students-filter-pills">
                {[
                  { id: "all", label: "All" },
                  { id: "active", label: "Active" },
                  { id: "inactive", label: "Inactive" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`students-filter-pill ${statusFilter === f.id ? "active" : ""}`}
                    onClick={() => setStatusFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Students Table ── */}
            {loading ? (
              <div className="empty-card">
                <h3>Loading Students...</h3>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="empty-card">
                <div style={{ fontSize: "70px" }}>👨‍🎓</div>
                <h3>
                  {students.length === 0 ? "No Students Found" : "No Matching Students"}
                </h3>
                <p>
                  {students.length === 0
                    ? "Import a CSV from the Google Form response spreadsheet to add students."
                    : "Try adjusting your search or filter."}
                </p>
              </div>
            ) : (
              <div className="students-table-wrap">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Branch</th>
                      <th>Sem</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s) => (
                      <tr key={s.id}>
                        <td>{s.name || "—"}</td>
                        <td>{s.email}</td>
                        <td>{s.branch || "—"}</td>
                        <td>{s.semester || "—"}</td>
                        <td>
                          <span className={`students-status ${s.active ? "active" : "inactive"}`}>
                            {s.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <div className="students-actions">
                            <button
                              type="button"
                              className="students-action-btn"
                              onClick={() => handleToggleActive(s)}
                              title={s.active ? "Mark inactive" : "Mark active"}
                            >
                              {s.active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              className="students-action-btn danger"
                              onClick={() => handleDelete(s)}
                              title="Delete student"
                            >
                              Delete
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