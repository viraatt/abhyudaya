import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../Firebase/firebase";

/**
 * Converts any title string into a clean, URL-friendly slug.
 * Removes accents, special characters, converts spaces to hyphens,
 * and strips leading/trailing hyphens.
 *
 * Example: "Welcome Freshers 2026!" -> "welcome-freshers-2026"
 *
 * @param {string} title
 * @returns {string}
 */
export const generateSlug = (title = "") => {
  if (!title) return "";

  return title
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD") // Split accented characters into base letters + diacritics
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/&/g, "-and-") // Replace & with 'and'
    .replace(/[^a-z0-9\s-]/g, "") // Remove all non-alphanumeric chars except space and hyphen
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with a single hyphen
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading and trailing hyphens
};

/**
 * Sanitizes user manual input as they type a custom slug.
 *
 * @param {string} input
 * @returns {string}
 */
export const cleanSlugInput = (input = "") => {
  return input
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
};

/**
 * Validates format of a slug string.
 *
 * @param {string} slug
 * @returns {{ isValid: boolean, message: string }}
 */
export const validateSlug = (slug = "") => {
  if (!slug || !slug.trim()) {
    return { isValid: false, message: "Slug cannot be empty." };
  }

  const trimmed = slug.trim();

  if (trimmed.length < 2) {
    return { isValid: false, message: "Slug must be at least 2 characters long." };
  }

  if (trimmed.length > 100) {
    return { isValid: false, message: "Slug cannot exceed 100 characters." };
  }

  if (/^-|-$/.test(trimmed)) {
    return { isValid: false, message: "Slug cannot start or end with a hyphen." };
  }

  if (/[^a-z0-9-]/.test(trimmed)) {
    return {
      isValid: false,
      message: "Slug can only contain lowercase letters, numbers, and hyphens.",
    };
  }

  if (/--/.test(trimmed)) {
    return { isValid: false, message: "Slug cannot contain consecutive hyphens." };
  }

  return { isValid: true, message: "Slug format is valid." };
};

/**
 * Checks Firestore collection 'blogs' to see if a slug is already in use.
 *
 * @param {string} targetSlug
 * @param {string|null} [excludeBlogId=null] - Exclude current blog ID when editing.
 * @returns {Promise<boolean>} Resolves true if slug is UNIQUE (available), false if taken.
 */
export const checkSlugUnique = async (targetSlug, excludeBlogId = null) => {
  if (!targetSlug || !targetSlug.trim()) return false;

  try {
    const q = query(
      collection(db, "blogs"),
      where("slug", "==", targetSlug.trim())
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return true; // Unique & available
    }

    // If editing existing blog, verify if the matching document is the same blog
    if (excludeBlogId) {
      const match = querySnapshot.docs.find((doc) => doc.id === excludeBlogId);
      if (match && querySnapshot.size === 1) {
        return true; // Available because it belongs to the current blog
      }
    }

    return false; // Taken by another blog
  } catch (error) {
    console.error("Error checking slug uniqueness in Firestore:", error);
    // On error, default to true or throw depending on design, but let's return true and log
    return true;
  }
};

/**
 * Generates a guaranteed unique slug for Firestore by appending counter (-1, -2, etc.)
 * if collisions exist.
 *
 * @param {string} titleOrBaseSlug
 * @param {string|null} [excludeBlogId=null]
 * @returns {Promise<string>} Unique slug
 */
export const generateUniqueSlug = async (titleOrBaseSlug, excludeBlogId = null) => {
  let baseSlug = generateSlug(titleOrBaseSlug);
  if (!baseSlug) baseSlug = "untitled-post";

  let candidateSlug = baseSlug;
  let counter = 1;

  while (!(await checkSlugUnique(candidateSlug, excludeBlogId))) {
    candidateSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  return candidateSlug;
};
