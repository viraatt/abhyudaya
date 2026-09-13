/**
 * Certificate Rendering, PDF Synthesis, and ZIP Packaging Utilities.
 * Pure JavaScript implementation with zero heavy external dependencies.
 */

/**
 * Standard font family options supported in the editor.
 */
export const AVAILABLE_FONTS = [
  { label: "Inter (Modern Sans)", value: "Inter, sans-serif" },
  { label: "Georgia (Classic Serif)", value: "Georgia, serif" },
  { label: "Playfair Display (Elegant Serif)", value: "'Playfair Display', serif" },
  { label: "Montserrat (Clean Sans)", value: "Montserrat, sans-serif" },
  { label: "Times New Roman (Formal)", value: "'Times New Roman', serif" },
  { label: "Arial (Standard)", value: "Arial, sans-serif" },
  { label: "Courier New (Monospace)", value: "'Courier New', monospace" },
];

/**
 * Default field presets for new templates.
 */
export const DEFAULT_TEMPLATE_FIELDS = [
  {
    id: "field_name",
    name: "Student Name",
    key: "name",
    sampleText: "John Doe",
    x: 50, // Percentage of width
    y: 48, // Percentage of height
    fontSize: 48, // Scaled for 1920 width
    fontFamily: "Georgia, serif",
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
    isRequired: true,
  },
  {
    id: "field_roll",
    name: "Roll Number",
    key: "rollNo",
    sampleText: "2301234567",
    x: 50,
    y: 56,
    fontSize: 24,
    fontFamily: "Inter, sans-serif",
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    isRequired: true,
  },
  {
    id: "field_event",
    name: "Event Name",
    key: "eventName",
    sampleText: "Techbloom 2026",
    x: 50,
    y: 63,
    fontSize: 28,
    fontFamily: "Inter, sans-serif",
    fontWeight: "700",
    color: "#2563eb",
    textAlign: "center",
    isRequired: true,
  },
  {
    id: "field_date",
    name: "Event Date",
    key: "eventDate",
    sampleText: "September 15, 2026",
    x: 25,
    y: 84,
    fontSize: 20,
    fontFamily: "Inter, sans-serif",
    fontWeight: "500",
    color: "#334155",
    textAlign: "center",
    isRequired: false,
  },
  {
    id: "field_id",
    name: "Certificate ID",
    key: "certificateId",
    sampleText: "ABH-TB26-0001",
    x: 75,
    y: 84,
    fontSize: 18,
    fontFamily: "'Courier New', monospace",
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    isRequired: true,
  },
];

/**
 * Loads an HTML Image object from a URL or Blob.
 *
 * @param {string|File|Blob} src
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error("Failed to load template image: " + err));

    if (src instanceof Blob || src instanceof File) {
      const url = URL.createObjectURL(src);
      img.src = url;
      // revoke URL once loaded
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
    } else {
      img.src = src;
    }
  });
}

/**
 * Renders the template image and text fields onto an HTML5 Canvas.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLImageElement} templateImg
 * @param {Array<object>} fields
 * @param {object} rowData - Dynamic student data record
 * @param {object} options
 */
