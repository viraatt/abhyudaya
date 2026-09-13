/**
 * Template Asset Loader for Bulk Certificate Generator.
 *
 * ARCHITECTURE:
 * Loads the certificate background template image EXACTLY ONCE before
 * batch generation starts. The resulting { arrayBuffer, isJpg, isPng, isPdf }
 * is reused for every certificate in the batch — eliminating repeated
 * fetch() calls to Firebase Storage and preventing CORS preflight failures.
 *
 * Flow:
 *   remote Firebase URL
 *         ↓
 *   FETCH ONCE (or use in-memory Blob if already loaded in wizard session)
 *         ↓
 *   LOCAL ArrayBuffer + format flags
 *         ↓
 *   BATCH GENERATION (embedded via pdfDoc.embedJpg / pdfDoc.embedPng)
 */

const IS_DEV = import.meta.env.DEV;

/**
 * Logs diagnostic messages in development mode only.
 */
function devLog(...args) {
  if (IS_DEV) {
    console.log("[TEMPLATE]", ...args);
  }
}

/**
 * Detects image format from MIME type, file extension, or Blob type.
 *
 * @param {string} mime - MIME type string
 * @param {string} [name] - Optional filename hint
 * @returns {{ isJpg: boolean, isPng: boolean, isPdf: boolean, isWebP: boolean, mimeType: string }}
 */
function detectFormat(mime = "", name = "") {
  const m = (mime || "").toLowerCase();
  const ext = (name || "").split(".").pop().toLowerCase();

  const isJpg = m.includes("jpg") || m.includes("jpeg") || ext === "jpg" || ext === "jpeg";
  const isPng = m.includes("png") || ext === "png";
  const isPdf = m.includes("pdf") || ext === "pdf";
  const isWebP = m.includes("webp") || ext === "webp";

  return {
    isJpg,
    isPng,
    isPdf,
    isWebP,
    mimeType: isJpg ? "image/jpeg" : isPng ? "image/png" : isPdf ? "application/pdf" : isWebP ? "image/webp" : "image/jpeg",
  };
}

/**
 * Rasterizes a WebP (or any unsupported image format) Blob to a PNG ArrayBuffer
 * via an off-screen canvas. Called ONCE before batch generation, not inside the loop.
 *
 * @param {Blob} blob
 * @param {number} width
 * @param {number} height
 * @returns {Promise<ArrayBuffer>}
 */
async function rasterizeToPNG(blob, width, height) {
  devLog("Rasterizing unsupported format to PNG via canvas...");
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width || img.naturalWidth || img.width;
      canvas.height = height || img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) {
          reject(new Error("Canvas rasterization to PNG failed."));
          return;
        }
        pngBlob.arrayBuffer().then(resolve).catch(reject);
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for rasterization."));
    };
    img.src = objectUrl;
  });
}

/**
 * Fetches a remote URL through the serverless proxy endpoint to bypass browser CORS.
 * Falls back to direct fetch if the proxy is unavailable.
 *
 * @param {string} remoteUrl
 * @returns {Promise<Blob>}
 */
async function fetchViaProxy(remoteUrl) {
  const proxyUrl = `/api/admin/proxy-asset?url=${encodeURIComponent(remoteUrl)}`;
  devLog(`Fetching template via proxy: ${proxyUrl}`);
  try {
    const resp = await fetch(proxyUrl);
    if (resp.ok) {
      devLog("Proxy fetch succeeded.");
      return await resp.blob();
    }
    throw new Error(`Proxy returned status ${resp.status}`);
  } catch (proxyErr) {
    devLog("Proxy fetch failed, trying direct fetch:", proxyErr.message);
    // Attempt direct fetch as final fallback
    const resp = await fetch(remoteUrl, { mode: "cors" });
    if (!resp.ok) {
      throw new Error(`Template fetch failed: HTTP ${resp.status} from ${remoteUrl}`);
    }
    return await resp.blob();
  }
}

/**
 * Loads the certificate template image EXACTLY ONCE and returns a reusable asset object.
 *
 * Priority:
 * 1. If template.arrayBuffer is already cached — return immediately (zero network calls).
 * 2. If template.blob is in memory — read arrayBuffer from Blob.
 * 3. If only a remote URL is available — fetch once (via proxy if CORS blocks direct fetch).
 *
 * For WebP/unsupported formats, rasterizes to PNG ArrayBuffer here — not inside the loop.
 *
 * @param {object} template - Wizard template state object
 * @param {string} [template.previewUrl] - Blob URL or Firebase Storage URL
 * @param {string} [template.storageUrl] - Firebase Storage download URL
 * @param {Blob|File} [template.blob] - In-memory Blob if available
 * @param {ArrayBuffer} [template._cachedArrayBuffer] - Previously cached ArrayBuffer
 * @param {string} [template.mimeType] - MIME type hint
 * @param {string} [template.format] - Format hint
 * @param {string} [template.name] - Filename for format detection
 * @param {boolean} [template.isPdf] - True if template is a rendered PDF page
 * @param {number} [template.originalWidth]
 * @param {number} [template.originalHeight]
 * @returns {Promise<{
 *   arrayBuffer: ArrayBuffer,
 *   isJpg: boolean,
 *   isPng: boolean,
 *   isPdf: boolean,
 *   mimeType: string,
 *   width: number,
 *   height: number
 * }>}
 * @throws {Error} If template cannot be loaded at all.
 */
