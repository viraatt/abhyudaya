import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, getMessagingInstance } from "../Firebase/firebase";

const STORAGE_KEY = "abhyudaya_push_token";

/**
 * Checks whether the current browser supports push notifications and FCM.
 */
export async function isPushSupported() {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return false;
  }

  const messaging = await getMessagingInstance();
  return Boolean(messaging);
}

/**
 * Gets the current notification permission state.
 * Returns: "unsupported" | "granted" | "denied" | "default"
 */
export function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Checks if the user is locally marked as subscribed with a valid token.
 */
export function getStoredPushToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Subscribes the current device to FCM push notifications.
 *
 * @param {object|null} currentUser - Optional logged-in user profile
 * @returns {Promise<{ success: boolean, token?: string, error?: string, permission?: string }>}
 */
export async function subscribeToPushNotifications(currentUser = null) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return { success: false, error: "Push notifications are not supported by your browser." };
    }

    // 1. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return {
        success: false,
        permission,
        error: permission === "denied"
          ? "Notification permission was blocked. Please enable notifications in your browser site settings."
          : "Notification permission was dismissed."
      };
    }

    // 2. Register service worker
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;

    // 3. Get messaging instance
    const messaging = await getMessagingInstance();
    if (!messaging) {
      return { success: false, error: "Firebase Cloud Messaging could not be initialized." };
    }

    // 4. Retrieve FCM device token
    const { getToken } = await import("firebase/messaging");
    const rawVapid = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    const vapidKey = rawVapid && rawVapid.trim().length > 0 ? rawVapid.trim() : undefined;

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return { success: false, error: "Unable to retrieve registration token from messaging provider." };
    }

    // 5. Store / update subscription record in Firestore
    const subscriptionRef = doc(db, "notification_subscriptions", token);
    await setDoc(
      subscriptionRef,
      {
        token,
        userId: currentUser?.uid || null,
        userEmail: currentUser?.email || null,
        userAgent: navigator.userAgent,
        platform: navigator.platform || "unknown",
        active: true,
        subscribedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 6. Save in local storage
    localStorage.setItem(STORAGE_KEY, token);

    return { success: true, token, permission: "granted" };
  } catch (err) {
    console.error("[Push Notifications] Subscription error:", err);
    return {
      success: false,
      error: err.message || "Failed to enable notifications. Please check your network connection.",
    };
  }
}

/**
 * Unsubscribes the current device from push notifications.
 *
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function unsubscribeFromPushNotifications() {
  try {
    const token = getStoredPushToken();

    // 1. Mark as inactive or remove from Firestore
    if (token) {
      try {
        const subscriptionRef = doc(db, "notification_subscriptions", token);
        await updateDoc(subscriptionRef, {
          active: false,
          unsubscribedAt: serverTimestamp(),
        });
      } catch (err) {
        // If doc doesn't exist or permission denied, fallback to delete or continue
        console.warn("[Push Notifications] Failed to update Firestore subscription status:", err);
      }
    }

    // 2. Delete token from FCM client
    try {
      const messaging = await getMessagingInstance();
      if (messaging) {
        const { deleteToken } = await import("firebase/messaging");
        await deleteToken(messaging);
      }
    } catch (err) {
      console.warn("[Push Notifications] deleteToken warning:", err);
    }

    // 3. Clear local storage
    localStorage.removeItem(STORAGE_KEY);

    return { success: true };
  } catch (err) {
    console.error("[Push Notifications] Unsubscribe error:", err);
    return { success: false, error: err.message || "Failed to unsubscribe." };
  }
}

/**
 * Subscribes to foreground push messages while the application is actively open.
 *
 * @param {Function} onMessageCallback - Receives payload `{ notification, data }`
 * @returns {Promise<Function|null>} Cleanup unsubscription function
 */
export async function listenToForegroundMessages(onMessageCallback) {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const { onMessage } = await import("firebase/messaging");
    return onMessage(messaging, (payload) => {
      console.log("[Push Notifications] Foreground message received:", payload);
      if (typeof onMessageCallback === "function") {
        onMessageCallback(payload);
      }
    });
  } catch (err) {
    console.warn("[Push Notifications] Foreground listener error:", err);
    return null;
  }
}
