import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  FaSearch,
  FaSync,
  FaPlus,
  FaEye,
  FaEdit,
  FaCopy,
  FaTrash,
  FaPaperPlane,
  FaUndo,
  FaStar,
  FaRegStar,
  FaCalendarAlt,
  FaArchive,
} from "react-icons/fa";
import { db } from "../../Firebase/firebase";
import {
  getEvents,
  updateEvent,
  deleteEvent,
  createEvent,
} from "../../Firebase/eventService";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import SkeletonLoader from "../components/SkeletonLoader";
import { useToast } from "../components/Toast";

import "./style/admin.css";
import "./EventManager.css";

/* ──────────────────────────────────────────────
   Sub-tab views
────────────────────────────────────────────── */
const TABS = [
  { id: "all",     label: "All Events",  icon: "📅" },
  { id: "drafts",  label: "Drafts",      icon: "📝" },
  { id: "trash",   label: "Trash",       icon: "🗑️" },
];

/* ──────────────────────────────────────────────
   Status filter sets per tab
────────────────────────────────────────────── */
const STATUS_FILTERS = {
  all:    ["All", "Published", "Draft", "Archived"],
  drafts: ["All", "Draft"],
  trash:  ["All", "Trashed"],
};

/* ──────────────────────────────────────────────
   Unique categories from event list
────────────────────────────────────────────── */
function getCategories(events) {
  const cats = new Set(events.map((e) => e.subtitle || e.category || "").filter(Boolean));
  return ["All", ...Array.from(cats)];
}

