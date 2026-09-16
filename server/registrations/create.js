/* global process */
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

// Firebase Admin is initialized lazily so a missing service-account
// env var never crashes the shared serverless function at cold start.
let _db = null;
function getDb() {
  if (!_db) {
    if (!getApps().length) {
      initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}")),
      });
    }
    _db = getFirestore();
  }
  return _db;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function registrationCode(title = "") {
  const initials = title.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return initials || "EVT";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed." });

  const input = req.body || {};
  const eventId = String(input.eventId || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const name = String(input.name || "").trim();
  if (!eventId || !name || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ success: false, error: "Please provide a valid event, name, and email." });
  }

  try {
    const result = await getDb().runTransaction(async (transaction) => {
      const eventRef = getDb().collection("events").doc(eventId);
      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists) throw new Error("EVENT_NOT_FOUND");
      const event = eventSnap.data();
      if (event.status !== "Published" || event.registrationOpen !== true) throw new Error("REGISTRATION_CLOSED");

      const duplicateQuery = getDb().collection("registrations")
        .where("eventId", "==", eventId)
        .where("email", "==", email)
        .limit(1);
      const duplicateSnap = await transaction.get(duplicateQuery);
      if (!duplicateSnap.empty) throw new Error("ALREADY_REGISTERED");

      const countQuery = getDb().collection("registrations").where("eventId", "==", eventId);
      const countSnap = await transaction.get(countQuery);
      if (event.maxRegistrations && countSnap.size >= Number(event.maxRegistrations)) throw new Error("EVENT_FULL");

      const ref = getDb().collection("registrations").doc();
      const registrationId = `ABH-${registrationCode(event.title)}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      transaction.set(ref, {
        eventId,
        eventTitle: event.title || String(input.eventTitle || "").trim(),
        name,
        email,
        phone: String(input.phone || "").trim(),
        branch: String(input.branch || "").trim(),
        semester: String(input.semester || "").trim(),
        registrationId,
        registrationStatus: input.isPaid ? "payment_pending" : "registered",
        isPaid: Boolean(input.isPaid),
        amount: event.isPaid ? Number(event.feeAmount) || 0 : 0,
        paymentStatus: input.isPaid ? "pending" : "free",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { id: ref.id, registrationId };
    });
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    const messages = {
      EVENT_NOT_FOUND: "Event not found.",
      REGISTRATION_CLOSED: "Registrations are closed for this event.",
      ALREADY_REGISTERED: "You are already registered for this event.",
      EVENT_FULL: "This event has reached its registration capacity.",
    };
    const message = messages[error.message] || "Unable to create registration.";
    console.error("Registration creation failed:", error);
    return res.status(400).json({ success: false, error: message });
  }
}
