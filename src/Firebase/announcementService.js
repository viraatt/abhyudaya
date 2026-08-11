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
  orderBy,
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
 * Fetches all announcements, newest first.
 * Used by the Admin panel.
 *
 * @returns {Promise<Array>}
 */
export async function getAnnouncements() {
  try {
    const q = query(announcementsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(formatAnnouncement);
  } catch (err) {
    console.warn("getAnnouncements fallback query:", err);
    const snapshot = await getDocs(announcementsRef);
    return snapshot.docs.map(formatAnnouncement);
  }
}

/**
 * Fetches only published announcements, newest first.
 * Used by the public site.
 *
 * @returns {Promise<Array>}
 */
export async function getPublishedAnnouncements() {
  try {
    const q = query(
      announcementsRef,
      where("status", "==", "published"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(formatAnnouncement);
  } catch (err) {
    console.warn("getPublishedAnnouncements fallback query:", err);
    const snapshot = await getDocs(announcementsRef);
    return snapshot.docs
      .map(formatAnnouncement)
      .filter((a) => a.status === "published" && a.published === true);
  }
}

/**
 * Fetches a single announcement by id.
 *
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getAnnouncementById(id) {
  const ref = doc(db, ANNOUNCEMENTS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return formatAnnouncement(snap);
}

/**
 * Creates a new announcement.
 *
 * @param {object} announcement
 * @param {string} createdBy
 * @returns {Promise<string>} new doc id
 */
export async function createAnnouncement(announcement, createdBy = "") {
  const published = Boolean(announcement.published);
  const payload = {
    title: (announcement.title || "").trim(),
    message: (announcement.message || "").trim(),
    type: announcement.type || "general",
    ctaText: (announcement.ctaText || "").trim(),
    ctaLink: (announcement.ctaLink || "").trim(),
    linkedEventId: announcement.linkedEventId || null,
    status: published ? "published" : "draft",
    published,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(announcementsRef, payload);
  return ref.id;
}

/**
 * Updates an existing announcement.
 *
 * @param {string} id
 * @param {object} announcement
 * @returns {Promise<void>}
 */
export async function updateAnnouncement(id, announcement) {
  const ref = doc(db, ANNOUNCEMENTS_COLLECTION, id);
  const published = Boolean(announcement.published);
  const payload = {
    title: (announcement.title || "").trim(),
    message: (announcement.message || "").trim(),
    type: announcement.type || "general",
    ctaText: (announcement.ctaText || "").trim(),
    ctaLink: (announcement.ctaLink || "").trim(),
    linkedEventId: announcement.linkedEventId || null,
    status: published ? "published" : "draft",
    published,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(ref, payload);
}

/**
 * Publishes or unpublishes an announcement.
 *
 * @param {string} id
 * @param {boolean} published
 * @returns {Promise<void>}
 */
export async function setAnnouncementPublished(id, published) {
  const ref = doc(db, ANNOUNCEMENTS_COLLECTION, id);
  await updateDoc(ref, {
    published: Boolean(published),
    status: published ? "published" : "draft",
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes an announcement.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteAnnouncement(id) {
  const ref = doc(db, ANNOUNCEMENTS_COLLECTION, id);
  await deleteDoc(ref);
}