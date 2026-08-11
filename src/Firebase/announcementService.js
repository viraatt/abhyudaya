import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";

const ANNOUNCEMENTS_COLLECTION = "announcements";
const announcementsRef = collection(db, ANNOUNCEMENTS_COLLECTION);

/**
 * Formats a Firestore announcement document.
 */
function formatAnnouncement(snapshotDoc) {
  const data = snapshotDoc.data();

  return {
    id: snapshotDoc.id,
    title: data.title || "",
    message: data.message || "",
    type: data.type || "general",
    ctaText: data.ctaText || "",
    ctaLink: data.ctaLink || "",
    linkedEventId: data.linkedEventId || null,

    status: data.status || "draft",
    published: Boolean(data.published),

    createdBy: data.createdBy || "",
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

/**
 * Converts Firestore Timestamp into milliseconds
 * for safe sorting.
 */
function getTimestampValue(timestamp) {
  if (!timestamp) return 0;

  if (typeof timestamp.toMillis === "function") {
    return timestamp.toMillis();
  }

  if (timestamp.seconds) {
    return timestamp.seconds * 1000;
  }

  return 0;
}

/**
 * Fetches all announcements.
 * Used by Admin panel.
 *
 * Only admins should call this function.
 */
export async function getAnnouncements() {
  try {
    const snapshot = await getDocs(announcementsRef);

    const announcements = snapshot.docs.map(formatAnnouncement);

    // Newest first
    announcements.sort(
      (a, b) =>
        getTimestampValue(b.createdAt) -
        getTimestampValue(a.createdAt)
    );

    return announcements;
  } catch (err) {
    console.error("Failed to load announcements:", err);
    throw err;
  }
}

/**
 * Fetches ONLY published announcements.
 *
 * Used by the PUBLIC website.
 *
 * Important:
 * Firestore Security Rules are not filters.
 * Therefore the query itself requests only
 * published documents.
 */
export async function getPublishedAnnouncements() {
  try {
    const q = query(
      announcementsRef,
      where("status", "==", "published")
    );

    const snapshot = await getDocs(q);

    const announcements = snapshot.docs.map(formatAnnouncement);

    // Newest first
    announcements.sort(
      (a, b) =>
        getTimestampValue(b.createdAt) -
        getTimestampValue(a.createdAt)
    );

    return announcements;
  } catch (err) {
    console.error(
      "Failed to load published announcements:",
      err
    );

    throw err;
  }
}

/**
 * Fetches a single announcement by ID.
 */
export async function getAnnouncementById(id) {
  try {
    const ref = doc(
      db,
      ANNOUNCEMENTS_COLLECTION,
      id
    );

    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return null;
    }

    return formatAnnouncement(snap);
  } catch (err) {
    console.error(
      "Failed to load announcement:",
      err
    );

    throw err;
  }
}

/**
 * Creates a new announcement.
 */
export async function createAnnouncement(
  announcement,
  createdBy = ""
) {
  const published = Boolean(
    announcement.published
  );

  const payload = {
    title: (announcement.title || "").trim(),

    message: (announcement.message || "").trim(),

    type: announcement.type || "general",

    ctaText: (announcement.ctaText || "").trim(),

    ctaLink: (announcement.ctaLink || "").trim(),

    linkedEventId:
      announcement.linkedEventId || null,

    // Keep both fields synchronized
    status: published
      ? "published"
      : "draft",

    published,

    createdBy,

    createdAt: serverTimestamp(),

    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(
    announcementsRef,
    payload
  );

  return ref.id;
}

/**
 * Updates an existing announcement.
 */
export async function updateAnnouncement(
  id,
  announcement
) {
  const ref = doc(
    db,
    ANNOUNCEMENTS_COLLECTION,
    id
  );

  const published = Boolean(
    announcement.published
  );

  const payload = {
    title: (announcement.title || "").trim(),

    message: (announcement.message || "").trim(),

    type: announcement.type || "general",

    ctaText: (announcement.ctaText || "").trim(),

    ctaLink: (announcement.ctaLink || "").trim(),

    linkedEventId:
      announcement.linkedEventId || null,

    status: published
      ? "published"
      : "draft",

    published,

    updatedAt: serverTimestamp(),
  };

  await updateDoc(ref, payload);
}

/**
 * Publishes or unpublishes an announcement.
 */
export async function setAnnouncementPublished(
  id,
  published
) {
  const ref = doc(
    db,
    ANNOUNCEMENTS_COLLECTION,
    id
  );

  await updateDoc(ref, {
    published: Boolean(published),

    status: published
      ? "published"
      : "draft",

    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes an announcement.
 */
export async function deleteAnnouncement(id) {
  const ref = doc(
    db,
    ANNOUNCEMENTS_COLLECTION,
    id
  );

  await deleteDoc(ref);
}