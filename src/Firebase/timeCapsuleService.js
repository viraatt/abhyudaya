import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const CAPSULES_COLLECTION = "time_capsules";
const capsulesRef = collection(db, CAPSULES_COLLECTION);

/**
 * Submits a new student Time Capsule via the secure serverless API.
 * The browser NEVER writes capsule records directly to Firestore.
 *
 * @param {object} formData
 * @returns {Promise<{success: boolean, capsuleCode: string, unlockDate: string, rawToken?: string}>}
 */
export async function submitTimeCapsule(formData) {
  const response = await fetch("/api/time-capsule/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    const error = new Error(data.error || "Failed to create Time Capsule.");
    error.details = data.details;
    throw error;
  }

  return data;
}

/**
 * Verifies a capsule's secret token via the serverless API.
 * The browser NEVER accesses Firestore documents by token directly.
 *
 * @param {string} token - 64-character hexadecimal secret token
 * @returns {Promise<object>}
 */
export async function verifyTimeCapsuleToken(token) {
  const response = await fetch("/api/time-capsule/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok && !data.locked) {
    throw new Error(data.error || "Failed to verify Time Capsule.");
  }

  return data;
}

// ─────────────────────────────────────────────────────────────
// Admin Serverless API Functions
// Protected by Server-Side Token Verification & RBAC
// ─────────────────────────────────────────────────────────────

import { auth } from "./firebase";

/**
 * Retrieves the current Firebase Auth ID Token for Authorization header.
 *
 * @returns {Promise<Record<string, string>>}
 */
async function getAdminAuthHeaders() {
  const currentUser = auth.currentUser;
  if (!currentUser) return {};
  const token = await currentUser.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

/**
 * Fetches paginated Time Capsules and stats from the secure admin API.
 *
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {string} [params.status]
 * @param {number} [params.graduationYear]
 * @param {string} [params.notificationStatus]
 * @param {string} [params.search]
 * @returns {Promise<{success: boolean, capsules: Array, pagination: object, stats: object}>}
 */
export async function adminFetchTimeCapsules({
  page = 1,
  limit = 20,
  status = "",
  graduationYear = "",
  notificationStatus = "",
  search = "",
} = {}) {
  const headers = await getAdminAuthHeaders();
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  if (status) params.set("status", status);
  if (graduationYear) params.set("graduationYear", String(graduationYear));
  if (notificationStatus) params.set("notificationStatus", notificationStatus);
  if (search) params.set("search", search);

  const res = await fetch(`/api/admin/time-capsules?${params.toString()}`, {
    method: "GET",
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to fetch Time Capsules.");
  }
  return data;
}

/**
 * Fetches a single Time Capsule detail (including answers) via admin API.
 *
 * @param {string} id - Firestore capsule ID
 * @returns {Promise<object>}
 */
export async function adminFetchTimeCapsuleById(id) {
  const headers = await getAdminAuthHeaders();
  const res = await fetch(`/api/admin/time-capsules?id=${encodeURIComponent(id)}`, {
    method: "GET",
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to fetch Time Capsule details.");
  }
  return data.capsule;
}

/**
 * Updates a capsule's unlock date through the secure serverless API.
 *
 * @param {string} id - Capsule ID
 * @param {string|Date} unlockDate - New unlock date
 * @returns {Promise<object>}
 */
export async function adminUpdateUnlockDate(id, unlockDate) {
  const headers = {
    "Content-Type": "application/json",
    ...(await getAdminAuthHeaders()),
  };

  const isoDate = unlockDate instanceof Date ? unlockDate.toISOString() : new Date(unlockDate).toISOString();

  const res = await fetch(`/api/admin/time-capsules?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ unlockDate: isoDate }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to update unlock date.");
  }
  return data;
}

/**
 * Manually unlocks a capsule via the serverless API (sets status: READY).
 *
 * @param {string} id - Capsule ID
 * @returns {Promise<object>}
 */
export async function adminManualUnlock(id) {
  const headers = await getAdminAuthHeaders();
  const res = await fetch(
    `/api/admin/time-capsules?id=${encodeURIComponent(id)}&action=unlock`,
    {
      method: "POST",
      headers,
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to unlock capsule.");
  }
  return data;
}

/**
 * Resets notification status to 'pending' via serverless API.
 *
 * @param {string} id - Capsule ID
 * @returns {Promise<object>}
 */
export async function adminResendNotification(id) {
  const headers = await getAdminAuthHeaders();
  const res = await fetch(
    `/api/admin/time-capsules?id=${encodeURIComponent(id)}&action=resend`,
    {
      method: "POST",
      headers,
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to reset notification.");
  }
  return data;
}

/**
 * Deletes a capsule via the serverless API.
 *
 * @param {string} id - Capsule ID
 * @returns {Promise<object>}
 */
export async function adminDeleteTimeCapsule(id) {
  const headers = await getAdminAuthHeaders();
  const res = await fetch(`/api/admin/time-capsules?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to delete capsule.");
  }
  return data;
}

// ─────────────────────────────────────────────────────────────
// Legacy Direct Firestore Queries (Protected by Firestore Rules)
// Kept for backward compatibility
// ─────────────────────────────────────────────────────────────

export async function getAllTimeCapsules({
  status = "",
  graduationYear = null,
  sortOrder = "desc",
} = {}) {
  try {
    const constraints = [];
    if (status) constraints.push(where("status", "==", status));
    if (graduationYear) constraints.push(where("graduationYear", "==", Number(graduationYear)));
    constraints.push(orderBy("createdAt", sortOrder === "asc" ? "asc" : "desc"));

    const snapshot = await getDocs(query(capsulesRef, ...constraints));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("[timeCapsuleService] Fallback query without compound sorting:", err);
    const constraints = [];
    if (status) constraints.push(where("status", "==", status));
    if (graduationYear) constraints.push(where("graduationYear", "==", Number(graduationYear)));

    const snapshot = await getDocs(query(capsulesRef, ...constraints));
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => {
      const ta = a.createdAt?.seconds ?? 0;
      const tb = b.createdAt?.seconds ?? 0;
      return sortOrder === "asc" ? ta - tb : tb - ta;
    });
    return items;
  }
}

export async function getTimeCapsuleById(id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, CAPSULES_COLLECTION, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateTimeCapsuleUnlockDate(id, newDate) {
  const unlockTimestamp = newDate instanceof Timestamp
    ? newDate
    : Timestamp.fromDate(new Date(newDate));

  await updateDoc(doc(capsulesRef, id), {
    unlockDate: unlockTimestamp,
    updatedAt: serverTimestamp(),
  });
}

export async function manuallyUnlockCapsule(id) {
  await updateDoc(doc(capsulesRef, id), {
    status: "READY",
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTimeCapsule(id) {
  await deleteDoc(doc(capsulesRef, id));
}

