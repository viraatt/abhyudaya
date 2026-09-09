/**
 * Template Helper for Bulk Certificate Generator.
 * Handles uploading and processing of certificate templates in PNG, JPG, JPEG, WEBP, and single-page PDF formats.
 * Extracts native pixel dimensions and creates high-fidelity canvas/image previews.
 */

/**
 * Loads an image file and determines its native dimensions.
 *
 * @param {File|Blob} file
 * @returns {Promise<{ originalWidth: number, originalHeight: number, previewUrl: string, blob: Blob }>}
 */
export async function processImageTemplate(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const originalWidth = img.naturalWidth || img.width;
      const originalHeight = img.naturalHeight || img.height;

      resolve({
        originalWidth,
        originalHeight,
        previewUrl: objectUrl,
        blob: file,
        format: file.type || "image/png",
        isPdf: false,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image template. Ensure the image is valid."));
    };

    img.src = objectUrl;
  });
}

/**
 * Renders the first page of a PDF certificate template to a high-DPI canvas/blob.
 *
 * @param {File|Blob} file
 * @param {number} renderScale - Resolution scale factor (default 2.5 for crisp print quality)
 * @returns {Promise<{ originalWidth: number, originalHeight: number, previewUrl: string, blob: Blob }>}
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
 * @returns {Promise<{ originalWidth: number, originalHeight: number, previewUrl: string, blob: Blob, isPdf: boolean }>}
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
