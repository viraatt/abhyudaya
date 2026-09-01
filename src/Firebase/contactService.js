import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

const contactRef = collection(db, "contact_messages");

function formatContactDoc(snapshotDoc) {
  return {
    id: snapshotDoc.id,
    ...snapshotDoc.data(),
  };
}

/**
 * Validate and submit a new contact form message.
 * Strict field whitelist matches firestore.rules:
 * ['name', 'email', 'phone', 'subject', 'message', 'status', 'createdAt']
 */
export async function submitContactMessage(data) {
  const name = String(data.name || "").trim();
  const email = String(data.email || "").trim().toLowerCase();
  const phone = String(data.phone || "").trim();
  const subject = String(data.subject || "General Inquiry").trim();
  const message = String(data.message || "").trim();

  if (!name || name.length < 2) {
    throw new Error("Please enter your name (at least 2 characters).");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    throw new Error("Please enter a valid email address.");
  }

  if (!message || message.length < 5) {
    throw new Error("Please enter a message (at least 5 characters).");
  }

  const payload = {
    name,
    email,
    phone,
    subject: subject || "General Inquiry",
    message,
    status: "unread", // 'unread' | 'read' | 'replied'
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(contactRef, payload);
  return docRef.id;
}

/**
 * Fetch all contact messages ordered newest first.
 * Gracefully falls back to client-side sorting if Firestore index is missing.
 */
export async function getContactMessages() {
  try {
    const q = query(contactRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(formatContactDoc);
  } catch (err) {
    console.warn("getContactMessages fallback to in-memory sort:", err);
    const snapshot = await getDocs(contactRef);
    return snapshot.docs
      .map(formatContactDoc)
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
        const bTime = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
        return bTime - aTime;
      });
  }
}

/**
 * Update the status of a contact inquiry (e.g. 'unread', 'read', 'replied').
 */
export async function updateMessageStatus(id, status) {
  if (!id) throw new Error("Message ID is required.");
  const msgRef = doc(db, "contact_messages", id);
  await updateDoc(msgRef, {
    status,
  });
}

/**
 * Delete a contact message doc by ID.
 */
export async function deleteContactMessage(id) {
  if (!id) throw new Error("Message ID is required.");
  const msgRef = doc(db, "contact_messages", id);
  await deleteDoc(msgRef);
}
