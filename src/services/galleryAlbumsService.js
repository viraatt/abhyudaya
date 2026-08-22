import { getPublishedGalleryItems } from "../Admin/pages/services/galleryService.js";
import {
  getCloudinaryThumbnail,
  getCloudinaryFullImage,
  FALLBACK_IMAGE,
} from "../utils/cloudinaryOptimized.js";
import {
  normalizeCategory,
  formatDisplayDate,
  yearFromDate,
} from "../utils/galleryConstants.js";
import { STATIC_ALBUMS } from "../data/staticGalleryAlbums.js";

// Vite asset imports for local images used in editorial moments & hero collage
import techBloomCover from "../assets/9ae3f21a-b6bf-4115-8c6b-a44b01f95bf9.jpg";
import aeromodellingCover from "../assets/AM3COVER.jpg";
import webDevCover from "../assets/WD4COVER.jpg";
import astronomyCover from "../assets/cover2.jpg";

// In-memory cache for albums metadata to avoid unnecessary repeat reads.
// Reduced to 30 seconds so Admin → Public updates appear quickly.
let _albumsCache = null;
let _albumsCacheTimestamp = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Invalidates the in-memory album cache.
 * Called after create/update/delete so the public Gallery reflects changes immediately.
 */
export function invalidateGalleryCache() {
  _albumsCache = null;
  _albumsCacheTimestamp = 0;
}

/**
 * Normalizes a Firestore album document into the public album card shape.
 * `doc` is a plain object: { id, ...data } as returned by getGalleryItems().
 */
function normalizeFirestoreAlbum(doc) {
  const data = doc || {};
  const id = data.id || data.slug || "";
  const photos = Array.isArray(data.photos) ? data.photos : [];
  const coverImage = data.coverImage || (photos.length > 0 ? photos[0].src : "") || FALLBACK_IMAGE;

  return {
    id,
    slug: data.slug || id,
    title: data.title || "Untitled Album",
    subtitle: data.subtitle || "",
    category: normalizeCategory(data.category),
    date: formatDisplayDate(data.date),
    year: data.year || yearFromDate(data.date),
    description: data.description || "",
    coverImage,
    featured: Boolean(data.featured),
    photoCount: photos.length,
    status: data.status || "Published",
    photos,
  };
}

/**
 * Fetches published albums from Firestore.
 * Falls back to STATIC_ALBUMS ONLY when Firestore has zero documents.
 */
async function fetchPublishedAlbums() {
  const dbItems = await getPublishedGalleryItems();

  // Firestore has albums → Firestore is the source of truth
  if (Array.isArray(dbItems) && dbItems.length > 0) {
    return dbItems.map(normalizeFirestoreAlbum);
  }

  // Firestore has zero albums → optional STATIC_ALBUMS fallback
  return STATIC_ALBUMS.map((album) => ({
    ...album,
    category: normalizeCategory(album.category),
    date: formatDisplayDate(album.date),
  }));
}

/**
 * Fetches lightweight Album metadata for the Gallery homepage.
 * Returns only: { id, slug, title, subtitle, category, date, year, description, coverThumbnail, coverImage, photoCount, featured }
 * Does NOT download all event photos upfront!
 */
export async function getGalleryAlbums({ category = "all", search = "", year = "all" } = {}) {
  const now = Date.now();
  let albums = _albumsCache;

  if (!albums || now - _albumsCacheTimestamp > CACHE_TTL_MS) {
    try {
      albums = await fetchPublishedAlbums();
    } catch (err) {
      console.error("Gallery fetch failed:", err);
      throw err;
    }

    _albumsCache = albums;
    _albumsCacheTimestamp = now;
  }

  // Apply filters on lightweight metadata
  let filtered = [...albums];

  if (category && category !== "all") {
    filtered = filtered.filter((a) => a.category.toLowerCase() === category.toLowerCase());
  }

  if (year && year !== "all") {
    filtered = filtered.filter((a) => String(a.year) === String(year));
  }

  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }

  // Return album cards with optimized cover thumbnail URLs
  return filtered.map((album) => ({
    id: album.id,
    slug: album.slug,
    title: album.title,
    subtitle: album.subtitle,
    category: album.category,
    date: album.date,
    year: album.year,
    description: album.description,
    coverThumbnail: getCloudinaryThumbnail(album.coverImage),
    coverImage: album.coverImage,
    photoCount: album.photoCount || album.photos?.length || 0,
    featured: Boolean(album.featured),
  }));
}

