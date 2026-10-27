import { useEffect, useState, useCallback, useMemo } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import {
  FiRadio,
  FiUsers,
  FiSend,
  FiCheckCircle,
  FiAlertTriangle,
  FiRefreshCw,
  FiInfo,
  FiBookmark,
  FiTrash2,
  FiSmartphone,
  FiMonitor,
  FiSearch,
  FiSliders,
  FiExternalLink,
} from "react-icons/fi";
import logoImg from "../../assets/logo-120.png";
import {
  fetchNotificationStats,
  broadcastNotification,
  sendTestNotification,
  saveNotifyDraft,
  getNotifyDraft,
  clearNotifyDraft,
} from "../../services/notifyStudioService";
import "./style/admin.css";
import "./Notifications.css";

const CONTENT_TYPES = [
  { id: "general", label: "⚡ General", presetPath: "/" },
  { id: "blog", label: "📝 Blog", presetPath: "/blog" },
  { id: "event", label: "🎯 Event", presetPath: "/events" },
  { id: "announcement", label: "📢 Announcement", presetPath: "/announcements" },
];

const PRESETS_BY_TYPE = {
  general: [
    { label: "Home", path: "/" },
    { label: "About Us", path: "/about" },
    { label: "Gallery", path: "/gallery" },
    { label: "Contact", path: "/contact" },
  ],
  blog: [
    { label: "All Blogs", path: "/blog" },
    { label: "Featured Article", path: "/blog" },
  ],
  event: [
    { label: "All Events", path: "/events" },
    { label: "Event Registration", path: "/register" },
  ],
  announcement: [
    { label: "All Announcements", path: "/announcements" },
    { label: "Important Notices", path: "/announcements" },
  ],
};