export function renderCertificateToCanvas(
  canvas,
  templateImg,
  fields = [],
  rowData = {},
  options = {}
) {
  if (!canvas || !templateImg) return;

  const targetWidth = options.width || templateImg.naturalWidth || templateImg.width || 1920;
  const targetHeight = options.height || templateImg.naturalHeight || templateImg.height || 1080;

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, targetWidth, targetHeight);

  // Draw background template image
  ctx.drawImage(templateImg, 0, 0, targetWidth, targetHeight);

  // Target template dimensions
  const origW = options.originalWidth || options.width || targetWidth;
  const origH = options.originalHeight || options.height || targetHeight;
  const scaleX = targetWidth / (origW || 1);
  const scaleY = targetHeight / (origH || 1);

  // Render each text field
  fields.forEach((field) => {
    if (field.visible === false) return;

    // Resolve text value: rowData[mappedColumn] -> rowData[key] -> rowData[variable] -> sampleText -> defaultValue
    let text = "";
    const cleanVar = (field.variable || "").replace(/[{}]/g, "");
    if (field.mappedColumn && rowData[field.mappedColumn] !== undefined) {
      text = String(rowData[field.mappedColumn]);
    } else if (cleanVar && rowData[cleanVar] !== undefined) {
      text = String(rowData[cleanVar]);
    } else if (field.key && rowData[field.key] !== undefined) {
      text = String(rowData[field.key]);
    } else if (rowData[field.label || field.name] !== undefined) {
      text = String(rowData[field.label || field.name]);
    } else {
      text = field.sampleText || field.defaultValue || field.variable || field.label || "";
    }

    if (!text && text !== 0) return;

    const alignment = field.alignment || field.textAlign || "center";
    const fontWeight = field.fontWeight || "normal";
    const fontFamily = field.fontFamily || "Inter, sans-serif";
    const color = field.color || "#0f172a";

    // Handle both original-pixel coordinates (with bounding box) and legacy percentage
    let posX = 0;
    let posY = 0;
    let fontSize = 28;

    if (field.width !== undefined && field.height !== undefined) {
      const boxX = (Number(field.x) || 0) * scaleX;
      const boxY = (Number(field.y) || 0) * scaleY;
      const boxW = (Number(field.width) || 400) * scaleX;
      const boxH = (Number(field.height) || 80) * scaleY;

      if (alignment === "left") {
        posX = boxX;
      } else if (alignment === "right") {
        posX = boxX + boxW;
      } else {
        posX = boxX + boxW / 2;
      }

      posY = boxY + boxH / 2;
      fontSize = Math.round((Number(field.fontSize) || 32) * scaleX);
    } else {
      // Legacy percentage fallback
      posX = (Number(field.x) / 100) * targetWidth;
      posY = (Number(field.y) / 100) * targetHeight;
      fontSize = Math.round((Number(field.fontSize) || 24) * scaleX);
    }

    ctx.save();
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textAlign = alignment;
    ctx.textBaseline = "middle";

    // Optional letter spacing
    if (field.letterSpacing && ctx.letterSpacing !== undefined) {
      ctx.letterSpacing = `${field.letterSpacing * scaleX}px`;
    }

    // Draw text
    ctx.fillText(text, posX, posY);

    ctx.restore();
  });
}

/**
 * Creates a standard PDF Blob from a rendered Canvas.
 * Generates an ISO compliant PDF 1.4 file with the canvas encoded as high quality JPEG.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number} quality - 0.1 to 1.0 (default 0.92)
 * @returns {Promise<Blob>}
 */
export async function canvasToPdfBlob(canvas, quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error("Failed to export canvas to image blob"));
          return;
        }

        try {
          const arrayBuffer = await blob.arrayBuffer();
          const jpegBytes = new Uint8Array(arrayBuffer);

          const width = canvas.width;
          const height = canvas.height;

          // Landscape points standard (72 points per inch)
          // Maintain aspect ratio with a base width of 841.89 points (A4 landscape)
          const pdfWidth = 841.89;
          const pdfHeight = (height / width) * pdfWidth;

          const pdfBytes = buildSimplePdf(jpegBytes, width, height, pdfWidth, pdfHeight);
          resolve(new Blob([pdfBytes], { type: "application/pdf" }));
        } catch (err) {
          reject(err);
        }
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * Low-level PDF 1.4 synthesizer that embeds a JPEG byte stream.
 */
