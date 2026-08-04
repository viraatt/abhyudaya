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
import { db } from "../../../Firebase/firebase";

const contactRef = collection(db, "contact_messages");

export async function submitContactMessage(messageData) {
  const ref = await addDoc(contactRef, {
    name: messageData.name,
    email: messageData.email,
    phone: messageData.phone || "",
    subject: messageData.subject || "General Inquiry",
    message: messageData.message,
    status: "unread", // unread | read | replied
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getContactMessages() {
  try {
    const q = query(contactRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    const snapshot = await getDocs(contactRef);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

export async function updateMessageStatus(id, status) {
  const msgRef = doc(db, "contact_messages", id);
  await updateDoc(msgRef, { status });
}

export async function deleteContactMessage(id) {
  await deleteDoc(doc(db, "contact_messages", id));
}
