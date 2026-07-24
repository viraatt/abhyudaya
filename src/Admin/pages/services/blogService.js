import { db } from "../../../Firebase/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

export const publishBlog = async (blog) => {
  const docRef = await addDoc(
    collection(db, "blogs"),
    {
      ...blog,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  return docRef.id;
};