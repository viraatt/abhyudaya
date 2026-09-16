import { getCachedTemplate, setCachedTemplate } from "./templateCache";

const IS_DEV = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV;

/**
 * Loads an image file and determines its native dimensions.
 *
 * @param {File|Blob} file
 * @returns {Promise<{ originalWidth: number, originalHeight: number, previewUrl: string, blob: Blob, format: string, mimeType: string, fileName: string, fileSize: number, isPdf: boolean }>}
 */
export async function processImageTemplate(file) {
  const t0 = IS_DEV ? performance.now() : 0;
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

      const result = {
        originalWidth,
        originalHeight,
        previewUrl: objectUrl,
        blob: file,
        format,
        mimeType: format,
        fileName: file.name || "template",
        fileSize: file.size || 0,
        isPdf: false,
      };

      setCachedTemplate(file.name || objectUrl, result);
      if (IS_DEV) {
        console.log(`[PERF] processImageTemplate took ${(performance.now() - t0).toFixed(1)}ms (${originalWidth}×${originalHeight})`);
      }
      resolve(result);
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
 * to avoid CORS/auth issues with plain <img> tags. Uses in-memory cache when available.
 *
 * @param {string} url
 * @param {Object} metadata
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Object>}
 */
export async function loadRemoteTemplate(url, metadata = {}, options = {}) {
  if (!url) {
    throw new Error("No URL provided to loadRemoteTemplate");
  }

  // ── Cache Check ─────────────────────────────────────────────────────────────
  const cacheKey = metadata.id || metadata.templateId || url;
  const cached = getCachedTemplate(cacheKey) || getCachedTemplate(url);
  if (cached) {
    return {
      originalWidth: cached.originalWidth || metadata.originalWidth || 1920,
      originalHeight: cached.originalHeight || metadata.originalHeight || 1080,
      previewUrl: cached.previewUrl || url,
      blob: cached.blob,
      arrayBuffer: cached.arrayBuffer,
      format: cached.format || "image/jpeg",
      mimeType: cached.mimeType || "image/jpeg",
      fileName: metadata.fileName || cached.fileName || "template",
      fileSize: cached.fileSize || 0,
      isPdf: Boolean(cached.isPdf),
      fromCache: true,
    };
  }

  const t0 = IS_DEV ? performance.now() : 0;
  const signal = options.signal;

  try {
    const response = await fetch(url, { mode: "cors", signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch template: HTTP ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const objectUrl = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        URL.revokeObjectURL(objectUrl);
        const abortErr = new Error("Template request aborted.");
        abortErr.name = "AbortError";
        return reject(abortErr);
      }

      const img = new Image();
      img.onload = () => {
        const result = {
          originalWidth: metadata.originalWidth || img.naturalWidth || img.width,
          originalHeight: metadata.originalHeight || img.naturalHeight || img.height,
          previewUrl: objectUrl,
          blob,
          arrayBuffer,
          format: blob.type || "image/jpeg",
          mimeType: blob.type || "image/jpeg",
          fileName: metadata.fileName || "template",
          fileSize: blob.size,
          isPdf: blob.type === "application/pdf",
        };

        setCachedTemplate(url, result, [metadata.id, metadata.templateId]);
        if (IS_DEV) {
          console.log(`[PERF] loadRemoteTemplate fetched & cached in ${(performance.now() - t0).toFixed(1)}ms`);
        }
        resolve(result);
      };

      img.onerror = () => {
        const fallbackResult = {
          originalWidth: metadata.originalWidth || 1920,
          originalHeight: metadata.originalHeight || 1080,
          previewUrl: objectUrl,
          blob,
          arrayBuffer,
          format: blob.type || "image/jpeg",
          mimeType: blob.type || "image/jpeg",
          fileName: metadata.fileName || "template",
          fileSize: blob.size,
          isPdf: false,
        };
        setCachedTemplate(url, fallbackResult, [metadata.id]);
        resolve(fallbackResult);
      };

      img.src = objectUrl;
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      // Clean cancellation, rethrow so caller's sequence check handles it without noise
      throw err;
    }
    console.warn("Could not fetch remote template to blob, falling back to direct URL:", err.message);
    return {
      originalWidth: metadata.originalWidth || 1920,
      originalHeight: metadata.originalHeight || 1080,
      previewUrl: url,
      blob: null,
      arrayBuffer: null,
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
 * Dynamically bounds renderScale to avoid giant canvases and frees canvas memory immediately.
 *
 * @param {File|Blob} file
 * @param {number} renderScale - Desired resolution scale factor (clamped safely)
 * @returns {Promise<{ originalWidth: number, originalHeight: number, previewUrl: string, blob: Blob, arrayBuffer: ArrayBuffer, format: string, mimeType: string, fileName: string, fileSize: number, isPdf: boolean }>}
 */
export async function processPdfTemplate(file, renderScale = 2.0) {
  const t0 = IS_DEV ? performance.now() : 0;
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
    const nativePointsWidth = Math.round(baseViewport.width);
    const nativePointsHeight = Math.round(baseViewport.height);

    // Dynamic resolution scaling: ensure max long-edge dimension does not exceed 2400px
    const maxNativeEdge = Math.max(nativePointsWidth, nativePointsHeight) || 842;
    const safeScale = Math.min(Math.max(1.5, renderScale), 2400 / maxNativeEdge);

    const scaledViewport = page.getViewport({ scale: safeScale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(scaledViewport.width);
    canvas.height = Math.round(scaledViewport.height);

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
    const outWidth = canvas.width;
    const outHeight = canvas.height;

    // Immediately free canvas memory
    canvas.width = 0;
    canvas.height = 0;

    const result = {
      originalWidth: outWidth,
      originalHeight: outHeight,
      nativePointsWidth,
      nativePointsHeight,
      previewUrl,
      blob,
      arrayBuffer,
      format: "application/pdf",
      mimeType: "image/png", // Rendered page is PNG
      fileName: file.name || "template.pdf",
      fileSize: file.size || blob.size,
      isPdf: true,
    };

    setCachedTemplate(file.name || previewUrl, result);
    if (IS_DEV) {
      console.log(`[PERF] processPdfTemplate completed in ${(performance.now() - t0).toFixed(1)}ms (${outWidth}×${outHeight}, scale: ${safeScale.toFixed(2)})`);
    }

    return result;
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
