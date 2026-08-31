import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";
import eventCategories from "../data/eventCategories";
import { normalizeRouteSlug } from "../utils/slug";

const EVENTS_COLLECTION = "events";
const eventsRef = collection(db, EVENTS_COLLECTION);

const CLOUD_NAME = "cn11zsvp";
const UPLOAD_PRESET = "abhyudaya_blog";

/* ============================================================================
   1. CLOUDINARY INTEGRATION
   ============================================================================ */

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
    console.error("Cloudinary upload catch error:", err);
    throw err;
  }
}

/* ============================================================================
   2. DATA HELPER / FORMATTER
   ============================================================================ */

import { normalizeEvent } from "../utils/eventNormalizer";

function formatEventDoc(snapshotDoc) {
  const data = snapshotDoc.data();
  const rawImage = data.image || data.banner || data.thumbnail || "";

  const baseEvent = {
    id: snapshotDoc.id,
    slug: data.slug || snapshotDoc.id,
    title: data.title || "Untitled Event",
    subtitle: data.subtitle || data.category || "Abhyudaya Event",
    category: data.category || data.subtitle || "Events",
    icon: data.icon || "📅",
    tagline: data.tagline || "",
    description: data.description || data.shortDescription || data.longDescription || "",
    shortDescription: data.shortDescription || "",
    longDescription: data.longDescription || data.description || "",
    image: rawImage,
    banner: rawImage,
    thumbnail: data.thumbnail || rawImage,
    since: data.since || data.stats?.since || data.statistics?.since || "",
    participants: data.participants || data.stats?.participants || data.statistics?.participants || "",
    participantsLabel: data.participantsLabel || data.stats?.participantsLabel || data.statistics?.participantsLabel || "Participants",
    events: data.events || data.activities || data.stats?.events || data.stats?.activities || data.statistics?.events || data.statistics?.activities || "",
    eventsLabel: data.eventsLabel || data.activitiesLabel || data.stats?.eventsLabel || data.stats?.activitiesLabel || data.statistics?.eventsLabel || data.statistics?.activitiesLabel || "Activities",
    editions: data.editions || data.stats?.editions || data.statistics?.editions || "",
    editionsLabel: data.editionsLabel || data.stats?.editionsLabel || data.statistics?.editionsLabel || "Editions",
    years: data.years || data.stats?.years || data.statistics?.years || "",
    yearsLabel: data.yearsLabel || data.stats?.yearsLabel || data.statistics?.yearsLabel || "Years Active",
    competitions: data.competitions || data.stats?.competitions || data.statistics?.competitions || "",
    competitionsLabel: data.competitionsLabel || data.stats?.competitionsLabel || data.statistics?.competitionsLabel || "Competitions",
    highlights: Array.isArray(data.highlights) ? data.highlights : [],
    speakers: Array.isArray(data.speakers) ? data.speakers : [],
    badgeText: data.badgeText || "",
    ctaText: data.ctaText || "Explore Event →",
    ctaLink: data.ctaLink || "",
    featured: Boolean(data.featured),
    status: data.status || "Published",
    order: Number(data.order) || 99,
    venue: data.venue || "",
    location: data.location || "",
    eventStartDate: data.eventStartDate || "",
    eventEndDate: data.eventEndDate || "",
    registrationDeadline: data.registrationDeadline || "",
    registrationOpen: data.registrationOpen === true,
    maxRegistrations: data.maxRegistrations ? Number(data.maxRegistrations) : null,
    // Pricing / Registration Type (backward-compatible safe defaults)
    isPaid: Boolean(data.isPaid),
    feeAmount: Number.isFinite(Number(data.feeAmount)) ? Number(data.feeAmount) : 0,
    currency: data.currency || "INR",
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };

  return normalizeEvent(baseEvent);
}

/* ============================================================================
   3. FIRESTORE READ OPERATIONS (PAGINATED)
   ============================================================================ */

/**
 * Cursor-based paginated fetching of events.
 * Limits reads to pageSize (default 6).
 */
