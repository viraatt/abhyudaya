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
  "name not found",
  "name not found — please contact admin",
  "unknown",
]);

export function isValidName(val) {
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
 * Extracts a candidate human name from any string or object.
 * Priority order within an object:
 * 1. name
 * 2. displayName
 * 3. fullName
 * 4. alumniName
 * 5. firstName + lastName
 * 6. authorName, writerName
 * and safely unpacks nested author/profile objects.
 */
function extractCandidateName(item, depth = 0) {
  if (!item || depth > 3) return null;
  if (typeof item === "string") {
    return isValidName(item) ? item.trim() : null;
  }
  if (typeof item !== "object") return null;

  // 1. Direct candidate string fields (exact requirement order)
  const fields = [
    item.name,
    item.displayName,
    item.fullName,
    item.alumniName,
    item.authorName,
    item.writerName,
  ];
  for (const f of fields) {
    if (typeof f === "string" && isValidName(f)) {
      return f.trim();
    }
  }

  // 2. Combined first + last name
  if (item.firstName || item.lastName) {
    const combined = [item.firstName, item.lastName].filter(Boolean).join(" ").trim();
    if (isValidName(combined)) {
      return combined;
    }
  }

  // 3. Nested author / profile structures
  const nested = [
    item.author,
    item.alumniAuthor,
    item.alumniProfile,
    item.authorUser,
    item.user,
    item.profile,
  ];
  for (const sub of nested) {
    if (sub && sub !== item) {
      const res = extractCandidateName(sub, depth + 1);
      if (res) return res;
    }
  }

  return null;
}

/**
 * Extracts the real author name from any combination of author/user objects or strings.
 * Returns null if no valid human name is found (does NOT use generic fallback).
 */
export function extractAuthorName(...sources) {
  for (const src of sources) {
    const name = extractCandidateName(src);
    if (name) return name;
  }
  return null;
}

/**
 * Resolves the author's actual name from any combination of author and user objects/strings.
 * Priority: checks all passed sources in order.
 * Default legacy fallback: "Abhyudaya Alumni" (only when no actual name is available).
 */
export function resolveAuthorName(...sources) {
  return extractAuthorName(...sources) || "Abhyudaya Alumni";
}


