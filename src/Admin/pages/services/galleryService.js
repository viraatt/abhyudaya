import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../../../Firebase/firebase";
import { uploadImage } from "./imageUpload";
import { slugify, yearFromDate, normalizeCategory } from "../../../utils/galleryConstants";
import { STATIC_ALBUMS } from "../../../data/staticGalleryAlbums";

const galleryRef = collection(db, "gallery");
const galleryMetaRef = doc(db, "gallery_meta", "deleted_static_albums");

/**
 * Fetch all gallery album documents (admin view — includes Drafts).
 */
export async function getGalleryItems() {
  try {
    const q = query(galleryRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const dbItems = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Fetch the list of deleted static album IDs from the metadata doc.
    let deletedStaticIds = [];
    try {
      const metaSnap = await getDoc(galleryMetaRef);
      if (metaSnap.exists()) {
        deletedStaticIds = Array.isArray(metaSnap.data().ids) ? metaSnap.data().ids : [];
      }
    } catch (err) {
      console.warn("Failed to read deleted static albums metadata:", err);
    }

    // If Firestore has zero albums, fall back to STATIC_ALBUMS
    // so the Admin Panel shows the same albums as the public Gallery.
    // Exclude any static albums that have been permanently deleted.
    if (dbItems.length === 0) {
      return STATIC_ALBUMS
        .filter((album) => !deletedStaticIds.includes(album.id) && !deletedStaticIds.includes(album.slug))
        .map((album) => ({
          ...album,
          id: album.id || album.slug,
          status: "Published",
        }));
    }

    return dbItems;
  } catch (err) {
    console.error("Gallery fetch failed:", err);
    throw err;
  }
}

/**
 * Fetch ONLY published gallery albums (public view).
 * Used by the public Gallery service so Firestore rules
 * (which only allow public reads of status == 'Published') are satisfied.
 */
export async function getPublishedGalleryItems() {
  try {
    const q = query(
      galleryRef,
      where("status", "==", "Published"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Published gallery fetch failed:", err);
    throw err;
  }
}

/**
 * Uploads a single image file to Cloudinary and returns a photo object.
 */
async function uploadPhotoToAlbum(file, index) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Selected file must be an image.");
  }

  const secureUrl = await uploadImage(file);
  const width = 1200;
  const height = 800;

  return {
    id: `photo-${Date.now()}-${index}`,
    title: file.name.replace(/\.[^.]+$/, "") || "",
    description: "",
    src: secureUrl,
    rawSrc: secureUrl,
    thumbnailSrc: secureUrl,
    fullSrc: secureUrl,
    width,
    height,
    aspectRatio: `${width}/${height}`,
    isVideo: false,
  };
}

/**
 * Normalizes a raw photo entry (file to upload OR prebuilt URL object)
 * into the canonical album photo schema.
 */
async function normalizePhotoEntry(entry, index) {
  // File object → upload to Cloudinary
  if (entry.file && typeof entry.file === "object" && entry.file.type) {
    const uploaded = await uploadPhotoToAlbum(entry.file, index);
    return {
      ...uploaded,
      title: entry.title || uploaded.title,
      description: entry.description || "",
    };
  }

  // Prebuilt/pasted URL photo
  if (entry.src) {
    const width = entry.width || 1200;
    const height = entry.height || 800;
    return {
      id: entry.id || `photo-${Date.now()}-${index}`,
      title: entry.title || "",
      description: entry.description || "",
      src: entry.src,
      rawSrc: entry.src,
      thumbnailSrc: entry.src,
      fullSrc: entry.src,
      width,
      height,
      aspectRatio: entry.aspectRatio || `${width}/${height}`,
      isVideo: Boolean(entry.isVideo),
    };
  }

  return null;
}

/**
 * Build the canonical album document payload from admin form data.
 */
function buildAlbumData(data, photos) {
  const title = (data.title || "").trim();
  const slug = data.slug || slugify(title);

  // Determine cover image: explicit coverImage wins; otherwise first photo.
  let coverImage = data.coverImage || "";
  // If coverImage is a blob URL (new upload), resolve it via coverImageIndex
  if (coverImage && coverImage.startsWith("blob:")) {
    const idx = Number(data.coverImageIndex) || 0;
    coverImage = photos[idx]?.src || photos[0]?.src || "";
  }
  if (!coverImage && Array.isArray(photos) && photos.length > 0) {
    coverImage = photos[0].src || "";
  }

  return {
    slug,
    title,
    subtitle: data.subtitle || "",
    category: normalizeCategory(data.category) || "Activities",
    date: data.date || new Date().toISOString().split("T")[0],
    year: Number(data.year) || yearFromDate(data.date),
    description: data.description || "",
    coverImage,
    featured: Boolean(data.featured),
    status: data.status === "Draft" ? "Draft" : "Published",
    photos: Array.isArray(photos) ? photos : [],
  };
}

/**
 * Adds a new album document.
 * `data.photos` can be an array of { file, title, description } or prebuilt photo objects.
 */
export async function addGalleryItem(data) {
  const rawPhotos = data.photos || [];
  const photos = [];

  for (let i = 0; i < rawPhotos.length; i++) {
    const normalized = await normalizePhotoEntry(rawPhotos[i], i);
    if (normalized) photos.push(normalized);
  }

  const albumData = buildAlbumData(data, photos);

  const ref = await addDoc(galleryRef, {
    ...albumData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Updates an existing album document.
 * Note: `createdAt` is never overwritten.
 */
export async function updateGalleryItem(id, data) {
  const itemRef = doc(db, "gallery", id);

  const rawPhotos = data.photos || [];
  const photos = [];

  for (let i = 0; i < rawPhotos.length; i++) {
    const normalized = await normalizePhotoEntry(rawPhotos[i], i);
    if (normalized) photos.push(normalized);
  }

  const albumData = buildAlbumData(data, photos);

  // Check if the album exists in Firestore.
  // If it's a static album (not yet in Firestore), create it.
  const snap = await getDoc(itemRef);
  if (snap.exists()) {
    await updateDoc(itemRef, {
      ...albumData,
      updatedAt: serverTimestamp(),
    });
  } else {
    // Check if this static album has been permanently deleted.
    const staticAlbum = STATIC_ALBUMS.find((a) => a.id === id || a.slug === id);
    if (staticAlbum) {
      let deletedStaticIds = [];
      try {
        const metaSnap = await getDoc(galleryMetaRef);
        if (metaSnap.exists()) {
          deletedStaticIds = Array.isArray(metaSnap.data().ids) ? metaSnap.data().ids : [];
        }
      } catch (err) {
        console.warn("Failed to read deleted static albums metadata:", err);
      }
      const albumId = staticAlbum.id || staticAlbum.slug;
      if (deletedStaticIds.includes(albumId)) {
        throw new Error("This album has been deleted and cannot be modified.");
      }
    }
    await setDoc(itemRef, {
      ...albumData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Deletes an album document from Firestore.
 * Cloudinary files are intentionally left orphaned (documented future cleanup).
 */
export async function deleteGalleryItem(id) {
  const itemRef = doc(db, "gallery", id);
  const snap = await getDoc(itemRef);

  if (snap.exists()) {
    // Case 3: Normal Firestore album — delete the document.
    await deleteDoc(itemRef);
    return;
  }

  // Case 1 & 2: Static album (not in Firestore, or was deleted from Firestore).
  // Persist the deleted static album ID so it never reappears from STATIC_ALBUMS.
  const staticAlbum = STATIC_ALBUMS.find((a) => a.id === id || a.slug === id);
  if (staticAlbum) {
    const albumId = staticAlbum.id || staticAlbum.slug;
    try {
      const metaSnap = await getDoc(galleryMetaRef);
      if (metaSnap.exists()) {
        const existing = Array.isArray(metaSnap.data().ids) ? metaSnap.data().ids : [];
        if (!existing.includes(albumId)) {
          await updateDoc(galleryMetaRef, { ids: arrayUnion(albumId) });
        }
      } else {
        await setDoc(galleryMetaRef, { ids: [albumId] });
      }
    } catch (err) {
      console.error("Failed to persist deleted static album:", err);
      throw err;
    }
  }
}

/**
 * Appends new photos to an EXISTING album document.
 * Uploads each file to Cloudinary, then merges the new photo objects
 * into the album's existing `photos` array (never replaces it).
 *
 * @param {string} id - The Firestore document ID of the existing album.
 * @param {Array<{file: File, title?: string, description?: string}>} newPhotoEntries
 * @returns {Promise<{albumId: string, addedCount: number, totalCount: number}>}
 */
export async function addPhotosToAlbum(id, newPhotoEntries) {
  if (!id) throw new Error("Album ID is required.");
  if (!Array.isArray(newPhotoEntries) || newPhotoEntries.length === 0) {
    throw new Error("No photos selected to upload.");
  }

  const itemRef = doc(db, "gallery", id);

  // 1. Fetch the existing album document to get its current photos array.
  const snap = await getDoc(itemRef);
  let existingData = null;
  let existingPhotos = [];

  if (snap.exists()) {
    existingData = snap.data() || {};
    existingPhotos = Array.isArray(existingData.photos) ? existingData.photos : [];
  } else {
    // Album not in Firestore yet — check if it's a STATIC_ALBUM.
    // If so, create the album in Firestore with the static data + new photos.
    const staticAlbum = STATIC_ALBUMS.find((a) => a.id === id || a.slug === id);
    if (staticAlbum) {
      // Check if this static album has been permanently deleted.
      let deletedStaticIds = [];
      try {
        const metaSnap = await getDoc(galleryMetaRef);
        if (metaSnap.exists()) {
          deletedStaticIds = Array.isArray(metaSnap.data().ids) ? metaSnap.data().ids : [];
        }
      } catch (err) {
        console.warn("Failed to read deleted static albums metadata:", err);
      }
      const albumId = staticAlbum.id || staticAlbum.slug;
      if (deletedStaticIds.includes(albumId)) {
        throw new Error("This album has been deleted and cannot be modified.");
      }

      existingData = {
        slug: staticAlbum.slug || staticAlbum.id,
        title: staticAlbum.title || "Untitled Album",
        subtitle: staticAlbum.subtitle || "",
        category: normalizeCategory(staticAlbum.category),
        date: staticAlbum.date || new Date().toISOString().split("T")[0],
        year: Number(staticAlbum.year) || yearFromDate(staticAlbum.date),
        description: staticAlbum.description || "",
        coverImage: staticAlbum.coverImage || "",
        featured: Boolean(staticAlbum.featured),
        status: "Published",
      };
      existingPhotos = Array.isArray(staticAlbum.photos) ? staticAlbum.photos : [];
    } else {
      throw new Error("Album not found. It may have been deleted.");
    }
  }

  // 2. Upload each new file to Cloudinary and build canonical photo objects.
  const newPhotos = [];
  for (let i = 0; i < newPhotoEntries.length; i++) {
    const entry = newPhotoEntries[i];
    if (!entry || !entry.file || typeof entry.file !== "object" || !entry.file.type) {
      continue;
    }
    if (!entry.file.type.startsWith("image/")) {
      throw new Error(`"${entry.file.name}" is not a valid image file.`);
    }

    const secureUrl = await uploadImage(entry.file);
    const width = 1200;
    const height = 800;

    newPhotos.push({
      id: `photo-${Date.now()}-${i}`,
      title: entry.title || entry.file.name.replace(/\.[^.]+$/, "") || "",
      description: entry.description || "",
      src: secureUrl,
      rawSrc: secureUrl,
      thumbnailSrc: secureUrl,
      fullSrc: secureUrl,
      width,
      height,
      aspectRatio: `${width}/${height}`,
      isVideo: false,
    });
  }

  if (newPhotos.length === 0) {
    throw new Error("No valid image files were selected.");
  }

  // 3. Append new photos to the existing array (never replace).
  const mergedPhotos = [...existingPhotos, ...newPhotos];

  // 4. If the album has no cover image yet, use the first new photo as cover.
  const coverImage = existingData.coverImage || mergedPhotos[0]?.src || "";

  // 5. If the album was a static album (not in Firestore), create it first.
  if (!snap.exists()) {
    await setDoc(itemRef, {
      ...existingData,
      coverImage,
      photos: mergedPhotos,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    // 6. Update the SAME album document with the merged photos array.
    await updateDoc(itemRef, {
      photos: mergedPhotos,
      coverImage,
      updatedAt: serverTimestamp(),
    });
  }

  return {
    albumId: id,
    addedCount: newPhotos.length,
    totalCount: mergedPhotos.length,
  };
}
