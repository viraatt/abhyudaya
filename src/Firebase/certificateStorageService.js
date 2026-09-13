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

/**
 * Upload a single generated certificate PDF to Firebase Storage.
 *
 * @param {Uint8Array|Blob} pdfData
 * @param {string} jobId
 * @param {string} fileName
 * @returns {Promise<{ downloadURL: string, storagePath: string }>}
 */
export async function uploadGeneratedCertificatePdf(pdfData, jobId = "batch", fileName = "cert.pdf") {
  try {
    const cleanJobId = (jobId || "batch").replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `generated_certificates/${cleanJobId}/${cleanFileName}`;
    const storageRef = ref(storage, storagePath);

    const blob = pdfData instanceof Blob ? pdfData : new Blob([pdfData], { type: "application/pdf" });
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: "application/pdf",
    });

    const downloadURL = await getDownloadURL(snapshot.ref);
    return { downloadURL, storagePath };
  } catch (err) {
    console.warn(`Storage upload failed for ${fileName}, falling back to local Blob URL:`, err);
    const blob = pdfData instanceof Blob ? pdfData : new Blob([pdfData], { type: "application/pdf" });
    const localUrl = URL.createObjectURL(blob);
    return {
      downloadURL: localUrl,
      storagePath: `local_fallback/${jobId}/${fileName}`,
      isLocalFallback: true,
    };
  }
}

/**
 * Upload a bulk certificates ZIP archive to Firebase Storage.
 *
 * @param {Blob|Uint8Array} zipData
 * @param {string} jobId
 * @param {string} zipFileName
 * @returns {Promise<{ downloadURL: string, storagePath: string }>}
 */
export async function uploadCertificateZip(zipData, jobId = "batch", zipFileName = "certificates.zip") {
  try {
    const cleanJobId = (jobId || "batch").replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanName = zipFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `generated_certificates/${cleanJobId}/${cleanName}`;
    const storageRef = ref(storage, storagePath);

    const blob = zipData instanceof Blob ? zipData : new Blob([zipData], { type: "application/zip" });
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: "application/zip",
    });

    const downloadURL = await getDownloadURL(snapshot.ref);
    return { downloadURL, storagePath };
  } catch (err) {
    console.warn("Storage upload failed for ZIP archive, falling back to local Blob URL:", err);
    const blob = zipData instanceof Blob ? zipData : new Blob([zipData], { type: "application/zip" });
    const localUrl = URL.createObjectURL(blob);
    return {
      downloadURL: localUrl,
      storagePath: `local_fallback/${jobId}/${zipFileName}`,
      isLocalFallback: true,
    };
  }
}

/**
 * Upload a designer image asset (logo, signature) to Firebase Storage.
 * Stored under certificate_assets/{templateId}/
 *
 * @param {File|Blob} file - The image file
 * @param {string} templateId - Template ID for path scoping
 * @param {string} [fileName] - Optional filename override
 * @returns {Promise<{ downloadURL: string, storagePath: string }>}
 */
export async function uploadDesignerImageAsset(file, templateId = "shared", fileName = null) {
  try {
    const cleanTemplateId = (templateId || "shared").replace(/[^a-zA-Z0-9_-]/g, "_");
    const timestamp = Date.now();
    const rawName = fileName || (file instanceof File ? file.name : "asset.png");
    const cleanName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `certificate_assets/${cleanTemplateId}/${timestamp}_${cleanName}`;
    const storageRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type || "image/png",
    });

    const downloadURL = await getDownloadURL(snapshot.ref);
    return { downloadURL, storagePath };
  } catch (err) {
    console.warn("Designer image asset upload failed, using local blob URL:", err);
    const localUrl = file instanceof Blob ? URL.createObjectURL(file) : "";
    return {
      downloadURL: localUrl,
      storagePath: `local_fallback/assets/${fileName || "asset.png"}`,
      isLocalFallback: true,
    };
  }
}