/* ──────────────────────────────────────────────
   Date formatter
────────────────────────────────────────────── */
function formatDate(ts) {
  if (!ts) return "—";
  // Firestore Timestamp
  if (ts?.seconds) {
    return new Date(ts.seconds * 1000).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  // ISO string / Date
  const d = new Date(ts);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function EventManager() {
  const toast = useToast();

  const [events, setEvents]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState("all");
  const [statusFilter, setStatusFilter]   = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery]     = useState("");

  /* ── Fetch ── */
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (err) {
      console.error(err);
      toast.error("Unable to load events.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  /* Reset status filter when tab changes */
  useEffect(() => { setStatusFilter("All"); }, [activeTab]);

  /* ── Counts per tab (for badge) ── */
  const tabCounts = useMemo(() => ({
    all:    events.filter((e) => e.status !== "Trashed").length,
    drafts: events.filter((e) => e.status === "Draft").length,
    trash:  events.filter((e) => e.status === "Trashed").length,
  }), [events]);

  /* ── Filtered list ── */
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Tab filter
      if (activeTab === "drafts" && ev.status !== "Draft") return false;
      if (activeTab === "trash"  && ev.status !== "Trashed") return false;
      if (activeTab === "all"    && ev.status === "Trashed") return false;

      // Status filter
      if (statusFilter !== "All" && ev.status !== statusFilter) return false;

      // Category filter
      const evCat = ev.subtitle || ev.category || "";
      if (categoryFilter !== "All" && evCat !== categoryFilter) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          (ev.title || "").toLowerCase().includes(q) ||
          (ev.slug  || "").toLowerCase().includes(q) ||
          (evCat    || "").toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [events, activeTab, statusFilter, categoryFilter, searchQuery]);

  const categories = useMemo(() => getCategories(events), [events]);

  /* ── Actions ── */

  const handleStatusChange = useCallback(async (ev, newStatus) => {
    try {
      const docRef = doc(db, "events", ev.id);
      await updateDoc(docRef, { status: newStatus, updatedAt: serverTimestamp() });
      setEvents((prev) =>
        prev.map((e) => (e.id === ev.id ? { ...e, status: newStatus } : e))
      );
      if (newStatus === "Published") toast.success("🚀 Event published!");
      else if (newStatus === "Draft") toast.info("Event moved to Drafts.");
      else if (newStatus === "Trashed") toast.info("Event moved to Trash.");
      else toast.info(`Event status changed to ${newStatus}.`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update event status.");
    }
  }, [toast]);

  const handleToggleFeatured = useCallback(async (ev) => {
    const newVal = !ev.featured;
    try {
      const docRef = doc(db, "events", ev.id);
      await updateDoc(docRef, { featured: newVal, updatedAt: serverTimestamp() });
      setEvents((prev) =>
        prev.map((e) => (e.id === ev.id ? { ...e, featured: newVal } : e))
      );
      toast.success(newVal ? "⭐ Marked as Featured!" : "Removed from Featured.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update featured status.");
    }
  }, [toast]);

  const handleDuplicate = useCallback(async (ev) => {
    try {
      const dupeData = {
        ...ev,
        title: `${ev.title} (Copy)`,
        slug: `${ev.slug}-copy-${Date.now()}`,
        status: "Draft",
        featured: false,
      };
      delete dupeData.id;
      delete dupeData.createdAt;
      delete dupeData.updatedAt;
      await createEvent(dupeData);
      await fetchEvents();
      toast.success("Event duplicated as Draft.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to duplicate event.");
    }
  }, [fetchEvents, toast]);

  const handleDelete = useCallback(async (ev) => {
    if (ev.status !== "Trashed") {
      // Move to trash first
      await handleStatusChange(ev, "Trashed");
      return;
    }
    // Permanent delete
    const confirmed = window.confirm(
      `Permanently delete "${ev.title}"? This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteEvent(ev.id);
      setEvents((prev) => prev.filter((e) => e.id !== ev.id));
      toast.success("Event permanently deleted.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete event.");
    }
  }, [handleStatusChange, toast]);

  const handleRestoreFromTrash = useCallback(async (ev) => {
    await handleStatusChange(ev, "Draft");
  }, [handleStatusChange]);

  /* ── Render ── */
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div className="admin-event-manager">

            {/* ── Page Header ── */}
            <div className="admin-event-header">
              <div>
                <h1>📅 Events Manager</h1>
                <p>
                  Total: <strong>{events.filter((e) => e.status !== "Trashed").length}</strong>
                  {" "}· Showing: <strong>{filteredEvents.length}</strong>
                </p>
              </div>

              <div className="evt-header-actions">
                <button
                  type="button"
                  className="evt-refresh-btn"
                  onClick={fetchEvents}
                  aria-label="Refresh events"
                >
                  <FaSync />
                  <span>Refresh</span>
                </button>

                <Link
                  to="/admin/events/add"
                  className="evt-add-btn"
                  aria-label="Add new event"
                >
                  <FaPlus />
                  <span>New Event</span>
                </Link>
              </div>
            </div>

            {/* ── Sub-tabs (All / Drafts / Trash) ── */}
            <div className="event-sub-tabs" role="tablist" aria-label="Event view tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`event-sub-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span className="tab-count">{tabCounts[tab.id]}</span>
                </button>
              ))}
            </div>

            {/* ── Filter Bar ── */}
            <div className="admin-event-filter-bar">
              {/* Status pills */}
              <div className="evt-status-tabs" role="group" aria-label="Status filter">
                {STATUS_FILTERS[activeTab].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`evt-filter-tab-btn ${statusFilter === st ? "active" : ""}`}
                    onClick={() => setStatusFilter(st)}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Category select */}
              {activeTab === "all" && (
                <select
                  className="evt-category-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filter by category"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}

              {/* Search */}
              <div className="evt-search-wrapper">
                <FaSearch className="evt-search-icon" aria-hidden="true" />
                <input
                  type="text"
                  className="evt-search-input"
                  placeholder="Search by title, slug, category…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search events"
                />
              </div>
            </div>

            {/* ── Table / States ── */}
            {loading ? (
              <SkeletonLoader type="table" rows={6} />
            ) : filteredEvents.length === 0 ? (
              <div className="evt-empty-state">
                <div className="empty-icon">
                  {activeTab === "trash" ? "🗑️" : activeTab === "drafts" ? "📝" : "📅"}
                </div>
                <h2>
                  {activeTab === "trash"
                    ? "Trash is Empty"
                    : activeTab === "drafts"
                    ? "No Drafts Found"
                    : "No Events Found"}
                </h2>
                <p>
                  {activeTab === "trash"
                    ? "Deleted events will appear here."
                    : activeTab === "drafts"
                    ? "Events saved as Draft will appear here."
                    : searchQuery || statusFilter !== "All"
                    ? "No events match your current filters."
                    : "Click \"New Event\" to create your first event."}
                </p>
              </div>
            ) : (
              <div className="evt-table-container">
                <table className="evt-table" aria-label="Events list">
                  <thead>
                    <tr>
                      <th scope="col">Event</th>
                      <th scope="col">Category</th>
                      <th scope="col">Status</th>
                      <th scope="col">Featured</th>
                      <th scope="col">Created</th>
                      <th scope="col">Updated</th>
                      <th scope="col" style={{ minWidth: "280px" }}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredEvents.map((ev) => (
                      <tr key={ev.id}>
                        {/* Thumbnail + Title + Slug */}
                        <td>
                          <div className="evt-thumb-cell">
                            {ev.image || ev.banner ? (
                              <img
                                src={ev.image || ev.banner}
                                alt={ev.title}
                                className="evt-thumb"
                                loading="lazy"
                              />
                            ) : (
                              <div className="evt-thumb-placeholder">
                                {ev.icon || "📅"}
                              </div>
                            )}
                            <div className="evt-title-wrap">
                              <span className="evt-title-text">{ev.title}</span>
                              <span className="evt-slug-text">/{ev.slug || ev.id}</span>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td>{ev.subtitle || ev.category || "—"}</td>

                        {/* Status */}
                        <td>
                          <span
                            className={`evt-status-pill ${(ev.status || "draft").toLowerCase()}`}
                          >
                            {ev.status || "Draft"}
                          </span>
                        </td>

                        {/* Featured toggle */}
                        <td>
                          <button
                            type="button"
                            className={`evt-featured-badge ${ev.featured ? "yes" : "no"}`}
                            onClick={() => handleToggleFeatured(ev)}
                            title={ev.featured ? "Remove from featured" : "Mark as featured"}
                            aria-label={ev.featured ? "Remove featured" : "Mark featured"}
                            style={{ cursor: "pointer", border: "none" }}
                          >
                            {ev.featured ? <FaStar /> : <FaRegStar />}
                            <span>{ev.featured ? "Yes" : "No"}</span>
                          </button>
                        </td>

                        {/* Created date */}
                        <td>
                          <span className="evt-date-text">
                            <FaCalendarAlt style={{ opacity: 0.45, marginRight: 4, fontSize: 11 }} />
                            {formatDate(ev.createdAt)}
                          </span>
                        </td>

                        {/* Updated date */}
                        <td>
                          <span className="evt-date-text">{formatDate(ev.updatedAt)}</span>
                        </td>

                        {/* Action buttons */}
                        <td>
                          <div className="evt-actions-group">
                            {/* View */}
                            <Link
                              to={`/events/${ev.slug || ev.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="evt-action-btn btn-view"
                              title="View on site"
                              aria-label={`View ${ev.title} on public site`}
                            >
                              <FaEye />
                              <span>View</span>
                            </Link>

                            {/* Edit — disabled for now (UI coming soon) */}
                            <Link
                              to={`/admin/events/edit/${ev.id}`}
                              className="evt-action-btn btn-edit"
                              title="Edit event"
                              aria-label={`Edit ${ev.title}`}
                            >
                              <FaEdit />
                              <span>Edit</span>
                            </Link>

                            {/* Duplicate */}
                            {activeTab !== "trash" && (
                              <button
                                type="button"
                                className="evt-action-btn btn-duplicate"
                                onClick={() => handleDuplicate(ev)}
                                title="Duplicate event"
                                aria-label={`Duplicate ${ev.title}`}
                              >
                                <FaCopy />
                                <span>Dupe</span>
                              </button>
                            )}

                            {/* Publish / Unpublish */}
                            {activeTab !== "trash" && (
                              ev.status === "Published" ? (
                                <button
                                  type="button"
                                  className="evt-action-btn btn-unpublish"
                                  onClick={() => handleStatusChange(ev, "Draft")}
                                  title="Unpublish event"
                                  aria-label={`Unpublish ${ev.title}`}
                                >
                                  <FaUndo />
                                  <span>Unpublish</span>
                                </button>
                              ) : ev.status !== "Trashed" ? (
                                <button
                                  type="button"
                                  className="evt-action-btn btn-publish"
                                  onClick={() => handleStatusChange(ev, "Published")}
                                  title="Publish event"
                                  aria-label={`Publish ${ev.title}`}
                                >
                                  <FaPaperPlane />
                                  <span>Publish</span>
                                </button>
                              ) : null
                            )}

                            {/* Archive (All Events tab only) */}
                            {activeTab === "all" && ev.status !== "Archived" && (
                              <button
                                type="button"
                                className="evt-action-btn"
                                style={{ background: "#f1f5f9", color: "#475569", borderColor: "#cbd5e1" }}
                                onClick={() => handleStatusChange(ev, "Archived")}
                                title="Archive event"
                                aria-label={`Archive ${ev.title}`}
                              >
                                <FaArchive />
                                <span>Archive</span>
                              </button>
                            )}

                            {/* Restore from Trash */}
                            {activeTab === "trash" && (
                              <button
                                type="button"
                                className="evt-action-btn btn-restore"
                                onClick={() => handleRestoreFromTrash(ev)}
                                title="Restore event"
                                aria-label={`Restore ${ev.title}`}
                              >
                                <FaUndo />
                                <span>Restore</span>
                              </button>
                            )}

                            {/* Delete / Permanent delete */}
                            <button
                              type="button"
                              className="evt-action-btn btn-delete"
                              onClick={() => handleDelete(ev)}
                              title={ev.status === "Trashed" ? "Permanently delete" : "Move to Trash"}
                              aria-label={
                                ev.status === "Trashed"
                                  ? `Permanently delete ${ev.title}`
                                  : `Trash ${ev.title}`
                              }
                            >
                              <FaTrash />
                              <span>{ev.status === "Trashed" ? "Delete" : "Trash"}</span>
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
