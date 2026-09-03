import {
  getFirebaseAdmin,
  hashToken,
  checkRateLimit,
} from "./utils.js";

const TOKEN_HEX_REGEX = /^[a-f0-9]{64}$/i;

/**
 * Serverless API Route: POST /api/time-capsule/verify
 * Receives the secret token, validates server-side unlock date,
 * and securely returns the capsule contents only when unlocked.
 */
export default async function handler(req, res) {
  // ── 1. HTTP Method validation ────────────────────────────────
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Only POST/GET requests are permitted.",
    });
  }

  // ── 2. Abuse prevention / Rate limiting ─────────────────────
  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "anonymous";

  const rateCheck = checkRateLimit(`verify_${clientIp}`, 30, 60000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: `Too many verification attempts. Please wait ${rateCheck.resetInSeconds} seconds.`,
    });
  }

  // ── 3. Extract & validate raw token ─────────────────────────
  const token = String(req.body?.token || req.query?.token || "").trim();

  if (!token) {
    return res.status(400).json({
      success: false,
      error: "Verification token is required.",
    });
  }

  if (!TOKEN_HEX_REGEX.test(token)) {
    return res.status(400).json({
      success: false,
      error: "Invalid token format. Tokens must be 64-character hexadecimal strings.",
    });
  }

  try {
    const { db, FieldValue } = getFirebaseAdmin();

    // ── 4. Compute SHA-256 hash and query Firestore ───────────
    const tokenHash = hashToken(token);

    const snapshot = await db
      .collection("time_capsules")
      .where("tokenHash", "==", tokenHash)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: "Time Capsule not found or invalid token link.",
      });
    }

    const docRef = snapshot.docs[0];
    const capsule = docRef.data();

    // ── 5. Server-side unlock date comparison ─────────────────
    const now = new Date();
    const unlockDate = capsule.unlockDate?.toDate
      ? capsule.unlockDate.toDate()
      : new Date(capsule.unlockDate);

    // If the unlock date is in the future, DO NOT disclose answers
    if (unlockDate > now) {
      return res.status(403).json({
        success: false,
        locked: true,
        capsuleCode: capsule.capsuleCode,
        unlockDate: unlockDate.toISOString(),
        message: "This Time Capsule is still locked! It will open when your graduation timeline arrives.",
      });
    }

    // ── 6. Unlock date has arrived: mark opened & return data ──
    const updates = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (capsule.status !== "OPENED") {
      updates.status = "OPENED";
      updates.openedAt = FieldValue.serverTimestamp();
      updates.openedCount = FieldValue.increment(1);
    } else {
      updates.openedCount = FieldValue.increment(1);
    }

    await docRef.ref.update(updates);

    // ── 7. Return sanitized payload (never disclose tokenHash, phone, email, internal IDs) ──
    const createdAtIso = capsule.createdAt?.toDate
      ? capsule.createdAt.toDate().toISOString()
      : null;

    const openedAtIso = capsule.openedAt?.toDate
      ? capsule.openedAt.toDate().toISOString()
      : now.toISOString();

    return res.status(200).json({
      success: true,
      locked: false,
      capsuleCode: capsule.capsuleCode,
      name: capsule.name,
      college: capsule.college,
      course: capsule.course,
      currentYear: capsule.currentYear,
      graduationYear: capsule.graduationYear,
      createdAt: createdAtIso,
      unlockDate: unlockDate.toISOString(),
      openedAt: openedAtIso,
      answers: capsule.answers || {},
    });
  } catch (error) {
    console.error("[TimeCapsule:Verify] Verification failed:", error);
    return res.status(500).json({
      success: false,
      error: "Unable to verify your Time Capsule right now. Please try again later.",
      details: error.message || undefined,
    });
  }
}
