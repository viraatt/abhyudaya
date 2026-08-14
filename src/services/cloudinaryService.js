const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "cn11zsvp";
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "abhyudaya_blog";

/**
 * Uploads a PDF file to Cloudinary under the `abhyudaya/certificates` folder.
 * Uses unsigned upload preset so no secret key is exposed in client code.
 *
 * @param {File} file - PDF file to upload
 * @param {Function} [onProgress] - Optional progress callback (percent: number) => void
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

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", "abhyudaya/certificates");

    const xhr = new XMLHttpRequest();
    // Use raw or auto endpoint for PDF files
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
          resolve({
            secure_url: data.secure_url,
            public_id: data.public_id,
          });
        } catch {
          reject(new Error("Invalid JSON response from Cloudinary."));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(
            new Error(
              errorData?.error?.message ||
                `Cloudinary PDF upload failed with status ${xhr.status}`
            )
          );
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () =>
      reject(
        new Error(
          "Network error occurred during Cloudinary upload. Please check connection."
        )
      );

    xhr.ontimeout = () =>
      reject(new Error("Upload timed out. Please try uploading again."));

    xhr.send(formData);
  });
};
