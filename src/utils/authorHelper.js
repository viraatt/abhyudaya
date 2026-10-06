/**
 * Helper to resolve and sanitize the author's public display name.
 * Prevents "Alumnus" fallback and ensures emails/UIDs are never displayed.
 */

const GENERIC_NAMES = new Set(["alumnus", "alumni", "anonymous", "admin"]);

function isValidName(val) {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  // Never expose an email as a name
  if (trimmed.includes("@")) return false;
  // Reject generic hardcoded fallbacks
  if (GENERIC_NAMES.has(trimmed.toLowerCase())) return false;
  return true;
}

/**
 * Resolves the author's actual name from any combination of author and user objects.
 * Priority:
 * 1. author.name / author.authorName / author.fullName / author.displayName
 * 2. user.name / user.authorName / user.fullName / user.displayName
 * 3. Default fallback: "Abhyudaya Alumni" (never "Alumnus", never email)
 */
export function resolveAuthorName(author, user = null) {
  // Direct string check
  if (typeof author === "string" && isValidName(author)) {
    return author.trim();
  }

  // Object checks on author
  if (author && typeof author === "object") {
    const candidates = [
      author.name,
      author.authorName,
      author.fullName,
      author.displayName,
    ];
    for (const cand of candidates) {
      if (isValidName(cand)) {
        return cand.trim();
      }
    }
  }

  // Object checks on user / profile
  if (user && typeof user === "object") {
    const candidates = [
      user.name,
      user.authorName,
      user.fullName,
      user.displayName,
    ];
    for (const cand of candidates) {
      if (isValidName(cand)) {
        return cand.trim();
      }
    }
  }

  return "Abhyudaya Alumni";
}
