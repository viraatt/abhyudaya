/**
 * Automatic Field Mapping and Validation Engine for Bulk Certificate Generator.
 *
 * Maps template variables (e.g. {{name}}, {{event}}, {{rollNo}}, {{college}})
 * to spreadsheet column headers automatically, while allowing manual overrides.
 *
 * v2 additions:
 *  - resolveParagraphContent() — replaces all {{var}} tokens in a paragraph string
 *  - autoMapElements() — maps variables from new elements[] schema
 *  - validateMappingForElements() — validates new element model
 */

// Normalized semantic aliases for known standard variables
const VARIABLE_ALIASES = {
  name: [
    "name",
    "fullname",
    "participantname",
    "studentname",
    "candidate",
    "candidatename",
    "student",
    "attendee",
  ],
  rollno: [
    "rollno",
    "rollnumber",
    "roll",
    "rollnum",
    "regno",
    "registrationno",
    "registrationnumber",
    "enrollmentno",
    "enrollmentnumber",
    "idnumber",
    "studentno",
    "studentid",
    "id",
  ],
  event: [
    "event",
    "eventname",
    "eventtitle",
    "competition",
    "competitionname",
    "program",
    "activity",
  ],
  date: [
    "date",
    "eventdate",
    "issuedate",
    "certificatedate",
    "dateofissue",
    "issuedon",
  ],
  position: [
    "position",
    "rank",
    "award",
    "category",
    "result",
    "standing",
    "achievement",
    "status",
    "role",
  ],
  certificateid: [
    "certificateid",
    "certid",
    "certno",
    "certificateno",
    "certificatenumber",
    "certidclean",
  ],
};

/**
 * Normalizes a variable or column string for fuzzy comparison.
 * Removes handlebars {{ }}, punctuation, spaces, and converts to lowercase.
 *
 * @param {string} str
 * @returns {string}
 */
export function normalizeKey(str = "") {
  return String(str)
    .replace(/^\{\{|\}\}$/g, "") // strip {{ and }}
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); // strip underscores, spaces, hyphens
}

/**
 * Finds the best matching column name for a given template variable.
 *
 * @param {string} variable - e.g. "{{name}}", "{{college}}", or "rollNo"
 * @param {string[]} columns - Available spreadsheet column headers
 * @returns {string|null} - Best matching column header, or null if none found
 */
export function findBestColumnMatch(variable = "", columns = []) {
  if (!variable || !columns || columns.length === 0) return null;

  const rawVar = String(variable).replace(/^\{\{|\}\}$/g, "").trim();
  const normVar = normalizeKey(rawVar);

  // 1. Check exact match (case-sensitive then case-insensitive)
  const exact = columns.find((col) => col === rawVar);
  if (exact) return exact;

  const caseInsensitive = columns.find(
    (col) => col.trim().toLowerCase() === rawVar.toLowerCase()
  );
  if (caseInsensitive) return caseInsensitive;

  // 2. Check normalized exact match
  const normMatch = columns.find((col) => normalizeKey(col) === normVar);
  if (normMatch) return normMatch;

  // 3. Check known aliases for standard variables
  const aliases = VARIABLE_ALIASES[normVar];
  if (aliases) {
    for (const alias of aliases) {
      const aliasMatch = columns.find((col) => normalizeKey(col) === alias);
      if (aliasMatch) return aliasMatch;
    }
  }

  // 4. Check if column contains the variable name (e.g. "College Name" contains "college")
  const containsMatch = columns.find((col) => {
    const normCol = normalizeKey(col);
    return normCol.includes(normVar) || normVar.includes(normCol);
  });
  if (containsMatch) return containsMatch;

  return null;
}

/**
 * Generates an automatic mapping dictionary for all template fields.
 *
 * @param {Array<{ id: string, variable: string, required?: boolean }>} fields
 * @param {string[]} columns - Spreadsheet column headers
 * @returns {Record<string, string>} Mapping object: { [variable]: columnKey }
 */
