/**
 * High-fidelity PDF Rendering and Generation Engine for Bulk Certificate Generator.
 * Built on pdf-lib and jszip.
 *
 * v2: Supports full element schema — text, dynamicText, paragraph (with word-wrap),
 * image, signature, qr, shape, and line elements.
 * Backward-compatible with old fields[] format.
 *
 * PERFORMANCE: generateCertificatePdf accepts an optional preloaded `templateAsset`
 * (from templateAssetLoader.loadTemplateAsset). When provided, the template image
 * is NEVER re-fetched — eliminating repeated CORS requests to Firebase Storage
 * during batch generation.
 */

import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import JSZip from "jszip";
import QRCode from "qrcode";
import { resolveFieldValue, parseTemplateText } from "./fieldMappingHelper.js";

const IS_DEV = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV;

/** Module-level cache for image/signature element ArrayBuffers within a generation batch. */
const imageAssetCache = new Map();

/** Clear the image asset cache — call once before starting a new batch. */
export function clearImageAssetCache() {
  imageAssetCache.clear();
}

/**
 * Normalizes unicode quotes, dashes, and whitespace to standard characters.
 */
export function sanitizeForPdfFont(text) {
  if (!text) return "";
  return String(text)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2026]/g, "...")
    .replace(/[\u00A0]/g, " ")
    .trim();
}

/**
 * Filters out characters not encodable by standard WinAnsi PDF fonts to prevent crashing.
 */
export function safeWinAnsiText(text) {
  const sanitized = sanitizeForPdfFont(text);
  // Keep ASCII printable + Latin-1 supplement
  const safe = sanitized.replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
  return safe || sanitized;
}

/**
 * Converts Hex or RGB string into pdf-lib normalized RGB object.
 *
 * @param {string} colorStr - e.g. "#1e293b" or "rgb(30, 41, 59)"
 * @returns {object} pdf-lib rgb(r, g, b)
 */
export function parseColorToRgb(colorStr = "#000000") {
  if (!colorStr) return rgb(0, 0, 0);

  // Hex format: #rrggbb or #rgb
  if (colorStr.startsWith("#")) {
    let hex = colorStr.slice(1);
    if (hex.length === 3) {
      hex = hex.split("").map((c) => c + c).join("");
    }
    const num = parseInt(hex, 16);
    if (!isNaN(num)) {
      const r = ((num >> 16) & 255) / 255;
      const g = ((num >> 8) & 255) / 255;
      const b = (num & 255) / 255;
      return rgb(r, g, b);
    }
  }

  // RGB format: rgb(r, g, b)
  const rgbMatch = colorStr.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbMatch) {
    return rgb(
      Number(rgbMatch[1]) / 255,
      Number(rgbMatch[2]) / 255,
      Number(rgbMatch[3]) / 255
    );
  }

  return rgb(0.1, 0.15, 0.2);
}

/**
 * Maps configured font family and weight to the closest pdf-lib StandardFont.
 *
 * @param {string} fontFamily
 * @param {string|number} fontWeight
 * @returns {string} StandardFonts key
 */
export function selectStandardFont(fontFamily = "", fontWeight = "600") {
  const normFamily = (fontFamily || "").toLowerCase();
  const isBold = Number(fontWeight) >= 600 || String(fontWeight).includes("bold");

  if (normFamily.includes("cinzel") || normFamily.includes("playfair") || normFamily.includes("serif") || normFamily.includes("georgia")) {
    return isBold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman;
  }

  if (normFamily.includes("alex") || normFamily.includes("vibes") || normFamily.includes("cursive") || normFamily.includes("script")) {
    return StandardFonts.TimesRomanItalic;
  }

  if (normFamily.includes("mono") || normFamily.includes("courier")) {
    return isBold ? StandardFonts.CourierBold : StandardFonts.Courier;
  }

  // Default Sans-Serif (Inter, Montserrat, Roboto, Arial, Helvetica)
  return isBold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica;
}

