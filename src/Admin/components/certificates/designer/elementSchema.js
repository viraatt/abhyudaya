/**
 * Certificate Designer — Element Schema v2
 *
 * Defines the data model for all supported element types,
 * factory functions to create new elements, and a migration
 * layer that converts old-format fields[] into new elements[].
 */

// ─── Element Type Constants ───────────────────────────────────────────────────

export const ELEMENT_TYPES = {
  TEXT: "text",
  DYNAMIC_TEXT: "dynamicText",
  PARAGRAPH: "paragraph",
  IMAGE: "image",
  QR: "qr",
  SIGNATURE: "signature",
  SHAPE: "shape",
  LINE: "line",
};

// ─── Template Schema Version ──────────────────────────────────────────────────

export const SCHEMA_VERSION = 2;

// ─── ID Generator ─────────────────────────────────────────────────────────────

let _idCounter = Date.now();
export function generateElementId(type = "el") {
  _idCounter += 1;
  return `${type}_${_idCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Default Shared Properties ────────────────────────────────────────────────

const defaultBase = {
  rotation: 0,
  opacity: 1,
  visible: true,
  locked: false,
};

const defaultTextStyle = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 32,
  fontWeight: "400",
  fontStyle: "normal",
  textDecoration: "none",
  color: "#1e293b",
  align: "center",
  lineHeight: 1.4,
  letterSpacing: 0,
};

// ─── Element Factory Functions ────────────────────────────────────────────────

/**
 * Creates a new static text element.
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {number} existingCount
 */
export function createTextElement(canvasWidth = 1920, canvasHeight = 1080, existingCount = 0) {
  const w = Math.round(canvasWidth * 0.5);
  const h = Math.round(canvasHeight * 0.08);
  const x = Math.round((canvasWidth - w) / 2);
  const y = Math.round(canvasHeight * 0.2 + existingCount * Math.round(canvasHeight * 0.1));
  return {
    ...defaultBase,
    ...defaultTextStyle,
    id: generateElementId("text"),
    type: ELEMENT_TYPES.TEXT,
    x, y, width: w, height: h,
    content: "Certificate of Participation",
    fontSize: 42,
    fontWeight: "700",
    fontFamily: "'Cinzel', serif",
    color: "#ffffff",
  };
}

/**
 * Creates a new dynamic text element (single variable).
 * @param {string} variable - e.g. "{{name}}"
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {number} existingCount
 */
export function createDynamicTextElement(variable = "{{name}}", canvasWidth = 1920, canvasHeight = 1080, existingCount = 0) {
  const w = Math.round(canvasWidth * 0.6);
  const h = Math.round(canvasHeight * 0.09);
  const x = Math.round((canvasWidth - w) / 2);
  const y = Math.round(canvasHeight * 0.3 + existingCount * Math.round(canvasHeight * 0.1));
  return {
    ...defaultBase,
    ...defaultTextStyle,
    id: generateElementId("dyntext"),
    type: ELEMENT_TYPES.DYNAMIC_TEXT,
    x, y, width: w, height: h,
    variable,
    fontSize: 46,
    fontWeight: "700",
    fontFamily: "'Cinzel', serif",
    color: "#1e293b",
  };
}

/**
 * Creates a new paragraph element (multi-line with variable interpolation).
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
export function createParagraphElement(canvasWidth = 1920, canvasHeight = 1080) {
  const w = Math.round(canvasWidth * 0.6);
  const h = Math.round(canvasHeight * 0.22);
  const x = Math.round((canvasWidth - w) / 2);
  const y = Math.round(canvasHeight * 0.5);
  return {
    ...defaultBase,
    ...defaultTextStyle,
    id: generateElementId("para"),
    type: ELEMENT_TYPES.PARAGRAPH,
    x, y, width: w, height: h,
    content: "This is to certify that {{name}} has actively participated in {{event}} held on {{date}}.",
    fontSize: 26,
    fontWeight: "400",
    fontFamily: "'Inter', sans-serif",
    color: "#334155",
    lineHeight: 1.6,
    verticalAlign: "middle",
  };
}

/**
 * Creates a new image element (logo, asset).
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
export function createImageElement(canvasWidth = 1920, canvasHeight = 1080) {
  const size = Math.round(Math.min(canvasWidth, canvasHeight) * 0.12);
  return {
    ...defaultBase,
    id: generateElementId("img"),
    type: ELEMENT_TYPES.IMAGE,
    x: Math.round(canvasWidth * 0.04),
    y: Math.round(canvasHeight * 0.04),
    width: size,
    height: size,
    src: null,          // local blob URL (temporary)
    storagePath: null,  // Firebase Storage path (persistent)
    storageUrl: null,   // Firebase download URL
    objectFit: "contain",
  };
}

/**
 * Creates a new QR code element.
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
export function createQrElement(canvasWidth = 1920, canvasHeight = 1080) {
  const size = Math.round(Math.min(canvasWidth, canvasHeight) * 0.14);
  return {
    ...defaultBase,
    id: generateElementId("qr"),
    type: ELEMENT_TYPES.QR,
    x: Math.round(canvasWidth * 0.82),
    y: Math.round(canvasHeight * 0.72),
    width: size,
    height: size,
  };
}

/**
 * Creates a new signature element (specialized image).
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
export function createSignatureElement(canvasWidth = 1920, canvasHeight = 1080) {
  const w = Math.round(canvasWidth * 0.16);
  const h = Math.round(canvasHeight * 0.08);
  return {
    ...defaultBase,
    id: generateElementId("sig"),
    type: ELEMENT_TYPES.SIGNATURE,
    x: Math.round(canvasWidth * 0.65),
    y: Math.round(canvasHeight * 0.82),
    width: w,
    height: h,
    src: null,
    storagePath: null,
    storageUrl: null,
    objectFit: "contain",
  };
}

/**
 * Creates a new shape element.
 * @param {"rectangle"|"circle"|"roundedRect"} shape
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
export function createShapeElement(shape = "rectangle", canvasWidth = 1920, canvasHeight = 1080) {
  const w = Math.round(canvasWidth * 0.9);
  const h = Math.round(canvasHeight * 0.9);
  const x = Math.round((canvasWidth - w) / 2);
  const y = Math.round((canvasHeight - h) / 2);
  return {
    ...defaultBase,
    id: generateElementId("shape"),
    type: ELEMENT_TYPES.SHAPE,
    shape, // 'rectangle' | 'roundedRect' | 'circle'
    x, y, width: w, height: h,
    fillColor: "transparent",
    borderColor: "#C0A060",
    borderWidth: 4,
    borderRadius: shape === "roundedRect" ? 16 : (shape === "circle" ? 9999 : 0),
  };
}

/**
 * Creates a new line element.
 * @param {"horizontal"|"vertical"} orientation
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
export function createLineElement(orientation = "horizontal", canvasWidth = 1920, canvasHeight = 1080) {
  if (orientation === "horizontal") {
    return {
      ...defaultBase,
      id: generateElementId("line"),
      type: ELEMENT_TYPES.LINE,
      x: Math.round(canvasWidth * 0.1),
      y: Math.round(canvasHeight * 0.5),
      width: Math.round(canvasWidth * 0.8),
      height: 3,
      color: "#C0A060",
      thickness: 3,
    };
  }
  return {
    ...defaultBase,
    id: generateElementId("line"),
    type: ELEMENT_TYPES.LINE,
    x: Math.round(canvasWidth * 0.5),
    y: Math.round(canvasHeight * 0.1),
    width: 3,
    height: Math.round(canvasHeight * 0.8),
    color: "#C0A060",
    thickness: 3,
  };
}

// ─── Variable Extraction ──────────────────────────────────────────────────────

/**
 * Extracts all {{variable}} tokens from a string.
 * @param {string} str
 * @returns {string[]} array of variables like ["{{name}}", "{{event}}"]
 */
export function extractVariablesFromString(str = "") {
  const matches = (str || "").match(/\{\{[a-zA-Z0-9_]+\}\}/g);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Extracts all unique variables from an elements array.
 * Used for DataMapper step — returns variable strings like "{{name}}".
 * @param {Array} elements
 * @returns {string[]}
 */
export function extractVariablesFromElements(elements = []) {
  const vars = new Set();
  for (const el of elements) {
    if (!el.visible && el.visible !== undefined) continue; // skip hidden? No, still need mapping
    if (el.type === ELEMENT_TYPES.DYNAMIC_TEXT && el.variable) {
      vars.add(el.variable);
    } else if (el.type === ELEMENT_TYPES.PARAGRAPH && el.content) {
      for (const v of extractVariablesFromString(el.content)) {
        vars.add(v);
      }
    } else if (el.type === ELEMENT_TYPES.TEXT) {
      // Static text — no variables
    } else if (el.type === ELEMENT_TYPES.QR) {
      vars.add("{{certificateId}}");
    }
  }
  return [...vars];
}

/**
 * Converts elements[] to the legacy fields[] format required by
 * DataMapper, CertificatePreview, fieldMappingHelper (backward compat).
 *
 * Each dynamic variable becomes a field entry. Paragraph variables
 * are extracted individually. QR becomes isQr field.
 *
 * @param {Array} elements
 * @returns {Array} fields compatible with old schema
 */
export function elementsToLegacyFields(elements = []) {
  const seen = new Set();
  const fields = [];

  for (const el of elements) {
    if (el.type === ELEMENT_TYPES.DYNAMIC_TEXT && el.variable) {
      if (!seen.has(el.variable)) {
        seen.add(el.variable);
        const rawVar = el.variable.replace(/^\{\{|\}\}$/g, "");
        fields.push({
          id: el.id,
          label: rawVar.charAt(0).toUpperCase() + rawVar.slice(1),
          variable: el.variable,
          isQr: false,
          required: true,
          x: el.x, y: el.y, width: el.width, height: el.height,
          fontFamily: el.fontFamily, fontSize: el.fontSize,
          fontWeight: el.fontWeight, color: el.color, align: el.align,
          defaultValue: rawVar,
        });
      }
    } else if (el.type === ELEMENT_TYPES.PARAGRAPH && el.content) {
      const vars = extractVariablesFromString(el.content);
      for (const v of vars) {
        if (!seen.has(v)) {
          seen.add(v);
          const rawVar = v.replace(/^\{\{|\}\}$/g, "");
          fields.push({
            id: `para_${el.id}_${rawVar}`,
            label: rawVar.charAt(0).toUpperCase() + rawVar.slice(1),
            variable: v,
            isQr: false,
            required: true,
            x: el.x, y: el.y, width: el.width, height: el.height,
            fontFamily: el.fontFamily, fontSize: el.fontSize,
            fontWeight: el.fontWeight, color: el.color, align: el.align,
            defaultValue: rawVar,
          });
        }
      }
    } else if (el.type === ELEMENT_TYPES.QR) {
      if (!seen.has("{{qrCode}}")) {
        seen.add("{{qrCode}}");
        fields.push({
          id: el.id,
          label: "Verification QR Code",
          variable: "{{qrCode}}",
          isQr: true,
          required: false,
          x: el.x, y: el.y, width: el.width, height: el.height,
          defaultValue: "",
        });
      }
      // Also ensure certificateId is included
      if (!seen.has("{{certificateId}}")) {
        seen.add("{{certificateId}}");
        fields.push({
          id: `certid_${el.id}`,
          label: "Certificate ID",
          variable: "{{certificateId}}",
          isQr: false,
          required: false,
          x: el.x, y: el.y, width: el.width, height: el.height,
          defaultValue: "",
        });
      }
    }
  }

  return fields;
}

// ─── Backward Compatibility Migration ────────────────────────────────────────

/**
 * Migrates an old-format fields[] array into the new elements[] format.
 * Called when loading templates saved before v2.
 *
 * @param {Array} fields - old fields array
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @returns {Array} elements in new format
 */
export function migrateFieldsToElements(fields = [], canvasWidth = 1920, canvasHeight = 1080) {
  return fields.map((field, idx) => {
    const base = {
      ...defaultBase,
      id: field.id || generateElementId("migrated"),
      x: Number(field.x) || 0,
      y: Number(field.y) || 0,
      width: Number(field.width) || Math.round(canvasWidth * 0.5),
      height: Number(field.height) || Math.round(canvasHeight * 0.08),
      fontFamily: field.fontFamily || "'Inter', sans-serif",
      fontSize: Number(field.fontSize) || 32,
      fontWeight: String(field.fontWeight || "600"),
      color: field.color || "#1e293b",
      align: field.align || "center",
      lineHeight: Number(field.lineHeight) || 1.4,
      letterSpacing: Number(field.letterSpacing) || 0,
    };

    // QR field
    if (field.isQr || field.variable === "{{qrCode}}" || field.type === "qr") {
      return {
        ...base,
        type: ELEMENT_TYPES.QR,
        // override dimensions to be square
        width: Math.max(base.width, base.height),
        height: Math.max(base.width, base.height),
      };
    }

    // Dynamic variable field
    if (field.variable && field.variable.match(/^\{\{[a-zA-Z0-9_]+\}\}$/)) {
      return {
        ...base,
        type: ELEMENT_TYPES.DYNAMIC_TEXT,
        variable: field.variable,
        fontStyle: "normal",
        textDecoration: "none",
      };
    }

    // Paragraph (has multi-variable content)
    if (field.type === "paragraph" || (field.content && field.content.includes("{{"))) {
      return {
        ...base,
        type: ELEMENT_TYPES.PARAGRAPH,
        content: field.content || field.variable || "",
        verticalAlign: "middle",
        fontStyle: "normal",
        textDecoration: "none",
      };
    }

    // Static text fallback
    return {
      ...base,
      type: ELEMENT_TYPES.TEXT,
      content: field.content || field.defaultValue || field.label || "Text",
      fontStyle: "normal",
      textDecoration: "none",
    };
  });
}

/**
 * Checks whether a given template data object uses the old (v1) schema.
 * @param {object} templateData
 * @returns {boolean}
 */
export function isLegacyTemplate(templateData) {
  return (
    !templateData.version ||
    templateData.version < SCHEMA_VERSION ||
    (!Array.isArray(templateData.elements) && Array.isArray(templateData.fields))
  );
}

/**
 * Ensures a template always has elements[].
 * If it's a legacy template, migrates fields to elements.
 * If it's v2, returns elements as-is.
 *
 * @param {object} templateData
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @returns {Array} elements
 */
export function normalizeTemplateElements(templateData, canvasWidth = 1920, canvasHeight = 1080) {
  if (Array.isArray(templateData.elements) && templateData.elements.length > 0) {
    return templateData.elements;
  }
  if (Array.isArray(templateData.fields) && templateData.fields.length > 0) {
    return migrateFieldsToElements(templateData.fields, canvasWidth, canvasHeight);
  }
  return [];
}

// ─── Standard Variables Registry ─────────────────────────────────────────────

export const STANDARD_VARIABLES = [
  { variable: "{{name}}", label: "Participant Name", group: "Standard" },
  { variable: "{{event}}", label: "Event Name", group: "Standard" },
  { variable: "{{position}}", label: "Position / Award", group: "Standard" },
  { variable: "{{date}}", label: "Event Date", group: "Standard" },
  { variable: "{{rollNo}}", label: "Roll Number", group: "Standard" },
  { variable: "{{certificateId}}", label: "Certificate ID", group: "Standard" },
];

export const GOOGLE_FONTS = [
  { name: "Cinzel (Classic Serif)", value: "'Cinzel', serif" },
  { name: "Playfair Display (Elegant Serif)", value: "'Playfair Display', serif" },
  { name: "Montserrat (Clean Sans)", value: "'Montserrat', sans-serif" },
  { name: "Inter (Modern Sans)", value: "'Inter', sans-serif" },
  { name: "Poppins (Geometric Sans)", value: "'Poppins', sans-serif" },
  { name: "Lato (Friendly Sans)", value: "'Lato', sans-serif" },
  { name: "Roboto (Universal)", value: "'Roboto', sans-serif" },
  { name: "Alex Brush (Script)", value: "'Alex Brush', cursive" },
  { name: "Great Vibes (Flourished Script)", value: "'Great Vibes', cursive" },
  { name: "Cinzel Decorative (Ornate)", value: "'Cinzel Decorative', cursive" },
  { name: "Courier New (Monospace)", value: "'Courier New', monospace" },
];
