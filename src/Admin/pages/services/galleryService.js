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
  where,
} from "firebase/firestore";
import { db } from "../../../Firebase/firebase";
import { uploadImage } from "./imageUpload";
import { slugify, yearFromDate, normalizeCategory } from "../../../utils/galleryConstants";

const galleryRef = collection(db, "gallery");

/**
 * Fetch all gallery album documents (admin view — includes Drafts).
 */
export async function getGalleryItems() {
  try {
    const q = query(galleryRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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

  await updateDoc(itemRef, {
    ...albumData,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes an album document from Firestore.
 * Cloudinary files are intentionally left orphaned (documented future cleanup).
 */
export async function deleteGalleryItem(id) {
  await deleteDoc(doc(db, "gallery", id));
}