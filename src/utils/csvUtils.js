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
export function parseCSV(text = "", options = {}) {
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

  // Remove completely empty rows unless options.keepEmptyRows is true
  const nonEmpty = options.keepEmptyRows
    ? (rows.length > 0 ? rows : [])
    : rows.filter((r) => r.some((cell) => (cell || "").trim() !== ""));

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

/**
 * Universal spreadsheet parser for Bulk Certificate Generator.
 * Supports .csv, .xlsx, and .xls files using SheetJS (xlsx).
 *
 * Performs:
 * 1. File reading (Binary ArrayBuffer / Text)
 * 2. Column header detection
 * 3. Empty row filtering & counting
 * 4. Duplicate row detection (by RollNo or Name)
 * 5. Returns parsed rows and first 5 preview rows
 *
 * @param {File} file
 * @returns {Promise<{
 *   fileName: string,
 *   fileSize: number,
 *   fileType: string,
 *   columns: string[],
 *   rows: Array<Record<string, string>>,
 *   totalRows: number,
 *   emptyRowsSkipped: number,
 *   duplicates: Array<{ row: number, name: string, rollNo: string, reason: string }>,
 *   previewRows: Array<Record<string, string>>
 * }>}
 */
export async function parseSpreadsheetFile(file) {
  if (!file) {
    throw new Error("No file provided.");
  }

  const fileName = file.name || "data";
  const ext = fileName.split(".").pop().toLowerCase();

  if (!["csv", "xlsx", "xls"].includes(ext)) {
    throw new Error(
      `Unsupported file format ".${ext}". Please upload a CSV, XLSX, or XLS file.`
    );
  }

  let rawRows = [];

  if (ext === "csv") {
    // For CSV: read as text preserving empty rows so we can track them
    const text = await file.text();
    rawRows = parseCSV(text, { keepEmptyRows: true });
  } else {
    // For XLSX / XLS: dynamically import or use SheetJS
    const XLSX = await import("xlsx");
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("Spreadsheet contains no sheets.");
    }

    // Read the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert sheet to JSON array of objects using headers
    // defval: "" ensures empty cells are returned as empty strings
    rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false, blankrows: true });
  }

  if (!rawRows || rawRows.length === 0) {
    throw new Error("Spreadsheet is empty or has no readable participant rows.");
  }

  // Detect column headers from first row and union of keys
  const colSet = new Set();
  rawRows.forEach((r) => {
    Object.keys(r).forEach((k) => {
      const cleanKey = (k || "").trim();
      if (cleanKey) colSet.add(cleanKey);
    });
  });
  const columns = Array.from(colSet);

  if (columns.length === 0) {
    throw new Error("No column headers detected in the uploaded file.");
  }

  // Clean rows, remove whitespace, filter completely empty rows
  let emptyRowsSkipped = 0;
  const validRows = [];
  const duplicates = [];

  // Track seen RollNos and Names for duplicate detection
  const seenRollNos = new Map(); // rollNo -> rowNumber
  const seenNames = new Map(); // name -> rowNumber

  // Helper to find a field key ignoring case/spaces
  const findValue = (row, candidates) => {
    for (const key of Object.keys(row)) {
      const normalized = key.toLowerCase().replace(/[\s_-]/g, "");
      for (const cand of candidates) {
        if (normalized === cand) {
          return (row[key] || "").toString().trim();
        }
      }
    }
    return "";
  };

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed row number (row 1 = headers)
    const cleanedRow = {};
    let hasAnyValue = false;

    columns.forEach((col) => {
      const val = row[col] !== undefined && row[col] !== null ? String(row[col]).trim() : "";
      cleanedRow[col] = val;
      if (val !== "") {
        hasAnyValue = true;
      }
    });

    if (!hasAnyValue) {
      emptyRowsSkipped++;
      return; // Skip empty row
    }

    // Duplicate detection: check rollNo and name independently
    const rollNoVal = findValue(cleanedRow, ["rollno", "rollnumber", "roll", "regno", "id"]);
    const nameVal = findValue(cleanedRow, ["name", "fullname", "participantname", "studentname"]);
    let isRowFlagged = false;

    if (rollNoVal) {
      const normRoll = rollNoVal.toLowerCase();
      if (seenRollNos.has(normRoll)) {
        duplicates.push({
          row: rowNum,
          name: nameVal || "N/A",
          rollNo: rollNoVal,
          reason: `Duplicate Roll Number "${rollNoVal}" (First seen at row ${seenRollNos.get(normRoll)})`,
        });
        isRowFlagged = true;
      } else {
        seenRollNos.set(normRoll, rowNum);
      }
    }

    if (nameVal) {
      const normName = nameVal.toLowerCase();
      if (seenNames.has(normName)) {
        if (!isRowFlagged) {
          duplicates.push({
            row: rowNum,
            name: nameVal,
            rollNo: rollNoVal || "",
            reason: `Duplicate Name "${nameVal}" (First seen at row ${seenNames.get(normName)})`,
          });
        }
      } else {
        seenNames.set(normName, rowNum);
      }
    }

    validRows.push(cleanedRow);
  });

  if (validRows.length === 0) {
    throw new Error("Spreadsheet contains only empty rows.");
  }

  return {
    fileName,
    fileSize: file.size,
    fileType: ext,
    columns,
    rows: validRows,
    totalRows: validRows.length,
    emptyRowsSkipped,
    duplicates,
    previewRows: validRows.slice(0, 5),
  };
}