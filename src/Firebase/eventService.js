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

function formatEventDoc(snapshotDoc) {
  const data = snapshotDoc.data();
  const rawImage = data.image || data.banner || "";

  return {
    id: snapshotDoc.id,
    slug: data.slug || snapshotDoc.id,
    title: data.title || "Untitled Event",
    subtitle: data.subtitle || "Abhyudaya Event",
    icon: data.icon || "📅",
    tagline: data.tagline || "",
    description: data.description || "",
    image: rawImage,
    banner: rawImage,
    since: data.since || "",
    participants: data.participants || "",
    participantsLabel: data.participantsLabel || "Participants",
    events: data.events || "",
    eventsLabel: data.eventsLabel || "Activities",
    editions: data.editions || "",
    editionsLabel: data.editionsLabel || "Editions",
    highlights: Array.isArray(data.highlights) ? data.highlights : [],
    featured: Boolean(data.featured),
    status: data.status || "Published",
    order: Number(data.order) || 99,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
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
    // Fallback without compound index
    const constraints = [limit(pageSize)];
    if (lastDoc) constraints.push(startAfter(lastDoc));
    const fallbackQ = query(eventsRef, ...constraints);
    const snapshot = await getDocs(fallbackQ);
    const items = snapshot.docs.map(formatEventDoc);
    const filtered = onlyPublished
      ? items.filter((item) => item.status === "Published")
      : items;
    const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    return { events: filtered, lastDoc: newLastDoc, hasMore: snapshot.docs.length === pageSize };
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
  if (!slug) return null;

  try {
    const q = query(eventsRef, where("slug", "==", slug), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return formatEventDoc(snapshot.docs[0]);
    }

    const docRef = doc(db, EVENTS_COLLECTION, slug);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return formatEventDoc(docSnap);
    }
  } catch (err) {
    console.warn(`getEventBySlug warning for "${slug}":`, err);
  }

  const staticMatch = eventCategories.find(
    (item) => item.slug === slug || String(item.id) === slug
  );
  return staticMatch || null;
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
    subtitle: (eventData.subtitle || "").trim(),
    icon: (eventData.icon || "").trim() || "📅",
    tagline: (eventData.tagline || "").trim(),
    description: (eventData.description || "").trim(),
    image: imageUrl,
    banner: imageUrl,
    since: (eventData.since || "").trim(),
    participants: (eventData.participants || "").trim(),
    participantsLabel: (eventData.participantsLabel || "Participants").trim(),
    events: (eventData.events || "").trim(),
    eventsLabel: (eventData.eventsLabel || "Activities").trim(),
    editions: (eventData.editions || "").trim(),
    editionsLabel: (eventData.editionsLabel || "Editions").trim(),
    highlights: Array.isArray(eventData.highlights) ? eventData.highlights : [],
    featured: Boolean(eventData.featured),
    status: eventData.status || "Published",
    order: Number(eventData.order) || 99,
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
    subtitle: (eventData.subtitle || "").trim(),
    icon: (eventData.icon || "").trim() || "📅",
    tagline: (eventData.tagline || "").trim(),
    description: (eventData.description || "").trim(),
    image: imageUrl,
    banner: imageUrl,
    since: (eventData.since || "").trim(),
    participants: (eventData.participants || "").trim(),
    participantsLabel: (eventData.participantsLabel || "Participants").trim(),
    events: (eventData.events || "").trim(),
    eventsLabel: (eventData.eventsLabel || "Activities").trim(),
    editions: (eventData.editions || "").trim(),
    editionsLabel: (eventData.editionsLabel || "Editions").trim(),
    highlights: Array.isArray(eventData.highlights) ? eventData.highlights : [],
    featured: Boolean(eventData.featured),
    status: eventData.status || "Published",
    order: Number(eventData.order) || 99,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(docRef, payload);
}

export async function deleteEvent(id) {
  const docRef = doc(db, EVENTS_COLLECTION, id);
  await deleteDoc(docRef);
}