/**
 * Generates a unique, standardized certificate ID matching Abhyudaya's format.
 * Format: ABH-CERT{YY}-{0001} (e.g. ABH-CERT26-0001)
 *
 * @param {string} prefix - Custom prefix (default "ABH-CERT")
 * @param {number} index - 1-based sequential index
 * @param {number} year - 2-digit year (default current year)
 * @returns {string} Standardized certificate ID
 */
export function generateUniqueCertId(prefix = "ABH-CERT", index = 1, year = null) {
  const yy = year ? String(year).slice(-2) : new Date().getFullYear().toString().slice(-2);
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();
  const paddedIndex = String(index).padStart(4, "0");

  if (cleanPrefix.includes(yy)) {
    return `${cleanPrefix}-${paddedIndex}`;
  }
  return `${cleanPrefix}${yy}-${paddedIndex}`;
}

/**
 * Creates safe, collision-free filenames for certificates.
 * e.g. "Ishan_Shukla_ABH-CERT26-0001.pdf" or "Ishan_Shukla_2.pdf"
 *
 * @param {string} participantName
 * @param {string} certificateId
 * @param {number} duplicateCounter
 * @returns {string} Safe filename ending with .pdf
 */
export function sanitizeFileName(participantName = "Participant", certificateId = "", duplicateCounter = 0) {
  const cleanName = (participantName || "Participant")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "") // Remove Windows invalid characters
    .replace(/\s+/g, "_");

  const cleanCertId = (certificateId || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "");

  if (cleanCertId) {
    return `${cleanName}_${cleanCertId}.pdf`;
  }

  if (duplicateCounter > 1) {
    return `${cleanName}_${duplicateCounter}.pdf`;
  }

  return `${cleanName}.pdf`;
}

/**
 * Renders multi-run rich text onto a pdf-lib page with word-wrap,
 * font-aware line width measurement, mixed normal/bold fonts, and alignment.
 */