export async function loadTemplateAsset(template) {
  if (!template) {
    throw new Error("No template provided. Please upload a certificate template before generating.");
  }

  const originalWidth = Number(template.originalWidth) || 1920;
  const originalHeight = Number(template.originalHeight) || 1080;

  devLog("Loading template asset...");
  devLog(`Dimensions: ${originalWidth}×${originalHeight}`);

  // ── Case 1: ArrayBuffer already cached from a previous call ──────────────
  if (template._cachedArrayBuffer instanceof ArrayBuffer && template._cachedArrayBuffer.byteLength > 0) {
    const fmt = detectFormat(template.mimeType || template.format || "", template.name || "");
    devLog("Template loaded from memory cache (ArrayBuffer). MIME:", fmt.mimeType);
    devLog(`Size: ${(template._cachedArrayBuffer.byteLength / 1024).toFixed(1)} KB`);
    devLog("Template loaded from memory: true");
    return {
      arrayBuffer: template._cachedArrayBuffer,
      isJpg: fmt.isJpg,
      isPng: fmt.isPng || fmt.isPdf, // PDF pages are rendered to PNG
      isPdf: fmt.isPdf,
      mimeType: fmt.mimeType,
      width: originalWidth,
      height: originalHeight,
    };
  }

  let blob = null;
  let detectedMime = template.mimeType || template.format || "";

  // ── Case 2: Blob is in wizard memory (fresh upload or previously loaded) ──
  if (template.blob instanceof Blob && template.blob.size > 0) {
    devLog("Template blob found in memory. Skipping network fetch.");
    blob = template.blob;
    detectedMime = detectedMime || blob.type || "";
    devLog("Template loaded from memory: true");
  }

  // ── Case 3: No blob — fetch from remote URL (exactly once) ────────────────
  if (!blob) {
    const remoteUrl = template.storageUrl || (
      template.previewUrl && !template.previewUrl.startsWith("blob:") ? template.previewUrl : null
    );

    if (!remoteUrl) {
      throw new Error(
        "Certificate template could not be loaded. Please replace the template and try again."
      );
    }

    devLog(`Fetching template from remote URL (once): ${remoteUrl.substring(0, 80)}...`);

    try {
      // First try direct fetch (works when Firebase Storage CORS is configured)
      const resp = await fetch(remoteUrl, { mode: "cors" });
      if (resp.ok) {
        blob = await resp.blob();
        detectedMime = detectedMime || blob.type || "";
        devLog("Direct fetch succeeded. Template loaded from memory: false (remote fetch)");
      } else {
        throw new Error(`HTTP ${resp.status}`);
      }
    } catch (directErr) {
      devLog("Direct fetch failed, using serverless proxy:", directErr.message);
      blob = await fetchViaProxy(remoteUrl);
      detectedMime = detectedMime || blob.type || "";
    }
  }

  devLog(`MIME: ${detectedMime || "unknown"}`);
  devLog(`Size: ${(blob.size / 1024).toFixed(1)} KB`);

  const fmt = detectFormat(detectedMime, template.name || "");

  // ── WebP or unrecognised format: rasterize to PNG ONCE ────────────────────
  let arrayBuffer;
  let finalFmt = { ...fmt };

  if (fmt.isWebP || (!fmt.isJpg && !fmt.isPng && !fmt.isPdf)) {
    devLog(`Rasterizing ${fmt.mimeType} → PNG (happens once before batch)`);
    arrayBuffer = await rasterizeToPNG(blob, originalWidth, originalHeight);
    finalFmt = { isJpg: false, isPng: true, isPdf: false, isWebP: false, mimeType: "image/png" };
  } else {
    arrayBuffer = await blob.arrayBuffer();
  }

  devLog(`Loaded successfully — format: ${finalFmt.mimeType}, bytes: ${arrayBuffer.byteLength}`);

  return {
    arrayBuffer,
    isJpg: finalFmt.isJpg,
    isPng: finalFmt.isPng,
    isPdf: finalFmt.isPdf,
    mimeType: finalFmt.mimeType,
    width: originalWidth,
    height: originalHeight,
  };
}
