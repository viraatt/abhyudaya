/**
 * Lightweight CSV parsing + student import validation utilities.
 * No external dependencies.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parses CSV text into an array of row objects keyed by header names.
 * Handles quoted fields, commas inside quotes, and escaped quotes.
 *
 * @param {string} text
 * @returns {Array<Record<string, string>>}
 */
export function parseCSV(text = "") {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      pushField();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      pushRow();
    } else {
      field += char;
    }
  }

  // Handle trailing row without newline
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  // Remove completely empty rows
  const nonEmpty = rows.filter((r) => r.some((cell) => (cell || "").trim() !== ""));

  if (nonEmpty.length === 0) return [];

  // First row = headers
  const headers = nonEmpty[0].map((h) => (h || "").trim());
  const dataRows = nonEmpty.slice(1);

  return dataRows.map((cells) => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = (cells[idx] || "").trim();
    });
    return obj;
  });
}

/**
 * Extracts unique column names from parsed CSV rows.
 *
 * @param {Array<Record<string, string>>} rows
 * @returns {string[]}
 */
export function getCSVColumns(rows = []) {
  const cols = new Set();
  rows.forEach((row) => Object.keys(row).forEach((k) => cols.add(k)));
  return Array.from(cols);
}

/**
 * Validates and normalizes a list of raw student records.
 *
 * Rules:
 *  - Reject empty emails
 *  - Reject invalid email formats
 *  - Normalize emails to lowercase
 *  - Remove duplicate emails (case-insensitive)
 *  - Ignore completely empty rows
 *
 * @param {Array<{name?: string, email?: string, branch?: string, semester?: string}>} rawStudents
 * @returns {{ valid: Array<{name: string, email: string, branch: string, semester: string}>, invalidCount: number, duplicateCount: number }}
 */
export function validateStudents(rawStudents = []) {
  const seen = new Set();
  const valid = [];
  let invalidCount = 0;
  let duplicateCount = 0;

  for (const raw of rawStudents) {
    const email = (raw.email || "").trim().toLowerCase();

    // Ignore completely empty rows
    if (!email && !(raw.name || "").trim()) continue;

    if (!email || !EMAIL_REGEX.test(email)) {
      invalidCount += 1;
      continue;
    }

    if (seen.has(email)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(email);
    valid.push({
      name: (raw.name || "").trim(),
      email,
      branch: (raw.branch || "").trim(),
      semester: (raw.semester || "").trim(),
    });
  }

  return { valid, invalidCount, duplicateCount };
}

/**
 * Maps raw CSV rows to student objects using the admin's column mapping.
 *
 * @param {Array<Record<string, string>>} rows
 * @param {{name: string, email: string, branch: string, semester: string}} mapping
 * @returns {Array<{name: string, email: string, branch: string, semester: string}>}
 */
export function mapCSVRows(rows = [], mapping = {}) {
  return rows.map((row) => ({
    name: mapping.name ? row[mapping.name] || "" : "",
    email: mapping.email ? row[mapping.email] || "" : "",
    branch: mapping.branch ? row[mapping.branch] || "" : "",
    semester: mapping.semester ? row[mapping.semester] || "" : "",
  }));
}