/**
 * Firebase Storage Service for Certificate Templates and Assets.
 */
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Upload a certificate template image/PDF to Firebase Storage.
 *
 * @param {Blob|File} file
 * @param {string} fileName
 * @returns {Promise<{ downloadURL: string, storagePath: string }>}
 */
export async function uploadCertificateTemplate(file, fileName = "template.png") {
  try {
    const timestamp = Date.now();
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `certificate_templates/${timestamp}_${cleanName}`;
    const storageRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type || "image/png",
    });

    const downloadURL = await getDownloadURL(snapshot.ref);

    return { downloadURL, storagePath };
  } catch (err) {
    console.warn("Storage upload failed or in offline mode, using local blob URL:", err);
    // Graceful fallback for local development or permission hiccups
    const localUrl = URL.createObjectURL(file);
    return {
      downloadURL: localUrl,
      storagePath: `local_fallback/${Date.now()}_${fileName}`,
      isLocalFallback: true,
    };
  }
}

/**
 * Delete a template asset from Firebase Storage.
 *
 * @param {string} storagePath
 */
export async function deleteTemplateAsset(storagePath) {
  if (!storagePath || storagePath.startsWith("local_fallback")) return;
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err) {
    console.warn("Failed to delete storage asset:", err);
  }
}
