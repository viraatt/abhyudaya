/**
 * ============================================================================
 * EVENT SERVICE — Firebase Firestore & Cloudinary CMS Foundation
 * Collection: "events"
 * ============================================================================
 *
 * DOCUMENT SCHEMA:
 * {
 *   id: string,               // Firestore Document ID
 *   slug: string,             // Unique URL slug (e.g. "techbloom", "antariksh-spardha")
 *   title: string,            // Title (e.g. "TechBloom 2026")
 *   subtitle: string,         // Category badge text (e.g. "Flagship Technical Festival")
 *   icon: string,             // Emoji / icon representation (e.g. "💻")
 *   tagline: string,          // Event tagline (e.g. "Innovate • Build • Compete")
 *   description: string,      // Full event summary & details
 *   image: string,            // Cloudinary image URL (banner)
 *   banner: string,           // Backward compatibility alias for image
 *   since: string,            // Year established (e.g. "2022")
 *   participants: string,     // Participant count metric (e.g. "2000+")
 *   participantsLabel: string,// Participant metric label (e.g. "Participants")
 *   events: string,           // Activities/Events metric (e.g. "25+")
 *   eventsLabel: string,      // Metric label (e.g. "Competitions" / "Activities")
 *   editions: string,         // Editions/Years metric (e.g. "4")
 *   editionsLabel: string,    // Metric label (e.g. "Editions" / "Years")
 *   highlights: string[],     // Array of key features/highlights
 *   featured: boolean,        // Whether displayed on featured sections
 *   status: string,           // "Published" | "Draft" | "Archived"
 *   order: number,            // Sort priority
 *   createdAt: Timestamp,     // Document creation timestamp
 *   updatedAt: Timestamp      // Document update timestamp
 * }
 */

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";
import eventCategories from "../data/eventCategories";

const EVENTS_COLLECTION = "events";
const eventsRef = collection(db, EVENTS_COLLECTION);

const CLOUD_NAME = "cn11zsvp";
const UPLOAD_PRESET = "abhyudaya_blog";

/* ============================================================================
   1. CLOUDINARY INTEGRATION
   ============================================================================ */

/**
 * Uploads an image file to Cloudinary and returns the secure HTTPS URL.
 * @param {File} file - Image file from input
 * @returns {Promise<string>} - Cloudinary secure image URL
 */
export async function uploadEventImage(file) {
  if (!file) return "";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();

    if (!res.ok) {
      // Fallback preset retry if primary fails
      const fallbackFormData = new FormData();
      fallbackFormData.append("file", file);
      fallbackFormData.append("upload_preset", "event_images");

      const fallbackRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: fallbackFormData }
      );

      if (!fallbackRes.ok) {
        throw new Error(data?.error?.message || "Cloudinary image upload failed.");
      }
      const fallbackData = await fallbackRes.json();
      return fallbackData.secure_url;
    }

    return data.secure_url;
  } catch (err) {
    console.error("Event image upload error:", err);
    throw err;
  }
}

/* ============================================================================
   2. REUSABLE FIRESTORE CRUD METHODS
   ============================================================================ */

/**
 * Normalizes event doc from Firestore into standardized format.
 */
