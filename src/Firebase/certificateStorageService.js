import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { storage } from "./firebase";

/**
 * Upload a certificate template image or file to Firebase Storage.
 *
 * @param {File|Blob} file
 * @param {string} templateId
 * @returns {Promise<{ downloadUrl: string, storagePath: string }>}
 */
export async function uploadCertificateTemplate(file, templateId) {
  if (!file) throw new Error("No template file provided.");

  const ext = file.name ? file.name.split(".").pop() : "png";
  const cleanId = (templateId || `tpl_${Date.now()}`).trim();
  const storagePath = `certificate_templates/${cleanId}_${Date.now()}.${ext}`;
  const storageRef = ref(storage, storagePath);

  const metadata = {
    contentType: file.type || "image/png",
    customMetadata: {
      templateId: cleanId,
      uploadedAt: new Date().toISOString(),
    },
  };

  const uploadResult = await uploadBytes(storageRef, file, metadata);
  const downloadUrl = await getDownloadURL(uploadResult.ref);

  return {
    downloadUrl,
    storagePath,
  };
}

/**
 * Upload a generated certificate PDF to Firebase Storage.
 *
 * @param {Blob} pdfBlob
 * @param {string} certificateId
 * @returns {Promise<{ downloadUrl: string, storagePath: string }>}
 */
export async function uploadGeneratedCertificatePdf(pdfBlob, certificateId) {
  if (!pdfBlob) throw new Error("No PDF blob provided.");

  const cleanId = (certificateId || `cert_${Date.now()}`).trim();
  const storagePath = `certificates_generated/${cleanId}.pdf`;
  const storageRef = ref(storage, storagePath);

  const metadata = {
    contentType: "application/pdf",
    customMetadata: {
      certificateId: cleanId,
      generatedAt: new Date().toISOString(),
    },
  };

  const uploadResult = await uploadBytes(storageRef, pdfBlob, metadata);
  const downloadUrl = await getDownloadURL(uploadResult.ref);

  return {
    downloadUrl,
    storagePath,
  };
}

/**
 * Upload a generated certificate ZIP archive to Firebase Storage.
 *
 * @param {Blob} zipBlob
 * @param {string} jobId
 * @returns {Promise<{ downloadUrl: string, storagePath: string }>}
 */
export async function uploadCertificateZip(zipBlob, jobId) {
  if (!zipBlob) throw new Error("No ZIP blob provided.");

  const cleanId = (jobId || `job_${Date.now()}`).trim();
  const storagePath = `certificate_batches/${cleanId}.zip`;
  const storageRef = ref(storage, storagePath);

  const metadata = {
    contentType: "application/zip",
    customMetadata: {
      jobId: cleanId,
      archivedAt: new Date().toISOString(),
    },
  };

  const uploadResult = await uploadBytes(storageRef, zipBlob, metadata);
  const downloadUrl = await getDownloadURL(uploadResult.ref);

  return {
    downloadUrl,
    storagePath,
  };
}
