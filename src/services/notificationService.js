import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, getMessagingInstance } from "../Firebase/firebase";

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
 * Gets the current notification permission state directly from the browser API.
 * Returns: "unsupported" | "granted" | "denied" | "default"
 */
export function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Listens for live browser permission changes (e.g. when the user changes
 * site permissions in the browser address bar lock icon or site settings).
 *
 * @param {Function} callback - Called with ("default" | "granted" | "denied")
 * @returns {Function} Cleanup function to remove listeners
 */
export function onPermissionChange(callback) {
  if (typeof window === "undefined") return () => {};

  let permissionStatus = null;

  // 1. Monitor via Permissions API if available
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions
      .query({ name: "notifications" })
      .then((status) => {
        permissionStatus = status;
        permissionStatus.onchange = () => {
          if (typeof callback === "function" && "Notification" in window) {
            callback(Notification.permission);
          }
        };
      })
      .catch(() => {
        // Permissions API query not supported in some browsers
      });
  }

  // 2. Monitor window focus (fires when returning from browser settings tab)
  const handleWindowFocus = () => {
    if (typeof callback === "function" && "Notification" in window) {
      callback(Notification.permission);
    }
  };
  window.addEventListener("focus", handleWindowFocus);

  return () => {
    if (permissionStatus) {
      permissionStatus.onchange = null;
    }
    window.removeEventListener("focus", handleWindowFocus);
  };
}

/**
 * Checks if the user is locally marked as subscribed with a valid token.
 */
export function getStoredPushToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Derives a safe, stable Firestore document ID from an FCM token.
 *
 * FCM tokens are long opaque strings (commonly 140-200+ characters) that
 * may contain characters that cause issues when used directly as Firestore
 * document IDs (forward slashes, leading dots, etc.).  Firestore document
 * IDs also have a 1,500-byte UTF-8 limit.
 *
 * Strategy: djb2-style numeric hash → base-36 string → prefix with "sub_"
 * producing a short (≤ 16 chars), collision-resistant, URL-safe id.
 *
 * @param {string} token - The raw FCM token.
 * @returns {string} Safe Firestore document ID.
 */
function tokenToDocId(token) {
  // djb2 hash over every char of the token
  let hash = 5381;
  for (let i = 0; i < token.length; i++) {
    hash = ((hash << 5) + hash) ^ token.charCodeAt(i);
    // Keep within 32-bit signed integer range to stay predictable
    hash = hash | 0;
  }
  // Convert to unsigned then base-36 to keep it compact and alphanumeric-safe
  const unsigned = hash >>> 0;
  return "sub_" + unsigned.toString(36);
}

/**
 * Subscribes the current device to FCM push notifications.
 * Strictly adheres to browser permission states:
 * - If already "denied", never calls Notification.requestPermission().
 * - If "default", prompts the user.
 * - Distinguishes between dismissed prompts and permanent denials.
 * - Only reports success if permission is granted AND FCM token is stored.
 *
 * @returns {Promise<{ success: boolean, token?: string, error?: string, permission?: string }>}
 */