export async function getEventsPage(options = {}) {
  const { pageSize = 6, lastDoc = null, onlyPublished = true } = options;

  try {
    const constraints = [];

    if (onlyPublished) {
      constraints.push(where("status", "==", "Published"));
    }

    constraints.push(orderBy("createdAt", "desc"));
    constraints.push(limit(pageSize));

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(eventsRef, ...constraints);
    const snapshot = await getDocs(q);

    const items = snapshot.docs.map(formatEventDoc);
    const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    const hasMore = snapshot.docs.length === pageSize;

    return { events: items, lastDoc: newLastDoc, hasMore };
  } catch (err) {
    console.warn("getEventsPage fallback query:", err);
    try {
      // Keep the public query compatible with the Firestore rule. The original
      // fallback read the entire collection, which is rejected when drafts exist.
      const constraints = onlyPublished
        ? [where("status", "==", "Published")]
        : [];
      const snapshot = await getDocs(query(eventsRef, ...constraints));
      const items = snapshot.docs
        .map(formatEventDoc)
        .sort((a, b) => Number(a.order || 99) - Number(b.order || 99))
        .slice(0, pageSize);
      return { events: items, lastDoc: null, hasMore: false };
    } catch (fallbackError) {
      console.warn("Unable to read Firestore events; using bundled event data.", fallbackError);
      // Core content remains usable if a privacy extension, a temporary network
      // failure, or an undeployed index prevents Firestore from loading.
      return {
        events: eventCategories.slice(0, pageSize).map(normalizeEvent),
        lastDoc: null,
        hasMore: false,
      };
    }
  }
}

/**
 * Fetches ALL events (regardless of status) for the Admin panel.
 * No pagination limit — the Admin Event Manager must see the complete collection.
 */
