import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../Firebase/firebase";
import { formatDateTime } from "../../utils/registrationStatus";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import "./style/admin.css";
import "./Registrations.css";

export default function Registrations() {
  const [searchParams] = useSearchParams();
  const eventFilterParam = searchParams.get("event") || "";

  const [registrations, setRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [eventFilter, setEventFilter] = useState(eventFilterParam);
  const [branchFilter, setBranchFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");

  /* ── Load registrations + events ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [regs, evts] = await Promise.all([
        getDocs(collection(db, "registrations")),
        getDocs(collection(db, "events")),
      ]);
      setRegistrations(
        regs.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
      setEvents(
        evts.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    } catch (err) {
      console.error("Failed to load registrations:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Event lookup ── */
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

    const upcomingEvents = events.filter((e) => {
      if (e.status !== "Published") return false;
      if (!e.eventStartDate) return false;
      const d = new Date(e.eventStartDate);
      return !isNaN(d) && d >= now;
    }).length;

    return { total: registrations.length, today: todayCount, activeEvents, upcomingEvents };
  }, [registrations, events]);

  /* ── Unique branches & semesters ── */
  const branches = useMemo(() => {
    const set = new Set(registrations.map((r) => r.branch).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [registrations]);

  const semesters = useMemo(() => {
    const set = new Set(registrations.map((r) => r.semester).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [registrations]);

  /* ── Filtered list ── */
  const filteredRegistrations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return registrations.filter((r) => {
      if (eventFilter && r.eventId !== eventFilter) return false;
      if (branchFilter !== "all" && r.branch !== branchFilter) return false;
      if (semesterFilter !== "all" && r.semester !== semesterFilter) return false;
      if (!q) return true;
      return (
        (r.name || "").toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q) ||
        (r.registrationId || "").toLowerCase().includes(q)
      );
    });
  }, [registrations, searchQuery, eventFilter, branchFilter, semesterFilter]);

  /* ── CSV Export ── */
  const handleExportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Event", "Branch", "Semester", "Registration ID", "Registered At"];
    const rows = filteredRegistrations.map((r) => [
      r.name || "",
      r.email || "",
      r.phone || "",
      eventMap[r.eventId] || r.eventId || "",
      r.branch || "",
      r.semester || "",
      r.registrationId || "",
      formatDateTime(r.createdAt),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
                <h2>📋 Registrations</h2>
                <p>Manage event registrations</p>
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
                <span className="reg-stat-label">Active Events</span>
              </div>
              <div className="reg-stat">
                <span className="reg-stat-value">{stats.upcomingEvents}</span>
                <span className="reg-stat-label">Upcoming Events</span>
              </div>
            </div>

            {/* ── Filters ── */}
            <div className="reg-toolbar">
              <input
                type="text"
                className="admin-input reg-search"
                placeholder="Search by name, email, or registration ID..."
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
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                aria-label="Filter by branch"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b === "all" ? "All Branches" : b}
                  </option>
                ))}
              </select>

              <select
                className="admin-input reg-filter"
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                aria-label="Filter by semester"
              >
                {semesters.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All Semesters" : `Semester ${s}`}
                  </option>
                ))}
              </select>
            </div>

            {/* ── Table ── */}
            {loading ? (
              <div className="empty-card">
                <h3>Loading Registrations...</h3>
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
                      <th>Name</th>
                      <th>Email</th>
                      <th>Event</th>
                      <th>Branch</th>
                      <th>Sem</th>
                      <th>Registration ID</th>
                      <th>Registered At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map((r) => (
                      <tr key={r.id}>
                        <td>{r.name || "—"}</td>
                        <td>{r.email || "—"}</td>
                        <td>{eventMap[r.eventId] || r.eventId || "—"}</td>
                        <td>{r.branch || "—"}</td>
                        <td>{r.semester || "—"}</td>
                        <td>
                          <span className="reg-id-badge">{r.registrationId || "—"}</span>
                        </td>
                        <td>{formatDateTime(r.createdAt)}</td>
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