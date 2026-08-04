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
import { uploadImage } from "./imageUpload";

const galleryRef = collection(db, "gallery");

export async function getGalleryItems() {
  try {
    const q = query(galleryRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    const snapshot = await getDocs(galleryRef);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

export async function addGalleryItem(data, imageFile) {
  let imageUrl = data.imageUrl || "";
  if (imageFile) {
    imageUrl = await uploadImage(imageFile);
  }

  if (!imageUrl) {
    throw new Error("Please select an image file or provide an image URL.");
  }

  const ref = await addDoc(galleryRef, {
    title: data.title,
    category: data.category || "Events",
    imageUrl,
    date: data.date || new Date().toISOString().split("T")[0],
    description: data.description || "",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateGalleryItem(id, data, imageFile) {
  const itemRef = doc(db, "gallery", id);
  let imageUrl = data.imageUrl || "";
  if (imageFile) {
    imageUrl = await uploadImage(imageFile);
  }

  await updateDoc(itemRef, {
    title: data.title,
    category: data.category || "Events",
    imageUrl,
    date: data.date || new Date().toISOString().split("T")[0],
    description: data.description || "",
    updatedAt: serverTimestamp(),
  });
}

export async function deleteGalleryItem(id) {
  await deleteDoc(doc(db, "gallery", id));
}
