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
    // v2 schema: elements[]
    elements: Array.isArray(templateData.elements) ? templateData.elements : [],
    version: templateData.version || 1,
    // Backward compat: also persist legacy fields[]
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

/**
 * Duplicate an existing certificate template.
 *
 * @param {string} templateId
 * @returns {Promise<string>} New duplicated template ID
 */
export async function duplicateCertificateTemplate(templateId) {
  const source = await getCertificateTemplateById(templateId);
  if (!source) {
    throw new Error(`Template "${templateId}" not found.`);
  }

  const newTitle = `${source.title || "Template"} (Copy)`;
  const newTemplateData = {
    ...source,
    id: `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    title: newTitle,
  };
  delete newTemplateData.createdAt;
  delete newTemplateData.updatedAt;

  return await saveCertificateTemplate(newTemplateData);
}

/**
 * Rename an existing certificate template.
 *
 * @param {string} templateId
 * @param {string} newTitle
 */
export async function renameCertificateTemplate(templateId, newTitle) {
  if (!templateId) return;
  const cleanTitle = (newTitle || "").trim();
  if (!cleanTitle) {
    throw new Error("Template title cannot be empty.");
  }
  const docRef = doc(db, TEMPLATES_COLLECTION, templateId);
  await setDoc(docRef, { title: cleanTitle, updatedAt: serverTimestamp() }, { merge: true });
}

// ─────────────────────────────────────────────────────────────
// Certificate Generation Jobs (certificateJobs collection)
// ─────────────────────────────────────────────────────────────
const JOBS_COLLECTION = "certificateJobs";
const jobsRef = collection(db, JOBS_COLLECTION);

/**
 * Fetch all certificate generation jobs for Generation History view.
 *
 * @returns {Promise<Array<object>>}
 */
export async function getCertificateJobs() {
  try {
    const q = query(jobsRef, orderBy("createdAt", "desc"));
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
    console.warn("Falling back to un-ordered query for jobs:", err);
    const snap = await getDocs(jobsRef);
    const list = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      };
    });
    // In-memory sort fallback
    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
}

/**
 * Delete a generation job record.
 *
 * @param {string} jobId
 */
export async function deleteCertificateJob(jobId) {
  if (!jobId) return;
  const docRef = doc(db, JOBS_COLLECTION, jobId);
  await deleteDoc(docRef);
}

/**
 * Initialize a new bulk generation job in Firestore.
 *
 * @param {object} jobData
 * @returns {Promise<string>} jobId
 */
export async function createCertificateJob(jobData) {
  const jobId = jobData.jobId || `job_${Date.now()}`;
  const docRef = doc(db, JOBS_COLLECTION, jobId);

  const payload = {
    jobId,
    templateId: jobData.templateId || "",
    templateTitle: jobData.templateTitle || "Certificate Batch",
    eventName: jobData.eventName || "",
    eventDate: jobData.eventDate || "",
    total: Number(jobData.total) || 0,
    completed: 0,
    failed: 0,
    status: jobData.status || "processing", // 'queued' | 'processing' | 'completed' | 'failed'
    zipUrl: "",
    errors: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(docRef, payload);
  } catch (err) {
    console.warn("Could not save job document to Firestore (offline fallback):", err);
  }

  return jobId;
}

/**
 * Update progress or completion details of a certificate generation job.
 *
 * @param {string} jobId
 * @param {object} updates
 */
export async function updateCertificateJob(jobId, updates = {}) {
  if (!jobId) return;
  const docRef = doc(db, JOBS_COLLECTION, jobId);

  const payload = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.warn(`Could not update job ${jobId} in Firestore:`, err);
  }
}

/**
 * Fetch a certificate generation job document by ID.
 *
 * @param {string} jobId
 * @returns {Promise<object|null>}
 */
export async function getCertificateJob(jobId) {
  if (!jobId) return null;
  const docRef = doc(db, JOBS_COLLECTION, jobId);
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

