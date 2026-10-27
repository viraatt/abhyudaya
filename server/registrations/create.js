/* global process */
import fs from "fs";
import path from "path";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

// Firebase Admin is initialized lazily so a missing service-account
// env var never crashes the shared serverless function at cold start.
let _db = null;
export function setDb(dbInstance) {
  _db = dbInstance;
}
function getDb() {
  if (!_db) {
    if (!getApps().length) {
      let cred = null;
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          cred = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
        } catch (e) {
          console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", e);
        }
      }
      if (!cred) {
        try {
          const saPath = path.resolve(process.cwd(), "firebase-service-account.json");
          if (fs.existsSync(saPath)) {
            const raw = fs.readFileSync(saPath, "utf-8");
            cred = cert(JSON.parse(raw));
          }
        } catch (e) {
          console.warn("Failed to read local firebase-service-account.json:", e);
        }
      }
      initializeApp(cred ? { credential: cred } : {});
    }
    _db = getFirestore();
  }
  return _db;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function registrationCode(title = "") {
  const initials = title
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return initials || "EVT";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed." });
  }

  const input = req.body || {};
  const eventId = String(input.eventId || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const name = String(input.name || "").trim();

  if (!eventId || !name || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({
      success: false,
      error: "Please provide a valid event, participant name, and valid email address.",
    });
  }

  const collegeEmail = String(input.collegeEmail || "").trim().toLowerCase();
  if (collegeEmail && !EMAIL_PATTERN.test(collegeEmail)) {
    return res.status(400).json({
      success: false,
      error: "Please provide a valid college email address.",
    });
  }

  try {
    const result = await getDb().runTransaction(async (transaction) => {
      const eventRef = getDb().collection("events").doc(eventId);
      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists) throw new Error("EVENT_NOT_FOUND");
      const event = eventSnap.data();

      // Check event publication and manual registration toggle
      if (event.status !== "Published") {
        throw new Error("EVENT_NOT_FOUND");
      }
      if (event.registrationOpen !== true) {
        throw new Error("REGISTRATION_CLOSED");
      }

      // Check registration schedule / deadline
      const now = new Date();
      if (event.registrationStartDate) {
        const start = new Date(event.registrationStartDate);
        if (!isNaN(start.getTime()) && now < start) {
          throw new Error("REGISTRATION_NOT_STARTED");
        }
      }

      if (event.registrationDeadline) {
        const deadline = new Date(event.registrationDeadline);
        if (!isNaN(deadline.getTime()) && now > deadline) {
          throw new Error("REGISTRATION_DEADLINE_PASSED");
        }
      }

      // Duplicate prevention by primary email
      const duplicateQuery = getDb()
        .collection("registrations")
        .where("eventId", "==", eventId)
        .where("email", "==", email)
        .limit(1);
      const duplicateSnap = await transaction.get(duplicateQuery);
      if (!duplicateSnap.empty) throw new Error("ALREADY_REGISTERED");

      // Duplicate prevention by college email if provided
      if (collegeEmail && collegeEmail !== email) {
        const collegeDupQuery = getDb()
          .collection("registrations")
          .where("eventId", "==", eventId)
          .where("collegeEmail", "==", collegeEmail)
          .limit(1);
        const collegeDupSnap = await transaction.get(collegeDupQuery);
        if (!collegeDupSnap.empty) throw new Error("ALREADY_REGISTERED");
      }

      // Capacity verification
      const countQuery = getDb().collection("registrations").where("eventId", "==", eventId);
      const countSnap = await transaction.get(countQuery);
      const activeRegistrations = countSnap.docs.filter(
        (docSnap) => docSnap.data().registrationStatus !== "cancelled"
      );

      if (event.maxRegistrations && activeRegistrations.length >= Number(event.maxRegistrations)) {
        throw new Error("EVENT_FULL");
      }

      // Prepare new registration document
      const ref = getDb().collection("registrations").doc();
      const code = registrationCode(event.title || input.eventTitle || "");
      const registrationId = `ABH-${code}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

      const rollNumber = String(input.rollNumber || "").trim();
      const department = String(input.department || input.branch || "").trim();
      const year = String(input.year || input.semester || "").trim();
      const phone = String(input.phone || "").trim();
      const customAnswers =
        typeof input.customAnswers === "object" && input.customAnswers !== null
          ? input.customAnswers
          : {};

      // Authoritatively determine payment requirements from Firestore event document
      const isPaidEvent = Boolean(event.isPaid);
      let feeAmount = 0;

      if (isPaidEvent) {
        feeAmount = Number(event.feeAmount);
        if (!Number.isFinite(feeAmount) || feeAmount <= 0) {
          throw new Error("INVALID_FEE_CONFIGURATION");
        }
      }

      transaction.set(ref, {
        eventId,
        eventTitle: event.title || String(input.eventTitle || "").trim(),
        name,
        email,
        collegeEmail: collegeEmail || email,
        rollNumber,
        department,
        year,
        branch: department,
        semester: year,
        phone,
        customAnswers,
        registrationId,
        registrationStatus: isPaidEvent ? "payment_pending" : "registered",
        isPaid: isPaidEvent,
        amount: feeAmount,
        paymentStatus: isPaidEvent ? "pending" : "free",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { id: ref.id, registrationId };
    });

    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    const messages = {
      EVENT_NOT_FOUND: "The requested event could not be found.",
      REGISTRATION_NOT_STARTED: "Registration for this event has not opened yet.",
      REGISTRATION_DEADLINE_PASSED: "Registration deadline for this event has passed.",
      REGISTRATION_CLOSED: "Registrations are currently closed for this event.",
      ALREADY_REGISTERED: "You are already registered for this event with this email.",
      EVENT_FULL: "This event has reached its maximum participant capacity.",
      INVALID_FEE_CONFIGURATION: "This event has an invalid registration fee configuration. Please contact the organizers.",
    };

    const message = messages[error.message] || "Unable to complete registration. Please try again.";
    console.error("Registration creation failed:", error.message || error);
    return res.status(400).json({ success: false, error: message });
  }
}
