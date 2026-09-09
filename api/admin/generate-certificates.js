import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin, checkRateLimit } from "../time-capsule/utils.js";
import { authenticateAdminRequest } from "../time-capsule/admin-auth.js";

const ALLOWED_ADMIN_ROLES = ["super_admin", "event_admin"];

/**
 * Serverless API handler for Bulk Certificate Generation and Job Tracking.
 * Endpoint: /api/admin/generate-certificates
 */
export default async function handler(req, res) {
  // 1. HTTP method check
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST or GET.",
    });
  }

  // 2. Rate limiting
  const ip =
    req.headers["x-forwarded-for"] ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown";

  if (!checkRateLimit(ip, 120, 60000)) {
    return res.status(429).json({
      success: false,
      error: "Too many requests. Please slow down.",
    });
  }

  // 3. Admin Authentication & Authorization
  const authResult = await authenticateAdminRequest(req, ALLOWED_ADMIN_ROLES);
  if (!authResult.authorized) {
    return res.status(authResult.status || 401).json({
      success: false,
      error: authResult.error || "Unauthorized",
    });
  }

  const { db } = getFirebaseAdmin();

  // 4. Handle GET (fetch job status)
  if (req.method === "GET") {
    const jobId = req.query?.jobId;
    if (!jobId) {
      return res.status(400).json({ success: false, error: "Missing jobId parameter." });
    }

    try {
      const jobSnap = await db.collection("certificateJobs").doc(jobId).get();
      if (!jobSnap.exists) {
        return res.status(404).json({ success: false, error: "Job not found." });
      }
      return res.status(200).json({ success: true, job: jobSnap.data() });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 5. Handle POST actions
  const body = req.body || {};
  const { action } = body;

  try {
    // Action A: Initialize generation job
    if (action === "create-job") {
      const jobId = body.jobId || `job_${Date.now()}`;
      const jobRef = db.collection("certificateJobs").doc(jobId);

      const jobPayload = {
        jobId,
        templateId: body.templateId || "",
        templateTitle: body.templateTitle || "Certificate Batch",
        eventName: body.eventName || "",
        eventDate: body.eventDate || "",
        total: Number(body.total) || 0,
        completed: 0,
        failed: 0,
        status: "processing",
        zipUrl: "",
        errors: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await jobRef.set(jobPayload);
      return res.status(200).json({ success: true, jobId });
    }

    // Action B: Save generated certificate metadata
    if (action === "save-certificate") {
      const certData = body.certificate || {};
      const certId = (certData.certificateId || "").trim();

      if (!certId) {
        return res.status(400).json({ success: false, error: "Missing certificateId." });
      }

      const certRef = db.collection("certificates").doc(certId);
      const existing = await certRef.get();

      if (existing.exists) {
        // Do not overwrite existing certificates
        return res.status(200).json({
          success: true,
          certificateId: certId,
          alreadyExists: true,
        });
      }

      const certPayload = {
        certificateId: certId,
        rollNo: (certData.rollNo || "").trim(),
        rollNoClean: (certData.rollNoClean || certData.rollNo || "").trim().toLowerCase().replace(/\s+/g, " "),
        name: (certData.name || "").trim(),
        nameLower: (certData.nameLower || certData.name || "").trim().toLowerCase().replace(/\s+/g, " "),
        eventName: (certData.eventName || "").trim(),
        eventDate: (certData.eventDate || "").trim(),
        certificateType: (certData.certificateType || "Participation").trim(),
        certificateUrl: (certData.certificateUrl || "").trim(),
        fileName: (certData.fileName || "").trim(),
        templateId: (certData.templateId || "").trim(),
        jobId: (certData.jobId || "").trim(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await certRef.set(certPayload);

      // Increment job completed counter if jobId provided
      if (certData.jobId) {
        await db.collection("certificateJobs").doc(certData.jobId).update({
          completed: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      return res.status(200).json({ success: true, certificateId: certId });
    }

    // Action C: Finalize job with ZIP url
    if (action === "complete-job") {
      const { jobId, zipUrl, total, completed, failed, errors } = body;
      if (!jobId) {
        return res.status(400).json({ success: false, error: "Missing jobId." });
      }

      const updates = {
        status: failed > 0 && completed === 0 ? "failed" : "completed",
        zipUrl: zipUrl || "",
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (total !== undefined) updates.total = total;
      if (completed !== undefined) updates.completed = completed;
      if (failed !== undefined) updates.failed = failed;
      if (errors) updates.errors = errors;

      await db.collection("certificateJobs").doc(jobId).set(updates, { merge: true });
      return res.status(200).json({ success: true, jobId });
    }

    return res.status(400).json({ success: false, error: `Unknown action "${action}".` });
  } catch (err) {
    console.error("Certificate API error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