export async function getAllEvents() {
  try {
    const q = query(eventsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(formatEventDoc);
  } catch (err) {
    console.warn("getAllEvents fallback query:", err);
    // Fallback without orderBy (avoids needing a single-field index on createdAt)
    const snapshot = await getDocs(eventsRef);
    return snapshot.docs.map(formatEventDoc);
  }
}

export async function getEvents(options = {}) {
  const { pageSize = 6, lastDoc = null, onlyPublished = true, allowFallback = false } = options;
  const res = await getEventsPage({ pageSize, lastDoc, onlyPublished });
  if (res.events.length === 0 && allowFallback) {
    return eventCategories;
  }
  return res.events;
}

export async function getEventBySlug(slug) {
  const normalizedSlug = normalizeRouteSlug(slug);
  if (!normalizedSlug) return null;

  try {
    // Firestore evaluates rules against the query, not only its eventual result.
    // Public callers must constrain this query to documents they may read.
    const q = query(
      eventsRef,
      where("status", "==", "Published"),
      where("slug", "==", normalizedSlug),
      limit(1)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return formatEventDoc(snapshot.docs[0]);
    }

    const documentId = String(slug).trim();
    if (documentId && !documentId.includes("/")) {
      const docSnap = await getDoc(doc(db, EVENTS_COLLECTION, documentId));
      if (docSnap.exists()) {
        return formatEventDoc(docSnap);
      }
    }
  } catch (err) {
    console.warn("Unable to load event from Firestore; checking bundled event data.", err);
  }

  const staticMatch = eventCategories.find(
    (item) => normalizeRouteSlug(item.slug) === normalizedSlug || String(item.id) === String(slug).trim()
  );
  return staticMatch ? normalizeEvent(staticMatch) : null;
}

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

/* ============================================================================
   4. FIRESTORE WRITE OPERATIONS (ADMIN CRUD)
   ============================================================================ */

export async function createEvent(eventData, imageFile = null) {
  let imageUrl = eventData.image || eventData.banner || "";

  if (imageFile) {
    imageUrl = await uploadEventImage(imageFile);
  }

  const payload = {
    title: (eventData.title || "").trim(),
    slug: (eventData.slug || "").trim() || (eventData.title || "").toLowerCase().replace(/\s+/g, "-"),
    subtitle: (eventData.subtitle || eventData.category || "").trim(),
    category: (eventData.category || eventData.subtitle || "Events").trim(),
    icon: (eventData.icon || "").trim() || "📅",
    tagline: (eventData.tagline || "").trim(),
    description: (eventData.description || eventData.longDescription || eventData.shortDescription || "").trim(),
    shortDescription: (eventData.shortDescription || "").trim(),
    longDescription: (eventData.longDescription || eventData.description || "").trim(),
    image: imageUrl,
    banner: imageUrl,
    thumbnail: eventData.thumbnail || imageUrl,
    since: (eventData.since || "").trim(),
    participants: (eventData.participants || "").trim(),
    participantsLabel: (eventData.participantsLabel || "Participants").trim(),
    events: (eventData.events || "").trim(),
    eventsLabel: (eventData.eventsLabel || "Activities").trim(),
    editions: (eventData.editions || "").trim(),
    editionsLabel: (eventData.editionsLabel || "Editions").trim(),
    years: (eventData.years || "").trim(),
    yearsLabel: (eventData.yearsLabel || "Years Active").trim(),
    competitions: (eventData.competitions || "").trim(),
    competitionsLabel: (eventData.competitionsLabel || "Competitions").trim(),
    highlights: Array.isArray(eventData.highlights) ? eventData.highlights : [],
    speakers: Array.isArray(eventData.speakers) ? eventData.speakers : [],
    badgeText: (eventData.badgeText || "").trim(),
    ctaText: (eventData.ctaText || "Explore Event →").trim(),
    ctaLink: (eventData.ctaLink || "").trim(),
    featured: Boolean(eventData.featured),
    status: eventData.status || "Published",
    order: Number(eventData.order) || 99,
    venue: (eventData.venue || "").trim(),
    location: (eventData.location || "").trim(),
    eventStartDate: eventData.eventStartDate || "",
    eventEndDate: eventData.eventEndDate || "",
    registrationDeadline: eventData.registrationDeadline || "",
    registrationOpen: Boolean(eventData.registrationOpen),
    maxRegistrations: eventData.maxRegistrations ? Number(eventData.maxRegistrations) : null,
    // Pricing / Registration Type
    isPaid: Boolean(eventData.isPaid),
    feeAmount: Number.isFinite(Number(eventData.feeAmount)) ? Number(eventData.feeAmount) : 0,
    currency: eventData.currency || "INR",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(eventsRef, payload);
  return docRef.id;
}

export async function updateEvent(id, eventData, imageFile = null) {
  const docRef = doc(db, EVENTS_COLLECTION, id);

  let imageUrl = eventData.image || eventData.banner || "";

  if (imageFile) {
    imageUrl = await uploadEventImage(imageFile);
  }

  const payload = {
    title: (eventData.title || "").trim(),
    slug: (eventData.slug || "").trim(),
    subtitle: (eventData.subtitle || eventData.category || "").trim(),
    category: (eventData.category || eventData.subtitle || "Events").trim(),
    icon: (eventData.icon || "").trim() || "📅",
    tagline: (eventData.tagline || "").trim(),
    description: (eventData.description || eventData.longDescription || eventData.shortDescription || "").trim(),
    shortDescription: (eventData.shortDescription || "").trim(),
    longDescription: (eventData.longDescription || eventData.description || "").trim(),
    image: imageUrl,
    banner: imageUrl,
    thumbnail: eventData.thumbnail || imageUrl,
    since: (eventData.since || "").trim(),
    participants: (eventData.participants || "").trim(),
    participantsLabel: (eventData.participantsLabel || "Participants").trim(),
    events: (eventData.events || "").trim(),
    eventsLabel: (eventData.eventsLabel || "Activities").trim(),
    editions: (eventData.editions || "").trim(),
    editionsLabel: (eventData.editionsLabel || "Editions").trim(),
    years: (eventData.years || "").trim(),
    yearsLabel: (eventData.yearsLabel || "Years Active").trim(),
    competitions: (eventData.competitions || "").trim(),
    competitionsLabel: (eventData.competitionsLabel || "Competitions").trim(),
    highlights: Array.isArray(eventData.highlights) ? eventData.highlights : [],
    speakers: Array.isArray(eventData.speakers) ? eventData.speakers : [],
    badgeText: (eventData.badgeText || "").trim(),
    ctaText: (eventData.ctaText || "Explore Event →").trim(),
    ctaLink: (eventData.ctaLink || "").trim(),
    featured: Boolean(eventData.featured),
    status: eventData.status || "Published",
    order: Number(eventData.order) || 99,
    venue: (eventData.venue || "").trim(),
    location: (eventData.location || "").trim(),
    eventStartDate: eventData.eventStartDate || "",
    eventEndDate: eventData.eventEndDate || "",
    registrationDeadline: eventData.registrationDeadline || "",
    registrationOpen: Boolean(eventData.registrationOpen),
    maxRegistrations: eventData.maxRegistrations ? Number(eventData.maxRegistrations) : null,
    // Pricing / Registration Type
    isPaid: Boolean(eventData.isPaid),
    feeAmount: Number.isFinite(Number(eventData.feeAmount)) ? Number(eventData.feeAmount) : 0,
    currency: eventData.currency || "INR",
    updatedAt: serverTimestamp(),
  };

  await updateDoc(docRef, payload);
}

export async function deleteEvent(id) {
  const docRef = doc(db, EVENTS_COLLECTION, id);
  await deleteDoc(docRef);
}