async function renderRichTextOnPage({
  page,
  originalHeight,
  field,
  runs,
  getFont,
  fieldX,
  fieldY,
  fieldWidth,
  fieldHeight,
  fieldOpacity = 1,
  fieldRotation = 0,
}) {
  if (!runs || runs.length === 0) return;

  const fontFamily = field.fontFamily || "'Inter', sans-serif";
  const baseWeight = field.fontWeight || "400";
  const fontSize = Number(field.fontSize) || 26;
  const lineHeight = Number(field.lineHeight) || 1.4;
  const lineHeightPx = fontSize * lineHeight;
  const textColor = parseColorToRgb(field.color || "#1e293b");
  const align = field.align || "center";
  const vertAlign = field.verticalAlign || (field.type === "paragraph" ? "middle" : "middle");

  const normalFont = await getFont(fontFamily, baseWeight);
  const boldFont = await getFont(fontFamily, "700");

  // Tokenize runs by whitespace while preserving space characters
  const tokens = [];
  for (const run of runs) {
    if (run.value === undefined || run.value === null) continue;
    const val = String(run.value);
    if (!val) continue;

    const font = run.bold ? boldFont : normalFont;
    const parts = val.split(/(\s+)/);

    for (const part of parts) {
      if (!part) continue;
      const isWhitespace = /^\s+$/.test(part);
      const safe = safeWinAnsiText(part);
      const textToMeasure = isWhitespace ? " " : (safe || " ");
      const width = font.widthOfTextAtSize(textToMeasure, fontSize);
      tokens.push({
        text: isWhitespace ? " " : safe,
        isWhitespace,
        font,
        width,
        bold: run.bold,
      });
    }
  }

  if (tokens.length === 0) return;

  // Word wrapping
  const lines = [];
  let currentTokens = [];
  let currentLineWidth = 0;

  for (const token of tokens) {
    if (token.isWhitespace) {
      if (currentTokens.length === 0) continue; // skip leading space
      currentTokens.push(token);
      currentLineWidth += token.width;
    } else {
      if (currentTokens.length > 0 && fieldWidth > 0 && (currentLineWidth + token.width > fieldWidth)) {
        // Line wrap: trim trailing spaces
        while (currentTokens.length > 0 && currentTokens[currentTokens.length - 1].isWhitespace) {
          const popped = currentTokens.pop();
          currentLineWidth -= popped.width;
        }
        if (currentTokens.length > 0) {
          lines.push({ tokens: currentTokens, width: currentLineWidth });
        }
        currentTokens = [token];
        currentLineWidth = token.width;
      } else {
        currentTokens.push(token);
        currentLineWidth += token.width;
      }
    }
  }

  // Flush remaining tokens
  while (currentTokens.length > 0 && currentTokens[currentTokens.length - 1].isWhitespace) {
    const popped = currentTokens.pop();
    currentLineWidth -= popped.width;
  }
  if (currentTokens.length > 0) {
    lines.push({ tokens: currentTokens, width: currentLineWidth });
  }

  if (lines.length === 0) return;

  // Vertical position
  const totalTextHeight = lines.length * lineHeightPx;
  let startY;
  if (vertAlign === "top") {
    startY = originalHeight - fieldY - fontSize;
  } else if (vertAlign === "bottom") {
    startY = originalHeight - fieldY - fieldHeight + totalTextHeight - (lineHeightPx - fontSize);
  } else {
    // middle
    const verticalOffset = Math.max(0, (fieldHeight - totalTextHeight) / 2);
    startY = originalHeight - fieldY - verticalOffset - fontSize;
  }

  // Draw lines
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const lineY = startY - li * lineHeightPx;

    // Boundary check if fieldHeight specified
    if (fieldHeight > 0) {
      if (lineY < originalHeight - fieldY - fieldHeight - 10) break;
      if (lineY > originalHeight - fieldY + 10) continue;
    }

    let lineX = fieldX;
    if (align === "center") {
      lineX = fieldX + Math.max(0, (fieldWidth - line.width) / 2);
    } else if (align === "right") {
      lineX = fieldX + Math.max(0, fieldWidth - line.width);
    }

    for (const t of line.tokens) {
      if (!t.isWhitespace && t.text) {
        page.drawText(t.text, {
          x: lineX,
          y: lineY,
          size: fontSize,
          font: t.font,
          color: textColor,
          opacity: fieldOpacity,
          rotate: fieldRotation ? degrees(fieldRotation) : undefined,
        });
      }
      lineX += t.width;
    }
  }
}

/**
 * Renders a single certificate into a standalone PDF document.
 * Preserves exact original template dimensions, background resolution, and text placement.
 *
 * @param {object} params
 * @param {object} params.template - { originalWidth, originalHeight, blob, previewUrl, isPdf }
 * @param {object} [params.templateAsset] - Preloaded asset from loadTemplateAsset():
 *   { arrayBuffer, isJpg, isPng, isPdf, mimeType, width, height }
 *   When provided, skips all template fetching (prevents repeated CORS requests in batch mode).
 * @param {Array<object>} params.fields - Array of field objects with x, y, width, height, fontSize, etc.
 * @param {Record<string, string>} params.mapping - Variable to column map
 * @param {Record<string, string>} params.row - Participant row data
 * @param {object} params.options - { certificateId, eventName, eventDate, rowIndex }
 * @returns {Promise<{
 *   pdfBytes: Uint8Array,
 *   certificateId: string,
 *   fileName: string,
 *   metadata: object
 * }>}
 */
