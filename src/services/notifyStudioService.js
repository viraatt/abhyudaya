import { auth } from "../Firebase/firebase";
import { getStoredPushToken } from "./notificationService";

const DRAFT_STORAGE_KEY = "abhyudaya_notify_studio_draft";

/**
 * Retrieves the current Firebase Auth ID Token for authenticated API calls.
 */
async function getAuthHeader() {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Loads notification statistics and dispatch history.
 * @returns {Promise<{ success: boolean, stats?: object, history?: Array, error?: string }>}
 */
export async function fetchNotificationStats() {
  try {
    const headers = await getAuthHeader();
    const res = await fetch("/api/admin/send-notification", { headers });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("[NotifyStudio] fetchNotificationStats error:", err);
    return {
      success: false,
      error: err.message || "Failed to load notification statistics.",
    };
  }
}

/**
 * Dispatches a push notification broadcast through the secure serverless backend.
 * @param {object} payload
 * @returns {Promise<{ success: boolean, message?: string, totalRecipients?: number, successCount?: number, failureCount?: number, error?: string, duplicate?: boolean }>}
 */
export async function broadcastNotification(payload) {
  try {
    const headers = await getAuthHeader();
    headers["Content-Type"] = "application/json";

    const res = await fetch("/api/admin/send-notification", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("[NotifyStudio] broadcastNotification error:", err);
    return {
      success: false,
      error: err.message || "Network error while broadcasting notification.",
    };
  }
}

/**
 * Sends a live test notification targeted specifically to the current administrator's browser.
 * @param {object} notificationData
 * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
 */
export async function sendTestNotification(notificationData) {
  const localToken = getStoredPushToken();
  if (!localToken) {
    return {
      success: false,
      error:
        "No device token found in your current browser. Please enable push notifications on the site first so your device can receive test notifications.",
    };
  }

  return broadcastNotification({
    ...notificationData,
    testToken: localToken,
  });
}

/**
 * Saves draft in browser localStorage.
 */
export function saveNotifyDraft(draft) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (err) {
    console.warn("[NotifyStudio] Failed to save draft:", err);
  }
}

/**
 * Retrieves saved draft from localStorage.
 */
export function getNotifyDraft() {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

/**
 * Clears saved draft from localStorage.
 */
export function clearNotifyDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Pre-fills suggested notification content for a published Blog.
 */
export function getBlogNotificationPrefill(blog) {
  const title = blog.title ? `📝 New Article: ${blog.title}` : "📝 New Article Published!";
  const body =
    blog.excerpt ||
    "Check out the latest insights and story from the Abhyudaya Club community. Read now!";
  const slug = blog.slug || "";
  const link = slug ? `/blog/${slug}` : "/blog";

  return {
    title: title.slice(0, 100),
    body: body.slice(0, 280),
    link,
    contentType: "blog",
    contentId: blog.id || slug,
    actionLabel: "Read Story",
  };
}

/**
 * Pre-fills suggested notification content for an Event.
 */
export function getEventNotificationPrefill(event) {
  const isRegOpen = event.registrationOpen === true;
  const title = isRegOpen
    ? `🎯 Registrations Open: ${event.title || "New Event"}`
    : `📅 New Event Announced: ${event.title || "Abhyudaya Event"}`;

  const body =
    event.tagline ||
    event.shortDescription ||
    "Join us for an exciting experience with keynote speakers and certificates!";

  const link = isRegOpen && event.id ? `/register/${event.id}` : `/events/${event.slug || ""}`;

  return {
    title: title.slice(0, 100),
    body: body.slice(0, 280),
    link,
    contentType: "event",
    contentId: event.id || event.slug,
    actionLabel: isRegOpen ? "Register Now" : "View Event",
  };
}

/**
 * Pre-fills suggested notification content for an Announcement.
 */
export function getAnnouncementNotificationPrefill(announcement) {
  const title = announcement.title ? `📢 ${announcement.title}` : "📢 New Announcement";
  const body =
    announcement.message ||
    "Important update from the Abhyudaya Club coordination committee. Click to read details.";
  const link = announcement.ctaLink || "/announcements";

  return {
    title: title.slice(0, 100),
    body: body.slice(0, 280),
    link,
    contentType: "announcement",
    contentId: announcement.id,
    actionLabel: announcement.ctaText || "View Update",
  };
}
