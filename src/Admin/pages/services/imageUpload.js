const CLOUD_NAME = "cn11zsvp";
const UPLOAD_PRESET = "abhyudaya_blog";

export const uploadImage = async (file) => {
  if (!file) {
    throw new Error("No file selected.");
  }

  // Enforce 10MB file size limit
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File size must be under 10 MB. Please compress your image.");
  }

  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Cloudinary upload error:", data);
    throw new Error(data?.error?.message || "Image upload failed");
  }

  return data.secure_url;
};