/* global process */
import { getMessaging } from "firebase-admin/messaging";
import { getFirebaseAdmin, checkRateLimit } from "../time-capsule/utils.js";
import { authenticateAdminRequest, logAdminAction } from "../time-capsule/admin-auth.js";

const ALLOWED_ADMIN_ROLES = ["super_admin", "event_admin", "blog_admin"];

/**
 * Validates destination link URL to prevent malicious redirection or protocol smuggling.
 */
function isValidDestination(url) {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 500) return false;
  if (trimmed.startsWith("/")) return true;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

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

  const userRole = authResult.adminUser?.role || "";
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

      let activeSubscribers = 0;
      let authenticatedSubscribers = 0;

      activeSubsSnapshot.docs.forEach((doc) => {
        activeSubscribers++;
        const d = doc.data();
        if (d.userId) authenticatedSubscribers++;
      });

      // 2. Get recent notification logs (last 50)
      const historySnapshot = await db
        .collection("notifications")
        .orderBy("sentAt", "desc")
        .limit(50)
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
          activeSubscribers,
          authenticatedSubscribers,
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
  // POST: Dispatch FCM Push Notifications
  // ─────────────────────────────────────────────────────────────
  if (method === "POST") {
    try {
      const {
        title,
        body,
        link,
        icon,
        contentType = "general",
        contentId = null,
        actionLabel = null,
        targetAudience = "all",
        idempotencyKey = null,
        testToken = null,
      } = req.body || {};

      // 1. Validate inputs
      const cleanTitle = typeof title === "string" ? title.trim() : "";
      const cleanBody = typeof body === "string" ? body.trim() : "";
      const rawLink = typeof link === "string" && link.trim().length > 0 ? link.trim() : "/";

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

      if (!isValidDestination(rawLink)) {
        return res.status(400).json({
          success: false,
          error: "Invalid destination URL. Must be a relative path (e.g. /events) or a valid HTTP(S) URL.",
        });
      }
      const cleanLink = rawLink;

      const validContentTypes = ["general", "blog", "event", "announcement"];
      const cleanContentType = validContentTypes.includes(contentType) ? contentType : "general";
      const cleanContentId = typeof contentId === "string" ? contentId.slice(0, 100) : null;
      const cleanActionLabel =
        typeof actionLabel === "string" && actionLabel.trim().length > 0
          ? actionLabel.trim().slice(0, 30)
          : null;
      const cleanAudience = targetAudience === "authenticated" ? "authenticated" : "all";

      // 2. Authoritative Domain Role Authorization:
      // - super_admin: can broadcast all types
      // - event_admin: can broadcast 'event' or 'announcement'
      // - blog_admin: can broadcast 'blog'
      if (userRole !== "super_admin") {
        if (userRole === "event_admin" && !["event", "announcement"].includes(cleanContentType)) {
          return res.status(403).json({
            success: false,
            error: "Event Administrators can only broadcast Event and Announcement notifications.",
          });
        }
        if (userRole === "blog_admin" && cleanContentType !== "blog") {
          return res.status(403).json({
            success: false,
            error: "Blog Administrators can only broadcast Blog notifications.",
          });
        }
      }

      // 3. Idempotency Check: Prevent duplicate broadcasts
      const cleanIdempotencyKey =
        typeof idempotencyKey === "string" && idempotencyKey.trim().length > 0
          ? idempotencyKey.trim().slice(0, 128)
          : null;

      if (cleanIdempotencyKey) {
        const existingSnapshot = await db
          .collection("notifications")
          .where("idempotencyKey", "==", cleanIdempotencyKey)
          .limit(1)
          .get();

        if (!existingSnapshot.empty) {
          const prevData = existingSnapshot.docs[0].data();
          return res.status(200).json({
            success: true,
            duplicate: true,
            message: "A notification with this idempotency key was already broadcasted.",
            totalRecipients: prevData.totalRecipients || 0,
            successCount: prevData.successCount || 0,
            failureCount: prevData.failureCount || 0,
            id: existingSnapshot.docs[0].id,
          });
        }
      }

      // Initialize Firebase Admin Messaging
      const { app } = getFirebaseAdmin();
      const messaging = getMessaging(app);

      // 4. Test Notification Flow (Single Token)
      if (testToken) {
        const cleanTestToken = typeof testToken === "string" ? testToken.trim() : "";
        if (cleanTestToken.length < 50) {
          return res.status(400).json({
            success: false,
            error: "Invalid test token provided.",
          });
        }

        const singlePayload = {
          token: cleanTestToken,
          notification: {
            title: `[TEST] ${cleanTitle}`,
            body: cleanBody,
          },
          data: {
            title: `[TEST] ${cleanTitle}`,
            body: cleanBody,
            link: cleanLink,
            url: cleanLink,
            contentType: cleanContentType,
          },
          webpush: {
            fcmOptions: {
              link: cleanLink,
            },
            notification: {
              title: `[TEST] ${cleanTitle}`,
              body: cleanBody,
              icon: icon || "/abhyudaya-logo.png",
              badge: "/favicon.png",
            },
          },
        };

        try {
          await messaging.send(singlePayload);
          return res.status(200).json({
            success: true,
            isTest: true,
            message: "Test notification delivered to your browser device successfully!",
            totalRecipients: 1,
            successCount: 1,
            failureCount: 0,
          });
        } catch (testErr) {
          return res.status(500).json({
            success: false,
            isTest: true,
            error: `Failed to deliver test notification: ${testErr.message}`,
          });
        }
      }

      // 5. Broadcast Flow: Fetch active subscribers from Firestore
      let queryRef = db.collection("notification_subscriptions").where("active", "==", true);
      const subscribersSnapshot = await queryRef.get();

      if (subscribersSnapshot.empty) {
        return res.status(200).json({
          success: true,
          message: "No active push notification subscribers found.",
          totalRecipients: 0,
          successCount: 0,
          failureCount: 0,
        });
      }

      // Deduplicate tokens and apply audience filtering
      const tokenDocMap = new Map();
      subscribersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (cleanAudience === "authenticated" && !data.userId) {
          return;
        }
        const token = data.token || doc.id;
        if (token && typeof token === "string" && !tokenDocMap.has(token)) {
          tokenDocMap.set(token, doc.id);
        }
      });

      const allTokens = Array.from(tokenDocMap.keys());
      const totalRecipients = allTokens.length;

      if (totalRecipients === 0) {
        return res.status(200).json({
          success: true,
          message: `No active subscribers matched audience filter: ${cleanAudience}.`,
          totalRecipients: 0,
          successCount: 0,
          failureCount: 0,
        });
      }

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
            contentType: cleanContentType,
            contentId: cleanContentId || "",
            actionLabel: cleanActionLabel || "",
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

        // Collect expired or unregistered registration tokens
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

      // 6. Prune or deactivate invalid tokens in background
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

      // 7. Save notification record to history log
      const logRecord = {
        title: cleanTitle,
        body: cleanBody,
        link: cleanLink,
        contentType: cleanContentType,
        contentId: cleanContentId,
        actionLabel: cleanActionLabel,
        targetAudience: cleanAudience,
        idempotencyKey: cleanIdempotencyKey,
        sentBy: authResult.adminUser?.email || "admin",
        sentByUid: authResult.adminUser?.uid || null,
        sentAt: Timestamp.now(),
        totalRecipients,
        successCount: totalSuccess,
        failureCount: totalFailure,
      };

      const docRef = await db.collection("notifications").add(logRecord);

      // Audit log
      await logAdminAction(
        authResult.adminUser?.uid,
        authResult.adminUser?.email,
        "PUSH_NOTIFICATION_BROADCAST",
        {
          title: cleanTitle,
          contentType: cleanContentType,
          contentId: cleanContentId,
          totalRecipients,
          successCount: totalSuccess,
          failureCount: totalFailure,
        }
      );

      return res.status(200).json({
        success: true,
        id: docRef.id,
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
