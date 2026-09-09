import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const TEMPLATES_COLLECTION = "certificateTemplates";
const JOBS_COLLECTION = "certificateJobs";

const templatesRef = collection(db, TEMPLATES_COLLECTION);
const jobsRef = collection(db, JOBS_COLLECTION);

/* ============================================================================
   CERTIFICATE TEMPLATES OPERATIONS
   ============================================================================ */

/**
 * Fetch all saved certificate templates.
 *
 * @returns {Promise<Array<object>>}
 */
export async function getCertificateTemplates() {
  try {
    const q = query(templatesRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || d.data().createdAt || null,
      updatedAt: d.data().updatedAt?.toDate?.() || d.data().updatedAt || null,
    }));
  } catch (err) {
    console.warn("getCertificateTemplates orderBy fallback:", err);
    const snapshot = await getDocs(templatesRef);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || d.data().createdAt || null,
      updatedAt: d.data().updatedAt?.toDate?.() || d.data().updatedAt || null,
    }));
  }
}

/**
 * Get a single certificate template by ID.
 *
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getCertificateTemplateById(id) {
  if (!id) return null;
  const docRef = doc(db, TEMPLATES_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || null,
  };
}

/**
 * Save or update a certificate template.
 *
 * @param {object} templateData
 * @returns {Promise<string>} Template Document ID
 */
export async function saveCertificateTemplate(templateData) {
  const templateId = templateData.id || `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const docRef = doc(db, TEMPLATES_COLLECTION, templateId);

  const payload = {
    id: templateId,
    name: (templateData.name || "Untitled Template").trim(),
    description: (templateData.description || "").trim(),
    eventId: templateData.eventId || "",
    eventName: (templateData.eventName || "").trim(),
    eventDate: (templateData.eventDate || "").trim(),
    certificateType: templateData.certificateType || "Participation",
    templateUrl: templateData.templateUrl || "",
    storagePath: templateData.storagePath || "",
    dimensions: templateData.dimensions || { width: 1920, height: 1080 },
    fields: Array.isArray(templateData.fields) ? templateData.fields : [],
    updatedAt: serverTimestamp(),
  };

  if (!templateData.id) {
    payload.createdAt = serverTimestamp();
  }

  await setDoc(docRef, payload, { merge: true });
  return templateId;
}

/**
 * Delete a certificate template by ID.
 *
 * @param {string} id
 */
export async function deleteCertificateTemplate(id) {
  if (!id) return;
  const docRef = doc(db, TEMPLATES_COLLECTION, id);
  await deleteDoc(docRef);
}

/* ============================================================================
   CERTIFICATE JOBS OPERATIONS
   ============================================================================ */

/**
 * Create a new generation job record.
 *
 * @param {object} jobData
 * @returns {Promise<string>} Job Document ID
 */
export async function createCertificateJob(jobData) {
  const jobId = jobData.id || `job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const docRef = doc(db, JOBS_COLLECTION, jobId);

  const payload = {
    id: jobId,
    templateId: jobData.templateId || "",
    templateName: jobData.templateName || "",
    eventName: jobData.eventName || "",
    eventDate: jobData.eventDate || "",
    certificateType: jobData.certificateType || "Participation",
    totalCount: Number(jobData.totalCount) || 0,
    processedCount: 0,
    successCount: 0,
    failedCount: 0,
    status: "pending", // pending | processing | completed | failed
    zipUrl: "",
    zipStoragePath: "",
    errors: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, payload);
  return jobId;
}

/**
 * Update an existing generation job's status and counters.
 *
 * @param {string} jobId
 * @param {object} updates
 */
export async function updateCertificateJob(jobId, updates) {
  if (!jobId) return;
  const docRef = doc(db, JOBS_COLLECTION, jobId);
  const payload = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(docRef, payload);
}

/**
 * Get recent generation jobs.
 *
 * @returns {Promise<Array<object>>}
 */
export async function getCertificateJobs() {
  try {
    const q = query(jobsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || d.data().createdAt || null,
      updatedAt: d.data().updatedAt?.toDate?.() || d.data().updatedAt || null,
    }));
  } catch (err) {
    console.warn("getCertificateJobs fallback query:", err);
    const snapshot = await getDocs(jobsRef);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || d.data().createdAt || null,
      updatedAt: d.data().updatedAt?.toDate?.() || d.data().updatedAt || null,
    }));
  }
}
