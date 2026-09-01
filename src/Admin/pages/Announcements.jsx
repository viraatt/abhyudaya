import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { uploadToCloudinary } from "../../utils/cloudinary";

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
  imageUrl: "",
  imageAlt: "",
  published: false,
};

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

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

  // Image Upload States
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [successMsg, setSuccessMsg] = useState("");

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

  /* ── File validation and selection ── */
  const processSelectedFile = (file) => {
    setFileError("");
    if (!file) return;

    if (
      !ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase()) &&
      !file.type.startsWith("image/")
    ) {
      setFileError(
        "Unsupported format. Please upload a JPG, JPEG, PNG, or WEBP image."
      );
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setFileError("File is too large. Maximum allowed size is 10 MB.");
      return;
    }

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setForm((prev) => ({
      ...prev,
      imageAlt: prev.imageAlt || prev.title || "",
    }));
  };

  const handleRemoveImage = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl("");
    setFileError("");
    setForm((prev) => ({
      ...prev,
      imageUrl: "",
      imageAlt: "",
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* ── Form handlers ── */
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl("");
    setFileError("");
    setUploadProgress(0);
    setShowForm(true);
  };

  const openEdit = (ann) => {
    setEditingId(ann.id);
    setForm({
      title: ann.title || "",
      message: ann.message || "",
      type: ann.type || "general",
      ctaText: ann.ctaText || "",
      ctaLink: ann.ctaLink || "",
      linkedEventId: ann.linkedEventId || "",
      imageUrl: ann.imageUrl || "",
      imageAlt: ann.imageAlt || "",
      published: Boolean(ann.published),
    });
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(ann.imageUrl || "");
    setFileError("");
    setUploadProgress(0);
    setShowForm(true);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // If user updates title and hasn't explicitly customized alt text, sync alt text
      if (field === "title" && (!prev.imageAlt || prev.imageAlt === prev.title)) {
        next.imageAlt = value;
      }
      return next;
    });
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
    setUploadProgress(0);

    try {
      let finalImageUrl = form.imageUrl || "";

      // Upload newly selected image if present
      if (selectedFile) {
        const uploadResult = await uploadToCloudinary(selectedFile, (pct) => {
          setUploadProgress(pct);
        });
        finalImageUrl = uploadResult.secure_url;
      } else if (!previewUrl) {
        finalImageUrl = "";
      }

      const payload = {
        ...form,
        imageUrl: finalImageUrl,
        imageAlt: form.imageAlt.trim() || form.title.trim(),
      };

      if (editingId) {
        await updateAnnouncement(editingId, payload);
        setSuccessMsg("Announcement updated.");
      } else {
        await createAnnouncement(payload, currentUser?.email || "");
        setSuccessMsg("Announcement created.");
      }

      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl("");
      setShowForm(false);
      await loadData();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Save failed - error:", err);
      alert(
        `Failed to save announcement. (${
          err?.code || err?.message || "unknown error"
        })`
      );
    } finally {
      setSaving(false);
      setUploadProgress(0);
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
                      {ann.imageUrl && (
                        <div className="ann-card-media">
                          <img
                            src={ann.imageUrl}
                            alt={ann.imageAlt || ann.title}
                            className="ann-card-thumbnail"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.parentElement.style.display = "none";
                            }}
                          />
                        </div>
                      )}

                      <div className="ann-card-body">
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

              {/* ── Announcement Banner / Image (Optional) ── */}
              <div className="ann-field">
                <div className="ann-label-header">
                  <label className="ann-label" htmlFor="ann-image-input">
                    Announcement Banner / Image <span className="ann-optional-tag">(Optional)</span>
                  </label>
                  <span className="ann-dim-hint">
                    Recommended: 16:9 landscape banner, minimum 1200 × 675 px
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  id="ann-image-input"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processSelectedFile(e.target.files[0]);
                    }
                  }}
                />

                {previewUrl ? (
                  <div className="ann-preview-container">
                    <div className="ann-preview-box">
                      <img
                        src={previewUrl}
                        alt={form.imageAlt || "Banner preview"}
                        className="ann-preview-img"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      {saving && uploadProgress > 0 && (
                        <div className="ann-uploading-overlay">
                          <div className="ann-uploading-spinner">
                            <span>Uploading image... {uploadProgress}%</span>
                            <div className="ann-upload-bar">
                              <div
                                className="ann-upload-bar-fill"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="ann-preview-actions">
                      <button
                        type="button"
                        className="ann-img-action-btn replace"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={saving}
                      >
                        🔄 Replace Banner
                      </button>
                      <button
                        type="button"
                        className="ann-img-action-btn remove"
                        onClick={handleRemoveImage}
                        disabled={saving}
                      >
                        🗑️ Remove Banner
                      </button>
                    </div>

                    <div className="ann-subfield">
                      <label className="ann-sublabel" htmlFor="ann-image-alt">
                        Image Alt Text (Accessibility)
                      </label>
                      <input
                        id="ann-image-alt"
                        type="text"
                        className="admin-input"
                        value={form.imageAlt}
                        onChange={(e) => handleFormChange("imageAlt", e.target.value)}
                        placeholder="Describe the image/banner..."
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    className={`ann-upload-zone ${dragActive ? "dragover" : ""}`}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragActive(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragActive(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragActive(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragActive(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        processSelectedFile(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    <div className="ann-upload-zone-icon">🖼️</div>
                    <div className="ann-upload-zone-text">
                      <strong>Click to upload</strong> or drag and drop image here
                    </div>
                    <div className="ann-upload-zone-sub">
                      Supported formats: JPG, JPEG, PNG, WEBP (Max 10 MB)
                    </div>
                  </div>
                )}

                {fileError && <div className="ann-error-msg">⚠️ {fileError}</div>}
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