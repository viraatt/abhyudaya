/* global process */
import { getMessaging } from "firebase-admin/messaging";
import { getFirebaseAdmin, checkRateLimit } from "../time-capsule/utils.js";
import { authenticateAdminRequest, logAdminAction } from "../time-capsule/admin-auth.js";

const ALLOWED_ADMIN_ROLES = ["super_admin", "event_admin"];

/**
 * Serverless API handler for sending and managing browser push notifications.
 * Endpoint: /api/admin/send-notification
 */
export default async function handler(req, res) {
  // 1. Rate limiting
  const ip =
    req.headers["x-forwarded-for"] ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown";

  if (!checkRateLimit(ip, 30, 60000)) {
    return res.status(429).json({
      success: false,
      error: "Too many notification requests. Please slow down.",
    });
  }

  // 2. Strict Server-side Admin Authentication
  const authResult = await authenticateAdminRequest(req, ALLOWED_ADMIN_ROLES);
  if (!authResult.authorized) {
    return res.status(authResult.status || 401).json({
      success: false,
      error: authResult.error || "Unauthorized admin access.",
    });
  }

  const { db, Timestamp } = getFirebaseAdmin();
  const method = (req.method || "GET").toUpperCase();

  // ─────────────────────────────────────────────────────────────
  // GET: Retrieve subscriber count & notification dispatch history
  // ─────────────────────────────────────────────────────────────
  if (method === "GET") {
    try {
      // 1. Get subscriber counts
      const activeSubsSnapshot = await db
        .collection("notification_subscriptions")
        .where("active", "==", true)
        .get();

      const totalActiveSubscribers = activeSubsSnapshot.size;

      // 2. Get recent notification logs (last 20)
      const historySnapshot = await db
        .collection("notifications")
        .orderBy("sentAt", "desc")
        .limit(20)
        .get();

      const history = historySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          sentAt: data.sentAt?.toDate ? data.sentAt.toDate().toISOString() : data.sentAt,
        };
      });

      return res.status(200).json({
        success: true,
        stats: {
          activeSubscribers: totalActiveSubscribers,
        },
        history,
      });
    } catch (err) {
      console.error("[SendNotification] GET error:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to load notification stats: " + err.message,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // POST: Dispatch FCM Push Notifications to active subscribers
  // ─────────────────────────────────────────────────────────────
  if (method === "POST") {
    try {
      const { title, body, link, icon } = req.body || {};

      // Validate inputs
      const cleanTitle = typeof title === "string" ? title.trim() : "";
      const cleanBody = typeof body === "string" ? body.trim() : "";
      const cleanLink = typeof link === "string" && link.trim().length > 0 ? link.trim() : "/";

      if (!cleanTitle || cleanTitle.length > 120) {
        return res.status(400).json({
          success: false,
          error: "A notification title is required (maximum 120 characters).",
        });
      }

      if (!cleanBody || cleanBody.length > 400) {
        return res.status(400).json({
          success: false,
          error: "A notification message body is required (maximum 400 characters).",
        });
      }

      // Fetch active subscribers from Firestore
      const subscribersSnapshot = await db
        .collection("notification_subscriptions")
        .where("active", "==", true)
        .get();

      if (subscribersSnapshot.empty) {
        return res.status(200).json({
          success: true,
          message: "No active push notification subscribers found.",
          totalRecipients: 0,
          successCount: 0,
          failureCount: 0,
        });
      }

      // Deduplicate tokens
      const tokenDocMap = new Map();
      subscribersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const token = data.token || doc.id;
        if (token && typeof token === "string" && !tokenDocMap.has(token)) {
          tokenDocMap.set(token, doc.id);
        }
      });

      const allTokens = Array.from(tokenDocMap.keys());
      const totalRecipients = allTokens.length;

      // Initialize Firebase Admin Messaging
      const { app } = getFirebaseAdmin();
      const messaging = getMessaging(app);

      let totalSuccess = 0;
      let totalFailure = 0;
      const invalidTokensToClean = [];

      // Chunk tokens into batches of 500 (FCM multicast limit)
      const CHUNK_SIZE = 500;
      for (let i = 0; i < allTokens.length; i += CHUNK_SIZE) {
        const tokenChunk = allTokens.slice(i, i + CHUNK_SIZE);

        const messagePayload = {
          tokens: tokenChunk,
          notification: {
            title: cleanTitle,
            body: cleanBody,
          },
          data: {
            title: cleanTitle,
            body: cleanBody,
            link: cleanLink,
            url: cleanLink,
          },
          webpush: {
            fcmOptions: {
              link: cleanLink,
            },
            notification: {
              title: cleanTitle,
              body: cleanBody,
              icon: icon || "/abhyudaya-logo.png",
              badge: "/favicon.png",
            },
          },
        };

        const batchResponse = await messaging.sendEachForMulticast(messagePayload);
        totalSuccess += batchResponse.successCount;
        totalFailure += batchResponse.failureCount;

        // Check for invalid / expired registration tokens
        batchResponse.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const errorCode = resp.error.code;
            if (
              errorCode === "messaging/invalid-registration-token" ||
              errorCode === "messaging/registration-token-not-registered"
            ) {
              const deadToken = tokenChunk[idx];
              const docId = tokenDocMap.get(deadToken);
              if (docId) {
                invalidTokensToClean.push(docId);
              }
            }
          }
        });
      }

      // Prune or deactivate invalid tokens in background
      if (invalidTokensToClean.length > 0) {
        const batch = db.batch();
        invalidTokensToClean.slice(0, 500).forEach((docId) => {
          const docRef = db.collection("notification_subscriptions").doc(docId);
          batch.update(docRef, { active: false, deactivatedAt: Timestamp.now() });
        });
        batch.commit().catch((cleanErr) => {
          console.warn("[SendNotification] Clean expired tokens error:", cleanErr);
        });
      }

      // Save notification record to history log
      const logRecord = {
        title: cleanTitle,
        body: cleanBody,
        link: cleanLink,
        sentBy: authResult.adminUser?.email || "admin",
        sentByUid: authResult.adminUser?.uid || null,
        sentAt: Timestamp.now(),
        totalRecipients,
        successCount: totalSuccess,
        failureCount: totalFailure,
      };

      await db.collection("notifications").add(logRecord);

      // Audit log
      await logAdminAction(
        authResult.adminUser?.uid,
        authResult.adminUser?.email,
        "PUSH_NOTIFICATION_BROADCAST",
        {
          title: cleanTitle,
          totalRecipients,
          successCount: totalSuccess,
          failureCount: totalFailure,
        }
      );

      return res.status(200).json({
        success: true,
        message: `Notification broadcast dispatched: ${totalSuccess} sent, ${totalFailure} failed.`,
        totalRecipients,
        successCount: totalSuccess,
        failureCount: totalFailure,
      });
    } catch (err) {
      console.error("[SendNotification] POST error:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to send notification: " + err.message,
      });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({
    success: false,
    error: `Method ${method} Not Allowed`,
  });
}
