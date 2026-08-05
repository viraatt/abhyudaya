const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "cn11zsvp";
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "abhyudaya_blog";

/**
 * Uploads a file to Cloudinary with real-time progress tracking via XMLHttpRequest.
 * @param {File} file - The file object to upload.
 * @param {Function} [onProgress] - Callback (percent: number) => void
 * @returns {Promise<{ secure_url: string, public_id: string, width: number, height: number }>}
 */
export const uploadToCloudinary = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("No file provided for upload."));
    }

    if (!file.type.startsWith("image/")) {
      return reject(new Error("Selected file must be an image."));
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
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
            width: data.width,
            height: data.height,
          });
        } catch (err) {
          reject(new Error("Invalid JSON response from Cloudinary."));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(
            new Error(
              errorData?.error?.message ||
                `Cloudinary upload failed with status ${xhr.status}`
            )
          );
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () =>
      reject(new Error("Network error occurred during Cloudinary upload. Please check your connection."));
    xhr.ontimeout = () =>
      reject(new Error("Upload timed out. Please try uploading again."));

    xhr.send(formData);
  });
};
