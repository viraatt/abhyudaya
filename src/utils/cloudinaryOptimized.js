/**
 * Cloudinary Free Plan Optimized Image Delivery Helper
 * 
 * Strategy:
 * - Fixed, predictable transformation URLs so Cloudinary caches every derived asset.
 * - 2 Primary Sizes:
 *   1. Thumbnail / Grid Card: ~600px width (f_auto, q_auto, w_600, c_limit)
 *   2. Fullscreen / Lightbox: ~1400px width (f_auto, q_auto, w_1400, c_limit)
 * - Zero eager transformations to protect Cloudinary Free plan transformation credits.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "cn11zsvp";

// Default safe fallback if an image fails or URL is broken
export const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80";

/**
 * Checks whether a given string is a Cloudinary delivery URL.
 */
export function isCloudinaryUrl(url) {
  return typeof url === "string" && url.includes("res.cloudinary.com");
}

/**
 * Injects transformation parameters into a Cloudinary URL or constructs one from a publicId.
 * @param {string} urlOrPublicId - Cloudinary URL or publicId
 * @param {string} transformString - e.g. "f_auto,q_auto,w_600,c_limit"
 */
export function transformCloudinaryUrl(urlOrPublicId, transformString = "f_auto,q_auto") {
  if (!urlOrPublicId) return FALLBACK_IMAGE;

  // If it's already a full Cloudinary URL
  if (isCloudinaryUrl(urlOrPublicId)) {
    // Check if it already has transformations after /upload/
    const uploadIndex = urlOrPublicId.indexOf("/upload/");
    if (uploadIndex === -1) return urlOrPublicId;

    const prefix = urlOrPublicId.substring(0, uploadIndex + 8);
    const suffix = urlOrPublicId.substring(uploadIndex + 8);

    // If suffix already has standard transformations, don't duplicate
    if (suffix.startsWith("f_auto") || suffix.startsWith("w_") || suffix.startsWith("c_") || suffix.startsWith("q_")) {
      return urlOrPublicId;
    }

    return `${prefix}${transformString}/${suffix}`;
  }

  // If it's an external URL (e.g. Unsplash)
  if (urlOrPublicId.startsWith("http://") || urlOrPublicId.startsWith("https://")) {
    if (urlOrPublicId.includes("unsplash.com")) {
      const width = transformString.includes("w_1400") ? "1400" : "600";
      const quality = transformString.includes("w_1400") ? "85" : "75";
      const clean = urlOrPublicId.split("?")[0];
      return `${clean}?auto=format&fit=crop&w=${width}&q=${quality}`;
    }
    return urlOrPublicId;
  }

  // If it's a relative path in assets
  if (urlOrPublicId.startsWith("/") || urlOrPublicId.startsWith("assets/") || urlOrPublicId.startsWith("./")) {
    return urlOrPublicId;
  }

  // If it's a raw Cloudinary publicId
  const cleanId = urlOrPublicId.replace(/^\//, "");
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformString}/${cleanId}`;
}

/**
 * 1. Thumbnail variant (~600px width)
 * Perfect for: Album Cover Cards, Masonry Grid Photos, Related Event Cards
 */
export function getCloudinaryThumbnail(urlOrPublicId) {
  return transformCloudinaryUrl(urlOrPublicId, "f_auto,q_auto,w_600,c_limit");
}

/**
 * 2. Full-Resolution variant (~1400px width)
 * Perfect for: Fullscreen Lightbox Modal
 */
export function getCloudinaryFullImage(urlOrPublicId) {
  return transformCloudinaryUrl(urlOrPublicId, "f_auto,q_auto,w_1400,c_limit");
}

/**
 * 3. Featured / Hero Cover variant (~1200px width)
 */
export function getCloudinaryCoverImage(urlOrPublicId) {
  return transformCloudinaryUrl(urlOrPublicId, "f_auto,q_auto,w_1200,c_limit");
}

/**
 * Universal optimizer helper
 */
export function getOptimizedImageUrl(urlOrPublicId, variant = "thumbnail") {
  switch (variant) {
    case "full":
    case "lightbox":
      return getCloudinaryFullImage(urlOrPublicId);
    case "cover":
    case "hero":
      return getCloudinaryCoverImage(urlOrPublicId);
    case "thumbnail":
    case "card":
    default:
      return getCloudinaryThumbnail(urlOrPublicId);
  }
}
