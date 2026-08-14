import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import {
  getCertificateById,
  updateCertificate,
} from "../../../Firebase/certificateService";
import { uploadPdfToCloudinary } from "../../../services/cloudinaryService";
import "../style/admin.css";
import "./Certificates.css";

export default function EditCertificate() {
  const { id } = useParams(); // Firestore doc ID
  const navigate = useNavigate();

  // Form state — populated from Firestore on load
  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [certificateType, setCertificateType] = useState("Participation");
  const [certificateId, setCertificateId] = useState("");
  const [existingUrl, setExistingUrl] = useState(""); // current Cloudinary URL

  // Optional new PDF replacement
  const [newPdfFile, setNewPdfFile] = useState(null);

  // UI state
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Load existing certificate on mount
  useEffect(() => {
    if (!id) {
      setLoadError("No certificate ID provided in the URL.");
      setLoadingData(false);
      return;
    }

    const fetchCert = async () => {
      try {
        const cert = await getCertificateById(id);
        if (!cert) {
          setLoadError(`Certificate with ID "${id}" not found.`);
          return;
        }
        setName(cert.name || "");
        setRollNo(cert.rollNo || "");
        setEventName(cert.eventName || "");
        setEventDate(cert.eventDate || "");
        setCertificateType(cert.certificateType || "Participation");
        setCertificateId(cert.certificateId || id);
        setExistingUrl(cert.certificateUrl || "");
      } catch (err) {
        console.error("Failed to load certificate for editing:", err);
        setLoadError("Failed to load certificate. " + (err.message || ""));
      } finally {
        setLoadingData(false);
      }
    };

    fetchCert();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim() || !rollNo.trim() || !eventName.trim() || !certificateId.trim()) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    // Validate new PDF if one was selected
    if (newPdfFile) {
      const isPdf =
        newPdfFile.type === "application/pdf" ||
        newPdfFile.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        setErrorMessage("Replacement file must be a PDF document.");
        return;
      }
      if (newPdfFile.size > 20 * 1024 * 1024) {
        setErrorMessage("PDF file size must be less than 20 MB.");
        return;
      }
    }

    setSubmitting(true);
    setUploadProgress(0);

    try {
      let updatedUrl = existingUrl;

      // Only upload a new PDF if the admin explicitly selected one
      if (newPdfFile) {
        setStatusMessage("Uploading new PDF to Cloudinary...");
        const uploadResult = await uploadPdfToCloudinary(newPdfFile, (pct) => {
          setUploadProgress(pct);
        });
        updatedUrl = uploadResult.secure_url;
        setStatusMessage("PDF uploaded. Updating Firestore metadata...");
      } else {
        setStatusMessage("Saving updated metadata to Firestore...");
      }

      // Build the update payload
      const updates = {
        name: name.trim(),
        rollNo: rollNo.trim(),
        eventName: eventName.trim(),
        eventDate: eventDate ? eventDate.trim() : "",
        certificateType,
        certificateId: certificateId.trim(),
        certificateUrl: updatedUrl,
      };

      await updateCertificate(id, updates);

      setStatusMessage("Certificate updated successfully! Redirecting...");
      setTimeout(() => {
        navigate("/admin/certificates");
      }, 1200);
    } catch (err) {
      console.error("Edit certificate error:", err);
      setErrorMessage(err.message || "Failed to update certificate. Please try again.");
      setSubmitting(false);
    }
  };

  // ── Loading state ──
  if (loadingData) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="dashboard-main">
          <Topbar />
          <div className="dashboard-content">
            <div className="certs-page">
              <div className="empty-card">
                <h3>Loading certificate data...</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Load error state ──
  if (loadError) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="dashboard-main">
          <Topbar />
          <div className="dashboard-content">
            <div className="certs-page">
              <div className="ro-error-box">
                <p>⚠️ {loadError}</p>
                <Link to="/admin/certificates" className="admin-btn admin-btn--outline" style={{ marginTop: "1rem" }}>
                  ← Back to Certificates
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div className="certs-page">
            {/* Header */}
            <div className="page-header">
              <div className="page-title">
                <h2>✏️ Edit Certificate</h2>
                <p>
                  Update certificate metadata.{" "}
                  <span style={{ opacity: 0.7 }}>
                    Leave &quot;Replace PDF&quot; empty to keep the existing Cloudinary file.
                  </span>
                </p>
              </div>

              <Link
                to="/admin/certificates"
                className="admin-btn admin-btn--outline"
              >
                ← Back to Certificates
              </Link>
            </div>

            <div className="admin-card" style={{ maxWidth: "720px" }}>
              {/* Error message */}
              {errorMessage && (
                <div className="ro-error-box" style={{ marginBottom: "1.5rem" }}>
                  <p>⚠️ {errorMessage}</p>
                </div>
              )}

              {/* Progress / status */}
              {statusMessage && submitting && (
                <div className="bulk-progress-box" style={{ marginBottom: "1.5rem" }}>
                  <div className="bulk-progress-bar">
                    <div
                      className="bulk-progress-fill"
                      style={{ width: `${newPdfFile ? uploadProgress : 100}%` }}
                    />
                  </div>
                  <span className="bulk-status-text">
                    {statusMessage}
                    {newPdfFile && uploadProgress > 0 ? ` (${uploadProgress}%)` : ""}
                  </span>
                </div>
              )}

              {/* Existing PDF preview link */}
              {existingUrl && (
                <div
                  style={{
                    background: "#f0f9ff",
                    border: "1px solid #bae6fd",
                    borderRadius: "8px",
                    padding: "0.9rem 1.1rem",
                    marginBottom: "1.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: "0.88rem", color: "#0369a1" }}>
                    📄 Current PDF on Cloudinary
                  </span>
                  <a
                    href={existingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tbl-btn tbl-btn--view"
                    style={{ flexShrink: 0 }}
                  >
                    View Current PDF →
                  </a>
                </div>
              )}

              <form onSubmit={handleSubmit} className="cert-add-form">
                {/* Student Name */}
                <div className="form-group mb-4">
                  <label htmlFor="editName" className="bulk-label">
                    Student Full Name <span className="req">*</span>
                  </label>
                  <input
                    id="editName"
                    type="text"
                    className="admin-input"
                    placeholder="e.g. Ishan Shukla"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>

                {/* Roll Number */}
                <div className="form-group mb-4">
                  <label htmlFor="editRollNo" className="bulk-label">
                    Roll Number <span className="req">*</span>
                  </label>
                  <input
                    id="editRollNo"
                    type="text"
                    className="admin-input"
                    placeholder="e.g. 2301234567"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>

                {/* Event Name */}
                <div className="form-group mb-4">
                  <label htmlFor="editEventName" className="bulk-label">
                    Event Name <span className="req">*</span>
                  </label>
                  <input
                    id="editEventName"
                    type="text"
                    className="admin-input"
                    placeholder="e.g. Techbloom 2026"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>

                {/* Event Date */}
                <div className="form-group mb-4">
                  <label htmlFor="editEventDate" className="bulk-label">
                    Event Date
                  </label>
                  <input
                    id="editEventDate"
                    type="date"
                    className="admin-input"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                {/* Certificate Type */}
                <div className="form-group mb-4">
                  <label htmlFor="editCertType" className="bulk-label">
                    Certificate Type <span className="req">*</span>
                  </label>
                  <select
                    id="editCertType"
                    className="admin-input"
                    value={certificateType}
                    onChange={(e) => setCertificateType(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="Participation">Participation</option>
                    <option value="Winner">Winner</option>
                    <option value="Runner-Up">Runner-Up</option>
                    <option value="Organizer">Organizer</option>
                    <option value="Special Merit">Special Merit</option>
                  </select>
                </div>

                {/* Certificate ID */}
                <div className="form-group mb-4">
                  <label htmlFor="editCertId" className="bulk-label">
                    Certificate ID <span className="req">*</span>
                  </label>
                  <input
                    id="editCertId"
                    type="text"
                    className="admin-input"
                    placeholder="e.g. ABH-TB26-0001"
                    value={certificateId}
                    onChange={(e) => setCertificateId(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  <small className="muted-text" style={{ display: "block", marginTop: "0.3rem" }}>
                    ⚠️ Changing the Certificate ID will also change its public verification URL.
                  </small>
                </div>

                {/* Optional PDF replacement */}
                <div className="form-group mb-4">
                  <label htmlFor="editPdfFile" className="bulk-label">
                    Replace Certificate PDF{" "}
                    <span
                      style={{
                        fontWeight: 400,
                        opacity: 0.7,
                        textTransform: "none",
                        letterSpacing: 0,
                        fontSize: "0.8rem",
                      }}
                    >
                      (optional — leave blank to keep existing)
                    </span>
                  </label>
                  <input
                    id="editPdfFile"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="admin-input"
                    onChange={(e) => setNewPdfFile(e.target.files?.[0] || null)}
                    disabled={submitting}
                  />
                  {newPdfFile && (
                    <small className="muted-text" style={{ display: "block", marginTop: "0.3rem" }}>
                      New file selected: {newPdfFile.name} (
                      {(newPdfFile.size / 1024 / 1024).toFixed(2)} MB) — will be uploaded to
                      Cloudinary on save.
                    </small>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
                  <button
                    type="submit"
                    className="admin-btn admin-btn--primary"
                    disabled={submitting}
                  >
                    {submitting ? "Saving Changes..." : "Save Changes →"}
                  </button>

                  <Link
                    to="/admin/certificates"
                    className="admin-btn admin-btn--outline"
                  >
                    Cancel
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
