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
} from "firebase/firestore";
import { db } from "./firebase";

const STUDENTS_COLLECTION = "students";
const studentsRef = collection(db, STUDENTS_COLLECTION);

/**
 * Fetches all student documents from the `students` collection.
 *
 * Expected document shape:
 *   { name, email, branch, semester, active }
 *
 * @returns {Promise<Array<{id: string, name: string, email: string, branch: string, semester: string, active: boolean}>>}
 */
export async function getStudents() {
  const snapshot = await getDocs(studentsRef);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || "",
      email: data.email || "",
      branch: data.branch || "",
      semester: data.semester || "",
      active: Boolean(data.active),
    };
  });
}

/**
 * Fetches only students with `active === true`.
 * Used by Registration Outreach for recipients.
 *
 * @returns {Promise<Array<{id: string, name: string, email: string, branch: string, semester: string}>>}
 */
export async function getActiveStudents() {
  const q = query(studentsRef, where("active", "==", true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || "",
      email: data.email || "",
      branch: data.branch || "",
      semester: data.semester || "",
      active: true,
    };
  });
}

/**
 * Creates or updates a student keyed by normalized email.
 * If a student with the same email already exists, it is updated.
 * Otherwise a new document is created.
 *
 * @param {{name: string, email: string, branch: string, semester: string}} student
 * @returns {Promise<{id: string, created: boolean}>}
 */
export async function upsertStudent(student) {
  const email = (student.email || "").trim().toLowerCase();
  if (!email) throw new Error("Email is required.");

  // Look for existing student with this email
  const q = query(studentsRef, where("email", "==", email));
  const snapshot = await getDocs(q);

  const payload = {
    name: (student.name || "").trim(),
    email,
    branch: (student.branch || "").trim(),
    semester: (student.semester || "").trim(),
    active: true,
    updatedAt: serverTimestamp(),
  };

  if (!snapshot.empty) {
    const existing = snapshot.docs[0];
    await updateDoc(existing.ref, payload);
    return { id: existing.id, created: false };
  }

  const docRef = doc(studentsRef);
  await setDoc(docRef, {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, created: true };
}

/**
 * Toggles a student's active status.
 *
 * @param {string} id
 * @param {boolean} active
 * @returns {Promise<void>}
 */
export async function setStudentActive(id, active) {
  const ref = doc(db, STUDENTS_COLLECTION, id);
  await updateDoc(ref, { active: Boolean(active), updatedAt: serverTimestamp() });
}

/**
 * Deletes a student document.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteStudent(id) {
  const ref = doc(db, STUDENTS_COLLECTION, id);
  await deleteDoc(ref);
}

/**
 * Fetches a single student by id.
 *
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getStudentById(id) {
  const ref = doc(db, STUDENTS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}