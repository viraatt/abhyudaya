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

const teamRef = collection(db, "team");

export async function getTeamMembers() {
  try {
    const q = query(teamRef, orderBy("order", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    const snapshot = await getDocs(teamRef);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

export async function addTeamMember(data, imageFile) {
  let image = data.image || "";
  if (imageFile) {
    image = await uploadImage(imageFile);
  }

  const ref = await addDoc(teamRef, {
    name: data.name,
    role: data.role || "",
    category: data.category || "Executive Board",
    image,
    linkedin: data.linkedin || "",
    github: data.github || "",
    email: data.email || "",
    bio: data.bio || "",
    order: data.order ? Number(data.order) : 99,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTeamMember(id, data, imageFile) {
  const memberRef = doc(db, "team", id);
  let image = data.image || "";
  if (imageFile) {
    image = await uploadImage(imageFile);
  }

  await updateDoc(memberRef, {
    name: data.name,
    role: data.role || "",
    category: data.category || "Executive Board",
    image,
    linkedin: data.linkedin || "",
    github: data.github || "",
    email: data.email || "",
    bio: data.bio || "",
    order: data.order ? Number(data.order) : 99,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTeamMember(id) {
  await deleteDoc(doc(db, "team", id));
}
