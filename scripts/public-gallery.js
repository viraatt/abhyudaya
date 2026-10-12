import { initializeApp, getApps } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  where,
} from "firebase/firestore/lite";
import { firebaseConfig } from "../src/Firebase/firebaseConfig.js";

const APP_NAME = "abhyudaya-public-gallery-build";

export async function fetchPublicGalleryData() {
  const app = getApps().find((candidate) => candidate.name === APP_NAME)
    || initializeApp(firebaseConfig, APP_NAME);
  const db = getFirestore(app);
  const galleryQuery = query(
    collection(db, "gallery"),
    where("status", "==", "Published")
  );

  const snapshot = await getDocs(galleryQuery);
  let deletedIds = [];
  try {
    const deletedAlbums = await getDoc(doc(db, "gallery_meta", "deleted_static_albums"));
    if (deletedAlbums.exists() && Array.isArray(deletedAlbums.data().ids)) {
      deletedIds = deletedAlbums.data().ids;
    }
  } catch (error) {
    console.warn("[gallery-build] Could not read public deleted-album metadata:", error.message);
  }

  return {
    albums: snapshot.docs
      .map((albumDoc) => ({ id: albumDoc.id, ...albumDoc.data() }))
      .filter((album) => album.status === "Published" && album.slug),
    deletedIds,
  };
}
