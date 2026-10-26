import { useEffect, useState, useCallback } from "react";
import { auth } from "../../Firebase/firebase";
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
} from "react-icons/fi";
import logoImg from "../../assets/logo-120.png";
import "./style/admin.css";
import "./Notifications.css";

const PRESET_ROUTES = [
  { label: "Events", path: "/events" },
  { label: "Announcements", path: "/announcements" },
  { label: "Blog", path: "/blog" },
  { label: "Gallery", path: "/gallery" },
  { label: "Home", path: "/" },
];

export default function Notifications() {
  const [stats, setStats] = useState({ activeSubscribers: 0 });
  const [history, setHistory] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("/events");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const hasVapidKey = Boolean(
    import.meta.env.VITE_FIREBASE_VAPID_KEY &&
    import.meta.env.VITE_FIREBASE_VAPID_KEY.trim().length > 0
  );

  const getAuthHeader = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return {};
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, []);

  const loadData = useCallback(async () => {
    setLoadingStats(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/admin/send-notification", {
        headers,
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats || { activeSubscribers: 0 });
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error("[Notifications] Load data error:", err);
    } finally {
      setLoadingStats(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const headers = await getAuthHeader();
        const res = await fetch("/api/admin/send-notification", { headers });
        const data = await res.json();
        if (mounted && data.success) {
          setStats(data.stats || { activeSubscribers: 0 });
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error("[Notifications] Load data error:", err);
      } finally {
        if (mounted) setLoadingStats(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [getAuthHeader]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setFeedback({ type: "error", message: "Please provide both a title and message body." });
      return;
    }

    if (
      !window.confirm(
        `Send push notification to all ${stats.activeSubscribers} subscribed browser device(s)?`
      )
    ) {
      return;
    }

    setSending(true);
    setFeedback(null);

    try {
      const headers = await getAuthHeader();
      headers["Content-Type"] = "application/json";

      const res = await fetch("/api/admin/send-notification", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          link: link.trim() || "/",
        }),
      });

      const result = await res.json();
      if (result.success) {
        setFeedback({
          type: "success",
          message: result.message || `Dispatched to ${result.totalRecipients} subscribers!`,
        });
        setTitle("");
        setBody("");
        loadData();
      } else {
        setFeedback({
          type: "error",
          message: result.error || "Failed to dispatch notification.",
        });
      }
    } catch (err) {
      console.error("[Notifications] Send error:", err);
      setFeedback({ type: "error", message: err.message || "Network error while sending notification." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="notif-admin">
          {/* Header */}
          <div className="notif-admin__header">
            <h1 className="notif-admin__title">
              <FiRadio />
              Push Notifications
            </h1>
            <p className="notif-admin__subtitle">
              Broadcast real-time browser push notifications to all subscribed students and members.
            </p>
          </div>

          {/* VAPID Configuration Notice */}
          {!hasVapidKey && (
            <div
              style={{
                background: "rgba(234, 179, 8, 0.12)",
                border: "1px solid rgba(234, 179, 8, 0.3)",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.85rem",
                color: "#fef08a",
                fontSize: "0.86rem",
                lineHeight: "1.45",
              }}
            >
              <FiAlertTriangle size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>Firebase VAPID Key Notice:</strong>{" "}
                <code>VITE_FIREBASE_VAPID_KEY</code> is not yet configured in{" "}
                <code>.env.local</code>. Frontend users can only subscribe to push notifications once
                a Web Push key pair is generated from Firebase Console (<em>Project Settings → Cloud Messaging → Web Push certificates</em>).
              </div>
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
                  {hasVapidKey ? "Configured" : "Pending VAPID"}
                </p>
                <p className="notif-stat-card__label">FCM Integration Status</p>
              </div>
            </div>
          </div>

          {/* Main Content: Form + Mockup */}
          <div className="notif-content-grid">
            {/* Compose Card */}
            <div className="notif-card">
              <h2 className="notif-card__title">
                <FiSend size={18} />
                Compose Broadcast
              </h2>

              <form onSubmit={handleSend}>
                <div className="notif-form-group">
                  <label className="notif-label" htmlFor="notif-title">
                    <span>Notification Title *</span>
                    <span className="notif-char-count">{title.length}/100</span>
                  </label>
                  <input
                    id="notif-title"
                    type="text"
                    maxLength={100}
                    className="notif-input"
                    placeholder="e.g. 🚀 Registrations Open: Tech Nova 2026!"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="notif-form-group">
                  <label className="notif-label" htmlFor="notif-body">
                    <span>Message Body *</span>
                    <span className="notif-char-count">{body.length}/300</span>
                  </label>
                  <textarea
                    id="notif-body"
                    maxLength={300}
                    className="notif-textarea"
                    placeholder="e.g. Join us this Saturday for hands-on workshops, prizes, and certificates. Seats are limited!"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                  />
                </div>

                <div className="notif-form-group">
                  <label className="notif-label" htmlFor="notif-link">
                    <span>Target URL / Route</span>
                    <span className="notif-char-count">Click destination</span>
                  </label>
                  <input
                    id="notif-link"
                    type="text"
                    className="notif-input"
                    placeholder="e.g. /events or https://..."
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                  />
                  <div className="notif-presets">
                    {PRESET_ROUTES.map((p) => (
                      <button
                        key={p.path}
                        type="button"
                        className="notif-preset-btn"
                        onClick={() => setLink(p.path)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {feedback && (
                  <div
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      marginBottom: "1rem",
                      fontSize: "0.85rem",
                      background:
                        feedback.type === "success"
                          ? "rgba(34, 197, 94, 0.12)"
                          : "rgba(239, 68, 68, 0.12)",
                      border: `1px solid ${
                        feedback.type === "success"
                          ? "rgba(34, 197, 94, 0.3)"
                          : "rgba(239, 68, 68, 0.3)"
                      }`,
                      color: feedback.type === "success" ? "#86efac" : "#fca5a5",
                    }}
                  >
                    {feedback.message}
                  </div>
                )}

                <button
                  type="submit"
                  className="notif-submit-btn"
                  disabled={sending || !title.trim() || !body.trim()}
                >
                  {sending ? (
                    <>
                      <FiRefreshCw className="spin" />
                      <span>Sending Broadcast...</span>
                    </>
                  ) : (
                    <>
                      <FiSend />
                      <span>Send to {stats.activeSubscribers} Subscribers</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Live Preview Card */}
            <div>
              <div className="notif-card">
                <h2 className="notif-card__title">
                  <FiInfo size={18} />
                  Live Notification Preview
                </h2>

                <div className="notif-preview-box">
                  <p className="notif-preview-box__title">Desktop / Mobile Banner</p>
                  <div className="notif-preview-mockup">
                    <img
                      src={logoImg}
                      alt="Abhyudaya"
                      className="notif-preview-mockup__icon"
                    />
                    <div className="notif-preview-mockup__content">
                      <div className="notif-preview-mockup__header">
                        <span className="notif-preview-mockup__app-name">Abhyudaya Club</span>
                        <span className="notif-preview-mockup__time">now</span>
                      </div>
                      <h4 className="notif-preview-mockup__title">
                        {title.trim() || "Notification Title Here"}
                      </h4>
                      <p className="notif-preview-mockup__body">
                        {body.trim() || "Your notification message will appear here for recipients."}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "#94a3b8",
                    lineHeight: "1.45",
                    background: "rgba(255, 255, 255, 0.03)",
                    padding: "0.85rem",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <strong>Delivery Behavior:</strong>
                  <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.2rem" }}>
                    <li>
                      <strong>Background / Device Locked:</strong> Shown via native OS push notification (service worker).
                    </li>
                    <li>
                      <strong>Active In-App:</strong> Displayed instantly in the top/bottom foreground banner.
                    </li>
                    <li>
                      <strong>Clicking:</strong> Automatically routes users to <code>{link || "/"}</code>.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* History Log */}
          <div className="notif-history-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
              }}
            >
              <h2 className="notif-card__title" style={{ margin: 0 }}>
                Recent Broadcasts
              </h2>
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

            {history.length === 0 ? (
              <p style={{ color: "#64748b", fontStyle: "italic", margin: "1rem 0" }}>
                No notifications broadcasted yet.
              </p>
            ) : (
              <table className="notif-table">
                <thead>
                  <tr>
                    <th>Title & Message</th>
                    <th>Destination</th>
                    <th>Recipients</th>
                    <th>Delivered</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td style={{ maxWidth: "340px" }}>
                        <strong style={{ color: "#f8fafc", display: "block" }}>
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
                          }}
                        >
                          {item.body}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.78rem", color: "#d4af37" }}>
                          {item.link || "/"}
                        </span>
                      </td>
                      <td>{item.totalRecipients || 0}</td>
                      <td>
                        <span className="notif-badge notif-badge--success">
                          {item.successCount || 0} sent
                        </span>
                        {item.failureCount > 0 && (
                          <span
                            className="notif-badge notif-badge--warn"
                            style={{ marginLeft: "0.35rem" }}
                          >
                            {item.failureCount} failed
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
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
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
