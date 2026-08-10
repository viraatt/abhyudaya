/**
 * Utilities for preparing Gmail registration outreach emails.
 */

/** Easy-to-change batch size. */
export const BATCH_SIZE = 200;

/** Maximum safe Gmail compose URL length (chars). */
export const MAX_GMAIL_URL_LENGTH = 2000;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Cleans and validates a list of raw email strings.
 *  - trims whitespace
 *  - removes empties
 *  - removes invalid formats
 *  - removes duplicates (case-insensitive)
 *
 * @param {string[]} rawEmails
 * @returns {{ valid: string[], invalidCount: number }}
 */
export function processEmails(rawEmails = []) {
  const seen = new Set();
  const valid = [];
  let invalidCount = 0;

  for (const raw of rawEmails) {
    const email = (raw || "").trim().toLowerCase();

    if (!email) {
      invalidCount += 1;
      continue;
    }

    if (!EMAIL_REGEX.test(email)) {
      invalidCount += 1;
      continue;
    }

    if (seen.has(email)) {
      invalidCount += 1;
      continue;
    }

    seen.add(email);
    valid.push(email);
  }

  return { valid, invalidCount };
}

/**
 * Splits a list of items into chunks of `size`.
 *
 * @param {T[]} items
 * @param {number} size
 * @returns {T[][]}
 */
export function chunkArray(items = [], size = BATCH_SIZE) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Builds a Gmail web compose URL with prefilled BCC, subject, and body.
 *
 * @param {string[]} recipients
 * @param {string} subject
 * @param {string} body
 * @returns {string}
 */
export function buildGmailUrl(recipients = [], subject = "", body = "") {
  const base = "https://mail.google.com/mail/?view=cm&fs=1";
  const parts = [base];

  if (recipients.length) {
    parts.push(`bcc=${encodeURIComponent(recipients.join(","))}`);
  }
  if (subject) {
    parts.push(`su=${encodeURIComponent(subject)}`);
  }
  if (body) {
    parts.push(`body=${encodeURIComponent(body)}`);
  }

  return parts.join("&");
}

/**
 * Generates the default outreach subject for an event.
 *
 * @param {string} eventName
 * @returns {string}
 */
export function buildSubject(eventName = "Event") {
  return `Registration Open — ${eventName}`;
}

/**
 * Generates the default outreach body for an event.
 *
 * @param {string} eventName
 * @param {string} registrationLink
 * @returns {string}
 */
export function buildBody(eventName = "Event", registrationLink = "") {
  return [
    "Hello,",

    `Registrations for ${eventName} are now open.`,

    "You can register using the link below:",

    registrationLink,

    "Regards,",
    "Abhyudaya Club",
    "MPEC",
  ].join("\n\n");
}