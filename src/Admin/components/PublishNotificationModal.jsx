import { useState, useEffect } from "react";
import { FiRadio, FiSend, FiX, FiCheckCircle, FiAlertTriangle } from "react-icons/fi";
import { broadcastNotification } from "../../services/notifyStudioService";

export default function PublishNotificationModal({
  isOpen,
  onClose,
  initialData,
  contentTypeLabel = "Content",
  onSuccess,
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("/");
  const [actionLabel, setActionLabel] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialData && isOpen) {
      setTitle(initialData.title || "");
      setBody(initialData.body || "");
      setLink(initialData.link || "/");
      setActionLabel(initialData.actionLabel || "");
      setTargetAudience(initialData.targetAudience || "all");
      setError(null);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError("Please provide both a title and message body.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const res = await broadcastNotification({
        title: title.trim(),
        body: body.trim(),
        link: link.trim() || "/",
        actionLabel: actionLabel.trim() || null,
        contentType: initialData?.contentType || "general",
        contentId: initialData?.contentId || null,
        targetAudience,
        idempotencyKey: initialData?.idempotencyKey || null,
      });

      if (res.success) {
        if (typeof onSuccess === "function") {
          onSuccess(res);
        }
        onClose();
      } else {
        setError(res.error || "Failed to broadcast notification.");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5, 8, 15, 0.75)",
        backdropFilter: "blur(8px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0f172a",
          border: "1px solid rgba(212, 175, 55, 0.35)",
          borderRadius: 18,
          maxWidth: 540,
          width: "100%",
          padding: "1.75rem 2rem",
          boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 35px rgba(212, 175, 55, 0.15)",
          color: "#f8fafc",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(212, 175, 55, 0.15)",
                border: "1px solid rgba(212, 175, 55, 0.3)",
                color: "#d4af37",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
                flexShrink: 0,
              }}
            >
              <FiRadio />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#f8fafc" }}>
                Notify Subscribers
              </h3>
              <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                {contentTypeLabel} published successfully! Broadcast an update now?
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <FiX size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: 8,
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
              fontSize: "0.85rem",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <FiAlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSend}>
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#cbd5e1",
                marginBottom: 4,
              }}
            >
              <span>Notification Title *</span>
              <span style={{ color: "#64748b", fontSize: "0.72rem" }}>{title.length}/100</span>
            </label>
            <input
              type="text"
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                width: "100%",
                background: "rgba(10, 14, 23, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 8,
                padding: "0.65rem 0.85rem",
                color: "#f8fafc",
                fontSize: "0.86rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#cbd5e1",
                marginBottom: 4,
              }}
            >
              <span>Message Body *</span>
              <span style={{ color: "#64748b", fontSize: "0.72rem" }}>{body.length}/300</span>
            </label>
            <textarea
              maxLength={300}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={3}
              style={{
                width: "100%",
                background: "rgba(10, 14, 23, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 8,
                padding: "0.65rem 0.85rem",
                color: "#f8fafc",
                fontSize: "0.86rem",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#cbd5e1",
                marginBottom: 4,
              }}
            >
              Destination Link / Slug
            </label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              required
              style={{
                width: "100%",
                background: "rgba(10, 14, 23, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 8,
                padding: "0.65rem 0.85rem",
                color: "#d4af37",
                fontSize: "0.86rem",
                boxSizing: "border-box",
                fontFamily: "monospace",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "1.25rem" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "#cbd5e1",
                  marginBottom: 4,
                }}
              >
                Action Label
              </label>
              <input
                type="text"
                placeholder="e.g. Read Now"
                value={actionLabel}
                onChange={(e) => setActionLabel(e.target.value)}
                maxLength={30}
                style={{
                  width: "100%",
                  background: "rgba(10, 14, 23, 0.75)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: 8,
                  padding: "0.6rem 0.8rem",
                  color: "#f8fafc",
                  fontSize: "0.82rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "#cbd5e1",
                  marginBottom: 4,
                }}
              >
                Target Audience
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(10, 14, 23, 0.75)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: 8,
                  padding: "0.6rem 0.8rem",
                  color: "#f8fafc",
                  fontSize: "0.82rem",
                  boxSizing: "border-box",
                }}
              >
                <option value="all">All Active Subscribers</option>
                <option value="authenticated">Authenticated Members</option>
              </select>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              paddingTop: "0.85rem",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#cbd5e1",
                padding: "0.65rem 1.2rem",
                borderRadius: 8,
                fontSize: "0.86rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Skip / Done
            </button>

            <button
              type="submit"
              disabled={sending || !title.trim() || !body.trim()}
              style={{
                background: "linear-gradient(135deg, #d4af37, #b8972e)",
                border: "none",
                color: "#0b0f19",
                padding: "0.65rem 1.35rem",
                borderRadius: 8,
                fontSize: "0.86rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 4px 14px rgba(212, 175, 55, 0.25)",
              }}
            >
              <FiSend />
              <span>{sending ? "Broadcasting..." : "Broadcast Push"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
