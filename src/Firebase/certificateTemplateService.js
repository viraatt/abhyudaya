/**
 * Firestore service for saving, loading, and managing Certificate Templates.
 */
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const TEMPLATES_COLLECTION = "certificateTemplates";
const templatesRef = collection(db, TEMPLATES_COLLECTION);

/**
 * Save a certificate template configuration.
 *
 * @param {object} templateData
 * @returns {Promise<string>} Template ID
 */
export async function saveCertificateTemplate(templateData) {
  const templateId = templateData.id || `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const docRef = doc(db, TEMPLATES_COLLECTION, templateId);

  const payload = {
    title: (templateData.title || "Untitled Template").trim(),
    eventName: (templateData.eventName || "").trim(),
    eventDate: (templateData.eventDate || "").trim(),
    certificateType: templateData.certificateType || "Participation",
    templateUrl: templateData.templateUrl || "",
    storagePath: templateData.storagePath || "",
    originalWidth: Number(templateData.originalWidth) || 1920,
    originalHeight: Number(templateData.originalHeight) || 1080,
    fields: Array.isArray(templateData.fields) ? templateData.fields : [],
    status: templateData.status || "draft",
    updatedAt: serverTimestamp(),
  };

  if (!templateData.id) {
    payload.createdAt = serverTimestamp();
    payload.id = templateId;
  }

  await setDoc(docRef, payload, { merge: true });
  return templateId;
}

/**
 * Fetch a single certificate template by ID.
 *
 * @param {string} templateId
 * @returns {Promise<object|null>}
 */
export async function getCertificateTemplateById(templateId) {
  if (!templateId) return null;
  const docRef = doc(db, TEMPLATES_COLLECTION, templateId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
  };
}

/**
 * Fetch all saved certificate templates.
 *
 * @returns {Promise<Array<object>>}
 */
export async function getCertificateTemplates() {
  try {
    const q = query(templatesRef, orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      };
    });
  } catch (err) {
    console.warn("Falling back to un-ordered query for templates:", err);
    const snap = await getDocs(templatesRef);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      };
    });
  }
}

/**
 * Delete a template by ID.
 *
 * @param {string} templateId
 */
export async function deleteCertificateTemplate(templateId) {
  if (!templateId) return;
  const docRef = doc(db, TEMPLATES_COLLECTION, templateId);
  await deleteDoc(docRef);
}
