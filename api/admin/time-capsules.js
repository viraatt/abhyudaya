/* global process */
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin, checkRateLimit } from "../time-capsule/utils.js";
import {
  authenticateAdminRequest,
  logAdminAction,
} from "../time-capsule/admin-auth.js";

const ALLOWED_ADMIN_ROLES = ["super_admin", "event_admin"];

/**
 * Sanitizes a Firestore capsule document for admin consumption.
 * STRICTLY removes `tokenHash` and any internal sensitive fields.
 */
function sanitizeCapsuleForAdmin(id, data = {}) {
  // eslint-disable-next-line no-unused-vars
  const { tokenHash, encryptedToken, ...safeData } = data;

  return {
    id,
    ...safeData,
    unlockDate: safeData.unlockDate?.toDate
      ? safeData.unlockDate.toDate().toISOString()
      : safeData.unlockDate,
    createdAt: safeData.createdAt?.toDate
      ? safeData.createdAt.toDate().toISOString()
      : safeData.createdAt,
    updatedAt: safeData.updatedAt?.toDate
      ? safeData.updatedAt.toDate().toISOString()
      : safeData.updatedAt,
    openedAt: safeData.openedAt?.toDate
      ? safeData.openedAt.toDate().toISOString()
      : safeData.openedAt,
    notificationSentAt: safeData.notificationSentAt?.toDate
      ? safeData.notificationSentAt.toDate().toISOString()
      : safeData.notificationSentAt,
  };
}

/**
 * Main serverless API handler for Time Capsule administrative operations.
 */
