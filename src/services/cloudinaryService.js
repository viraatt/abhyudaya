/**
 * cloudinaryService.js
 *
 * Uploads certificate PDF files to Cloudinary using an unsigned upload preset.
 * A DEDICATED preset (abhyudaya_certs) must be created in Cloudinary dashboard
 * with: Signing Mode = Unsigned, Allowed formats = pdf, folder = abhyudaya/certificates
 *
 * IMPORTANT: Never use the Cloudinary API Secret in frontend code.
 * This service only uses the cloud_name (public) and an unsigned upload preset (public).
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "cn11zsvp";

// Use a SEPARATE preset for PDF certificates — NOT the image preset.
// Create "abhyudaya_certs" as an unsigned preset in Cloudinary dashboard.
const CERT_PRESET = import.meta.env.VITE_CLOUDINARY_CERT_PRESET || "abhyudaya_certs";

/**
 * Uploads a PDF file to Cloudinary under the `abhyudaya/certificates` folder.
 * Uses an unsigned upload preset — no API secret is exposed in client code.
 *
 * @param {File}     file         - PDF file to upload (must be application/pdf or .pdf)
 * @param {Function} [onProgress] - Optional progress callback: (percent: number) => void
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
export const uploadPdfToCloudinary = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("No PDF file provided for upload."));
    }

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return reject(new Error("Selected file must be a PDF document."));
    }

    if (file.size > 20 * 1024 * 1024) {
      return reject(new Error("PDF file size must be less than 20 MB."));
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CERT_PRESET);
    formData.append("folder", "abhyudaya/certificates");
    // resource_type=auto is handled by the /auto/upload endpoint

    const xhr = new XMLHttpRequest();
    // Use /auto/upload so Cloudinary handles PDF as a "raw" resource correctly
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
      true
    );

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (!data.secure_url) {
            return reject(new Error("Cloudinary did not return a secure URL."));
          }
          resolve({
            secure_url: data.secure_url,
            public_id: data.public_id || "",
          });
        } catch {
          reject(new Error("Invalid JSON response from Cloudinary."));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          const msg =
            errorData?.error?.message ||
            `Cloudinary PDF upload failed with status ${xhr.status}`;
          console.error("Cloudinary upload error:", errorData);
          reject(new Error(msg));
        } catch {
          reject(new Error(`Upload failed with HTTP status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () =>
      reject(
        new Error(
          "Network error during Cloudinary upload. Please check your connection."
        )
      );

    xhr.ontimeout = () =>
      reject(new Error("Cloudinary upload timed out. Please try again."));

    xhr.send(formData);
  });
};
