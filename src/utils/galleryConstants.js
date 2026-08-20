/**
 * Shared gallery constants + helpers.
 * Used by BOTH Admin Gallery and Public Gallery services
 * so the two sides are guaranteed to stay in sync.
 */

/** Canonical public gallery categories (what the public filter pills use). */
export const GALLERY_CATEGORIES = [
  "Festivals",
  "Workshops",
  "Competitions",
  "Talks",
  "Activities",
];

/** Document status values. */
export const GALLERY_STATUS = {
  PUBLISHED: "Published",
  DRAFT: "Draft",
};

/** Default dimensions for uploaded photos (used when Cloudinary metadata is unavailable). */
export const DEFAULT_PHOTO_WIDTH = 1200;
export const DEFAULT_PHOTO_HEIGHT = 800;
export const DEFAULT_ASPECT_RATIO = "3/2";

/** Maps an OLD legacy admin category to the canonical public category. */
const LEGACY_CATEGORY_MAP = {
  techbloom: "Festivals",
  "antariksh spardha": "Festivals",
  communicraft: "Competitions",
  workshops: "Workshops",
  competitions: "Competitions",
  cultural: "Activities",
  "campus life": "Activities",
  events: "Activities",
  "flagship fest": "Festivals",
  astronomy: "Talks",
  robotics: "Workshops",
  quiz: "Competitions",
  design: "Competitions",
  entrepreneurship: "Talks",
};

/**
 * Normalizes any category (legacy admin, static album, or user input)
 * into one of the canonical public GALLERY_CATEGORIES values.
 */
export function normalizeCategory(category) {
  if (!category) return "Activities";
  const key = String(category).toLowerCase().trim();
  if (LEGACY_CATEGORY_MAP[key]) return LEGACY_CATEGORY_MAP[key];
  const match = GALLERY_CATEGORIES.find(
    (c) => c.toLowerCase() === key || c.toLowerCase().includes(key) || key.includes(c.toLowerCase())
  );
  return match || "Activities";
}

/**
 * Converts a title into a URL-safe slug.
 * "TechBloom 2.0" → "techbloom-2-0"
 */
export function slugify(title) {
  if (!title) return "";
  return String(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // strip punctuation except spaces/dashes
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Formats "YYYY-MM-DD" → "19 August 2026".
 * Falls back to the raw string if it cannot be parsed.
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(dateStr);
  const [, y, m, d] = match;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthIndex = parseInt(m, 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) return String(dateStr);
  const day = parseInt(d, 10);
  return `${day} ${months[monthIndex]} ${y}`;
}

/**
 * Extracts year (Number) from a "YYYY-MM-DD" string.
 * Falls back to current year.
 */
export function yearFromDate(dateStr) {
  const match = String(dateStr || "").match(/^(\d{4})/);
  if (!match) return new Date().getFullYear();
  return parseInt(match[1], 10);
}

/**
 * Builds a photo object in the shape the Public Gallery expects.
 * `thumbnailSrc` / `fullSrc` are computed lazily in the public service
 * via cloudinaryOptimized helpers so this stays schema-agnostic.
 */
export function buildPhotoObject({ id, title, description, src, width, height, aspectRatio, isVideo }) {
  return {
    id: id || `photo-${Math.random().toString(36).slice(2, 8)}`,
    title: title || "",
    description: description || "",
    src: src || "",
    rawSrc: src || "",
    thumbnailSrc: src || "",
    fullSrc: src || "",
    width: width || DEFAULT_PHOTO_WIDTH,
    height: height || DEFAULT_PHOTO_HEIGHT,
    aspectRatio: aspectRatio || DEFAULT_ASPECT_RATIO,
    isVideo: Boolean(isVideo),
  };
}