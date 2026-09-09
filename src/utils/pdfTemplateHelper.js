import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

// Configure PDF.js worker
if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

/**
 * Processes an uploaded template file (PNG, JPG, JPEG, WEBP, or PDF)
 * and returns image data along with original dimensions.
 *
 * @param {File} file
 * @returns {Promise<{
 *   file: File,
 *   imageBlob: Blob,
 *   previewUrl: string,
 *   originalWidth: number,
 *   originalHeight: number,
 *   isPdf: boolean
 * }>}
 */
export async function processTemplateFile(file) {
  if (!file) throw new Error("No file provided.");

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    return processPdfTemplate(file);
  } else {
    return processImageTemplate(file);
  }
}

/**
 * Extracts page 1 of a PDF as a high-resolution image.
 */
async function processPdfTemplate(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;

  if (pdfDoc.numPages < 1) {
    throw new Error("The uploaded PDF file has no pages.");
  }

  // Load first page
  const page = await pdfDoc.getPage(1);

  // Use scale of 2.5 for crisp, high-resolution rendering
  const baseViewport = page.getViewport({ scale: 1.0 });
  const renderScale = 2.5;
  const viewport = page.getViewport({ scale: renderScale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize 2D context for PDF rendering.");

  const renderContext = {
    canvasContext: ctx,
    viewport,
  };

  await page.render(renderContext).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to extract image from PDF template."));
        return;
      }

      const previewUrl = URL.createObjectURL(blob);
      resolve({
        file,
        imageBlob: blob,
        previewUrl,
        // Native dimensions based on 1.0 scale (or scaled rendering resolution)
        originalWidth: Math.round(baseViewport.width * 2), // Standard high-res target
        originalHeight: Math.round(baseViewport.height * 2),
        isPdf: true,
      });
    }, "image/png");
  });
}

/**
 * Loads an image file and extracts its natural dimensions.
 */
async function processImageTemplate(file) {
  const objectUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        file,
        imageBlob: file,
        previewUrl: objectUrl,
        originalWidth: img.naturalWidth || 1920,
        originalHeight: img.naturalHeight || 1080,
        isPdf: false,
      });
    };
    img.onerror = () => {
      reject(new Error("Failed to decode image template. Please verify the file format."));
    };
    img.src = objectUrl;
  });
}
