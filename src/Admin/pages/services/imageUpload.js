const CLOUD_NAME = "cn11zsvp";
const UPLOAD_PRESET = "abhyudaya_blog";

export const uploadImage = async (file) => {
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