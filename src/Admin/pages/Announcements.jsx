import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../Firebase/firebase";
import { useAuth } from "../../context/AuthContext";
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  setAnnouncementPublished,
  deleteAnnouncement,
} from "../../Firebase/announcementService";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import "./style/admin.css";
import "./Announcements.css";

const ANNOUNCEMENT_TYPES = [
  { id: "general", label: "📢 General" },
  { id: "event", label: "🎯 Event" },
  { id: "important", label: "⚠️ Important" },
  { id: "deadline", label: "📅 Deadline" },
  { id: "achievement", label: "🏆 Achievement" },
];

const EMPTY_FORM = {
  title: "",
  message: "",
  type: "general",
  ctaText: "",
  ctaLink: "",
  linkedEventId: "",
  published: false,
};

function formatDate(ts) {
  if (!ts) return "—";
  if (ts?.seconds) {
    return new Date(ts.seconds * 1000).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  const d = new Date(ts);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Announcements() {
  const { currentUser } = useAuth();

  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [successMsg, setSuccessMsg] = useState("");

  /* ── Load announcements + events ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [anns, evts] = await Promise.all([
        getAnnouncements(),
        getDocs(collection(db, "events")),
      ]);
      setAnnouncements(anns);
      setEvents(
        evts.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    } catch (err) {
      console.error("Failed to load announcements:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Event lookup for linked event names ── */
  const eventMap = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      map[e.id] = e.title || "Untitled Event";
    });
    return map;
  }, [events]);

  /* ── Form handlers ── */
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (ann) => {
    setEditingId(ann.id);
    setForm({
      title: ann.title,
      message: ann.message,
      type: ann.type,
      ctaText: ann.ctaText,
      ctaLink: ann.ctaLink,
      linkedEventId: ann.linkedEventId || "",
      published: ann.published,
    });
    setShowForm(true);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert("Title is required.");
      return;
    }
    if (!form.message.trim()) {
      alert("Message is required.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateAnnouncement(editingId, form);
        setSuccessMsg("Announcement updated.");
      } else {
        await createAnnouncement(form, currentUser?.email || "");
        setSuccessMsg("Announcement created.");
      }
      setShowForm(false);
      await loadData();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save announcement.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Publish / Unpublish ── */
  const handleTogglePublish = async (ann) => {
    try {
      await setAnnouncementPublished(ann.id, !ann.published);
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === ann.id
            ? {
                ...a,
                published: !ann.published,
                status: !ann.published ? "published" : "draft",
              }
            : a
        )
      );
    } catch (err) {
      console.error("Publish toggle failed:", err);
      alert("Failed to update publish status.");
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAnnouncement(deleteTarget.id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
      setSuccessMsg("Announcement deleted.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete announcement.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div className="ann-page">
            {/* ── Page Header ── */}
            <div className="page-header">
              <div className="page-title">
                <h2>📢 Announcements</h2>
                <p>Create and manage announcements for the Abhyudaya website.</p>
              </div>

              <button
                type="button"
                className="admin-btn ann-add-btn"
                onClick={openCreate}
              >
                + New Announcement
              </button>
            </div>

            {/* ── Success message ── */}
            {successMsg && <div className="ann-success">{successMsg}</div>}

            {/* ── Error state ── */}
            {error && (
              <div className="ro-error-box">
                <p>⚠️ Failed to load announcements.</p>
                <button type="button" className="admin-btn" onClick={loadData}>
                  Retry
                </button>
              </div>
            )}

            {/* ── Loading ── */}
            {loading ? (
              <div className="empty-card">
                <h3>Loading Announcements...</h3>
              </div>
            ) : announcements.length === 0 ? (
              <div className="empty-card">
                <div style={{ fontSize: "70px" }}>📢</div>
                <h3>No Announcements Found</h3>
                <p>Click "New Announcement" to create your first announcement.</p>
              </div>
            ) : (
              <div className="ann-list">
                {announcements.map((ann) => {
                  const typeMeta =
                    ANNOUNCEMENT_TYPES.find((t) => t.id === ann.type) ||
                    ANNOUNCEMENT_TYPES[0];
                  return (
                    <div className="ann-card" key={ann.id}>
                      <div className="ann-card-top">
                        <span className={`ann-type-badge ann-type-${ann.type}`}>
                          {typeMeta.label}
                        </span>
                        <span
                          className={`ann-status-badge ${ann.published ? "published" : "draft"}`}
                        >
                          {ann.published ? "Published" : "Draft"}
                        </span>
                      </div>

                      <h3 className="ann-card-title">{ann.title}</h3>
                      <p className="ann-card-message">{ann.message}</p>

                      {ann.linkedEventId && eventMap[ann.linkedEventId] && (
                        <div className="ann-linked-event">
                          🎯 Linked Event: {eventMap[ann.linkedEventId]}
                        </div>
                      )}

                      {ann.ctaText && ann.ctaLink && (
                        <a
                          href={ann.ctaLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ann-cta-link"
                        >
                          {ann.ctaText} →
                        </a>
                      )}

                      <div className="ann-card-footer">
                        <span className="ann-date">Created: {formatDate(ann.createdAt)}</span>
                        <div className="ann-actions">
                          <button
                            type="button"
                            className="ann-action-btn"
                            onClick={() => openEdit(ann)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="ann-action-btn"
                            onClick={() => handleTogglePublish(ann)}
                          >
                            {ann.published ? "Unpublish" : "Publish"}
                          </button>
                          <button
                            type="button"
                            className="ann-action-btn danger"
                            onClick={() => setDeleteTarget(ann)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {showForm && (
        <div className="ann-modal-overlay" onClick={() => setShowForm(false)}>
          <div
            className="ann-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ann-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="ann-modal-title">
              {editingId ? "Edit Announcement" : "New Announcement"}
            </h3>

            <div className="ann-form">
              <div className="ann-field">
                <label className="ann-label" htmlFor="ann-title">
                  Title <span className="ann-required">*</span>
                </label>
                <input
                  id="ann-title"
                  type="text"
                  className="admin-input"
                  value={form.title}
                  onChange={(e) => handleFormChange("title", e.target.value)}
                  placeholder="e.g. TechBloom 2026 Registrations Open"
                />
              </div>

              <div className="ann-field">
                <label className="ann-label" htmlFor="ann-message">
                  Message <span className="ann-required">*</span>
                </label>
                <textarea
                  id="ann-message"
                  className="admin-input ann-textarea"
                  rows={4}
                  value={form.message}
                  onChange={(e) => handleFormChange("message", e.target.value)}
                  placeholder="Announcement message..."
                />
              </div>

              <div className="ann-form-grid-2">
                <div className="ann-field">
                  <label className="ann-label" htmlFor="ann-type">
                    Type
                  </label>
                  <select
                    id="ann-type"
                    className="admin-input"
                    value={form.type}
                    onChange={(e) => handleFormChange("type", e.target.value)}
                  >
                    {ANNOUNCEMENT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {form.type === "event" && (
                  <div className="ann-field">
                    <label className="ann-label" htmlFor="ann-event">
                      Linked Event
                    </label>
                    <select
                      id="ann-event"
                      className="admin-input"
                      value={form.linkedEventId}
                      onChange={(e) => handleFormChange("linkedEventId", e.target.value)}
                    >
                      <option value="">— Select Event —</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="ann-form-grid-2">
                <div className="ann-field">
                  <label className="ann-label" htmlFor="ann-cta-text">
                    CTA Text
                  </label>
                  <input
                    id="ann-cta-text"
                    type="text"
                    className="admin-input"
                    value={form.ctaText}
                    onChange={(e) => handleFormChange("ctaText", e.target.value)}
                    placeholder="e.g. Register Now"
                  />
                </div>

                <div className="ann-field">
                  <label className="ann-label" htmlFor="ann-cta-link">
                    CTA Link
                  </label>
                  <input
                    id="ann-cta-link"
                    type="text"
                    className="admin-input"
                    value={form.ctaLink}
                    onChange={(e) => handleFormChange("ctaLink", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="ann-field">
                <label className="ann-label">Status</label>
                <div className="ann-status-toggle">
                  <button
                    type="button"
                    className={`ann-status-option ${!form.published ? "active-draft" : ""}`}
                    onClick={() => handleFormChange("published", false)}
                  >
                    📝 Draft
                  </button>
                  <button
                    type="button"
                    className={`ann-status-option ${form.published ? "active-published" : ""}`}
                    onClick={() => handleFormChange("published", true)}
                  >
                    🟢 Publish
                  </button>
                </div>
              </div>
            </div>

            <div className="ann-modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="ann-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div
            className="ann-modal ann-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ann-delete-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="ann-delete-title">Delete this announcement?</h3>
            <p className="ann-delete-text">
              "{deleteTarget.title}" will be permanently removed. This cannot be
              undone.
            </p>

            <div className="ann-modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary ann-delete-btn"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}