function buildSimplePdf(jpegBytes, imgW, imgH, pageW, pageH) {
  const parts = [];
  const offsets = [];

  const add = (str) => {
    const enc = new TextEncoder().encode(str);
    parts.push(enc);
    return enc.length;
  };

  const addBinary = (uint8) => {
    parts.push(uint8);
    return uint8.length;
  };

  let currentOffset = 0;

  const writePart = (str) => {
    const len = add(str);
    currentOffset += len;
  };

  const writeBinaryPart = (uint8) => {
    const len = addBinary(uint8);
    currentOffset += len;
  };

  // 1. PDF Header
  writePart("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");

  // Object 1: Catalog
  offsets[1] = currentOffset;
  writePart("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // Object 2: Pages
  offsets[2] = currentOffset;
  writePart(
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
  );

  // Object 3: Page
  offsets[3] = currentOffset;
  writePart(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(
      2
    )} ${pageH.toFixed(
      2
    )}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>\nendobj\n`
  );

  // Object 4: Contents (stream to place image)
  const contentStream = `q\n${pageW.toFixed(2)} 0 0 ${pageH.toFixed(
    2
  )} 0 0 cm\n/Im0 Do\nQ\n`;
  offsets[4] = currentOffset;
  writePart(
    `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`
  );

  // Object 5: Image XObject (JPEG data)
  offsets[5] = currentOffset;
  writePart(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  writeBinaryPart(jpegBytes);
  writePart("\nendstream\nendobj\n");

  // XRef table
  const xrefOffset = currentOffset;
  writePart("xref\n0 6\n0000000000 65535 f \n");
  for (let i = 1; i <= 5; i++) {
    const offStr = String(offsets[i]).padStart(10, "0");
    writePart(`${offStr} 00000 n \n`);
  }

  // Trailer
  writePart(
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  // Combine parts into single Uint8Array
  const totalLen = parts.reduce((acc, p) => acc + p.length, 0);
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of parts) {
    result.set(p, pos);
    pos += p.length;
  }

  return result;
}

/**
 * Generates an uncompressed ZIP archive from an array of files.
 * Format: array of { name: string, blob: Blob }
 *
 * @param {Array<{ name: string, blob: Blob }>} files
 * @returns {Promise<Blob>}
 */
export async function createZipFromFiles(files = []) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const file of files) {
    const arrayBuffer = await file.blob.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);
    const fileNameBytes = new TextEncoder().encode(file.name);
    const crc = computeCrc32(fileBytes);
    const size = fileBytes.length;

    // Date/Time in MS-DOS format
    const now = new Date();
    const dosTime =
      (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate =
      ((now.getFullYear() - 1980) << 9) |
      ((now.getMonth() + 1) << 5) |
      now.getDate();

    // Local file header (30 bytes)
    const localHeader = new Uint8Array(30 + fileNameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true); // Local file header signature
    localView.setUint16(4, 20, true); // Version needed to extract
    localView.setUint16(6, 0, true); // General purpose bit flag
    localView.setUint16(8, 0, true); // Compression method (0 = uncompressed)
    localView.setUint16(10, dosTime, true);
    localView.setUint16(12, dosDate, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, size, true); // Compressed size
    localView.setUint32(22, size, true); // Uncompressed size
    localView.setUint16(26, fileNameBytes.length, true);
    localView.setUint16(28, 0, true); // Extra field length
    localHeader.set(fileNameBytes, 30);

    localHeaders.push({
      header: localHeader,
      data: fileBytes,
      offset,
    });

    // Central directory header (46 bytes)
    const centralHeader = new Uint8Array(46 + fileNameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true); // Central directory header signature
    centralView.setUint16(4, 20, true); // Version made by
    centralView.setUint16(6, 20, true); // Version needed to extract
    centralView.setUint16(8, 0, true); // Flags
    centralView.setUint16(10, 0, true); // Method (uncompressed)
    centralView.setUint16(12, dosTime, true);
    centralView.setUint16(14, dosDate, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, size, true);
    centralView.setUint32(24, size, true);
    centralView.setUint16(28, fileNameBytes.length, true);
    centralView.setUint16(30, 0, true); // Extra field len
    centralView.setUint16(32, 0, true); // Comment len
    centralView.setUint16(34, 0, true); // Disk number start
    centralView.setUint16(36, 0, true); // Internal attributes
    centralView.setUint32(38, 0, true); // External attributes
    centralView.setUint32(42, offset, true); // Relative offset of local header
    centralHeader.set(fileNameBytes, 46);

    centralHeaders.push(centralHeader);

    offset += localHeader.length + fileBytes.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const ch of centralHeaders) {
    centralDirSize += ch.length;
  }

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true); // Number of this disk
  eocdView.setUint16(6, 0, true); // Disk with start of central directory
  eocdView.setUint16(8, files.length, true); // Total entries on this disk
  eocdView.setUint16(10, files.length, true); // Total entries
  eocdView.setUint32(12, centralDirSize, true); // Size of central directory
  eocdView.setUint32(16, centralDirOffset, true); // Offset of start of central directory
  eocdView.setUint16(20, 0, true); // Comment length

  // Combine into single Blob
  const blobParts = [];
  for (const lh of localHeaders) {
    blobParts.push(lh.header);
    blobParts.push(lh.data);
  }
  for (const ch of centralHeaders) {
    blobParts.push(ch);
  }
  blobParts.push(eocd);

  return new Blob(blobParts, { type: "application/zip" });
}

/**
 * CRC32 calculation table helper.
 */
let crcTable = null;
function makeCrcTable() {
  const cTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    cTable[n] = c;
  }
  return cTable;
}

function computeCrc32(uint8Array) {
  if (!crcTable) crcTable = makeCrcTable();
  let crc = 0 ^ -1;
  for (let i = 0; i < uint8Array.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ uint8Array[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

/**
 * Generates an automatic Certificate ID string.
 *
 * @param {string} prefix e.g. "ABH"
 * @param {string} eventCode e.g. "TB26"
 * @param {number} index e.g. 1
 * @param {number} pad e.g. 4
 * @returns {string} e.g. "ABH-TB26-0001"
 */
export function generateCertificateId(
  prefix = "ABH",
  eventCode = "CERT",
  index = 1,
  pad = 4
) {
  const cleanPrefix = (prefix || "ABH").toUpperCase().trim();
  const cleanCode = (eventCode || "CERT")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  const numStr = String(index).padStart(pad, "0");
  return `${cleanPrefix}-${cleanCode}-${numStr}`;
}
