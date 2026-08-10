import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const REGISTRATIONS_COLLECTION = "registrations";
const registrationsRef = collection(db, REGISTRATIONS_COLLECTION);

/**
 * Generates a human-readable unique registration ID.
 * Format: ABH-{EVENT_CODE}-{SEQUENCE}
 * Example: ABH-TB26-00421
 *
 * @param {string} eventCode - short code derived from event (e.g. "TB26")
 * @returns {Promise<string>}
 */
async function generateRegistrationId(eventCode = "EVT") {
  const code = (eventCode || "EVT").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "EVT";

  // Count existing registrations to derive a sequence number
  const snapshot = await getDocs(registrationsRef);
  const base = snapshot.size + 1;

  // Ensure uniqueness by checking if the ID already exists
  let seq = base;
  let candidate = `ABH-${code}-${String(seq).padStart(5, "0")}`;

  // Loop until we find a unique ID (in case of collisions)
  let exists = true;
  while (exists) {
    const q = query(registrationsRef, where("registrationId", "==", candidate));
    const check = await getDocs(q);
    if (check.empty) {
      exists = false;
    } else {
      seq += 1;
      candidate = `ABH-${code}-${String(seq).padStart(5, "0")}`;
    }
  }

  return candidate;
}

/**
 * Derives a short event code from an event title.
 * Example: "TechBloom 2026" -> "TB26"
 *
 * @param {string} title
 * @returns {string}
 */
function deriveEventCode(title = "") {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "EVT";

  // Take first letters of first two words + last 2 digits of year if present
  const initials = words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const yearMatch = title.match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1].slice(-2) : "";

  return `${initials}${year}` || "EVT";
}

/**
 * Checks if a user is already registered for an event.
 *
 * @param {string} eventId
 * @param {string} email
 * @returns {Promise<{registered: boolean, registrationId: string|null}>}
 */
export async function checkExistingRegistration(eventId, email) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!eventId || !normalizedEmail) {
    return { registered: false, registrationId: null };
  }

  const q = query(
    registrationsRef,
    where("eventId", "==", eventId),
    where("email", "==", normalizedEmail)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return { registered: false, registrationId: null };
  }

  const data = snapshot.docs[0].data();
  return { registered: true, registrationId: data.registrationId || null };
}

/**
 * Counts registrations for a specific event.
 *
 * @param {string} eventId
 * @returns {Promise<number>}
 */
export async function countRegistrations(eventId) {
  const q = query(registrationsRef, where("eventId", "==", eventId));
  const snapshot = await getDocs(q);
  return snapshot.size;
}

/**
 * Creates a new registration.
 * Throws if the user is already registered.
 *
 * @param {{eventId: string, eventTitle: string, name: string, email: string, phone: string, branch: string, semester: string}} data
 * @returns {Promise<{registrationId: string, id: string}>}
 */
export async function createRegistration(data) {
  const email = (data.email || "").trim().toLowerCase();
  if (!email) throw new Error("Email is required.");

  // Check for duplicate
  const existing = await checkExistingRegistration(data.eventId, email);
  if (existing.registered) {
    throw new Error("ALREADY_REGISTERED");
  }

  const eventCode = deriveEventCode(data.eventTitle || "");
  const registrationId = await generateRegistrationId(eventCode);

  const payload = {
    eventId: data.eventId,
    name: (data.name || "").trim(),
    email,
    phone: (data.phone || "").trim(),
    branch: (data.branch || "").trim(),
    semester: (data.semester || "").trim(),
    registrationId,
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(registrationsRef, payload);
  return { registrationId, id: ref.id };
}

/**
 * Fetches a registration by its human-readable ID.
 *
 * @param {string} registrationId
 * @returns {Promise<object|null>}
 */
export async function getRegistrationByPublicId(registrationId) {
  const q = query(registrationsRef, where("registrationId", "==", registrationId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

/**
 * Fetches all registrations for an event (admin use).
 *
 * @param {string} eventId
 * @returns {Promise<Array>}
 */
export async function getRegistrationsForEvent(eventId) {
  const q = query(registrationsRef, where("eventId", "==", eventId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}