export function autoMapFields(fields = [], columns = []) {
  const mapping = {};

  fields.forEach((field) => {
    const rawVar = String(field.variable || "").replace(/^\{\{|\}\}$/g, "").trim();
    if (!rawVar) return;

    const matchedColumn = findBestColumnMatch(rawVar, columns);

    if (matchedColumn) {
      mapping[rawVar] = matchedColumn;
    } else if (normalizeKey(rawVar) === "certificateid") {
      // Special default for certificate ID if no column found: auto generate sequential IDs
      mapping[rawVar] = "__auto_id__";
    } else {
      mapping[rawVar] = ""; // Unmapped
    }
  });

  return mapping;
}

/**
 * Validates whether all required template fields are mapped.
 *
 * @param {Array<{ id: string, variable: string, required?: boolean, label?: string }>} fields
 * @param {Record<string, string>} mapping
 * @returns {{
 *   isValid: boolean,
 *   unmappedFields: string[],
 *   errors: string[]
 * }}
 */
export function validateMapping(fields = [], mapping = {}) {
  const unmappedFields = [];
  const errors = [];

  fields.forEach((field) => {
    const rawVar = String(field.variable || "").replace(/^\{\{|\}\}$/g, "").trim();
    if (!rawVar) return;

    // Fields are considered required unless explicitly marked required: false
    const isRequired = field.required !== false;
    const mappedValue = (mapping[rawVar] || "").trim();

    if (isRequired && (!mappedValue || mappedValue === "__none__")) {
      const displayVar = `{{${rawVar}}}`;
      unmappedFields.push(displayVar);
      errors.push(`${displayVar} is not mapped.`);
    }
  });

  return {
    isValid: unmappedFields.length === 0,
    unmappedFields,
    errors,
  };
}

/**
 * Resolves the actual text value for a template field from a participant row.
 *
 * @param {object} field - Template field definition
 * @param {Record<string, string>} mapping - Variable to column map
 * @param {Record<string, string>} row - Single participant row data
 * @param {object} options - Optional fixed context ({ eventName, eventDate, rowIndex, certPrefix, certificateId })
 * @returns {string} - Evaluated text value
 */
export function resolveFieldValue(field, mapping = {}, row = {}, options = {}) {
  const rawVar = String(field.variable || "").replace(/^\{\{|\}\}$/g, "").trim();
  const mappedKey = mapping[rawVar];

  if (mappedKey === "__none__") {
    return field.defaultValue || "";
  }

  if (mappedKey === "__auto_id__") {
    const prefix = options.certPrefix || "ABH";
    const idx = (options.rowIndex !== undefined ? options.rowIndex + 1 : 1);
    const padded = String(idx).padStart(4, "0");
    return `${prefix}-${padded}`;
  }

  if (mappedKey === "__fixed_event__") {
    return options.eventName || field.defaultValue || "";
  }

  if (mappedKey === "__fixed_date__") {
    return options.eventDate || field.defaultValue || "";
  }

  // 1. Check explicit mapping
  if (mappedKey && row && row[mappedKey] !== undefined && row[mappedKey] !== null) {
    const val = String(row[mappedKey]).trim();
    if (val) return val;
  }

  // 2. Generic direct fallback on row keys (e.g. {{college}}, {{venue}}, {{organizer}})
  if (row && typeof row === "object") {
    if (row[rawVar] !== undefined && row[rawVar] !== null) {
      const direct = String(row[rawVar]).trim();
      if (direct) return direct;
    }

    const normVar = normalizeKey(rawVar);
    const matchedRowKey = Object.keys(row).find((k) => normalizeKey(k) === normVar);
    if (matchedRowKey && row[matchedRowKey] !== undefined && row[matchedRowKey] !== null) {
      const val = String(row[matchedRowKey]).trim();
      if (val) return val;
    }
  }

  // 3. Fallback for standard context fields
  const norm = normalizeKey(rawVar);
  if ((norm === "event" || norm === "eventname") && options.eventName) {
    return options.eventName;
  }
  if ((norm === "date" || norm === "eventdate") && options.eventDate) {
    return options.eventDate;
  }
  if ((norm === "certificateid" || norm === "certid") && options.certificateId) {
    return options.certificateId;
  }

  return field.defaultValue !== undefined ? field.defaultValue : "";
}

