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

function formatTemplateDoc(docSnap) {
  const data = docSnap.data();
  const width = data.width || data.dimensions?.width || 1920;
  const height = data.height || data.dimensions?.height || 1080;
  const fileUrl = data.fileUrl || data.templateUrl || "";

  return {
    id: docSnap.id,
    templateId: data.templateId || docSnap.id,
    name: data.name || "Untitled Template",
    description: data.description || "",
    eventId: data.eventId || "",
    eventName: data.eventName || "",
    eventDate: data.eventDate || "",
    certificateType: data.certificateType || "Participation",
    fileUrl,
    templateUrl: fileUrl,
    storagePath: data.storagePath || "",
    width,
    height,
    dimensions: { width, height },
    fields: Array.isArray(data.fields) ? data.fields : [],
    status: data.status || "published", // 'published' | 'draft'
    createdBy: data.createdBy || "",
    createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || null,
  };
}

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
    return snapshot.docs.map(formatTemplateDoc);
  } catch (err) {
    console.warn("getCertificateTemplates orderBy fallback:", err);
    const snapshot = await getDocs(templatesRef);
    return snapshot.docs.map(formatTemplateDoc);
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
  const cleanId = String(id).trim();
  const docRef = doc(db, TEMPLATES_COLLECTION, cleanId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return formatTemplateDoc(docSnap);
}

/**
 * Save or update a certificate template.
 *
 * @param {object} templateData
 * @returns {Promise<string>} Template Document ID
 */
export async function saveCertificateTemplate(templateData) {
  const templateId =
    templateData.templateId ||
    templateData.id ||
    `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const docRef = doc(db, TEMPLATES_COLLECTION, templateId);

  const width =
    Number(templateData.width) ||
    Number(templateData.dimensions?.width) ||
    1920;
  const height =
    Number(templateData.height) ||
    Number(templateData.dimensions?.height) ||
    1080;
  const fileUrl = templateData.fileUrl || templateData.templateUrl || "";

  // Normalize fields
  const fields = (templateData.fields || []).map((f, idx) => ({
    id: f.id || `field_${idx + 1}`,
    variable: f.variable || `{{${f.key || f.label || "var"}}}`,
    label: f.label || f.name || "Text Field",
    x: Math.round(Number(f.x) || 0),
    y: Math.round(Number(f.y) || 0),
    width: Math.round(Number(f.width) || 400),
    height: Math.round(Number(f.height) || 80),
    fontFamily: f.fontFamily || "Inter, sans-serif",
    fontSize: Math.round(Number(f.fontSize) || 28),
    fontWeight: f.fontWeight || "normal",
    color: f.color || "#0f172a",
    alignment: f.alignment || f.textAlign || "center",
    letterSpacing: Number(f.letterSpacing) || 0,
    lineHeight: Number(f.lineHeight) || 1.2,
    isRequired: f.isRequired ?? true,
    // legacy support
    name: f.label || f.name || "Text Field",
    key: f.key || (f.variable || "").replace(/[{}]/g, ""),
    textAlign: f.alignment || f.textAlign || "center",
  }));

  const payload = {
    id: templateId,
    templateId,
    name: (templateData.name || templateData.templateName || "Untitled Template").trim(),
    description: (templateData.description || "").trim(),
    eventId: templateData.eventId || "",
    eventName: (templateData.eventName || "").trim(),
    eventDate: (templateData.eventDate || "").trim(),
    certificateType: templateData.certificateType || "Participation",
    fileUrl,
    templateUrl: fileUrl,
    storagePath: templateData.storagePath || "",
    width,
    height,
    dimensions: { width, height },
    fields,
    status: templateData.status || "published", // 'published' | 'draft'
    createdBy: templateData.createdBy || "",
    updatedAt: serverTimestamp(),
  };

  if (!templateData.id && !templateData.templateId) {
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