export async function subscribeToPushNotifications() {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return {
        success: false,
        permission: "unsupported",
        error: "Push notifications are not supported by your browser.",
      };
    }

    const currentPermission = Notification.permission;

    // If permission is already blocked, DO NOT repeatedly invoke requestPermission()
    if (currentPermission === "denied") {
      return {
        success: false,
        permission: "denied",
        error:
          "Notifications are blocked in your browser settings. To enable them, click the lock icon in your address bar and set Notifications to 'Allow'.",
      };
    }

    let resolvedPermission = currentPermission;

    // Trigger browser prompt only if currently "default"
    if (currentPermission === "default") {
      try {
        resolvedPermission = await Notification.requestPermission();
      } catch (err) {
        console.warn("[Push Notifications] requestPermission error:", err);
        resolvedPermission = Notification.permission;
      }
    }

    // Handle user choice
    if (resolvedPermission === "denied") {
      return {
        success: false,
        permission: "denied",
        error:
          "Notifications were blocked. To enable them, click the lock icon in your browser address bar and set Notifications to 'Allow'.",
      };
    }

    if (resolvedPermission === "default") {
      return {
        success: false,
        permission: "default",
        error:
          "The notification prompt was closed. Click 'Enable Notifications' whenever you are ready to allow updates.",
      };
    }

    // Permission is "granted". Now register with Firebase Cloud Messaging.
    // Important: Do not claim notifications are enabled unless FCM succeeds.
    try {
      // 1. Validate VAPID key BEFORE calling getToken() to prevent
      //    "Registration failed – push service error" from browser PushManager.
      //    Modern browsers require a valid applicationServerKey (VAPID public key).
      const rawVapid = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      const vapidKey = rawVapid && rawVapid.trim().length > 10 ? rawVapid.trim() : null;

      if (!vapidKey) {
        console.error(
          "[Push Notifications] VAPID key is missing or empty. " +
          "Add VITE_FIREBASE_VAPID_KEY to .env.local (Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Generate key pair)."
        );
        return {
          success: false,
          permission: "granted",
          error:
            "Notification setup is incomplete: the web push certificate (VAPID key) is not configured. " +
            "Please contact the site administrator.",
        };
      }

      // 2. Register service worker and wait for it to become active
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
        scope: "/",
      });

      // Wait for active controller — handles both fresh installs and updates
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Service worker activation timed out.")), 10000);

        if (registration.active) {
          clearTimeout(timeout);
          resolve(registration);
          return;
        }

        const target = registration.installing || registration.waiting;
        if (!target) {
          clearTimeout(timeout);
          resolve(registration);
          return;
        }

        target.addEventListener("statechange", function onStateChange(e) {
          if (e.target.state === "activated") {
            target.removeEventListener("statechange", onStateChange);
            clearTimeout(timeout);
            resolve(registration);
          } else if (e.target.state === "redundant") {
            target.removeEventListener("statechange", onStateChange);
            clearTimeout(timeout);
            reject(new Error("Service worker became redundant before activating."));
          }
        });
      });

      // 3. Initialize messaging
      const messaging = await getMessagingInstance();
      if (!messaging) {
        return {
          success: false,
          permission: "granted",
          error: "Permission granted, but Firebase Cloud Messaging could not be initialized in this browser.",
        };
      }

      // 4. Retrieve FCM token with validated VAPID key
      const { getToken } = await import("firebase/messaging");

      let token;
      try {
        token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration,
        });
      } catch (tokenErr) {
        console.error("[Push Notifications] getToken() error:", tokenErr);

        // Provide specific, actionable guidance for common failure modes
        const msg = tokenErr.message || "";
        let friendlyError;

        if (msg.includes("push service error") || msg.includes("Registration failed")) {
          // Check for Brave browser (blocks Google push service by default)
          const isBrave = typeof navigator.brave === "object" && typeof navigator.brave.isBrave === "function";
          if (isBrave) {
            friendlyError =
              "Push notifications require Google's push service, which Brave blocks by default. " +
              "Go to brave://settings/privacy and enable \"Use Google services for push messaging\", then try again.";
          } else if (!window.isSecureContext) {
            friendlyError =
              "Push notifications require a secure (HTTPS) connection or localhost. " +
              "Please access the site over HTTPS.";
          } else {
            friendlyError =
              "The browser's push service could not be reached. This can happen in incognito/private mode, " +
              "when third-party cookies are blocked, or when the browser blocks Google's push service. " +
              "Try in a regular browser window with standard privacy settings.";
          }
        } else if (msg.includes("applicationServerKey") || msg.includes("VAPID")) {
          friendlyError =
            "The web push certificate is invalid. Please regenerate the VAPID key in Firebase Console " +
            "(Project Settings → Cloud Messaging → Web Push certificates).";
        } else if (msg.includes("network") || msg.includes("fetch")) {
          friendlyError = "Network error while contacting the push service. Check your connection and try again.";
        } else {
          friendlyError = "Could not complete push registration (" + msg + "). Try again in a standard browser window.";
        }

        return {
          success: false,
          permission: "granted",
          error: friendlyError,
        };
      }

      if (!token) {
        return {
          success: false,
          permission: "granted",
          error: "Permission granted, but failed to retrieve a messaging token. Please check your connection.",
        };
      }

      // 5. Save subscription record to Firestore.
      //    Use a stable, hash-derived document ID instead of the raw token so
      //    we avoid the 1,500-byte Firestore document-ID limit and any special
      //    characters in FCM tokens (e.g. slashes) that would corrupt the path.
      const docId = tokenToDocId(token);
      const subscriptionRef = doc(db, "notification_subscriptions", docId);
      const authenticatedUser = auth.currentUser;
      const subscriptionData = {
        token,
        userId: authenticatedUser?.uid || null,
        userEmail: authenticatedUser?.email || null,
        userAgent: navigator.userAgent,
        platform: navigator.platform || "unknown",
        active: true,
        subscribedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      };
      try {
        await setDoc(subscriptionRef, subscriptionData, { merge: true });
      } catch (firestoreErr) {
        console.error("[Push Notifications] Firestore subscription write failed:", {
          operation: "setDoc(notification_subscriptions/{subId}, merge: true)",
          fieldNames: Object.keys(subscriptionData),
          projectId: db.app.options.projectId,
          authenticated: Boolean(authenticatedUser),
          errorCode: firestoreErr.code || "unknown",
        });
        // Token is valid — store it locally so notifications still work in the
        // foreground even if the database record could not be saved.
        localStorage.setItem(STORAGE_KEY, token);

        const fsMsg = firestoreErr.message || "";
        const isPermDenied = firestoreErr.code === "permission-denied";

        return {
          success: false,
          permission: "granted",
          error: isPermDenied
            ? "Notifications are enabled in your browser, but saving your subscription to the database failed (Firestore permission denied). " +
              "This is a server-side configuration issue — please ask the site administrator to deploy the updated Firestore security rules."
            : "Notifications are enabled in your browser, but saving your subscription to the server failed (" +
              fsMsg +
              "). Please try again later.",
        };
      }

      // 6. Store in local storage (never log the full token)
      localStorage.setItem(STORAGE_KEY, token);
      console.log("[Push Notifications] Successfully subscribed. Token stored locally.");

      return { success: true, token, permission: "granted" };
    } catch (fcmErr) {
      console.error("[Push Notifications] FCM token generation error:", fcmErr);
      return {
        success: false,
        permission: "granted",
        error:
          "Permission was granted, but generating the push token failed (" +
          (fcmErr.message || "unexpected error") +
          "). Please try again.",
      };
    }
  } catch (err) {
    console.error("[Push Notifications] Subscription exception:", err);
    return {
      success: false,
      permission: getNotificationPermission(),
      error: err.message || "An unexpected error occurred while enabling notifications.",
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

    // 1. Mark as inactive in Firestore
    if (token) {
      try {
        // Use the same hash-derived ID that was used during subscription.
        const docId = tokenToDocId(token);
        const subscriptionRef = doc(db, "notification_subscriptions", docId);
        await updateDoc(subscriptionRef, {
          active: false,
          unsubscribedAt: serverTimestamp(),
        });
      } catch (err) {
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