export default async function handler(req, res) {
  // 1. Rate limiting
  const ip =
    req.headers["x-forwarded-for"] ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown";

  if (!checkRateLimit(ip, 60, 60000)) {
    return res.status(429).json({
      success: false,
      error: "Too many admin requests. Please slow down.",
    });
  }

  // 2. Strict server-side Admin Authentication & Authorization
  const authResult = await authenticateAdminRequest(req, ALLOWED_ADMIN_ROLES);
  if (!authResult.authorized) {
    return res.status(authResult.status || 401).json({
      success: false,
      error: authResult.error || "Unauthorized.",
    });
  }

  const adminUser = authResult.user;
  const { db } = getFirebaseAdmin();
  const capsulesRef = db.collection("time_capsules");

  const method = req.method?.toUpperCase();
  const capsuleId = req.query.id || req.body?.id;
  const action = req.query.action || req.body?.action;

  try {
    // ─────────────────────────────────────────────────────────
    // GET: Retrieve single capsule OR list capsules + stats
    // ─────────────────────────────────────────────────────────
    if (method === "GET") {
      // Case A: Single capsule detail view
      if (capsuleId) {
        const docSnap = await capsulesRef.doc(capsuleId).get();
        if (!docSnap.exists) {
          return res.status(404).json({
            success: false,
            error: "Time capsule not found.",
          });
        }

        return res.status(200).json({
          success: true,
          capsule: sanitizeCapsuleForAdmin(docSnap.id, docSnap.data()),
        });
      }

      // Case B: List capsules with filters, search, and pagination
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const statusFilter = req.query.status?.trim() || "";
      const gradYearFilter = req.query.graduationYear
        ? Number(req.query.graduationYear)
        : null;
      const notifFilter = req.query.notificationStatus?.trim() || "";
      const search = req.query.search?.trim().toLowerCase() || "";

      // 1. Calculate dashboard statistics efficiently using projection
      const statsSnapshot = await capsulesRef
        .select("status", "notificationStatus")
        .get();

      const stats = {
        total: statsSnapshot.size,
        locked: 0,
        ready: 0,
        opened: 0,
        notificationSent: 0,
        notificationPending: 0,
        notificationFailed: 0,
      };

      statsSnapshot.forEach((doc) => {
        const d = doc.data();
        const s = d.status || "LOCKED";
        if (s === "LOCKED") stats.locked++;
        else if (s === "READY") stats.ready++;
        else if (s === "OPENED") stats.opened++;

        const ns = d.notificationStatus || "pending";
        if (ns === "sent") stats.notificationSent++;
        else if (ns === "failed") stats.notificationFailed++;
        else stats.notificationPending++;
      });

      // 2. Fetch list of capsules with sorting
      // Fetch projection for list view to keep memory & bandwidth optimal
      const listSnapshot = await capsulesRef
        .select(
          "capsuleCode",
          "name",
          "email",
          "phone",
          "college",
          "course",
          "currentYear",
          "graduationYear",
          "status",
          "notificationStatus",
          "notificationSentAt",
          "unlockDate",
          "createdAt",
          "openedAt",
          "openedCount"
        )
        .orderBy("createdAt", "desc")
        .get();

      let items = [];
      listSnapshot.forEach((doc) => {
        const data = doc.data();
        // Exclude answers from table listing for performance
        items.push(sanitizeCapsuleForAdmin(doc.id, data));
      });

      // 3. Apply memory filters for search & compound conditions
      if (statusFilter) {
        items = items.filter((item) => item.status === statusFilter);
      }
      if (gradYearFilter) {
        items = items.filter((item) => item.graduationYear === gradYearFilter);
      }
      if (notifFilter) {
        items = items.filter(
          (item) => (item.notificationStatus || "pending") === notifFilter
        );
      }
      if (search) {
        items = items.filter((item) => {
          return (
            (item.name || "").toLowerCase().includes(search) ||
            (item.email || "").toLowerCase().includes(search) ||
            (item.capsuleCode || "").toLowerCase().includes(search) ||
            (item.college || "").toLowerCase().includes(search) ||
            (item.course || "").toLowerCase().includes(search)
          );
        });
      }

      const totalFiltered = items.length;
      const totalPages = Math.ceil(totalFiltered / limit) || 1;
      const startIndex = (page - 1) * limit;
      const paginatedItems = items.slice(startIndex, startIndex + limit);

      return res.status(200).json({
        success: true,
        capsules: paginatedItems,
        pagination: {
          page,
          limit,
          total: totalFiltered,
          totalPages,
        },
        stats,
      });
    }

    // ─────────────────────────────────────────────────────────
    // PATCH: Update unlock date
    // ─────────────────────────────────────────────────────────
    if (method === "PATCH") {
      if (!capsuleId) {
        return res.status(400).json({
          success: false,
          error: "Missing required 'id' parameter.",
        });
      }

      const newUnlockDateStr = req.body?.unlockDate;
      if (!newUnlockDateStr) {
        return res.status(400).json({
          success: false,
          error: "Missing new 'unlockDate' in request body.",
        });
      }

      const newDate = new Date(newUnlockDateStr);
      if (isNaN(newDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: "Invalid date format for unlockDate.",
        });
      }

      const capsuleDoc = await capsulesRef.doc(capsuleId).get();
      if (!capsuleDoc.exists) {
        return res.status(404).json({
          success: false,
          error: "Time capsule not found.",
        });
      }

      const prevData = capsuleDoc.data();
      const newTimestamp = Timestamp.fromDate(newDate);

      await capsulesRef.doc(capsuleId).update({
        unlockDate: newTimestamp,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Record audit log
      await logAdminAction({
        adminUser,
        action: "UPDATE_UNLOCK_DATE",
        capsuleId,
        capsuleCode: prevData.capsuleCode,
        details: {
          previousUnlockDate: prevData.unlockDate?.toDate
            ? prevData.unlockDate.toDate().toISOString()
            : prevData.unlockDate,
          newUnlockDate: newDate.toISOString(),
        },
      });

      return res.status(200).json({
        success: true,
        message: "Unlock date successfully updated.",
        unlockDate: newDate.toISOString(),
      });
    }

    // ─────────────────────────────────────────────────────────
    // POST: Actions (Manual Unlock or Resend Notification)
    // ─────────────────────────────────────────────────────────
    if (method === "POST") {
      if (!capsuleId) {
        return res.status(400).json({
          success: false,
          error: "Missing required 'id' parameter.",
        });
      }

      const capsuleDoc = await capsulesRef.doc(capsuleId).get();
      if (!capsuleDoc.exists) {
        return res.status(404).json({
          success: false,
          error: "Time capsule not found.",
        });
      }

      const capsuleData = capsuleDoc.data();

      // Action 1: Manual Unlock
      if (action === "unlock") {
        await capsulesRef.doc(capsuleId).update({
          status: "READY",
          updatedAt: FieldValue.serverTimestamp(),
        });

        await logAdminAction({
          adminUser,
          action: "MANUAL_UNLOCK",
          capsuleId,
          capsuleCode: capsuleData.capsuleCode,
          details: { previousStatus: capsuleData.status, newStatus: "READY" },
        });

        return res.status(200).json({
          success: true,
          message: `Capsule ${capsuleData.capsuleCode} has been manually unlocked (status: READY).`,
        });
      }

      // Action 2: Resend Notification
      if (action === "resend") {
        await capsulesRef.doc(capsuleId).update({
          notificationStatus: "pending",
          notificationAttempts: 0,
          notificationError: null,
          updatedAt: FieldValue.serverTimestamp(),
        });

        await logAdminAction({
          adminUser,
          action: "RESEND_NOTIFICATION",
          capsuleId,
          capsuleCode: capsuleData.capsuleCode,
          details: {
            previousNotificationStatus: capsuleData.notificationStatus,
            recipientEmail: capsuleData.email,
          },
        });

        return res.status(200).json({
          success: true,
          message: `Notification status reset to 'pending' for capsule ${capsuleData.capsuleCode}.`,
        });
      }

      return res.status(400).json({
        success: false,
        error: `Unknown action '${action}'. Permitted actions: 'unlock', 'resend'.`,
      });
    }

    // ─────────────────────────────────────────────────────────
    // DELETE: Remove capsule document
    // ─────────────────────────────────────────────────────────
    if (method === "DELETE") {
      if (!capsuleId) {
        return res.status(400).json({
          success: false,
          error: "Missing required 'id' parameter.",
        });
      }

      const capsuleDoc = await capsulesRef.doc(capsuleId).get();
      if (!capsuleDoc.exists) {
        return res.status(404).json({
          success: false,
          error: "Time capsule not found.",
        });
      }

      const capsuleData = capsuleDoc.data();

      await capsulesRef.doc(capsuleId).delete();

      await logAdminAction({
        adminUser,
        action: "DELETE_CAPSULE",
        capsuleId,
        capsuleCode: capsuleData.capsuleCode,
        details: {
          deletedStudentEmail: capsuleData.email,
          capsuleCode: capsuleData.capsuleCode,
        },
      });

      return res.status(200).json({
        success: true,
        message: `Capsule ${capsuleData.capsuleCode} deleted successfully.`,
      });
    }

    return res.status(405).json({
      success: false,
      error: `HTTP method ${method} not allowed.`,
    });
  } catch (error) {
    console.error("[api/admin/time-capsules] Internal Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error handling admin request.",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
