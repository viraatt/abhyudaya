/* global process */
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin, decryptToken } from "./utils.js";
import { sendTimeCapsuleEmail } from "./email-service.js";

const MAX_RETRY_ATTEMPTS = 3;
const LEASE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes lease for sending state
const BATCH_CONCURRENCY = 5; // Max concurrent email dispatches per run

/**
 * Validates the incoming cron request against CRON_SECRET.
 */
function verifyCronAuth(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // If no secret configured in test/dev, permit only in explicit test environment
    if (process.env.NODE_ENV === "test") return true;
    return false;
  }

  const authHeader =
    req.headers?.authorization || req.headers?.Authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.substring(7).trim();
  return token === cronSecret;
}

/**
 * Processes an individual due capsule atomically.
 */
async function processCapsule(docRef, docData, baseUrl) {
  const { db } = getFirebaseAdmin();
  const capsuleId = docRef.id;

  // 1. Atomic claim via Firestore Transaction
  let claimed = false;
  try {
    claimed = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists) return false;
      const data = snap.data();

      // Ensure still not sent
      if (data.notificationStatus === "sent") return false;

      // Ensure max retries not exceeded
      const attempts = data.notificationAttempts || 0;
      if (data.notificationStatus === "failed" && attempts >= MAX_RETRY_ATTEMPTS) {
        return false;
      }

      // Ensure lease is not active by another worker
      if (data.notificationStatus === "sending") {
        const sendingAt = data.sendingAt?.toMillis
          ? data.sendingAt.toMillis()
          : data.sendingAt
          ? new Date(data.sendingAt).getTime()
          : 0;

        if (Date.now() - sendingAt < LEASE_EXPIRY_MS) {
          // Lease still active
          return false;
        }
      }

      // Transition to 'sending' atomically
      transaction.update(docRef, {
        notificationStatus: "sending",
        sendingAt: FieldValue.serverTimestamp(),
        notificationAttempts: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return true;
    });
  } catch (claimErr) {
    console.warn(`[notify-cron] Claim transaction failed for ${capsuleId}:`, claimErr.message);
    return { status: "skipped" };
  }

  if (!claimed) {
    return { status: "skipped" };
  }

  // 2. Decrypt opening token
  let rawToken;
  try {
    if (!docData.encryptedToken) {
      throw new Error("Capsule record lacks encryptedToken payload.");
    }
    rawToken = decryptToken(docData.encryptedToken);
  } catch (decryptErr) {
    const errorMsg = `Decryption failed: ${decryptErr.message || "invalid ciphertext"}`;
    await docRef.update({
      notificationStatus: "failed",
      notificationError: errorMsg.slice(0, 150),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { status: "failed", error: errorMsg };
  }

  // 3. Dispatch transactional email
  const unlockUrl = `${baseUrl.replace(/\/+$/, "")}/time-capsule/open/${rawToken}`;

  try {
    await sendTimeCapsuleEmail({
      to: docData.email,
      studentName: docData.name,
      unlockUrl,
      capsuleCode: docData.capsuleCode,
    });

    // 4. Mark successful delivery in Firestore
    await docRef.update({
      notificationStatus: "sent",
      notificationSentAt: FieldValue.serverTimestamp(),
      notificationError: null,
      status: "READY", // Ensure capsule is marked ready when email is sent
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { status: "sent" };
  } catch (emailErr) {
    const safeError = (emailErr.message || "Provider error").slice(0, 150);
    await docRef.update({
      notificationStatus: "failed",
      notificationError: safeError,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { status: "failed", error: safeError };
  }
}

/**
 * Serverless API Route: POST /api/time-capsule/notify-cron
 * Cron worker that queries due capsules, claims them idempotently, and sends unlock emails.
 */
export default async function handler(req, res) {
  // 1. Method check: POST only
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Only POST is accepted.",
    });
  }

  // 2. Secret authentication
  if (!verifyCronAuth(req)) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Invalid or missing cron credentials.",
    });
  }

  const { db } = getFirebaseAdmin();
  const nowTimestamp = Timestamp.now();
  const baseUrl =
    process.env.PUBLIC_APP_URL || "https://www.abhyudayaclub.in";

  try {
    // 3. Query due capsules: unlockDate <= now and notificationStatus in ['pending', 'failed', 'sending']
    let dueQuery;
    try {
      dueQuery = await db
        .collection("time_capsules")
        .where("notificationStatus", "in", ["pending", "failed", "sending"])
        .where("unlockDate", "<=", nowTimestamp)
        .limit(100)
        .get();
    } catch (indexErr) {
      if (indexErr.code === 9 || indexErr.message?.includes("requires an index")) {
        // Fallback for when composite index is building or pending deployment:
        // Query by notificationStatus and filter unlockDate in memory
        const fallbackSnap = await db
          .collection("time_capsules")
          .where("notificationStatus", "in", ["pending", "failed", "sending"])
          .limit(200)
          .get();

        const filteredDocs = fallbackSnap.docs.filter((doc) => {
          const d = doc.data();
          if (!d.unlockDate) return false;
          const unlockMillis = d.unlockDate.toMillis
            ? d.unlockDate.toMillis()
            : new Date(d.unlockDate).getTime();
          return unlockMillis <= Date.now();
        }).slice(0, 100);

        dueQuery = {
          size: filteredDocs.length,
          empty: filteredDocs.length === 0,
          docs: filteredDocs,
        };
      } else {
        throw indexErr;
      }
    }

    const results = {
      totalDue: dueQuery.size,
      sent: 0,
      failed: 0,
      skipped: 0,
    };

    if (dueQuery.empty) {
      return res.status(200).json({
        success: true,
        message: "No Time Capsules currently due for notification.",
        summary: results,
      });
    }

    // 4. Process capsules in batches with controlled concurrency
    const docs = dueQuery.docs;
    for (let i = 0; i < docs.length; i += BATCH_CONCURRENCY) {
      const chunk = docs.slice(i, i + BATCH_CONCURRENCY);
      const chunkPromises = chunk.map((docSnap) =>
        processCapsule(docSnap.ref, docSnap.data(), baseUrl)
      );

      const chunkResults = await Promise.all(chunkPromises);
      for (const r of chunkResults) {
        if (r.status === "sent") results.sent++;
        else if (r.status === "failed") results.failed++;
        else if (r.status === "skipped") results.skipped++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Cron execution completed: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped.`,
      summary: results,
    });
  } catch (err) {
    console.error("[notify-cron] Cron execution failure:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error during notification cron run.",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}