export default function Notifications() {
  const [stats, setStats] = useState({ activeSubscribers: 0, authenticatedSubscribers: 0 });
  const [history, setHistory] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Form State
  const [contentType, setContentType] = useState("general");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("/");
  const [actionLabel, setActionLabel] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");

  // Interaction States
  const [previewMode, setPreviewMode] = useState("desktop");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  const hasVapidKey = Boolean(
    import.meta.env.VITE_FIREBASE_VAPID_KEY &&
      import.meta.env.VITE_FIREBASE_VAPID_KEY.trim().length > 0
  );

  // Check for existing draft on mount
  useEffect(() => {
    const draft = getNotifyDraft();
    if (draft && (draft.title || draft.body)) {
      setHasSavedDraft(true);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await fetchNotificationStats();
      if (data.success) {
        setStats(data.stats || { activeSubscribers: 0, authenticatedSubscribers: 0 });
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error("[NotifyStudio] Load data error:", err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Content Type Change
  const handleContentTypeSelect = (typeId) => {
    setContentType(typeId);
    const typeObj = CONTENT_TYPES.find((t) => t.id === typeId);
    if (typeObj && (!link || link === "/")) {
      setLink(typeObj.presetPath);
    }
  };

  // Draft Management
  const handleSaveDraft = () => {
    saveNotifyDraft({
      contentType,
      title,
      body,
      link,
      actionLabel,
      targetAudience,
    });
    setHasSavedDraft(true);
    setFeedback({ type: "success", message: "Draft saved locally to your browser." });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleRestoreDraft = () => {
    const draft = getNotifyDraft();
    if (draft) {
      if (draft.contentType) setContentType(draft.contentType);
      if (draft.title) setTitle(draft.title);
      if (draft.body) setBody(draft.body);
      if (draft.link) setLink(draft.link);
      if (draft.actionLabel) setActionLabel(draft.actionLabel);
      if (draft.targetAudience) setTargetAudience(draft.targetAudience);
      setFeedback({ type: "success", message: "Draft restored successfully." });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleClearDraft = () => {
    clearNotifyDraft();
    setHasSavedDraft(false);
    setFeedback({ type: "success", message: "Saved draft cleared." });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Test Notification
  const handleSendTest = async () => {
    if (!title.trim() || !body.trim()) {
      setFeedback({
        type: "error",
        message: "Please enter both a title and message before sending a test notification.",
      });
      return;
    }

    setSendingTest(true);
    setFeedback(null);

    const res = await sendTestNotification({
      title: title.trim(),
      body: body.trim(),
      link: link.trim() || "/",
      contentType,
      actionLabel: actionLabel.trim() || null,
    });

    setSendingTest(false);

    if (res.success) {
      setFeedback({
        type: "success",
        message: "Test push notification delivered to your browser device!",
      });
    } else {
      setFeedback({
        type: "error",
        message: res.error || "Failed to deliver test notification.",
      });
    }
  };

  // Broadcast Confirmation Trigger
  const handleInitiateBroadcast = (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setFeedback({
        type: "error",
        message: "Both title and message are required for broadcasting.",
      });
      return;
    }
    setShowConfirmModal(true);
  };

  // Final Broadcast Execution
  const handleExecuteBroadcast = async () => {
    setShowConfirmModal(false);
    setSending(true);
    setFeedback(null);

    try {
      const res = await broadcastNotification({
        title: title.trim(),
        body: body.trim(),
        link: link.trim() || "/",
        contentType,
        actionLabel: actionLabel.trim() || null,
        targetAudience,
      });

      if (res.success) {
        setFeedback({
          type: res.duplicate ? "duplicate" : "success",
          message:
            res.message ||
            `Dispatched broadcast to ${res.successCount} subscriber(s) (${res.failureCount} failed).`,
        });
        setTitle("");
        setBody("");
        setActionLabel("");
        clearNotifyDraft();
        setHasSavedDraft(false);
        loadData();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to broadcast notification.",
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "An unexpected error occurred during dispatch.",
      });
    } finally {
      setSending(false);
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesType =
        typeFilter === "all" || (item.contentType || "general") === typeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.body && item.body.toLowerCase().includes(q)) ||
        (item.link && item.link.toLowerCase().includes(q));

      return matchesType && matchesSearch;
    });
  }, [history, typeFilter, searchQuery]);

  const recipientCount =
    targetAudience === "authenticated"
      ? stats.authenticatedSubscribers
      : stats.activeSubscribers;

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="notif-admin">
          {/* Header */}
          <div className="notif-admin__header">
            <div className="notif-admin__title-wrap">
              <span className="notif-admin__badge">
                <FiRadio /> Abhyudaya Notify Studio
              </span>
              <h1 className="notif-admin__title">Push Notification Broadcasting</h1>
              <p className="notif-admin__subtitle">
                Compose, preview, and broadcast real-time browser push notifications to club members
                and subscribers.
              </p>
            </div>

            <button
              type="button"
              className="notif-btn-secondary"
              onClick={loadData}
              disabled={loadingStats}
            >
              <FiRefreshCw className={loadingStats ? "spin" : ""} />
              <span>Refresh Stats</span>
            </button>
          </div>

          {/* VAPID Notice if missing */}
          {!hasVapidKey && (
            <div className="notif-feedback-banner notif-feedback-banner--duplicate">
              <FiAlertTriangle size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>Firebase VAPID Key Notice:</strong> <code>VITE_FIREBASE_VAPID_KEY</code> is
                missing in <code>.env.local</code>. Frontend users can only subscribe to push
                notifications once a Web Push key pair is configured.
              </div>
            </div>
          )}

          {/* Feedback Banner */}
          {feedback && (
            <div className={`notif-feedback-banner notif-feedback-banner--${feedback.type}`}>
              {feedback.type === "success" && <FiCheckCircle size={18} style={{ flexShrink: 0 }} />}
              {feedback.type === "error" && <FiAlertTriangle size={18} style={{ flexShrink: 0 }} />}
              {feedback.type === "duplicate" && <FiInfo size={18} style={{ flexShrink: 0 }} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Stats Bar */}
          <div className="notif-stats-grid">
            <div className="notif-stat-card">
              <div className="notif-stat-card__icon notif-stat-card__icon--green">
                <FiUsers />
              </div>
              <div>
                <p className="notif-stat-card__value">
                  {loadingStats ? "..." : stats.activeSubscribers}
                </p>
                <p className="notif-stat-card__label">Active Push Subscribers</p>
              </div>
            </div>

            <div className="notif-stat-card">
              <div className="notif-stat-card__icon notif-stat-card__icon--blue">
                <FiUsers />
              </div>
              <div>
                <p className="notif-stat-card__value">
                  {loadingStats ? "..." : stats.authenticatedSubscribers}
                </p>
                <p className="notif-stat-card__label">Authenticated Members</p>
              </div>
            </div>

            <div className="notif-stat-card">
              <div className="notif-stat-card__icon notif-stat-card__icon--purple">
                <FiSend />
              </div>
              <div>
                <p className="notif-stat-card__value">
                  {loadingStats ? "..." : history.length}
                </p>
                <p className="notif-stat-card__label">Broadcasts Dispatched</p>
              </div>
            </div>

            <div className="notif-stat-card">
              <div className="notif-stat-card__icon">
                <FiCheckCircle />
              </div>
              <div>
                <p className="notif-stat-card__value">
                  {hasVapidKey ? "Connected" : "Pending Key"}
                </p>
                <p className="notif-stat-card__label">FCM Pipeline Status</p>
              </div>
            </div>
          </div>

          {/* Studio Content Grid */}
          <div className="notif-content-grid">
            {/* Compose Card */}
            <div className="notif-card">
              <h2 className="notif-card__title">
                <FiSend className="notif-admin__title-icon" />
                <span>Compose Notification</span>
                <span className="notif-card__title-badge">Step 1 of 2</span>
              </h2>

              {/* Content Type Tabs */}
              <div className="notif-types-bar">
                {CONTENT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    className={`notif-type-btn ${
                      contentType === type.id ? "notif-type-btn--active" : ""
                    }`}
                    onClick={() => handleContentTypeSelect(type.id)}
                  >
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleInitiateBroadcast}>
                {/* Title */}
                <div className="notif-form-group">
                  <label className="notif-label" htmlFor="notif-title">
                    <span>Notification Title *</span>
                    <span
                      className={`notif-char-count ${
                        title.length > 90 ? "notif-char-count--warn" : ""
                      }`}
                    >
                      {title.length}/100
                    </span>
                  </label>
                  <input
                    id="notif-title"
                    type="text"
                    maxLength={100}
                    className="notif-input"
                    placeholder="e.g. 🎯 Tech Nova 2026: Registrations Are Now Live!"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Message Body */}
                <div className="notif-form-group">
                  <label className="notif-label" htmlFor="notif-body">
                    <span>Message Body *</span>
                    <span
                      className={`notif-char-count ${
                        body.length > 270 ? "notif-char-count--warn" : ""
                      }`}
                    >
                      {body.length}/300
                    </span>
                  </label>
                  <textarea
                    id="notif-body"
                    maxLength={300}
                    className="notif-textarea"
                    placeholder="e.g. Join us for keynote tech sessions, networking, and certificate awards. Register before slots fill up!"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                  />
                </div>

                {/* Destination Route */}
                <div className="notif-form-group">
                  <label className="notif-label" htmlFor="notif-link">
                    <span>Destination URL / Route *</span>
                    <span className="notif-char-count">Opens upon clicking</span>
                  </label>
                  <input
                    id="notif-link"
                    type="text"
                    className="notif-input"
                    placeholder="e.g. /events or /blog/my-post"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    required
                  />
                  <div className="notif-presets-wrapper">
                    <div className="notif-presets-label">Quick Destination Presets:</div>
                    <div className="notif-presets">
                      {(PRESETS_BY_TYPE[contentType] || PRESETS_BY_TYPE.general).map((preset) => (
                        <button
                          key={preset.path}
                          type="button"
                          className="notif-preset-btn"
                          onClick={() => setLink(preset.path)}
                        >
                          {preset.label} ({preset.path})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Label (Optional) & Audience Scope */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="notif-form-group">
                    <label className="notif-label" htmlFor="notif-action-label">
                      <span>Action Label (Optional)</span>
                    </label>
                    <input
                      id="notif-action-label"
                      type="text"
                      maxLength={30}
                      className="notif-input"
                      placeholder="e.g. Register Now"
                      value={actionLabel}
                      onChange={(e) => setActionLabel(e.target.value)}
                    />
                  </div>

                  <div className="notif-form-group">
                    <label className="notif-label" htmlFor="notif-audience">
                      <span>Target Audience</span>
                    </label>
                    <select
                      id="notif-audience"
                      className="notif-select"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                    >
                      <option value="all">All Active Subscribers ({stats.activeSubscribers})</option>
                      <option value="authenticated">
                        Authenticated Members Only ({stats.authenticatedSubscribers})
                      </option>
                    </select>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="notif-form-actions-bar">
                  <div className="notif-draft-actions">
                    <button
                      type="button"
                      className="notif-btn-secondary"
                      onClick={handleSaveDraft}
                      title="Save composition locally"
                    >
                      <FiBookmark />
                      <span>Save Draft</span>
                    </button>

                    {hasSavedDraft && (
                      <>
                        <button
                          type="button"
                          className="notif-btn-secondary"
                          onClick={handleRestoreDraft}
                          title="Restore last saved draft"
                        >
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          className="notif-btn-secondary"
                          onClick={handleClearDraft}
                          title="Clear saved draft"
                        >
                          <FiTrash2 />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      className="notif-btn-test"
                      onClick={handleSendTest}
                      disabled={sendingTest || !title.trim() || !body.trim()}
                      title="Send test to your current browser"
                    >
                      <FiMonitor />
                      <span>{sendingTest ? "Testing..." : "Send Test to Me"}</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="notif-submit-btn"
                    disabled={sending || !title.trim() || !body.trim()}
                  >
                    {sending ? (
                      <>
                        <FiRefreshCw className="spin" />
                        <span>Broadcasting...</span>
                      </>
                    ) : (
                      <>
                        <FiSend />
                        <span>Review & Broadcast ({recipientCount})</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Live Preview Panel */}
            <div>
              <div className="notif-card">
                <div className="notif-preview-box__header">
                  <h2 className="notif-card__title" style={{ margin: 0 }}>
                    <FiInfo className="notif-admin__title-icon" />
                    <span>Live Browser Preview</span>
                  </h2>

                  <div className="notif-preview-toggle-btns">
                    <button
                      type="button"
                      className={`notif-preview-toggle-btn ${
                        previewMode === "desktop" ? "notif-preview-toggle-btn--active" : ""
                      }`}
                      onClick={() => setPreviewMode("desktop")}
                    >
                      <FiMonitor style={{ marginRight: 4 }} />
                      Desktop
                    </button>
                    <button
                      type="button"
                      className={`notif-preview-toggle-btn ${
                        previewMode === "mobile" ? "notif-preview-toggle-btn--active" : ""
                      }`}
                      onClick={() => setPreviewMode("mobile")}
                    >
                      <FiSmartphone style={{ marginRight: 4 }} />
                      Mobile
                    </button>
                  </div>
                </div>

                <div className="notif-preview-box">
                  <div className="notif-preview-mockup">
                    <img src={logoImg} alt="Abhyudaya" className="notif-preview-mockup__icon" />
                    <div className="notif-preview-mockup__content">
                      <div className="notif-preview-mockup__meta">
                        <span className="notif-preview-mockup__app-name">
                          <span className="notif-preview-mockup__app-dot" />
                          Abhyudaya Club
                        </span>
                        <span className="notif-preview-mockup__time">now</span>
                      </div>
                      <h4 className="notif-preview-mockup__title">
                        {title.trim() || "Notification Title Preview"}
                      </h4>
                      <p className="notif-preview-mockup__body">
                        {body.trim() ||
                          "Your push notification message preview will appear here as users will see it."}
                      </p>

                      <div className="notif-preview-mockup__footer">
                        <span className="notif-preview-mockup__link-tag">
                          {link.trim() || "/"}
                        </span>
                        {actionLabel && (
                          <span className="notif-preview-mockup__action-chip">
                            {actionLabel.trim()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="notif-info-box">
                  <strong>Delivery Behavior:</strong>
                  <ul>
                    <li>
                      <strong>Background / Sleep:</strong> Rendered through the active OS notification
                      tray via the background service worker.
                    </li>
                    <li>
                      <strong>Foreground / Active Site:</strong> Triggered via web worker messaging
                      listener and displayed instantly in foreground notification prompt.
                    </li>
                    <li>
                      <strong>Click Navigation:</strong> Focuses an open tab or launches destination:{" "}
                      <code>{link || "/"}</code>.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* History Card */}
          <div className="notif-history-card">
            <div className="notif-history-header">
              <div>
                <h2 className="notif-card__title" style={{ margin: 0 }}>
                  <FiRadio className="notif-admin__title-icon" />
                  <span>Broadcast History &amp; Delivery Log</span>
                </h2>
                <p style={{ margin: "0.25rem 0 0", color: "#94a3b8", fontSize: "0.82rem" }}>
                  Record of all dispatched push broadcasts with delivery metrics.
                </p>
              </div>

              <div className="notif-history-tools">
                <input
                  type="text"
                  placeholder="Filter by title or link..."
                  className="notif-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                <select
                  className="notif-search-input"
                  style={{ width: "130px" }}
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="blog">Blog</option>
                  <option value="event">Event</option>
                  <option value="announcement">Announcement</option>
                  <option value="general">General</option>
                </select>

                <button
                  type="button"
                  className="notif-preset-btn"
                  onClick={loadData}
                  disabled={loadingStats}
                  style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
                >
                  <FiRefreshCw className={loadingStats ? "spin" : ""} />
                  Refresh
                </button>
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <p style={{ color: "#64748b", fontStyle: "italic", margin: "1.5rem 0" }}>
                {history.length === 0
                  ? "No push broadcasts dispatched yet."
                  : "No notifications match the filter."}
              </p>
            ) : (
              <div className="notif-table-wrapper">
                <table className="notif-table">
                  <thead>
                    <tr>
                      <th>Type &amp; Content</th>
                      <th>Destination Link</th>
                      <th>Audience</th>
                      <th>Delivery Statistics</th>
                      <th>Sender</th>
                      <th>Date &amp; Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((item) => {
                      const type = item.contentType || "general";
                      const successPct =
                        item.totalRecipients > 0
                          ? Math.round(((item.successCount || 0) / item.totalRecipients) * 100)
                          : 100;

                      return (
                        <tr key={item.id}>
                          <td style={{ maxWidth: "340px" }}>
                            <span className={`notif-type-chip notif-type-chip--${type}`}>
                              {type}
                            </span>
                            <strong style={{ color: "#f8fafc", display: "block", fontSize: "0.88rem" }}>
                              {item.title}
                            </strong>
                            <span
                              style={{
                                fontSize: "0.78rem",
                                color: "#94a3b8",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                marginTop: "2px",
                              }}
                            >
                              {item.body}
                            </span>
                          </td>
                          <td>
                            <a
                              href={item.link || "/"}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: "#d4af37",
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                fontSize: "0.82rem",
                                fontFamily: "monospace",
                              }}
                            >
                              <span>{item.link || "/"}</span>
                              <FiExternalLink size={12} />
                            </a>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
                              {item.targetAudience === "authenticated" ? "Members" : "All Subs"}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span className="notif-badge notif-badge--success">
                                {item.successCount || 0} sent ({successPct}%)
                              </span>
                              {item.failureCount > 0 && (
                                <span className="notif-badge notif-badge--warn">
                                  {item.failureCount} failed
                                </span>
                              )}
                            </div>
                            <small style={{ color: "#64748b", display: "block", marginTop: "3px" }}>
                              Total recipients: {item.totalRecipients || 0}
                            </small>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                              {item.sentBy || "Admin"}
                            </span>
                          </td>
                          <td style={{ fontSize: "0.78rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                            {item.sentAt
                              ? new Date(item.sentAt).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="notif-modal-backdrop" onClick={() => setShowConfirmModal(false)}>
          <div className="notif-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="notif-modal-header">
              <div className="notif-modal-icon">
                <FiSend />
              </div>
              <div>
                <h3 className="notif-modal-title">Confirm Push Broadcast</h3>
                <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                  This will dispatch to active browser devices immediately.
                </span>
              </div>
            </div>

            <div className="notif-modal-body">
              Are you sure you want to broadcast this notification to{" "}
              <strong>{recipientCount} active device(s)</strong>?
              <div className="notif-modal-summary-box">
                <div className="notif-modal-summary-row">
                  <span className="notif-modal-summary-label">Category:</span>
                  <span className="notif-modal-summary-value" style={{ textTransform: "capitalize" }}>
                    {contentType}
                  </span>
                </div>
                <div className="notif-modal-summary-row">
                  <span className="notif-modal-summary-label">Title:</span>
                  <span className="notif-modal-summary-value">{title}</span>
                </div>
                <div className="notif-modal-summary-row">
                  <span className="notif-modal-summary-label">Destination Link:</span>
                  <span className="notif-modal-summary-value" style={{ color: "#d4af37" }}>
                    {link}
                  </span>
                </div>
                <div className="notif-modal-summary-row">
                  <span className="notif-modal-summary-label">Audience Scope:</span>
                  <span className="notif-modal-summary-value">
                    {targetAudience === "authenticated"
                      ? "Authenticated Members Only"
                      : "All Active Subscribers"}
                  </span>
                </div>
              </div>
            </div>

            <div className="notif-modal-actions">
              <button
                type="button"
                className="notif-modal-cancel"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="notif-modal-confirm"
                onClick={handleExecuteBroadcast}
              >
                <FiSend />
                <span>Confirm &amp; Broadcast</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
