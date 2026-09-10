/**
 * High-fidelity PDF Rendering and Generation Engine for Bulk Certificate Generator.
 * Built on pdf-lib and jszip.
 *
 * Preserves exact original certificate dimensions, text coordinates, font styles,
 * alignments, and generates collision-safe filenames and standardized Certificate IDs.
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import JSZip from "jszip";
import QRCode from "qrcode";
import { resolveFieldValue } from "./fieldMappingHelper.js";

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
 * Renders a single certificate into a standalone PDF document.
 * Preserves exact original template dimensions, background resolution, and text placement.
 *
 * @param {object} params
 * @param {object} params.template - { originalWidth, originalHeight, blob, previewUrl, isPdf }
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
  fields = [],
  mapping = {},
  row = {},
  options = {},
}) {
  if (!template) {
    throw new Error("No template provided for certificate rendering.");
  }

  const originalWidth = Number(template.originalWidth) || 1920;
  const originalHeight = Number(template.originalHeight) || 1080;

  // 1. Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // 2. Add page with exact template dimensions (0 distortion)
  const page = pdfDoc.addPage([originalWidth, originalHeight]);

  // 3. Embed background template image or PDF
  let imageBlob = template.blob;
  if (!imageBlob && template.previewUrl) {
    try {
      const resp = await fetch(template.previewUrl);
      if (resp.ok) {
        imageBlob = await resp.blob();
      }
    } catch (fetchErr) {
      console.warn("Could not fetch template image blob from previewUrl:", fetchErr);
    }
  }

  if (imageBlob) {
    const arrayBuffer = await imageBlob.arrayBuffer();
    const isPdfTemplate = template.isPdf || imageBlob.type === "application/pdf";

    if (isPdfTemplate) {
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const [embeddedPage] = await pdfDoc.embedPages([srcDoc.getPage(0)]);
      page.drawPage(embeddedPage, {
        x: 0,
        y: 0,
        width: originalWidth,
        height: originalHeight,
      });
    } else {
      const mime = (imageBlob.type || template.mimeType || template.format || "").toLowerCase();
      const isJpg = mime.includes("jpg") || mime.includes("jpeg") || (template.name && /\.(jpe?g)$/i.test(template.name));
      let embeddedImage = null;

      if (isJpg) {
        try {
          embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
        } catch (jpgErr) {
          try {
            embeddedImage = await pdfDoc.embedPng(arrayBuffer);
          } catch {
            console.warn("Could not embed image as JPG or PNG:", jpgErr);
          }
        }
      } else {
        try {
          embeddedImage = await pdfDoc.embedPng(arrayBuffer);
        } catch (pngErr) {
          try {
            embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
          } catch {
            console.warn("Could not embed image as PNG or JPG:", pngErr);
          }
        }
      }

      // Final fallback: rasterize via canvas if browser environment
      if (!embeddedImage && typeof document !== "undefined") {
        try {
          const img = new Image();
          await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
            img.src = template.previewUrl || URL.createObjectURL(imageBlob);
          });
          const canvas = document.createElement("canvas");
          canvas.width = originalWidth;
          canvas.height = originalHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, originalWidth, originalHeight);
          const pngBlob = await new Promise((r) => canvas.toBlob(r, "image/png"));
          if (pngBlob) {
            const pngBuf = await pngBlob.arrayBuffer();
            embeddedImage = await pdfDoc.embedPng(pngBuf);
          }
        } catch (canvasErr) {
          console.warn("Canvas rasterization fallback failed:", canvasErr);
        }
      }

      if (embeddedImage) {
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: originalWidth,
          height: originalHeight,
        });
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

  // 6. Draw each field (text or QR code) onto the PDF page
  for (const field of fields) {
    const fieldWidth = Number(field.width) || originalWidth;
    const fieldHeight = Number(field.height) || 60;
    const fieldX = Number(field.x) || 0;
    const fieldY = Number(field.y) || 0;

    // Check if this is a QR code field
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
        page.drawImage(embeddedQr, {
          x: fieldX,
          y: originalHeight - fieldY - fieldHeight,
          width: fieldWidth,
          height: fieldHeight,
        });
      } catch (err) {
        console.warn("Failed to generate and embed QR code:", err);
      }
      continue;
    }

    const rawValue = resolveFieldValue(field, mapping, row, {
      ...options,
      certificateId: certId,
    });

    if (!rawValue) continue;

    const textValue = safeWinAnsiText(rawValue);
    if (!textValue) continue;

    const font = await getFont(field.fontFamily, field.fontWeight);
    let fontSize = Number(field.fontSize) || 32;
    const textColor = parseColorToRgb(field.color || "#1e293b");

    // Auto-scale font size down if text exceeds field width (prevents text overflow)
    let textWidth = font.widthOfTextAtSize(textValue, fontSize);
    if (fieldWidth > 0 && textWidth > fieldWidth) {
      const scaleRatio = (fieldWidth - 4) / textWidth;
      fontSize = Math.max(8, Math.floor(fontSize * scaleRatio));
      textWidth = font.widthOfTextAtSize(textValue, fontSize);
    }

    // Horizontal Alignment calculation
    let drawX = fieldX;
    const align = field.align || "center";
    if (align === "center") {
      drawX = fieldX + Math.max(0, (fieldWidth - textWidth) / 2);
    } else if (align === "right") {
      drawX = fieldX + Math.max(0, fieldWidth - textWidth);
    }

    // Vertical Positioning conversion:
    // Web coordinates: (0, 0) top-left, Y goes DOWN.
    // PDF coordinates: (0, 0) bottom-left, Y goes UP.
    // Baseline approximation: place text in vertical middle of field box
    const verticalCenterOffset = Math.max(0, (fieldHeight - fontSize) / 2);
    const drawY = originalHeight - fieldY - fontSize - verticalCenterOffset;

    page.drawText(textValue, {
      x: drawX,
      y: drawY,
      size: fontSize,
      font,
      color: textColor,
    });
  }

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
