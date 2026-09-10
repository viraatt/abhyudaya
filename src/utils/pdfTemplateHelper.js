/**
 * Template Helper for Bulk Certificate Generator.
 * Handles uploading and processing of certificate templates in PNG, JPG, JPEG, WEBP, and single-page PDF formats.
 * Extracts native pixel dimensions and creates high-fidelity canvas/image previews.
 */

/**
 * Loads an image file and determines its native dimensions.
 *
 * @param {File|Blob} file
 * @returns {Promise<{ originalWidth: number, originalHeight: number, previewUrl: string, blob: Blob, format: string, mimeType: string, fileName: string, fileSize: number, isPdf: boolean }>}
 */
export async function processImageTemplate(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const originalWidth = img.naturalWidth || img.width;
      const originalHeight = img.naturalHeight || img.height;

      const ext = (file.name || "").split(".").pop().toLowerCase();
      let format = file.type;
      if (!format || format === "application/octet-stream") {
        if (ext === "jpg" || ext === "jpeg") format = "image/jpeg";
        else if (ext === "png") format = "image/png";
        else if (ext === "webp") format = "image/webp";
        else format = "image/jpeg";
      }

      resolve({
        originalWidth,
        originalHeight,
        previewUrl: objectUrl,
        blob: file,
        format,
        mimeType: format,
        fileName: file.name || "template",
        fileSize: file.size || 0,
        isPdf: false,
      });
    };

    img.onerror = () => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}
      reject(new Error("Failed to load image template. Please ensure the file is a valid JPG, PNG, or WEBP image."));
    };

    img.src = objectUrl;
  });
}

/**
 * Safely revokes a generated blob object URL to free memory.
 *
 * @param {string} url
 */
export function revokeTemplatePreview(url) {
  if (url && typeof url === "string" && url.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
}

/**
 * Loads a remote template URL (e.g. from Firebase Storage) and converts it to a local blob URL
 * to avoid CORS/auth issues with plain <img> tags.
 *
 * @param {string} url
 * @param {Object} metadata
 * @returns {Promise<Object>}
 */
export async function loadRemoteTemplate(url, metadata = {}) {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.statusText}`);
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          originalWidth: metadata.originalWidth || img.naturalWidth || img.width,
          originalHeight: metadata.originalHeight || img.naturalHeight || img.height,
          previewUrl: objectUrl,
          blob,
          format: blob.type || "image/jpeg",
          mimeType: blob.type || "image/jpeg",
          fileName: metadata.fileName || "template",
          fileSize: blob.size,
          isPdf: blob.type === "application/pdf",
        });
      };
      img.onerror = () => {
        resolve({
          originalWidth: metadata.originalWidth || 1920,
          originalHeight: metadata.originalHeight || 1080,
          previewUrl: objectUrl,
          blob,
          format: blob.type || "image/jpeg",
          mimeType: blob.type || "image/jpeg",
          fileName: metadata.fileName || "template",
          fileSize: blob.size,
          isPdf: false,
        });
      };
      img.src = objectUrl;
    });
  } catch (err) {
    console.warn("Could not fetch remote template to blob, falling back to direct URL:", err);
    return {
      originalWidth: metadata.originalWidth || 1920,
      originalHeight: metadata.originalHeight || 1080,
      previewUrl: url,
      blob: null,
      format: "image/jpeg",
      mimeType: "image/jpeg",
      fileName: metadata.fileName || "template",
      fileSize: 0,
      isPdf: false,
    };
  }
}

/**
 * Renders the first page of a PDF certificate template to a high-DPI canvas/blob.
 *
 * @param {File|Blob} file
 * @param {number} renderScale - Resolution scale factor (default 2.5 for crisp print quality)
 * @returns {Promise<{ originalWidth: number, originalHeight: number, previewUrl: string, blob: Blob, format: string, mimeType: string, fileName: string, fileSize: number, isPdf: boolean }>}
 */
export async function processPdfTemplate(file, renderScale = 2.5) {
  try {
    const pdfjsLib = await import("pdfjs-dist");

    // Configure worker if not yet set
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.10.38"}/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    if (pdf.numPages < 1) {
      throw new Error("PDF file contains no pages.");
    }

    // Get the first page
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1.0 });

    // Native points (72 DPI) - standard A4 is 842 x 595
    const originalWidth = Math.round(baseViewport.width);
    const originalHeight = Math.round(baseViewport.height);

    // High resolution render
    const scaledViewport = page.getViewport({ scale: renderScale });
    const canvas = document.createElement("canvas");
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    const ctx = canvas.getContext("2d", { alpha: false });
    const renderContext = {
      canvasContext: ctx,
      viewport: scaledViewport,
    };

    await page.render(renderContext).promise;

    // Convert rendered canvas to blob
    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png", 0.95);
    });

    const previewUrl = URL.createObjectURL(blob);

    return {
      originalWidth: canvas.width,
      originalHeight: canvas.height,
      nativePointsWidth: originalWidth,
      nativePointsHeight: originalHeight,
      previewUrl,
      blob,
      format: "application/pdf",
      mimeType: "image/png", // Rendered page is PNG
      fileName: file.name || "template.pdf",
      fileSize: file.size || blob.size,
      isPdf: true,
    };
  } catch (err) {
    console.error("PDF processing failed:", err);
    throw new Error(
      `Failed to render PDF template: ${err.message || "Unknown error"}. Try uploading as high-res PNG or JPG.`
    );
  }
}

/**
 * Universal template processor supporting PNG, JPG, JPEG, WEBP, and PDF.
 *
 * @param {File} file
 * @returns {Promise<{ originalWidth: number, originalHeight: number, previewUrl: string, blob: Blob, isPdf: boolean, format: string, mimeType: string, fileName: string, fileSize: number }>}
 */
export async function processTemplateFile(file) {
  if (!file) {
    throw new Error("No template file provided.");
  }

  const name = file.name || "";
  const ext = name.split(".").pop().toLowerCase();
  const type = file.type || "";

  if (ext === "pdf" || type === "application/pdf") {
    return processPdfTemplate(file);
  }

  if (["png", "jpg", "jpeg", "webp"].includes(ext) || type.startsWith("image/")) {
    return processImageTemplate(file);
  }

  throw new Error(
    `Unsupported template format ".${ext}". Please upload a PNG, JPG, JPEG, or PDF file.`
  );
}