function formatEventDoc(docSnap) {
  const data = docSnap.data();
  const imageUrl = data.image || data.banner || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1400";

  return {
    id: docSnap.id,
    slug: data.slug || docSnap.id,
    title: data.title || data.name || "Untitled Event",
    subtitle: data.subtitle || data.category || "Special Event",
    badgeText: data.badgeText || data.subtitle || data.category || "",
    icon: data.icon || "📅",
    tagline: data.tagline || "",
    description: data.longDescription || data.description || data.shortDescription || "",
    shortDescription: data.shortDescription || "",
    longDescription: data.longDescription || "",
    venue: data.venue || "",
    location: data.location || "",
    organizer: data.organizer || "Abhyudaya Club",
    eventStartDate: data.eventStartDate || "",
    eventEndDate: data.eventEndDate || "",
    registrationDeadline: data.registrationDeadline || "",
    image: imageUrl,
    banner: imageUrl,
    thumbnail: data.thumbnail || imageUrl,
    since: data.since || "2024",
    participants: data.participants || "",
    participantsLabel: data.participantsLabel || "Participants",
    events: data.events || "",
    eventsLabel: data.eventsLabel || "Activities",
    editions: data.editions || "",
    editionsLabel: data.editionsLabel || "Editions",
    competitions: data.competitions || "",
    competitionsLabel: data.competitionsLabel || "Competitions",
    years: data.years || "",
    yearsLabel: data.yearsLabel || "Years Active",
    highlights: Array.isArray(data.highlights) ? data.highlights : [],
    objectives: Array.isArray(data.objectives) ? data.objectives : [],
    schedule: Array.isArray(data.schedule) ? data.schedule : [],
    gallery: Array.isArray(data.gallery) ? data.gallery : [],
    downloads: Array.isArray(data.downloads) ? data.downloads : [],
    faqs: Array.isArray(data.faqs) ? data.faqs : [],
    speakers: Array.isArray(data.speakers) ? data.speakers : [],
    ctaText: data.ctaText || "Register / Express Interest",
    ctaLink: data.ctaLink || "",
    featured: Boolean(data.featured),
    status: data.status || "Published",
    order: typeof data.order === "number" ? data.order : 99,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

/**
 * Fetches all published events from Firestore.
 * Automatically falls back to static seed data if collection is empty or offline.
 * @returns {Promise<Array>} List of formatted event objects
 */
export async function getEvents(options = {}) {
  const { onlyPublished = true, allowFallback = false } = options;

  try {
    const q = query(eventsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const items = snapshot.docs.map(formatEventDoc);
      return onlyPublished
        ? items.filter((item) => item.status === "Published")
        : items;
    }

    // Fallback only if explicitly requested
    return allowFallback ? eventCategories : [];
  } catch (err) {
    console.warn("Firestore getEvents query warning:", err);
    return allowFallback ? eventCategories : [];
  }
}

/**
 * Fetches a single event by URL slug or document ID.
 * @param {string} slug - Event URL slug (e.g. "techbloom")
 * @returns {Promise<Object|null>} Event object
 */
export async function getEventBySlug(slug) {
  if (!slug) return null;

  try {
    // 1. Query by slug
    const q = query(eventsRef, where("slug", "==", slug));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return formatEventDoc(snapshot.docs[0]);
    }

    // 2. Query by Document ID fallback
    const docRef = doc(db, EVENTS_COLLECTION, slug);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return formatEventDoc(docSnap);
    }
  } catch (err) {
    console.warn(`Firestore getEventBySlug warning for "${slug}":`, err);
  }

  // 3. Static data fallback
  const staticMatch = eventCategories.find(
    (item) => item.slug === slug || String(item.id) === slug
  );
  return staticMatch || null;
}

/**
 * Fetches event by Firestore document ID.
 * @param {string} id - Firestore Document ID
 * @returns {Promise<Object|null>}
 */
export async function getEventById(id) {
  if (!id) return null;

  try {
    const docRef = doc(db, EVENTS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return formatEventDoc(docSnap);
    }
  } catch (err) {
    console.error("getEventById error:", err);
  }

  return null;
}

/**
 * Creates a new event document in Firestore "events" collection.
 * @param {Object} eventData - Form fields
 * @param {File} [file] - Optional banner image file
 * @returns {Promise<string>} Created Firestore document ID
 */
export async function createEvent(eventData, file) {
  let imageUrl = eventData.image || eventData.banner || "";

  if (file) {
    imageUrl = await uploadEventImage(file);
  }

  const generatedSlug =
    eventData.slug ||
    (eventData.title || "event")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-");

  const docPayload = {
    title: eventData.title || "",
    slug: generatedSlug,
    subtitle: eventData.subtitle || eventData.category || "Special Event",
    icon: eventData.icon || "📅",
    tagline: eventData.tagline || "",
    description: eventData.description || "",
    image: imageUrl,
    banner: imageUrl,
    since: eventData.since || String(new Date().getFullYear()),
    participants: eventData.participants || "1000+",
    participantsLabel: eventData.participantsLabel || "Participants",
    events: eventData.events || "10+",
    eventsLabel: eventData.eventsLabel || "Activities",
    editions: eventData.editions || "1",
    editionsLabel: eventData.editionsLabel || "Editions",
    highlights: Array.isArray(eventData.highlights) ? eventData.highlights : [],
    featured: Boolean(eventData.featured),
    status: eventData.status || "Published",
    order: Number(eventData.order) || 99,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(eventsRef, docPayload);
  return ref.id;
}

/**
 * Backward compatible alias for createEvent.
 */
export const addEvent = createEvent;

/**
 * Updates an existing event document in Firestore.
 * @param {string} id - Firestore Document ID
 * @param {Object} eventData - Updated fields
 * @param {File} [file] - Optional new banner file
 */
export async function updateEvent(id, eventData, file) {
  const docRef = doc(db, EVENTS_COLLECTION, id);

  let imageUrl = eventData.image || eventData.banner || "";
  if (file) {
    imageUrl = await uploadEventImage(file);
  }

  const updatePayload = {
    ...eventData,
    updatedAt: serverTimestamp(),
  };

  if (imageUrl) {
    updatePayload.image = imageUrl;
    updatePayload.banner = imageUrl;
  }

  delete updatePayload.id; // Avoid storing id field inside doc body

  await updateDoc(docRef, updatePayload);
}

/**
 * Deletes an event document from Firestore.
 * @param {string} id - Firestore Document ID
 */
export async function deleteEvent(id) {
  const docRef = doc(db, EVENTS_COLLECTION, id);
  await deleteDoc(docRef);
}
