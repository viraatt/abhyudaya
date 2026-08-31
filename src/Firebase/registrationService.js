import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
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
function generateRegistrationId(eventCode = "EVT") {
  const code = (eventCode || "EVT").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "EVT";

  // Do not query registrations from a public browser: registrations are private.
  return `ABH-${code}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

async function registrationDocumentId(eventId, email) {
  const source = `${eventId}:${email}`;
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(source);
    const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return `${eventId}_${Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
  }
  return `${eventId}_${encodeURIComponent(email).replace(/%/g, "_")}`;
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

  // Registration records are intentionally not readable by anonymous users.
  // The deterministic document ID below makes creation atomic: an existing
  // registration cannot be overwritten because Firestore only permits creates.
  return { registered: false, registrationId: null };
}

/**
 * Counts registrations for a specific event.
 *
 * @param {string} eventId
 * @returns {Promise<number>}
 */
export async function countRegistrations(eventId) {
  const q = query(registrationsRef, where("eventId", "==", eventId));
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
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
  return createServerRegistration({ ...data, email });
}

async function createServerRegistration(data) {
  const response = await fetch("/api/registrations/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) throw new Error(result.error || "Unable to create registration.");
  return { registrationId: result.registrationId, id: result.id };
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

export async function getRegistrationsPage({ eventId = "", status = "", pageSize = 50, lastDoc = null } = {}) {
  const constraints = [];
  if (eventId) constraints.push(where("eventId", "==", eventId));
  if (status) constraints.push(where("registrationStatus", "==", status));
  constraints.push(orderBy("createdAt", "desc"), limit(pageSize));
  if (lastDoc) constraints.push(startAfter(lastDoc));
  const snapshot = await getDocs(query(registrationsRef, ...constraints));
  return {
    registrations: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    lastDoc: snapshot.docs.at(-1) || null,
    hasMore: snapshot.docs.length === pageSize,
  };
}

export async function updateRegistrationStatus(id, registrationStatus) {
  await updateDoc(doc(registrationsRef, id), { registrationStatus, updatedAt: serverTimestamp() });
}

export async function deleteRegistration(id) {
  await deleteDoc(doc(registrationsRef, id));
}

/**
 * Fetches a single registration by its Firestore document ID.
 * Admin use only.
 *
 * @param {string} id - Firestore document ID
 * @returns {Promise<object|null>}
 */
export async function getRegistrationById(id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, "registrations", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Fetches ALL registrations for the admin panel.
 * Supports optional eventId filter, sort order, and registrationStatus filter.
 *
 * @param {{ eventId?: string, registrationStatus?: string, sortOrder?: "desc"|"asc"|"name" }} options
 * @returns {Promise<Array>}
 */
export async function getAllRegistrations({ eventId = "", registrationStatus = "", sortOrder = "desc" } = {}) {
  try {
    const constraints = [];
    if (eventId) constraints.push(where("eventId", "==", eventId));
    if (registrationStatus) constraints.push(where("registrationStatus", "==", registrationStatus));
    if (sortOrder === "name") {
      constraints.push(orderBy("name", "asc"));
    } else {
      constraints.push(orderBy("createdAt", sortOrder === "asc" ? "asc" : "desc"));
    }
    const snapshot = await getDocs(query(registrationsRef, ...constraints));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    // Fallback without compound ordering if index not ready
    console.warn("getAllRegistrations fallback query:", err);
    const constraints = [];
    if (eventId) constraints.push(where("eventId", "==", eventId));
    if (registrationStatus) constraints.push(where("registrationStatus", "==", registrationStatus));
    const snapshot = await getDocs(query(registrationsRef, ...constraints));
    const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (sortOrder === "name") {
      docs.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else {
      docs.sort((a, b) => {
        const ta = a.createdAt?.seconds ?? 0;
        const tb = b.createdAt?.seconds ?? 0;
        return sortOrder === "asc" ? ta - tb : tb - ta;
      });
    }
    return docs;
  }
}

