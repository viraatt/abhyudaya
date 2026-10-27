import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { FiBell, FiBellOff, FiX, FiCheck } from "react-icons/fi";
import {
  isPushSupported,
  getNotificationPermission,
  getStoredPushToken,
  subscribeToPushNotifications,
  onPermissionChange,
} from "../services/notificationService";
import "./NotificationPrompt.css";

const DISMISSAL_STORAGE_KEY = "abhyudaya_push_dismissed_until";
const DISMISSAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DISPLAY_DELAY_MS = 4000; // 4 seconds delay after page load
const EXIT_ANIMATION_DURATION_MS = 220; // Matches CSS exit animation duration

export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [permission, setPermission] = useState(() => getNotificationPermission());
  const [isClosing, setIsClosing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const timerRef = useRef(null);
  const exitTimerRef = useRef(null);

  const closeWithAnimation = useCallback((callback) => {
    setIsClosing(true);
    exitTimerRef.current = setTimeout(() => {
      setVisible(false);
      setIsClosing(false);
      if (typeof callback === "function") callback();
    }, EXIT_ANIMATION_DURATION_MS);
  }, []);

  useEffect(() => {
    let mounted = true;
    console.log("[Push Prompt] Component mounted");

    // Diagnostic helper for resetting prompt in browser console during testing
    if (typeof window !== "undefined") {
      window.__resetNotificationPrompt = () => {
        localStorage.removeItem(DISMISSAL_STORAGE_KEY);
        console.log("[Push Prompt] Dismissal state reset. Refresh to see prompt.");
      };
    }

    async function evaluateEligibility() {
      // 1. Check browser and FCM push support
      const supported = await isPushSupported();
      if (!mounted) return;

      if (!supported) {
        console.log("[Push Prompt] Visibility decision: Hidden (Push not supported by browser/environment)");
        return;
      }

      // 2. Check current notification permission
      const currentPerm = getNotificationPermission();
      setPermission(currentPerm);
      console.log("[Push Prompt] Current permission state:", currentPerm);

      if (currentPerm === "denied") {
        console.log("[Push Prompt] Visibility decision: Hidden (Permission previously blocked by user)");
        return;
      }

      // 3. Check existing subscription status
      const existingToken = getStoredPushToken();
      const isSubscribed = Boolean(existingToken) && currentPerm === "granted";
      console.log("[Push Prompt] Subscription status:", isSubscribed ? "Subscribed" : "Not subscribed");

      if (isSubscribed) {
        console.log("[Push Prompt] Visibility decision: Hidden (User is already subscribed)");
        return;
      }

      // 4. Check dismissal period (7 days)
      const dismissedUntilStr = localStorage.getItem(DISMISSAL_STORAGE_KEY);
      const dismissedUntil = dismissedUntilStr ? parseInt(dismissedUntilStr, 10) : 0;
      const isDismissed = dismissedUntil && Date.now() < dismissedUntil;

      console.log(
        "[Push Prompt] Dismissal expiry:",
        dismissedUntil ? new Date(dismissedUntil).toISOString() : "none"
      );

      if (isDismissed) {
        console.log(
          "[Push Prompt] Visibility decision: Hidden (Dismissed until",
          new Date(dismissedUntil).toLocaleString() + ")"
        );
        return;
      }

      // 5. Eligible: Schedule appearance after delay
      console.log(`[Push Prompt] Visibility decision: Eligible! Scheduling popup in ${DISPLAY_DELAY_MS / 1000}s`);
      timerRef.current = setTimeout(() => {
        if (mounted) {
          console.log("[Push Prompt] Showing notification subscription popup now");
          setVisible(true);
        }
      }, DISPLAY_DELAY_MS);
    }

    evaluateEligibility();

    // Listen for live browser permission changes (e.g. user toggles in address bar)
    const unsub = onPermissionChange((newPerm) => {
      if (!mounted) return;
      console.log("[Push Prompt] Live permission change detected:", newPerm);
      setPermission(newPerm);

      if (newPerm === "granted") {
        setError(null);
        const token = getStoredPushToken();
        if (token) {
          closeWithAnimation();
        }
      }
    });

    return () => {
      mounted = false;
      unsub();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
    };
  }, [closeWithAnimation]);

  const handleDismiss = () => {
    const expiry = Date.now() + DISMISSAL_DURATION_MS;
    localStorage.setItem(DISMISSAL_STORAGE_KEY, String(expiry));
    console.log(
      "[Push Prompt] User dismissed prompt. Hidden for 7 days until:",
      new Date(expiry).toISOString()
    );
    closeWithAnimation();
  };

  const handleEnable = async () => {
    setLoading(true);
    setError(null);
    console.log("[Push Prompt] User clicked 'Enable Notifications'. Checking permission state...");

    try {
      const res = await subscribeToPushNotifications();
      const updatedPerm = res.permission || getNotificationPermission();
      setPermission(updatedPerm);

      if (res.success) {
        console.log("[Push Prompt] Successfully subscribed to push notifications");
        setSuccess(true);
        setTimeout(() => {
          closeWithAnimation();
        }, 1600);
      } else {
        console.log("[Push Prompt] Subscription unsuccessful:", res.error, "Permission:", updatedPerm);
        setError(res.error || "Unable to enable notifications.");
      }
    } catch (err) {
      console.error("[Push Prompt] Error enabling notifications:", err);
      setError(err.message || "Failed to subscribe.");
    } finally {
      setLoading(false);
    }
  };

  if (!visible || typeof document === "undefined") {
    return null;
  }

  const isBlocked = permission === "denied";

  return createPortal(
    <div
      className={`push-prompt ${isClosing ? "push-prompt--closing" : ""}`}
      role="dialog"
      aria-labelledby="push-prompt-title"
      aria-describedby="push-prompt-desc"
    >
      <div className="push-prompt__header">
        <div className="push-prompt__brand">
          <div className="push-prompt__icon-wrap" aria-hidden="true">
            {isBlocked ? (
              <FiBellOff size={16} />
            ) : (
              <span className="push-prompt__icon-bell">
                <FiBell size={16} />
              </span>
            )}
          </div>
          <div className="push-prompt__headings">
            <span className="push-prompt__tag">
              {isBlocked ? "Permission Blocked" : "Stay Connected"}
            </span>
            <h4 id="push-prompt-title" className="push-prompt__title">
              Abhyudaya Club Updates
            </h4>
          </div>
        </div>
        <button
          type="button"
          className="push-prompt__close"
          onClick={handleDismiss}
          aria-label="Dismiss notification prompt"
          title="Dismiss"
        >
          <FiX size={16} />
        </button>
      </div>

      <p id="push-prompt-desc" className="push-prompt__desc">
        {isBlocked
          ? "Notifications are blocked in your browser settings. To enable them, click the lock icon in your address bar and set Notifications to 'Allow'."
          : "Get instant browser notifications for upcoming events, workshops, certificates, and important club announcements."}
      </p>

      {error && !isBlocked && (
        <div className="push-prompt__alert push-prompt__alert--error" role="alert">
          {error}
        </div>
      )}

      {success ? (
        <div className="push-prompt__alert push-prompt__alert--success" role="status">
          <FiCheck size={14} style={{ flexShrink: 0 }} />
          <span>You&apos;re subscribed! You will now receive club updates.</span>
        </div>
      ) : isBlocked ? (
        <div className="push-prompt__actions">
          <button
            type="button"
            className="push-prompt__btn push-prompt__btn--primary"
            onClick={handleDismiss}
          >
            Got It
          </button>
        </div>
      ) : (
        <div className="push-prompt__actions">
          <button
            type="button"
            className="push-prompt__btn push-prompt__btn--primary"
            onClick={handleEnable}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="push-prompt__spinner" />
                <span>Enabling...</span>
              </>
            ) : (
              <>
                <FiBell size={14} />
                <span>Enable Notifications</span>
              </>
            )}
          </button>
          <button
            type="button"
            className="push-prompt__btn push-prompt__btn--dismiss"
            onClick={handleDismiss}
            disabled={loading}
          >
            Maybe Later
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}
