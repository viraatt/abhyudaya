import { db } from "../../../Firebase/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { uploadToCloudinary } from "../../../utils/cloudinary";

const mediaCollectionRef = collection(db, "media");

/**
 * Uploads a file to Cloudinary and saves metadata to Firestore 'media' collection.
 *
 * @param {File} file
 * @param {Function} [onProgress]
 * @returns {Promise<Object>} The saved media object
 */
export const uploadMediaFile = async (file, onProgress) => {
  if (!file) throw new Error("No file provided.");

  // 1. Upload to Cloudinary
  const cloudResult = await uploadToCloudinary(file, onProgress);

  // 2. Save metadata to Firestore
  const mediaData = {
    url: cloudResult.secure_url,
    public_id: cloudResult.public_id || "",
    name: file.name || "Untitled Image",
    width: cloudResult.width || null,
    height: cloudResult.height || null,
    size: file.size || 0,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(mediaCollectionRef, mediaData);

  return {
    id: docRef.id,
    ...mediaData,
    createdAt: new Date(),
  };
};

/**
 * Fetches all media items from Firestore ordered by creation date descending.
 *
 * @returns {Promise<Array<Object>>}
 */
export const getMediaItems = async () => {
  try {
    const q = query(mediaCollectionRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  } catch (err) {
    console.error("Error fetching media items:", err);
    return [];
  }
};

/**
 * Deletes a media document from Firestore.
 *
 * @param {string} id
 */
export const deleteMediaItem = async (id) => {
  if (!id) return;
  const docRef = doc(db, "media", id);
  await deleteDoc(docRef);
};
