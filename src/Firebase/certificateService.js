import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

const CERTIFICATES_COLLECTION = "certificates";
const certificatesRef = collection(db, CERTIFICATES_COLLECTION);

/**
 * Normalizes string by trimming whitespace and converting to lowercase.
 */
function normalizeString(str) {
  return (str || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Search Firestore for a certificate matching rollNo and student name.
 * Performs case-insensitive and whitespace-insensitive matching.
 *
 * @param {string} rollNo
 * @param {string} name
 * @returns {Promise<object|null>}
 */
export async function searchCertificate(rollNo, name) {
  const cleanRoll = normalizeString(rollNo);
  const cleanName = normalizeString(name);

  if (!cleanRoll || !cleanName) {
    return null;
  }

  // Primary lookup by rollNoClean
  const q = query(certificatesRef, where("rollNoClean", "==", cleanRoll));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  // Find exact match by nameLower (handling double spaces, case)
  const matchDoc = snapshot.docs.find((d) => {
    const data = d.data();
    const docNameLower = normalizeString(data.nameLower || data.name);
    return docNameLower === cleanName;
  });

  if (!matchDoc) {
    return null;
  }

  const data = matchDoc.data();
  return {
    id: matchDoc.id,
    certificateId: data.certificateId || matchDoc.id,
    rollNo: data.rollNo || "",
    name: data.name || "",
    eventName: data.eventName || "",
    eventDate: data.eventDate || "",
    certificateType: data.certificateType || "Participation",
    certificateUrl: data.certificateUrl || "",
    createdAt: data.createdAt ? data.createdAt.toDate?.() || data.createdAt : null,
  };
}

/**
 * Get a single certificate by certificateId (case-insensitive).
 *
 * @param {string} certificateId
 * @returns {Promise<object|null>}
 */
export async function getCertificateById(certificateId) {
  const cleanId = (certificateId || "").trim();
  if (!cleanId) return null;

  // Try direct doc ID read first
  const docRef = doc(db, CERTIFICATES_COLLECTION, cleanId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      certificateId: data.certificateId || docSnap.id,
      rollNo: data.rollNo || "",
      name: data.name || "",
      eventName: data.eventName || "",
      eventDate: data.eventDate || "",
      certificateType: data.certificateType || "Participation",
      certificateUrl: data.certificateUrl || "",
      createdAt: data.createdAt ? data.createdAt.toDate?.() || data.createdAt : null,
    };
  }

  // Fallback query by certificateId field
  const q = query(certificatesRef, where("certificateId", "==", cleanId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const d = snapshot.docs[0];
  const data = d.data();
  return {
    id: d.id,
    certificateId: data.certificateId || d.id,
    rollNo: data.rollNo || "",
    name: data.name || "",
    eventName: data.eventName || "",
    eventDate: data.eventDate || "",
    certificateType: data.certificateType || "Participation",
    certificateUrl: data.certificateUrl || "",
    createdAt: data.createdAt ? data.createdAt.toDate?.() || data.createdAt : null,
  };
}

/**
 * Fetch all certificates for Admin management.
 *
 * @returns {Promise<Array<object>>}
 */
export async function getCertificates() {
  try {
    const q = query(certificatesRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        certificateId: data.certificateId || d.id,
        rollNo: data.rollNo || "",
        name: data.name || "",
        eventName: data.eventName || "",
        eventDate: data.eventDate || "",
        certificateType: data.certificateType || "Participation",
        certificateUrl: data.certificateUrl || "",
        createdAt: data.createdAt ? data.createdAt.toDate?.() || data.createdAt : null,
      };
    });
  } catch (err) {
    // If composite index is missing for orderBy, fallback without orderBy
    console.warn("Falling back to unordered query:", err);
    const snapshot = await getDocs(certificatesRef);
    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        certificateId: data.certificateId || d.id,
        rollNo: data.rollNo || "",
        name: data.name || "",
        eventName: data.eventName || "",
        eventDate: data.eventDate || "",
        certificateType: data.certificateType || "Participation",
        certificateUrl: data.certificateUrl || "",
        createdAt: data.createdAt ? data.createdAt.toDate?.() || data.createdAt : null,
      };
    });
  }
}

/**
 * Create a new certificate document in Firestore.
 * Prevents duplicate Certificate IDs.
 *
 * @param {object} certData
 * @returns {Promise<string>} Created doc ID
 */
export async function createCertificate(certData) {
  const certId = (certData.certificateId || "").trim();
  if (!certId) {
    throw new Error("Certificate ID is required.");
  }
  if (!certData.rollNo || !certData.name || !certData.eventName || !certData.certificateUrl) {
    throw new Error("Missing required certificate fields.");
  }

  // Check if certificate with this ID already exists
  const existing = await getCertificateById(certId);
  if (existing) {
    throw new Error(`Certificate ID "${certId}" already exists.`);
  }

  const docRef = doc(db, CERTIFICATES_COLLECTION, certId);
  const payload = {
    certificateId: certId,
    rollNo: certData.rollNo.trim(),
    rollNoClean: normalizeString(certData.rollNo),
    name: certData.name.trim(),
    nameLower: normalizeString(certData.name),
    eventName: certData.eventName.trim(),
    eventDate: certData.eventDate ? certData.eventDate.trim() : "",
    certificateType: certData.certificateType ? certData.certificateType.trim() : "Participation",
    certificateUrl: certData.certificateUrl.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, payload);
  return certId;
}

/**
 * Update an existing certificate document.
 *
 * @param {string} id
 * @param {object} updates
 */
export async function updateCertificate(id, updates) {
  const docRef = doc(db, CERTIFICATES_COLLECTION, id);
  const payload = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  if (updates.rollNo) {
    payload.rollNo = updates.rollNo.trim();
    payload.rollNoClean = normalizeString(updates.rollNo);
  }
  if (updates.name) {
    payload.name = updates.name.trim();
    payload.nameLower = normalizeString(updates.name);
  }
  await updateDoc(docRef, payload);
}

/**
 * Delete a certificate document by ID.
 *
 * @param {string} id
 */
export async function deleteCertificate(id) {
  const docRef = doc(db, CERTIFICATES_COLLECTION, id);
  await deleteDoc(docRef);
}
