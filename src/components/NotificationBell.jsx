import { useEffect, useState } from "react";
import { FiBell, FiBellOff, FiCheck } from "react-icons/fi";
import {
  isPushSupported,
  getNotificationPermission,
  getStoredPushToken,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "../services/notificationService";
import { useAuth } from "../context/AuthContext";
import "./NotificationBell.css";

export default function NotificationBell({ minimal = false }) {
  const { currentUser } = useAuth();
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function checkState() {
      const isSupp = await isPushSupported();
      if (!mounted) return;
      setSupported(isSupp);

      if (isSupp) {
        const perm = getNotificationPermission();
        setPermission(perm);
        const token = getStoredPushToken();
        setIsSubscribed(Boolean(token) && perm === "granted");
      }
    }

    checkState();
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    setFeedback(null);

    try {
      if (isSubscribed) {
        const res = await unsubscribeFromPushNotifications();
        if (res.success) {
          setIsSubscribed(false);
          setFeedback({ type: "success", message: "Notifications turned off." });
        } else {
          setFeedback({ type: "error", message: res.error || "Failed to turn off." });
        }
      } else {
        const res = await subscribeToPushNotifications(currentUser);
        if (res.success) {
          setIsSubscribed(true);
          setPermission("granted");
          setFeedback({ type: "success", message: "Push notifications enabled!" });
        } else {
          const perm = getNotificationPermission();
          setPermission(perm);
          setFeedback({ type: "error", message: res.error || "Permission required." });
        }
      }
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return null;
  }

  const isBlocked = permission === "denied";

  if (minimal) {
    return (
      <button
        type="button"
        className={`push-widget__minimal-btn ${isSubscribed ? "push-widget__minimal-btn--active" : ""}`}
        onClick={handleToggle}
        disabled={loading || isBlocked}
        title={
          isBlocked
            ? "Notifications blocked in browser settings"
            : isSubscribed
            ? "Disable push notifications"
            : "Enable push notifications"
        }
        aria-label="Push notifications"
      >
        {loading ? (
          <span className="push-widget__spinner" />
        ) : isBlocked ? (
          <FiBellOff />
        ) : (
          <FiBell />
        )}
      </button>
    );
  }

  return (
    <div
      className={`push-widget ${
        isSubscribed
          ? "push-widget--active"
          : isBlocked
          ? "push-widget--blocked"
          : ""
      }`}
    >
      <div className="push-widget__header">
        <div className="push-widget__meta">
          <div className="push-widget__icon-wrap">
            {isBlocked ? <FiBellOff /> : <FiBell />}
          </div>
          <h4 className="push-widget__title">
            Club Updates
            <span
              className="push-widget__status-dot"
              title={
                isBlocked
                  ? "Notifications blocked"
                  : isSubscribed
                  ? "Notifications active"
                  : "Notifications inactive"
              }
            />
          </h4>
        </div>
      </div>

      <p className="push-widget__desc">
        {isBlocked
          ? "Notifications are blocked by your browser settings. To enable, allow notifications for this site."
          : isSubscribed
          ? "You will receive instant alerts for new events, workshops, and club notices."
          : "Get real-time browser alerts for upcoming events, workshops, and announcements."}
      </p>

      {!isBlocked && (
        <button
          type="button"
          className={`push-widget__action-btn ${
            isSubscribed ? "push-widget__action-btn--active" : ""
          }`}
          onClick={handleToggle}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="push-widget__spinner" />
              <span>Updating...</span>
            </>
          ) : isSubscribed ? (
            <>
              <FiCheck />
              <span>Notifications On</span>
            </>
          ) : (
            <>
              <FiBell />
              <span>Enable Notifications</span>
            </>
          )}
        </button>
      )}

      {feedback && (
        <div
          className={`push-widget__alert push-widget__alert--${feedback.type}`}
          role="status"
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}
