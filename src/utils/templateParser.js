/**
 * Shared Template & Rich Text Run Parser for Abhyudaya Certificate Generator.
 *
 * Decomposes text containing {{variables}} into styled text runs:
 * [
 *   { type: "text", value: "This is to certify that ", bold: false },
 *   { type: "variable", rawVar: "name", value: "Ayush Shukla", bold: true },
 *   ...
 * ]
 *
 * Used uniformly across:
 *  - Certificate Designer (CanvasStage)
 *  - Live Preview (CertificatePreview)
 *  - Participant Switcher Preview
 *  - Single PDF Generator (pdfGenerator)
 *  - Batch Certificate Generator (GenerationProgress)
 */

import { resolveFieldValue } from "./fieldMappingHelper";

/**
 * Parses template text containing {{variable}} placeholders into an array of styled text runs.
 *
 * @param {string} content - Template string e.g. "This is to certify that {{name}} from {{college}}..."
 * @param {object} [options]
 * @param {Record<string, string>} [options.mapping={}] - Variable to column map
 * @param {Record<string, string>} [options.row={}] - Participant row data
 * @param {object} [options.options={}] - Context ({ eventName, eventDate, certificateId, rowIndex })
 * @param {boolean} [options.autoBoldVariables=true] - Whether substituted variables should be bold
 * @param {boolean} [options.isPreview=false] - Whether in preview mode (resolves values vs shows {{var}})
 * @param {string|number} [options.baseFontWeight="400"] - Element's base font weight
 * @returns {Array<{
 *   type: "text" | "variable",
 *   value: string,
 *   rawVar?: string,
 *   bold: boolean,
 *   fontWeight: string
 * }>}
 */
export function parseTemplateText(content = "", options = {}) {
  if (content === null || content === undefined) return [];
  const text = String(content);
  if (!text) return [];

  const {
    mapping = {},
    row = null,
    options: contextOptions = {},
    autoBoldVariables = true,
    isPreview = false,
    baseFontWeight = "400",
  } = options;

  const isBaseBold =
    Number(baseFontWeight) >= 600 || String(baseFontWeight).toLowerCase().includes("bold");

  // Regex to match {{variable_name}}
  const varRegex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  const runs = [];
  let lastIndex = 0;
  let match;

  while ((match = varRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    const fullMatch = match[0]; // e.g. "{{name}}"
    const varName = match[1];   // e.g. "name"

    // 1. Preceding static text run
    if (matchIndex > lastIndex) {
      const staticChunk = text.slice(lastIndex, matchIndex);
      runs.push({
        type: "text",
        value: staticChunk,
        bold: isBaseBold,
        fontWeight: isBaseBold ? "700" : String(baseFontWeight || "400"),
      });
    }

    // 2. Dynamic variable run
    let resolvedValue = fullMatch;
    // Resolve if row is provided or in preview/PDF mode
    if (row || isPreview) {
      const syntheticField = {
        variable: fullMatch,
        defaultValue: fullMatch,
      };
      const val = resolveFieldValue(syntheticField, mapping, row || {}, contextOptions);
      resolvedValue = val !== undefined && val !== null && val !== "" ? String(val) : fullMatch;
    }

    const isVarBold = autoBoldVariables ? true : isBaseBold;

    runs.push({
      type: "variable",
      rawVar: varName,
      value: resolvedValue,
      bold: isVarBold,
      fontWeight: isVarBold ? "700" : String(baseFontWeight || "400"),
    });

    lastIndex = varRegex.lastIndex;
  }

  // 3. Trailing static text run
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    runs.push({
      type: "text",
      value: remaining,
      bold: isBaseBold,
      fontWeight: isBaseBold ? "700" : String(baseFontWeight || "400"),
    });
  }

  return runs;
}

/**
 * Returns plain combined text from parsed runs.
 *
 * @param {Array<{ value: string }>} runs
 * @returns {string}
 */
export function runsToPlainText(runs = []) {
  return runs.map((r) => r.value).join("");
}
