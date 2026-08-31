import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../Firebase/firebase";
import {
  getAllRegistrations,
  updateRegistrationStatus,
  deleteRegistration,
} from "../../Firebase/registrationService";
import { formatDateTime } from "../../utils/registrationStatus";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import "./style/admin.css";
import "./Registrations.css";

/* ── Possible registration statuses ── */
const STATUS_OPTIONS = ["registered", "confirmed", "pending", "cancelled"];

const STATUS_LABELS = {
  registered: "Registered",
  confirmed: "Confirmed",
  pending: "Pending",
  cancelled: "Cancelled",
  free: "Free",
  paid: "Paid",
};

const STATUS_COLORS = {
  registered: "var(--primary)",
  confirmed: "#22c55e",
  pending: "#f59e0b",
  cancelled: "#ef4444",
  free: "#8b5cf6",
  paid: "#0ea5e9",
};

function StatusBadge({ status }) {
  const s = (status || "registered").toLowerCase();
  const color = STATUS_COLORS[s] || "#6b7280";
  const label = STATUS_LABELS[s] || status || "—";
  return (
    <span
      className="reg-status-badge"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {label}
    </span>
  );
}

export default function Registrations() {
  const [searchParams] = useSearchParams();
  const eventFilterParam = searchParams.get("event") || "";

  const [registrations, setRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  /* ── Filters / Sort ── */
  const [searchQuery, setSearchQuery] = useState("");
  const [eventFilter, setEventFilter] = useState(eventFilterParam);
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // desc | asc | name

  /* ── Detail Modal ── */
  const [selectedReg, setSelectedReg] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  /* ── Delete Confirmation ── */
  const [deleteTarget, setDeleteTarget] = useState(null); // reg object to delete
  const [deleting, setDeleting] = useState(false);

  const modalRef = useRef(null);

  /* ── Load registrations + events ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [regs, evts] = await Promise.all([
        getAllRegistrations({ sortOrder }),
        getDocs(collection(db, "events")),
      ]);
      setRegistrations(regs);
      setEvents(evts.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load registrations:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Event lookup map ── */
  const eventMap = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      map[e.id] = e.title || "Untitled Event";
    });
    return map;
  }, [events]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayCount = registrations.filter((r) => {
      const ts = r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000) : null;
      return ts && ts >= todayStart;
    }).length;
    const activeEvents = events.filter((e) => e.status === "Published").length;
    const openRegs = events.filter((e) => e.registrationOpen === true).length;
    return { total: registrations.length, today: todayCount, activeEvents, openRegs };
  }, [registrations, events]);

  /* ── Filtered + searched list ── */
  const filteredRegistrations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return registrations.filter((r) => {
      if (eventFilter && r.eventId !== eventFilter) return false;
      const rs = (r.registrationStatus || r.paymentStatus || "registered").toLowerCase();
      if (statusFilter && rs !== statusFilter) return false;
      if (!q) return true;
      return (
        (r.name || "").toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q) ||
        (r.phone || "").toLowerCase().includes(q) ||
        (r.branch || "").toLowerCase().includes(q) ||
        (r.registrationId || "").toLowerCase().includes(q)
      );
    });
  }, [registrations, searchQuery, eventFilter, statusFilter]);

  /* ── CSV Export ── */
  const handleExportCSV = () => {
    const headers = [
      "Registration ID",
      "Name",
      "Email",
      "Phone",
      "Event",
      "Branch",
      "Semester",
      "Status",
      "Payment Status",
      "Registered At",
    ];
    const rows = filteredRegistrations.map((r) => [
      r.registrationId || "",
      r.name || "",
      r.email || "",
      r.phone || "",
      eventMap[r.eventId] || r.eventTitle || r.eventId || "",
      r.branch || "",
      r.semester || "",
      r.registrationStatus || "",
      r.paymentStatus || "",
      formatDateTime(r.createdAt),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const eventLabel = eventFilter ? (eventMap[eventFilter] || "event").replace(/\s+/g, "-").toLowerCase() : "all";
    a.download = `registrations-${eventLabel}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ── Open Detail Modal ── */
  const openDetail = (reg) => {
    setSelectedReg(reg);
    setNewStatus(reg.registrationStatus || reg.paymentStatus || "registered");
    setTimeout(() => modalRef.current?.focus(), 50);
  };

  /* ── Update Status ── */
  const handleUpdateStatus = async () => {
    if (!selectedReg || !newStatus) return;
    setUpdatingStatus(true);
    try {
      await updateRegistrationStatus(selectedReg.id, newStatus);
      setRegistrations((prev) =>
        prev.map((r) => (r.id === selectedReg.id ? { ...r, registrationStatus: newStatus } : r))
      );
      setSelectedReg((prev) => ({ ...prev, registrationStatus: newStatus }));
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  /* ── Confirm & Execute Delete ── */
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRegistration(deleteTarget.id);
      setRegistrations((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      if (selectedReg?.id === deleteTarget.id) setSelectedReg(null);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete registration:", err);
      alert("Failed to delete. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Close modal on Escape ── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedReg(null);
        setDeleteTarget(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div className="reg-page">

            {/* ── Page Header ── */}
            <div className="page-header">
              <div className="page-title">
                <h2>📋 Registration Management</h2>
                <p>View, filter, and manage all event registrations</p>
              </div>
              <button
                type="button"
                className="admin-btn reg-export-btn"
                onClick={handleExportCSV}
                disabled={filteredRegistrations.length === 0}
              >
                📥 Export CSV
              </button>
            </div>

            {/* ── Error state ── */}
            {error && (
              <div className="ro-error-box">
                <p>⚠️ Failed to load registrations.</p>
                <button type="button" className="admin-btn" onClick={loadData}>
                  Retry
                </button>
              </div>
            )}

            {/* ── Stats ── */}
            <div className="reg-stats">
              <div className="reg-stat">
                <span className="reg-stat-value">{stats.total}</span>
                <span className="reg-stat-label">Total Registrations</span>
              </div>
              <div className="reg-stat">
                <span className="reg-stat-value">{stats.today}</span>
                <span className="reg-stat-label">Today's Registrations</span>
              </div>
              <div className="reg-stat">
                <span className="reg-stat-value">{stats.activeEvents}</span>
                <span className="reg-stat-label">Published Events</span>
              </div>
              <div className="reg-stat reg-stat-highlight">
                <span className="reg-stat-value">{stats.openRegs}</span>
                <span className="reg-stat-label">Open for Registration</span>
              </div>
            </div>

            {/* ── Toolbar ── */}
            <div className="reg-toolbar">
              <input
                type="text"
                className="admin-input reg-search"
                placeholder="Search by name, email, phone, branch, or reg ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search registrations"
              />

              <select
                className="admin-input reg-filter"
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                aria-label="Filter by event"
              >
                <option value="">All Events</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>

              <select
                className="admin-input reg-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="">All Status</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>

              <select
                className="admin-input reg-filter"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                aria-label="Sort order"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>

            {/* ── Showing count ── */}
            {!loading && !error && (
              <p className="reg-count-label">
                Showing <strong>{filteredRegistrations.length}</strong> of <strong>{registrations.length}</strong> registrations
              </p>
            )}

            {/* ── Table ── */}
            {loading ? (
              <div className="empty-card">
                <div className="reg-spinner" aria-label="Loading" />
                <h3>Loading Registrations…</h3>
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <div className="empty-card">
                <div style={{ fontSize: "70px" }}>📋</div>
                <h3>No Registrations Found</h3>
                <p>
                  {registrations.length === 0
                    ? "No registrations have been submitted yet."
                    : "Try adjusting your search or filters."}
                </p>
              </div>
            ) : (
              <div className="reg-table-wrap">
                <table className="reg-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Participant</th>
                      <th>Event</th>
                      <th>Phone</th>
                      <th>Branch / Sem</th>
                      <th>Status</th>
                      <th>Registered At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map((r, idx) => (
                      <tr
                        key={r.id}
                        className="reg-table-row"
                        onClick={() => openDetail(r)}
                        title="Click to view full details"
                      >
                        <td className="reg-index-cell">{idx + 1}</td>
                        <td>
                          <div className="reg-participant-cell">
                            <span className="reg-participant-name">{r.name || "—"}</span>
                            <span className="reg-participant-email">{r.email || ""}</span>
                          </div>
                        </td>
                        <td className="reg-event-cell">
                          {eventMap[r.eventId] || r.eventTitle || r.eventId || "—"}
                        </td>
                        <td>{r.phone || "—"}</td>
                        <td>
                          {r.branch ? (
                            <span>
                              {r.branch}
                              {r.semester ? ` · Sem ${r.semester}` : ""}
                            </span>
                          ) : "—"}
                        </td>
                        <td>
                          <StatusBadge status={r.registrationStatus || r.paymentStatus || "registered"} />
                        </td>
                        <td className="reg-date-cell">{formatDateTime(r.createdAt)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="reg-actions">
                            <button
                              type="button"
                              className="reg-action-btn reg-view-btn"
                              onClick={() => openDetail(r)}
                              title="View details"
                            >
                              👁️
                            </button>
                            <button
                              type="button"
                              className="reg-action-btn reg-delete-btn"
                              onClick={() => setDeleteTarget(r)}
                              title="Delete registration"
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

      {/* ── Detail Modal ── */}
      {selectedReg && (
        <div
          className="reg-modal-overlay"
          onClick={() => setSelectedReg(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Registration Details"
        >
          <div
            className="reg-modal"
            onClick={(e) => e.stopPropagation()}
            ref={modalRef}
            tabIndex={-1}
          >
            <div className="reg-modal-header">
              <div>
                <h3>📋 Registration Details</h3>
                <span className="reg-id-badge">{selectedReg.registrationId || selectedReg.id}</span>
              </div>
              <button
                type="button"
                className="reg-modal-close"
                onClick={() => setSelectedReg(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="reg-modal-body">
              <div className="reg-detail-grid">
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Full Name</span>
                  <span className="reg-detail-value">{selectedReg.name || "—"}</span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Email</span>
                  <span className="reg-detail-value">{selectedReg.email || "—"}</span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Phone</span>
                  <span className="reg-detail-value">{selectedReg.phone || "—"}</span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Event</span>
                  <span className="reg-detail-value">
                    {eventMap[selectedReg.eventId] || selectedReg.eventTitle || selectedReg.eventId || "—"}
                  </span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Branch</span>
                  <span className="reg-detail-value">{selectedReg.branch || "—"}</span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Semester</span>
                  <span className="reg-detail-value">{selectedReg.semester || "—"}</span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Payment Status</span>
                  <span className="reg-detail-value">
                    <StatusBadge status={selectedReg.paymentStatus || "free"} />
                  </span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Registration Status</span>
                  <span className="reg-detail-value">
                    <StatusBadge status={selectedReg.registrationStatus || "registered"} />
                  </span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Registered At</span>
                  <span className="reg-detail-value">{formatDateTime(selectedReg.createdAt)}</span>
                </div>
                {selectedReg.amount > 0 && (
                  <div className="reg-detail-item">
                    <span className="reg-detail-label">Amount Paid</span>
                    <span className="reg-detail-value">
                      ₹{Number(selectedReg.amount).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>

              {/* ── Status Update ── */}
              <div className="reg-status-update">
                <label className="reg-detail-label" htmlFor="reg-status-select">
                  Update Registration Status
                </label>
                <div className="reg-status-update-row">
                  <select
                    id="reg-status-select"
                    className="admin-input"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={handleUpdateStatus}
                    disabled={updatingStatus || newStatus === (selectedReg.registrationStatus || "registered")}
                  >
                    {updatingStatus ? "Saving…" : "Save Status"}
                  </button>
                </div>
              </div>
            </div>

            <div className="reg-modal-footer">
              <button
                type="button"
                className="reg-delete-confirm-btn"
                onClick={() => {
                  setDeleteTarget(selectedReg);
                  setSelectedReg(null);
                }}
              >
                🗑️ Delete Registration
              </button>
              <button
                type="button"
                className="admin-btn"
                onClick={() => setSelectedReg(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div
          className="reg-modal-overlay"
          onClick={() => setDeleteTarget(null)}
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirm delete"
        >
          <div
            className="reg-modal reg-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="reg-confirm-icon">🗑️</div>
            <h3>Delete Registration?</h3>
            <p>
              You are about to permanently delete the registration for{" "}
              <strong>{deleteTarget.name || "this participant"}</strong>{" "}
              from event{" "}
              <strong>
                {eventMap[deleteTarget.eventId] || deleteTarget.eventTitle || "this event"}
              </strong>
              .
            </p>
            <p className="reg-confirm-warning">
              ⚠️ This action cannot be undone. The registration data will be permanently removed.
            </p>
            <div className="reg-confirm-actions">
              <button
                type="button"
                className="reg-cancel-btn"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="reg-delete-confirm-btn"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Yes, Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}