/**
 * Helper to resolve and sanitize the author's public display name.
 * Prevents "Alumnus" fallback and ensures emails/UIDs are never displayed.
 */

const GENERIC_NAMES = new Set([
  "alumnus",
  "alumni",
  "anonymous",
  "admin",
  "abhyudaya alumni",
  "name not set",
]);

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
 * Resolves the author's actual name from any combination of author and user objects/strings.
 * Priority:
 * 1. author string (if valid) or author object candidate fields (name, authorName, fullName, displayName)
 * 2. user string (if valid) or user object candidate fields (name, authorName, fullName, displayName)
 * 3. Default legacy fallback: "Abhyudaya Alumni" (only when no actual name is available)
 */
export function resolveAuthorName(author, user = null) {
  // Direct string check on author
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

  // Direct string check on user
  if (typeof user === "string" && isValidName(user)) {
    return user.trim();
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