/**
 * Fetches full album details including all event photos for the dedicated /gallery/:eventSlug page.
 */
export async function getAlbumBySlug(slug) {
  if (!slug) return null;

  // Make sure cache or base albums are loaded
  if (!_albumsCache) {
    await getGalleryAlbums();
  }

  const all = _albumsCache || STATIC_ALBUMS;
  const album = all.find((a) => a.slug === slug || a.id === slug);

  if (!album) return null;

  // Prepare photos with both thumbnail and full-resolution Cloudinary URLs
  const optimizedPhotos = (album.photos || []).map((photo, index) => ({
    id: photo.id || `photo-${index}`,
    title: photo.title || `${album.title} — Moment ${index + 1}`,
    description: photo.description || album.description,
    thumbnailSrc: getCloudinaryThumbnail(photo.src || photo.thumbnailSrc || photo.rawSrc),
    fullSrc: getCloudinaryFullImage(photo.src || photo.fullSrc || photo.rawSrc),
    rawSrc: photo.rawSrc || photo.src || "",
    src: photo.src || photo.rawSrc || "",
    width: photo.width || 1200,
    height: photo.height || 800,
    aspectRatio: photo.aspectRatio || "4/3",
    isVideo: Boolean(photo.isVideo),
  }));

  return {
    ...album,
    coverThumbnail: getCloudinaryThumbnail(album.coverImage),
    photos: optimizedPhotos,
    photoCount: optimizedPhotos.length,
  };
}

/**
 * Editorial spotlight moments for Section 7: "Moments That Define Us"
 */
export const EDITORIAL_MOMENTS = [
  {
    id: "moment-1",
    tagline: "Learning Together",
    subtitle: "Workshop Series",
    title: "Hands-on Code & Engineering Labs",
    albumSlug: "web-dev-workshop",
    image: webDevCover,
    description: "Students building fullstack web apps and hardware controllers side-by-side.",
  },
  {
    id: "moment-2",
    tagline: "Creating Together",
    subtitle: "TechBloom 2.0",
    title: "Autonomous Robotics & RC Flight",
    albumSlug: "techbloom-2",
    image: techBloomCover,
    description: "Prototyping, testing, and flying student-built fixed-wing models on college grounds.",
  },
  {
    id: "moment-3",
    tagline: "Celebrating Together",
    subtitle: "Antariksh Spardha",
    title: "Stargazing & Space Discoveries",
    albumSlug: "antariksh-spardha",
    image: astronomyCover,
    description: "Deep sky exploration through high-power telescopes with IIT Kanpur Astro Club.",
  },
];

/**
 * Hero Collage Photographs for the 2-column editorial layout
 */
export const HERO_COLLAGE_PHOTOS = [
  {
    id: "hero-1",
    src: techBloomCover,
    title: "TechBloom 2.0 Opening",
    category: "Flagship Fest",
    dominant: true,
  },
  {
    id: "hero-2",
    src: aeromodellingCover,
    title: "RC Aircraft Design",
    category: "Workshop",
    dominant: false,
  },
  {
    id: "hero-3",
    src: astronomyCover,
    title: "Night Sky Observation",
    category: "Astronomy",
    dominant: false,
  },
  {
    id: "hero-4",
    src: webDevCover,
    title: "Fullstack Lab",
    category: "Coding",
    dominant: false,
  },
];

/**
 * Surprise Me: returns a random photo across published albums for instant lightbox opening.
 */
export async function getRandomHighlightPhoto() {
  if (!_albumsCache) {
    await getGalleryAlbums();
  }
  const albums = _albumsCache || STATIC_ALBUMS;
  const allPhotos = [];
  albums.forEach((alb) => {
    (alb.photos || []).forEach((p) => {
      allPhotos.push({
        ...p,
        albumTitle: alb.title,
        albumSlug: alb.slug,
        albumCategory: alb.category,
        thumbnailSrc: getCloudinaryThumbnail(p.src || p.thumbnailSrc || p.rawSrc),
        fullSrc: getCloudinaryFullImage(p.src || p.fullSrc || p.rawSrc),
      });
    });
  });

  if (allPhotos.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * allPhotos.length);
  return allPhotos[randomIndex];
}