/**
 * Resolves all {{variable}} tokens in a paragraph content string.
 * Used for paragraph-type elements in the designer.
 *
 * @param {string} content - e.g. "This certifies that {{name}} participated in {{event}}."
 * @param {Record<string, string>} mapping - variable to column map
 * @param {Record<string, string>} row - participant row data
 * @param {object} options - { eventName, eventDate, rowIndex, certPrefix, certificateId }
 * @returns {string} - Resolved paragraph text with all tokens replaced
 */
export function resolveParagraphContent(content = "", mapping = {}, row = {}, options = {}) {
  if (!content) return "";

  return content.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match) => {
    const syntheticField = {
      variable: match,
      defaultValue: match,
    };
    const resolved = resolveFieldValue(syntheticField, mapping, row, options);
    return resolved !== undefined && resolved !== null && resolved !== "" ? String(resolved) : match;
  });
}

/**
 * Generates an automatic mapping dictionary from an elements[] array (v2 schema).
 * Extracts variables from dynamicText, paragraph, and text elements.
 *
 * @param {Array} elements - New-format elements array
 * @param {string[]} columns - Spreadsheet column headers
 * @returns {Record<string, string>} Mapping object: { [variable]: columnKey }
 */
export function autoMapElements(elements = [], columns = []) {
  const variables = new Set();

  for (const el of elements) {
    if (el.type === "dynamicText" && el.variable) {
      const rawVar = String(el.variable).replace(/^\{\{|\}\}$/g, "").trim();
      if (rawVar) variables.add(rawVar);
    } else if ((el.type === "paragraph" || el.type === "text") && el.content) {
      const matches = (el.content || "").match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
      for (const m of matches) {
        const rawVar = m.replace(/^\{\{|\}\}$/g, "").trim();
        if (rawVar) variables.add(rawVar);
      }
    } else if (el.type === "qr") {
      variables.add("certificateId");
    }
  }

  const mapping = {};
  for (const rawVar of variables) {
    const matchedColumn = findBestColumnMatch(rawVar, columns);
    if (matchedColumn) {
      mapping[rawVar] = matchedColumn;
    } else if (rawVar.toLowerCase() === "certificateid" || rawVar.toLowerCase() === "certid") {
      mapping[rawVar] = "__auto_id__";
    } else {
      mapping[rawVar] = "";
    }
  }

  return mapping;
}

/**
 * Validates whether all required variables found in elements are mapped.
 *
 * @param {Array} elements - New-format elements
 * @param {Record<string, string>} mapping
 * @returns {{ isValid: boolean, unmappedFields: string[], errors: string[] }}
 */
export function validateMappingForElements(elements = [], mapping = {}) {
  const unmappedFields = [];
  const errors = [];
  const seen = new Set();

  for (const el of elements) {
    let varsToCheck = [];

    if (el.type === "dynamicText" && el.variable) {
      varsToCheck = [el.variable];
    } else if ((el.type === "paragraph" || el.type === "text") && el.content) {
      varsToCheck = (el.content.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || []);
    }

    for (const v of varsToCheck) {
      if (seen.has(v)) continue;
      seen.add(v);

      const rawVar = v.replace(/^\{\{|\}\}$/g, "").trim();
      const mappedValue = (mapping[rawVar] || "").trim();

      if (!mappedValue || mappedValue === "__none__") {
        unmappedFields.push(v);
        errors.push(`${v} is not mapped.`);
      }
    }
  }

  return {
    isValid: unmappedFields.length === 0,
    unmappedFields,
    errors,
  };
}

export { parseTemplateText, runsToPlainText } from "./templateParser";

