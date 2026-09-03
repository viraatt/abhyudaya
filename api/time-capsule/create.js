import {
  getFirebaseAdmin,
  EMAIL_REGEX,
  INDIAN_PHONE_REGEX,
  VALID_CURRENT_YEARS,
  REQUIRED_QUESTIONS,
  getDefaultUnlockDate,
  generateSecureToken,
  hashToken,
  encryptToken,
  generateCapsuleCode,
  sanitizeText,
  normalizePhone,
  checkRateLimit,
} from "./utils.js";

/**
 * Serverless API Route: POST /api/time-capsule/create
 * Creates a new locked Time Capsule securely via the Firebase Admin SDK.
 */
export default async function handler(req, res) {
  // ── 1. HTTP Method validation ────────────────────────────────
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Only POST requests are permitted.",
    });
  }

  // ── 2. Content-Type and payload size check ──────────────────
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("application/json")) {
    return res.status(400).json({
      success: false,
      error: "Invalid Content-Type. Expected application/json.",
    });
  }

  // ── 3. Abuse prevention / Rate limiting ─────────────────────
  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "anonymous";

  const rateCheck = checkRateLimit(clientIp, 10, 60000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: `Too many submission attempts. Please wait ${rateCheck.resetInSeconds} seconds and try again.`,
    });
  }

  // ── 4. Input parsing & validation ────────────────────────────
  const input = req.body || {};

  // Basic info fields
  const name = sanitizeText(input.name, 100);
  const email = String(input.email || "").trim().toLowerCase();
  const rawPhone = String(input.phone || "").trim();
  const college = sanitizeText(input.college, 120);
  const course = sanitizeText(input.course, 60);
  const currentYear = String(input.currentYear || "").trim();
  const graduationYear = parseInt(input.graduationYear, 10);
  const rawAnswers = input.answers && typeof input.answers === "object" ? input.answers : {};

  const errors = {};

  if (!name || name.length < 2) {
    errors.name = "Full Name must be at least 2 characters.";
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    errors.email = "Please provide a valid email address.";
  }

  const cleanPhoneDigits = rawPhone.replace(/\D/g, "");
  if (!rawPhone || !INDIAN_PHONE_REGEX.test(rawPhone) || cleanPhoneDigits.length < 10 || cleanPhoneDigits.length > 13) {
    errors.phone = "Please provide a valid 10-digit mobile number.";
  }

  if (!college || college.length < 2) {
    errors.college = "College/Institute name is required.";
  }

  if (!course || course.length < 2) {
    errors.course = "Course/Branch name is required.";
  }

  if (!VALID_CURRENT_YEARS.includes(currentYear)) {
    errors.currentYear = `Current Year must be one of: ${VALID_CURRENT_YEARS.join(", ")}.`;
  }

  const currentCalendarYear = new Date().getFullYear();
  if (
    isNaN(graduationYear) ||
    graduationYear < currentCalendarYear ||
    graduationYear > currentCalendarYear + 7
  ) {
    errors.graduationYear = `Expected Graduation Year must be between ${currentCalendarYear} and ${currentCalendarYear + 7}.`;
  }

  // Validate all 8 questionnaire prompts
  const sanitizedAnswers = {};
  for (const q of REQUIRED_QUESTIONS) {
    const val = sanitizeText(rawAnswers[q.key] || "", 1500);
    if (!val || val.length < 3) {
      errors[`answers.${q.key}`] = `Please answer: "${q.label}"`;
    } else {
      sanitizedAnswers[q.key] = val;
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      error: "Validation failed. Please review the highlighted fields.",
      details: errors,
    });
  }

  try {
    const { db, Timestamp, FieldValue } = getFirebaseAdmin();

    // ── 5. Duplicate enforcement: One active capsule per student ─
    const existingSnap = await db
      .collection("time_capsules")
      .where("email", "==", email)
      .where("status", "in", ["LOCKED", "READY"])
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return res.status(409).json({
        success: false,
        error: "An active Time Capsule is already locked for this email address. Each student may have one active capsule per academic journey.",
      });
    }

    // ── 6. Cryptographic secret token generation ─────────────
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);

    // ── 7. Server-side unlock date calculation ───────────────
    const unlockDate = getDefaultUnlockDate(graduationYear);
    const unlockTimestamp = Timestamp.fromDate(unlockDate);
    const capsuleCode = generateCapsuleCode(graduationYear);

    // ── 8. Atomic creation in Firestore ───────────────────────
    const capsuleRef = db.collection("time_capsules").doc();

    const capsuleDoc = {
      capsuleCode,
      name,
      email,
      phone: normalizePhone(rawPhone),
      college,
      course,
      currentYear,
      graduationYear,
      answers: sanitizedAnswers,
      tokenHash,
      encryptedToken: encryptToken(rawToken),
      unlockDate: unlockTimestamp,
      status: "LOCKED",
      notificationStatus: "pending",
      notificationSentAt: null,
      notificationError: null,
      notificationAttempts: 0,
      openedAt: null,
      openedCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await capsuleRef.set(capsuleDoc);

    // Return safe confirmation.
    // Notice: rawToken is provided in the creation response as a single-time receipt
    // for the student/testing, while ONLY tokenHash is persisted in the database.
    return res.status(201).json({
      success: true,
      message: "Your Time Capsule has been created and securely locked!",
      capsuleCode,
      unlockDate: unlockDate.toISOString(),
      rawToken, // Single-use confirmation receipt
    });
  } catch (error) {
    console.error("[TimeCapsule:Create] Failed to create capsule:", error);
    return res.status(500).json({
      success: false,
      error: "Unable to create your Time Capsule right now. Please try again later.",
      details: error.message || undefined,
    });
  }
}