export async function generateCertificatePdf({
  template,
  templateAsset = null,
  fields = [],
  mapping = {},
  row = {},
  options = {},
}) {
  if (!template) {
    throw new Error("No template provided for certificate rendering.");
  }

  const originalWidth = Number(templateAsset?.width || template.originalWidth) || 1920;
  const originalHeight = Number(templateAsset?.height || template.originalHeight) || 1080;

  // 1. Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // 2. Add page with exact template dimensions (0 distortion)
  const page = pdfDoc.addPage([originalWidth, originalHeight]);

  // 3. Embed background template image
  // PERFORMANCE: If templateAsset is preloaded (batch mode), use the cached ArrayBuffer directly.
  // This prevents 53 repeated fetch() calls to Firebase Storage during bulk generation.
  if (templateAsset && templateAsset.arrayBuffer && templateAsset.arrayBuffer.byteLength > 0) {
    // ── Fast path: use preloaded asset ──────────────────────────────────────
    try {
      let embeddedImage = null;
      if (templateAsset.isPdf) {
        const srcDoc = await PDFDocument.load(templateAsset.arrayBuffer);
        const [embeddedPage] = await pdfDoc.embedPages([srcDoc.getPage(0)]);
        page.drawPage(embeddedPage, { x: 0, y: 0, width: originalWidth, height: originalHeight });
      } else if (templateAsset.isJpg) {
        try {
          embeddedImage = await pdfDoc.embedJpg(templateAsset.arrayBuffer);
        } catch {
          // Try PNG as fallback (some JPEGs have incorrect headers)
          embeddedImage = await pdfDoc.embedPng(templateAsset.arrayBuffer);
        }
      } else {
        // PNG or rasterized WebP
        try {
          embeddedImage = await pdfDoc.embedPng(templateAsset.arrayBuffer);
        } catch {
          embeddedImage = await pdfDoc.embedJpg(templateAsset.arrayBuffer);
        }
      }
      if (embeddedImage) {
        page.drawImage(embeddedImage, { x: 0, y: 0, width: originalWidth, height: originalHeight });
      }
    } catch (embedErr) {
      console.warn("[PDF] Failed to embed preloaded template asset:", embedErr);
    }
  } else {
    // ── Fallback path: no preloaded asset (single-certificate mode or direct call) ──
    // This path should NOT be hit during batch generation with preloaded assets.
    if (IS_DEV) console.warn("[PDF] No preloaded templateAsset — falling back to blob/fetch. Avoid in batch mode.");

    let imageBlob = template.blob;
    if (!imageBlob && template.previewUrl) {
      try {
        const resp = await fetch(template.previewUrl);
        if (resp.ok) {
          imageBlob = await resp.blob();
        }
      } catch (fetchErr) {
        console.warn("[PDF] Could not fetch template image blob from previewUrl:", fetchErr);
      }
    }

    if (imageBlob) {
      const arrayBuffer = await imageBlob.arrayBuffer();
      const isPdfTemplate = template.isPdf || imageBlob.type === "application/pdf";

      if (isPdfTemplate) {
        const srcDoc = await PDFDocument.load(arrayBuffer);
        const [embeddedPage] = await pdfDoc.embedPages([srcDoc.getPage(0)]);
        page.drawPage(embeddedPage, { x: 0, y: 0, width: originalWidth, height: originalHeight });
      } else {
        const mime = (imageBlob.type || template.mimeType || template.format || "").toLowerCase();
        const isJpg = mime.includes("jpg") || mime.includes("jpeg") || (template.name && /\.(jpe?g)$/i.test(template.name));
        let embeddedImage = null;

        if (isJpg) {
          try {
            embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
          } catch {
            try {
              embeddedImage = await pdfDoc.embedPng(arrayBuffer);
            } catch (pngErr) {
              if (IS_DEV) console.warn("[PDF] Fallback PNG embedding failed:", pngErr);
            }
          }
        } else {
          try {
            embeddedImage = await pdfDoc.embedPng(arrayBuffer);
          } catch {
            try {
              embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
            } catch (jpgErr) {
              if (IS_DEV) console.warn("[PDF] Fallback JPG embedding failed:", jpgErr);
            }
          }
        }

        // Final fallback: rasterize via canvas
        if (!embeddedImage && typeof document !== "undefined") {
          try {
            const img = new Image();
            await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = template.previewUrl || URL.createObjectURL(imageBlob); });
            const canvas = document.createElement("canvas");
            canvas.width = originalWidth; canvas.height = originalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, originalWidth, originalHeight);
            const pngBlob = await new Promise((r) => canvas.toBlob(r, "image/png"));
            if (pngBlob) {
              const pngBuf = await pngBlob.arrayBuffer();
              embeddedImage = await pdfDoc.embedPng(pngBuf);
            }
          } catch (canvasErr) {
            console.warn("[PDF] Canvas rasterization fallback failed:", canvasErr);
          }
        }

        if (embeddedImage) {
          page.drawImage(embeddedImage, { x: 0, y: 0, width: originalWidth, height: originalHeight });
        }
      }
    }
  }

  // 4. Determine certificate ID
  const certId =
    options.certificateId ||
    resolveFieldValue({ variable: "{{certificateId}}" }, mapping, row, options) ||
    generateUniqueCertId("ABH-CERT", (options.rowIndex || 0) + 1);

  // 5. Preload cached standard fonts to avoid redundant font creation
  const fontCache = new Map();
  const getFont = async (fontFamily, fontWeight) => {
    const fontKey = selectStandardFont(fontFamily, fontWeight);
    if (!fontCache.has(fontKey)) {
      const font = await pdfDoc.embedFont(fontKey);
      fontCache.set(fontKey, font);
    }
    return fontCache.get(fontKey);
  };

  // 6. Draw each element onto the PDF page
  for (const field of fields) {
    // Skip hidden elements
    if (field.visible === false) continue;

    const fieldWidth = Number(field.width) || originalWidth;
    const fieldHeight = Number(field.height) || 60;
    const fieldX = Number(field.x) || 0;
    const fieldY = Number(field.y) || 0;
    const fieldOpacity = field.opacity !== undefined ? Number(field.opacity) : 1;
    const fieldRotation = Number(field.rotation) || 0;

    // ── QR CODE element ──────────────────────────────────────────────────────
    const isQrField = field.isQr || field.variable === "{{qrCode}}" || field.type === "qr";
    if (isQrField) {
      const baseUrl =
        options.baseUrl ||
        (typeof window !== "undefined" ? window.location.origin : "https://www.abhyudayaclub.in");
      const verifyUrl = `${baseUrl}/verify/${certId}`;
      try {
        const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
          margin: 1,
          width: Math.max(128, Math.round(fieldWidth)),
          errorCorrectionLevel: "M",
        });
        const base64Data = qrDataUrl.split(",")[1];
        const qrPngBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const embeddedQr = await pdfDoc.embedPng(qrPngBytes);
        const pdfY = originalHeight - fieldY - fieldHeight;
        page.drawImage(embeddedQr, {
          x: fieldX,
          y: pdfY,
          width: fieldWidth,
          height: fieldHeight,
          opacity: fieldOpacity,
          rotate: fieldRotation ? degrees(fieldRotation) : undefined,
        });
      } catch (err) {
        console.warn("Failed to generate and embed QR code:", err);
      }
      continue;
    }

    // ── IMAGE / SIGNATURE element ─────────────────────────────────────────────
    // PERFORMANCE: Uses imageAssetCache to fetch each unique image URL only ONCE
    // per batch — not once per participant.
    if (field.type === "image" || field.type === "signature") {
      const imgSrc = field.src || field.storageUrl;
      if (!imgSrc) continue;

      try {
        let imgBytes = null;

        // Check module-level cache first
        if (imageAssetCache.has(imgSrc)) {
          imgBytes = imageAssetCache.get(imgSrc);
        } else {
          if (imgSrc.startsWith("blob:") || imgSrc.startsWith("data:")) {
            const resp = await fetch(imgSrc);
            if (resp.ok) imgBytes = await resp.arrayBuffer();
          } else if (imgSrc.startsWith("http")) {
            try {
              const resp = await fetch(imgSrc, { mode: "cors" });
              if (resp.ok) imgBytes = await resp.arrayBuffer();
            } catch {
              // Try proxy fallback for CORS-blocked assets
              const proxyResp = await fetch(`/api/admin/proxy-asset?url=${encodeURIComponent(imgSrc)}`);
              if (proxyResp.ok) imgBytes = await proxyResp.arrayBuffer();
            }
          }
          // Cache for subsequent participants in this batch
          if (imgBytes) imageAssetCache.set(imgSrc, imgBytes);
        }

        if (!imgBytes) continue;

        let embeddedImg = null;
        try {
          embeddedImg = await pdfDoc.embedPng(imgBytes);
        } catch {
          try {
            embeddedImg = await pdfDoc.embedJpg(imgBytes);
          } catch (imgErr) {
            console.warn("[PDF] Could not embed element image:", imgErr);
          }
        }

        if (embeddedImg) {
          const pdfY = originalHeight - fieldY - fieldHeight;
          page.drawImage(embeddedImg, {
            x: fieldX,
            y: pdfY,
            width: fieldWidth,
            height: fieldHeight,
            opacity: fieldOpacity,
            rotate: fieldRotation ? degrees(fieldRotation) : undefined,
          });
        }
      } catch (imgErr) {
        console.warn("Failed to embed image/signature element:", imgErr);
      }
      continue;
    }

    // ── SHAPE element ─────────────────────────────────────────────────────────
    if (field.type === "shape") {
      const fillColor = field.fillColor && field.fillColor !== "transparent"
        ? parseColorToRgb(field.fillColor)
        : null;
      const borderColor = field.borderColor ? parseColorToRgb(field.borderColor) : null;
      const borderWidth = Number(field.borderWidth) || 0;
      const pdfY = originalHeight - fieldY - fieldHeight;

      if (field.shape === "circle") {
        const cx = fieldX + fieldWidth / 2;
        const cy = pdfY + fieldHeight / 2;
        const rx = fieldWidth / 2;
        const ry = fieldHeight / 2;
        // pdf-lib drawEllipse
        try {
          page.drawEllipse({
            x: cx, y: cy,
            xScale: rx, yScale: ry,
            color: fillColor || undefined,
            borderColor: borderColor || undefined,
            borderWidth: borderWidth || undefined,
            opacity: fieldOpacity,
          });
        } catch {
          // Fallback for older pdf-lib
          page.drawCircle({
            x: cx, y: cy,
            size: Math.min(rx, ry),
            color: fillColor || undefined,
            borderColor: borderColor || undefined,
            borderWidth: borderWidth || undefined,
            opacity: fieldOpacity,
          });
        }
      } else {
        // rectangle / rounded rectangle
        page.drawRectangle({
          x: fieldX, y: pdfY,
          width: fieldWidth, height: fieldHeight,
          color: fillColor || undefined,
          borderColor: borderColor || undefined,
          borderWidth: borderWidth || undefined,
          borderLineCap: 0,
          opacity: fieldOpacity,
          rotate: fieldRotation ? degrees(fieldRotation) : undefined,
        });
      }
      continue;
    }

    // ── LINE element ──────────────────────────────────────────────────────────
    if (field.type === "line") {
      const lineColor = parseColorToRgb(field.color || "#c0a060");
      const lineThickness = Number(field.thickness) || 3;
      const pdfY = originalHeight - fieldY - lineThickness / 2;
      page.drawLine({
        start: { x: fieldX, y: pdfY },
        end: { x: fieldX + fieldWidth, y: pdfY },
        thickness: lineThickness,
        color: lineColor,
        opacity: fieldOpacity,
      });
      continue;
    }

    // ── PARAGRAPH element ─────────────────────────────────────────────────────
    if (field.type === "paragraph") {
      const rawContent = field.content || "";
      if (!rawContent) continue;
      const runs = parseTemplateText(rawContent, {
        mapping,
        row,
        options: { ...options, certificateId: certId },
        autoBoldVariables: field.autoBoldVariables !== false,
        isPreview: true,
        baseFontWeight: field.fontWeight || "400",
      });
      await renderRichTextOnPage({
        page,
        originalHeight,
        field,
        runs,
        getFont,
        fieldX,
        fieldY,
        fieldWidth,
        fieldHeight,
        fieldOpacity,
        fieldRotation,
      });
      continue;
    }

    // ── TEXT element (static / custom text) ───────────────────────────────────
    if (field.type === "text") {
      const content = field.content || "";
      if (!content) continue;
      const runs = parseTemplateText(content, {
        mapping,
        row,
        options: { ...options, certificateId: certId },
        autoBoldVariables: field.autoBoldVariables !== false,
        isPreview: true,
        baseFontWeight: field.fontWeight || "400",
      });
      await renderRichTextOnPage({
        page,
        originalHeight,
        field,
        runs,
        getFont,
        fieldX,
        fieldY,
        fieldWidth,
        fieldHeight,
        fieldOpacity,
        fieldRotation,
      });
      continue;
    }

    // ── DYNAMIC TEXT / Legacy field (backward compat) ─────────────────────────
    {
      const rawVar = field.variable || "";
      const textToParse = rawVar || field.defaultValue || "";
      if (!textToParse) continue;
      const runs = parseTemplateText(textToParse, {
        mapping,
        row,
        options: { ...options, certificateId: certId },
        autoBoldVariables: field.autoBoldVariables !== false,
        isPreview: true,
        baseFontWeight: field.fontWeight || "700",
      });
      await renderRichTextOnPage({
        page,
        originalHeight,
        field,
        runs,
        getFont,
        fieldX,
        fieldY,
        fieldWidth,
        fieldHeight,
        fieldOpacity,
        fieldRotation,
      });
    }
  } // end for (const field of fields)

  // 7. Save PDF bytes
  const pdfBytes = await pdfDoc.save();

  // 8. Determine safe filename
  const participantName =
    resolveFieldValue({ variable: "{{name}}" }, mapping, row, options) ||
    row.Name ||
    "Participant";

  const fileName = sanitizeFileName(participantName, certId, options.duplicateIndex);

  // 9. Prepare metadata matching Abhyudaya's existing certificate schema
  const metadata = {
    certificateId: certId,
    rollNo:
      resolveFieldValue({ variable: "{{rollNo}}" }, mapping, row, options) ||
      row.RollNo ||
      "",
    rollNoClean: (
      resolveFieldValue({ variable: "{{rollNo}}" }, mapping, row, options) ||
      row.RollNo ||
      ""
    ).trim().toLowerCase().replace(/\s+/g, " "),
    name: participantName.trim(),
    nameLower: participantName.trim().toLowerCase().replace(/\s+/g, " "),
    eventName:
      options.eventName ||
      resolveFieldValue({ variable: "{{event}}" }, mapping, row, options) ||
      row.Event ||
      "",
    eventDate:
      options.eventDate ||
      resolveFieldValue({ variable: "{{date}}" }, mapping, row, options) ||
      row.Date ||
      "",
    certificateType:
      resolveFieldValue({ variable: "{{position}}" }, mapping, row, options) ||
      row.Position ||
      "Participation",
    fileName,
    templateId: options.templateId || "",
    jobId: options.jobId || "",
  };

  return {
    pdfBytes,
    certificateId: certId,
    fileName,
    metadata,
  };
}

/**
 * Bundles an array of generated certificate PDFs into a compressed ZIP file.
 *
 * @param {Array<{ fileName: string, pdfBytes: Uint8Array }>} certificates
 * @returns {Promise<{
 *   zipBlob: Blob,
 *   zipBuffer: ArrayBuffer,
 *   totalFiles: number,
 *   sizeBytes: number
 * }>}
 */
export async function createCertificatesZip(certificates = []) {
  if (!certificates || certificates.length === 0) {
    throw new Error("No certificate files provided to create ZIP.");
  }

  const zip = new JSZip();

  certificates.forEach((cert) => {
    zip.file(cert.fileName, cert.pdfBytes);
  });

  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const zipBuffer = await zipBlob.arrayBuffer();

  return {
    zipBlob,
    zipBuffer,
    totalFiles: certificates.length,
    sizeBytes: zipBlob.size,
  };
}
