import { useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import {
  adminFetchTimeCapsules,
  adminFetchTimeCapsuleById,
  adminUpdateUnlockDate,
  adminManualUnlock,
  adminResendNotification,
  adminDeleteTimeCapsule,
} from "../../Firebase/timeCapsuleService";
import "./style/admin.css";
import "./TimeCapsules.css";

const QUESTIONS_MAP = {
  aspiredRole: "What do you want to become?",
  biggestDream: "What is your biggest dream right now?",
  fourYearVision: "Where do you see yourself after 4 years?",
  graduationGoals: "What do you want to achieve before graduation?",
  currentFear: "What is your biggest fear right now?",
  inspirationSource: "Who or what inspires you?",
  personalPromise: "What is one promise you are making to yourself?",
  memoryAnchor: "What do you want your future self to remember about today?",
};

function formatDate(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TimeCapsules() {
  // ── Data State ──
  const [capsules, setCapsules] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    locked: 0,
    ready: 0,
    opened: 0,
    notificationSent: 0,
    notificationPending: 0,
    notificationFailed: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Filter State ──
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [gradYearFilter, setGradYearFilter] = useState("");
  const [notifFilter, setNotifFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Modal State ──
  const [detailCapsule, setDetailCapsule] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [dateModalCapsule, setDateModalCapsule] = useState(null);
  const [newUnlockDate, setNewUnlockDate] = useState("");
  const [savingDate, setSavingDate] = useState(false);

  const [unlockTarget, setUnlockTarget] = useState(null);
  const [unlocking, setUnlocking] = useState(false);

  const [resendTarget, setResendTarget] = useState(null);
  const [resending, setResending] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Load Data ──
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    adminFetchTimeCapsules({
      page: currentPage,
      limit: 20,
      status: statusFilter,
      graduationYear: gradYearFilter,
      notificationStatus: notifFilter,
      search,
    })
      .then((data) => {
        if (!isMounted) return;
        setCapsules(data.capsules || []);
        setStats(data.stats || {});
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
        setError("");
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("[TimeCapsules Admin] Fetch error:", err);
        setError(err.message || "Failed to load Time Capsules.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentPage, statusFilter, gradYearFilter, notifFilter, search, refreshKey]);

  // Reset to page 1 on filter changes
  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
    setLoading(true);
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setGradYearFilter("");
    setNotifFilter("");
    setCurrentPage(1);
    setLoading(true);
  };

  // ── Action: View Detail ──
  const handleViewDetail = async (capsule) => {
    setLoadingDetail(true);
    setDetailCapsule(capsule); // show skeleton / placeholder immediately
    try {
      const full = await adminFetchTimeCapsuleById(capsule.id);
      setDetailCapsule(full);
    } catch (err) {
      alert(err.message || "Failed to load full capsule answers.");
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── Action: Open Edit Date Modal ──
  const handleOpenDateModal = (capsule) => {
    setDateModalCapsule(capsule);
    // Format existing date to YYYY-MM-DD for input[type="date"]
    if (capsule.unlockDate) {
      const d = new Date(capsule.unlockDate);
      if (!isNaN(d.getTime())) {
        setNewUnlockDate(d.toISOString().slice(0, 10));
        return;
      }
    }
    setNewUnlockDate("");
  };

  const handleSaveDate = async () => {
    if (!dateModalCapsule || !newUnlockDate) return;
    setSavingDate(true);
    try {
      await adminUpdateUnlockDate(dateModalCapsule.id, newUnlockDate);
      setDateModalCapsule(null);
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message || "Failed to update unlock date.");
    } finally {
      setSavingDate(false);
    }
  };

  // ── Action: Manual Unlock ──
  const handleConfirmUnlock = async () => {
    if (!unlockTarget) return;
    setUnlocking(true);
    try {
      await adminManualUnlock(unlockTarget.id);
      setUnlockTarget(null);
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message || "Failed to unlock capsule.");
    } finally {
      setUnlocking(false);
    }
  };

  // ── Action: Resend Notification ──
  const handleConfirmResend = async () => {
    if (!resendTarget) return;
    setResending(true);
    try {
      await adminResendNotification(resendTarget.id);
      setResendTarget(null);
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message || "Failed to reset notification status.");
    } finally {
      setResending(false);
    }
  };

  // ── Action: Delete Capsule ──
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminDeleteTimeCapsule(deleteTarget.id);
      setDeleteTarget(null);
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message || "Failed to delete capsule.");
    } finally {
      setDeleting(false);
    }
  };

  // ── Export CSV ──
  const handleExportCSV = () => {
    const headers = [
      "Capsule Code",
      "Name",
      "Email",
      "Phone",
      "College",
      "Course",
      "Current Year",
      "Graduation Year",
      "Status",
      "Notification Status",
      "Created At",
      "Unlock Date",
      "Opened At",
    ];

    const rows = capsules.map((c) => [
      c.capsuleCode || "",
      c.name || "",
      c.email || "",
      c.phone || "",
      c.college || "",
      c.course || "",
      c.currentYear || "",
      c.graduationYear || "",
      c.status || "",
      c.notificationStatus || "pending",
      formatDateTime(c.createdAt),
      formatDate(c.unlockDate),
      formatDateTime(c.openedAt),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `time-capsules-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Escape key handler to close any active modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setDetailCapsule(null);
        setDateModalCapsule(null);
        setUnlockTarget(null);
        setResendTarget(null);
        setDeleteTarget(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Graduation Year Options for Filter
  const currentYear = new Date().getFullYear();
  const gradYearOptions = useMemo(
    () => Array.from({ length: 8 }, (_, i) => currentYear + i - 2),
    [currentYear]
  );

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div className="tc-admin-page">
            {/* ── Page Header ── */}
            <div className="page-header">
              <div className="page-title">
                <h2>📦 Time Capsule Management</h2>
                <p>Monitor, inspect, and manage student Time Capsules</p>
              </div>
              <button
                type="button"
                className="tc-btn tc-btn-secondary"
                onClick={handleExportCSV}
                disabled={capsules.length === 0}
              >
                📥 Export CSV
              </button>
            </div>

            {/* ── Stats Cards Grid ── */}
            <div className="tc-stats-grid">
              <div className="tc-stat-card">
                <span className="tc-stat-label">Total Capsules</span>
                <span className="tc-stat-value">{stats.total || 0}</span>
              </div>
              <div className="tc-stat-card locked">
                <span className="tc-stat-label">Locked</span>
                <span className="tc-stat-value">{stats.locked || 0}</span>
              </div>
              <div className="tc-stat-card ready">
                <span className="tc-stat-label">Ready</span>
                <span className="tc-stat-value">{stats.ready || 0}</span>
              </div>
              <div className="tc-stat-card opened">
                <span className="tc-stat-label">Opened</span>
                <span className="tc-stat-value">{stats.opened || 0}</span>
              </div>
              <div className="tc-stat-card sent">
                <span className="tc-stat-label">Notif Sent</span>
                <span className="tc-stat-value">{stats.notificationSent || 0}</span>
              </div>
              <div className="tc-stat-card pending">
                <span className="tc-stat-label">Notif Pending</span>
                <span className="tc-stat-value">{stats.notificationPending || 0}</span>
              </div>
              <div className="tc-stat-card failed">
                <span className="tc-stat-label">Notif Failed</span>
                <span className="tc-stat-value">{stats.notificationFailed || 0}</span>
              </div>
            </div>

            {/* ── Toolbar / Filters ── */}
            <div className="tc-toolbar">
              <div className="tc-search-box">
                <span className="tc-search-icon" aria-hidden="true">🔍</span>
                <input
                  type="text"
                  className="tc-search-input"
                  placeholder="Search by name, email, code, college..."
                  value={search}
                  onChange={handleFilterChange(setSearch)}
                />
              </div>

              <select
                className="tc-filter-select"
                value={statusFilter}
                onChange={handleFilterChange(setStatusFilter)}
              >
                <option value="">All Statuses</option>
                <option value="LOCKED">Locked</option>
                <option value="READY">Ready</option>
                <option value="OPENED">Opened</option>
              </select>

              <select
                className="tc-filter-select"
                value={gradYearFilter}
                onChange={handleFilterChange(setGradYearFilter)}
              >
                <option value="">Graduation Year</option>
                {gradYearOptions.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>

              <select
                className="tc-filter-select"
                value={notifFilter}
                onChange={handleFilterChange(setNotifFilter)}
              >
                <option value="">Notification Status</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>

              {(search || statusFilter || gradYearFilter || notifFilter) && (
                <button
                  type="button"
                  className="tc-btn tc-btn-secondary"
                  onClick={handleResetFilters}
                >
                  ✕ Reset
                </button>
              )}
            </div>

            {/* ── Table Card ── */}
            <div className="tc-table-card">
              {error && (
                <div style={{ padding: "16px 20px", color: "#dc2626", background: "#fef2f2" }}>
                  ⚠ {error}
                </div>
              )}

              {loading ? (
                <div className="tc-loading">
                  <div className="tc-spinner" />
                  <span>Loading Time Capsules...</span>
                </div>
              ) : capsules.length === 0 ? (
                <div className="tc-empty">
                  <span className="tc-empty-icon" aria-hidden="true">📦</span>
                  <h3>No Time Capsules Found</h3>
                  <p>Try adjusting your search query or filters.</p>
                </div>
              ) : (
                <div className="tc-table-responsive">
                  <table className="tc-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Student Name</th>
                        <th>Email & Phone</th>
                        <th>College & Course</th>
                        <th>Year</th>
                        <th>Grad</th>
                        <th>Created</th>
                        <th>Unlock Date</th>
                        <th>Status</th>
                        <th>Notif</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {capsules.map((capsule) => {
                        const statusClass = (capsule.status || "LOCKED").toLowerCase();
                        const notifClass = `notif-${capsule.notificationStatus || "pending"}`;

                        return (
                          <tr key={capsule.id}>
                            <td>
                              <span className="tc-code-badge">{capsule.capsuleCode}</span>
                            </td>
                            <td>
                              <strong>{capsule.name}</strong>
                            </td>
                            <td>
                              <div>{capsule.email}</div>
                              <div style={{ color: "var(--muted)", fontSize: "11px" }}>
                                {capsule.phone}
                              </div>
                            </td>
                            <td>
                              <div>{capsule.college}</div>
                              <div style={{ color: "var(--muted)", fontSize: "11px" }}>
                                {capsule.course}
                              </div>
                            </td>
                            <td>{capsule.currentYear}</td>
                            <td>{capsule.graduationYear}</td>
                            <td>{formatDate(capsule.createdAt)}</td>
                            <td>{formatDate(capsule.unlockDate)}</td>
                            <td>
                              <span className={`tc-badge ${statusClass}`}>
                                {capsule.status || "LOCKED"}
                              </span>
                            </td>
                            <td>
                              <span className={`tc-badge ${notifClass}`}>
                                {capsule.notificationStatus || "pending"}
                              </span>
                            </td>
                            <td>
                              <div className="tc-actions">
                                <button
                                  type="button"
                                  className="tc-icon-btn"
                                  title="Inspect Capsule Details & Answers"
                                  onClick={() => handleViewDetail(capsule)}
                                >
                                  👁️
                                </button>
                                <button
                                  type="button"
                                  className="tc-icon-btn"
                                  title="Change Unlock Date"
                                  onClick={() => handleOpenDateModal(capsule)}
                                >
                                  📅
                                </button>
                                {capsule.status !== "READY" && capsule.status !== "OPENED" && (
                                  <button
                                    type="button"
                                    className="tc-icon-btn"
                                    title="Manual Unlock"
                                    onClick={() => setUnlockTarget(capsule)}
                                  >
                                    🔓
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="tc-icon-btn"
                                  title="Resend Notification"
                                  onClick={() => setResendTarget(capsule)}
                                >
                                  📧
                                </button>
                                <button
                                  type="button"
                                  className="tc-icon-btn delete"
                                  title="Delete Capsule"
                                  onClick={() => setDeleteTarget(capsule)}
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Pagination ── */}
              {pagination.totalPages > 1 && (
                <div className="tc-pagination">
                  <span>
                    Showing {capsules.length} of {pagination.total} capsules
                  </span>
                  <div className="tc-page-controls">
                    <button
                      type="button"
                      className="tc-page-btn"
                      disabled={currentPage <= 1 || loading}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      ← Previous
                    </button>
                    <span>
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      type="button"
                      className="tc-page-btn"
                      disabled={currentPage >= pagination.totalPages || loading}
                      onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL 1: Detail Inspection Modal ── */}
      {detailCapsule && (
        <div className="tc-modal-overlay" onClick={() => setDetailCapsule(null)}>
          <div className="tc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tc-modal-header">
              <h3>Capsule Details — {detailCapsule.capsuleCode}</h3>
              <button
                type="button"
                className="tc-modal-close"
                onClick={() => setDetailCapsule(null)}
              >
                ✕
              </button>
            </div>

            <div className="tc-modal-body">
              {loadingDetail ? (
                <div className="tc-loading">
                  <div className="tc-spinner" />
                  <span>Loading answers...</span>
                </div>
              ) : (
                <>
                  <div className="tc-detail-grid">
                    <div className="tc-detail-item">
                      <span className="tc-detail-key">Student Name</span>
                      <span className="tc-detail-val">{detailCapsule.name}</span>
                    </div>
                    <div className="tc-detail-item">
                      <span className="tc-detail-key">Email Address</span>
                      <span className="tc-detail-val">{detailCapsule.email}</span>
                    </div>
                    <div className="tc-detail-item">
                      <span className="tc-detail-key">Phone</span>
                      <span className="tc-detail-val">{detailCapsule.phone}</span>
                    </div>
                    <div className="tc-detail-item">
                      <span className="tc-detail-key">College</span>
                      <span className="tc-detail-val">{detailCapsule.college}</span>
                    </div>
                    <div className="tc-detail-item">
                      <span className="tc-detail-key">Course & Year</span>
                      <span className="tc-detail-val">
                        {detailCapsule.course} ({detailCapsule.currentYear})
                      </span>
                    </div>
                    <div className="tc-detail-item">
                      <span className="tc-detail-key">Graduation Year</span>
                      <span className="tc-detail-val">{detailCapsule.graduationYear}</span>
                    </div>
                    <div className="tc-detail-item">
                      <span className="tc-detail-key">Status</span>
                      <span className="tc-detail-val">{detailCapsule.status}</span>
                    </div>
                    <div className="tc-detail-item">
                      <span className="tc-detail-key">Unlock Date</span>
                      <span className="tc-detail-val">{formatDate(detailCapsule.unlockDate)}</span>
                    </div>
                    <div className="tc-detail-item">
                      <span className="tc-detail-key">Notification</span>
                      <span className="tc-detail-val">
                        {detailCapsule.notificationStatus || "pending"}
                      </span>
                    </div>
                    <div className="tc-detail-item">
                      <span className="tc-detail-key">Written On</span>
                      <span className="tc-detail-val">{formatDateTime(detailCapsule.createdAt)}</span>
                    </div>
                  </div>

                  <h4 style={{ margin: "10px 0 4px 0", color: "var(--text)" }}>
                    Questionnaire Answers
                  </h4>

                  <div className="tc-answers-list">
                    {detailCapsule.answers ? (
                      Object.entries(QUESTIONS_MAP).map(([key, label], idx) => {
                        const answerText = detailCapsule.answers[key] || "—";
                        return (
                          <div key={key} className="tc-answer-card">
                            <div className="tc-answer-q">
                              Q{idx + 1}: {label}
                            </div>
                            <div className="tc-answer-a">{answerText}</div>
                          </div>
                        );
                      })
                    ) : (
                      <p style={{ color: "var(--muted)" }}>No answers recorded.</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="tc-modal-footer">
              <button
                type="button"
                className="tc-btn tc-btn-secondary"
                onClick={() => setDetailCapsule(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Edit Unlock Date Modal ── */}
      {dateModalCapsule && (
        <div className="tc-modal-overlay" onClick={() => setDateModalCapsule(null)}>
          <div className="tc-modal" style={{ maxWidth: "450px" }} onClick={(e) => e.stopPropagation()}>
            <div className="tc-modal-header">
              <h3>Change Unlock Date</h3>
              <button
                type="button"
                className="tc-modal-close"
                onClick={() => setDateModalCapsule(null)}
              >
                ✕
              </button>
            </div>

            <div className="tc-modal-body">
              <p style={{ fontSize: "14px", color: "var(--muted)" }}>
                Update the unlock date for capsule{" "}
                <strong>{dateModalCapsule.capsuleCode}</strong> ({dateModalCapsule.name}).
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600" }}>New Unlock Date:</label>
                <input
                  type="date"
                  className="tc-search-input"
                  value={newUnlockDate}
                  onChange={(e) => setNewUnlockDate(e.target.value)}
                  disabled={savingDate}
                />
              </div>
            </div>

            <div className="tc-modal-footer">
              <button
                type="button"
                className="tc-btn tc-btn-secondary"
                disabled={savingDate}
                onClick={() => setDateModalCapsule(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tc-btn tc-btn-primary"
                disabled={savingDate || !newUnlockDate}
                onClick={handleSaveDate}
              >
                {savingDate ? "Saving..." : "Save New Date"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Manual Unlock Confirmation Modal ── */}
      {unlockTarget && (
        <div className="tc-modal-overlay" onClick={() => setUnlockTarget(null)}>
          <div className="tc-modal" style={{ maxWidth: "450px" }} onClick={(e) => e.stopPropagation()}>
            <div className="tc-modal-header">
              <h3>Confirm Manual Unlock</h3>
              <button
                type="button"
                className="tc-modal-close"
                onClick={() => setUnlockTarget(null)}
              >
                ✕
              </button>
            </div>

            <div className="tc-modal-body">
              <p style={{ fontSize: "14px", color: "#b45309" }}>
                ⚠ Are you sure you want to manually unlock capsule{" "}
                <strong>{unlockTarget.capsuleCode}</strong> for{" "}
                <strong>{unlockTarget.name}</strong>?
              </p>
              <p style={{ fontSize: "13px", color: "var(--muted)" }}>
                This will change its status to <strong>READY</strong>, allowing the student to view
                their answers even if their original graduation date has not arrived yet.
              </p>
            </div>

            <div className="tc-modal-footer">
              <button
                type="button"
                className="tc-btn tc-btn-secondary"
                disabled={unlocking}
                onClick={() => setUnlockTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tc-btn tc-btn-primary"
                disabled={unlocking}
                onClick={handleConfirmUnlock}
              >
                {unlocking ? "Unlocking..." : "Yes, Unlock Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: Resend Notification Confirmation ── */}
      {resendTarget && (
        <div className="tc-modal-overlay" onClick={() => setResendTarget(null)}>
          <div className="tc-modal" style={{ maxWidth: "450px" }} onClick={(e) => e.stopPropagation()}>
            <div className="tc-modal-header">
              <h3>Resend Notification</h3>
              <button
                type="button"
                className="tc-modal-close"
                onClick={() => setResendTarget(null)}
              >
                ✕
              </button>
            </div>

            <div className="tc-modal-body">
              <p style={{ fontSize: "14px", color: "var(--text)" }}>
                Reset notification status for capsule{" "}
                <strong>{resendTarget.capsuleCode}</strong> ({resendTarget.name}) to{" "}
                <strong>pending</strong>?
              </p>
              <p style={{ fontSize: "13px", color: "var(--muted)" }}>
                Recipient: <strong>{resendTarget.email}</strong>
              </p>
            </div>

            <div className="tc-modal-footer">
              <button
                type="button"
                className="tc-btn tc-btn-secondary"
                disabled={resending}
                onClick={() => setResendTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tc-btn tc-btn-primary"
                disabled={resending}
                onClick={handleConfirmResend}
              >
                {resending ? "Resetting..." : "Reset to Pending"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="tc-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="tc-modal" style={{ maxWidth: "450px" }} onClick={(e) => e.stopPropagation()}>
            <div className="tc-modal-header">
              <h3 style={{ color: "#dc2626" }}>Delete Time Capsule</h3>
              <button
                type="button"
                className="tc-modal-close"
                onClick={() => setDeleteTarget(null)}
              >
                ✕
              </button>
            </div>

            <div className="tc-modal-body">
              <p style={{ fontSize: "14px", color: "#dc2626" }}>
                ⚠ <strong>Warning:</strong> This action cannot be undone.
              </p>
              <p style={{ fontSize: "13px", color: "var(--text)" }}>
                Are you sure you want to permanently delete capsule{" "}
                <strong>{deleteTarget.capsuleCode}</strong> belonging to{" "}
                <strong>{deleteTarget.name}</strong> ({deleteTarget.email})?
              </p>
            </div>

            <div className="tc-modal-footer">
              <button
                type="button"
                className="tc-btn tc-btn-secondary"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tc-btn tc-btn-danger"
                disabled={deleting}
                onClick={handleConfirmDelete}
              >
                {deleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
