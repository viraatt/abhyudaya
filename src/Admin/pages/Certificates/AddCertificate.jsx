import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { createCertificate } from "../../../Firebase/certificateService";
import { uploadPdfToCloudinary } from "../../../services/cloudinaryService";
import "../style/admin.css";
import "./Certificates.css";

export default function AddCertificate() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [certificateType, setCertificateType] = useState("Participation");
  const [certificateId, setCertificateId] = useState("");
  const [pdfFile, setPdfFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Helper to generate a unique Certificate ID
  const handleAutoGenerateId = () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const autoId = `ABH-CERT${year}-${randomNum}`;
    setCertificateId(autoId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim() || !rollNo.trim() || !eventName.trim() || !certificateId.trim()) {
      setErrorMessage("Please fill in all required text fields.");
      return;
    }

    if (!pdfFile) {
      setErrorMessage("Please select a PDF certificate file.");
      return;
    }

    if (pdfFile.type !== "application/pdf" && !pdfFile.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("Selected file must be a PDF document.");
      return;
    }

    // Max 10MB check
    if (pdfFile.size > 10 * 1024 * 1024) {
      setErrorMessage("PDF file size must be less than 10MB.");
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);
    setStatusMessage("Uploading PDF to Cloudinary...");

    try {
      // Step 1: Upload PDF file to Cloudinary
      const uploadResult = await uploadPdfToCloudinary(pdfFile, (percent) => {
        setUploadProgress(percent);
      });

      setStatusMessage("Saving certificate metadata to Firestore...");

      // Step 2: Save metadata in Firestore
      await createCertificate({
        certificateId: certificateId.trim(),
        rollNo: rollNo.trim(),
        name: name.trim(),
        eventName: eventName.trim(),
        eventDate: eventDate ? eventDate.trim() : "",
        certificateType,
        certificateUrl: uploadResult.secure_url,
      });

      setStatusMessage("Certificate added successfully! Redirecting...");
      setTimeout(() => {
        navigate("/admin/certificates");
      }, 1200);
    } catch (err) {
      console.error("Add certificate error:", err);
      setErrorMessage(err.message || "Failed to add certificate. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div className="certs-page">
            <div className="page-header">
              <div className="page-title">
                <h2>➕ Add New Certificate</h2>
                <p>Upload a certificate PDF and save student record</p>
              </div>

              <Link
                to="/admin/certificates"
                className="admin-btn admin-btn--outline"
              >
                ← Back to Certificates
              </Link>
            </div>

            <div className="admin-card" style={{ maxWidth: "720px" }}>
              {errorMessage && (
                <div className="ro-error-box" style={{ marginBottom: "1.5rem" }}>
                  <p>⚠️ {errorMessage}</p>
                </div>
              )}

              {statusMessage && submitting && (
                <div className="bulk-progress-box" style={{ marginBottom: "1.5rem" }}>
                  <div className="bulk-progress-bar">
                    <div
                      className="bulk-progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="bulk-status-text">
                    {statusMessage} {uploadProgress > 0 ? `(${uploadProgress}%)` : ""}
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="cert-add-form">
                <div className="form-group mb-4">
                  <label htmlFor="studentName" className="bulk-label">
                    Student Full Name <span className="req">*</span>
                  </label>
                  <input
                    id="studentName"
                    type="text"
                    className="admin-input"
                    placeholder="e.g. Ishan Shukla"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="rollNo" className="bulk-label">
                    Roll Number <span className="req">*</span>
                  </label>
                  <input
                    id="rollNo"
                    type="text"
                    className="admin-input"
                    placeholder="e.g. 2301234567"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="eventName" className="bulk-label">
                    Event Name <span className="req">*</span>
                  </label>
                  <input
                    id="eventName"
                    type="text"
                    className="admin-input"
                    placeholder="e.g. Techbloom 2026"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="eventDate" className="bulk-label">
                    Event Date
                  </label>
                  <input
                    id="eventDate"
                    type="date"
                    className="admin-input"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="certificateType" className="bulk-label">
                    Certificate Type <span className="req">*</span>
                  </label>
                  <select
                    id="certificateType"
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

                <div className="form-group mb-4">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <label htmlFor="certificateId" className="bulk-label" style={{ marginBottom: 0 }}>
                      Certificate ID <span className="req">*</span>
                    </label>
                    <button
                      type="button"
                      className="tbl-btn tbl-btn--verify"
                      onClick={handleAutoGenerateId}
                      disabled={submitting}
                    >
                      ⚡ Auto Generate
                    </button>
                  </div>
                  <input
                    id="certificateId"
                    type="text"
                    className="admin-input"
                    placeholder="e.g. ABH-TB26-0001"
                    value={certificateId}
                    onChange={(e) => setCertificateId(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="pdfFile" className="bulk-label">
                    Certificate PDF File (.pdf) <span className="req">*</span>
                  </label>
                  <input
                    id="pdfFile"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="admin-input"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    disabled={submitting}
                    required
                  />
                  {pdfFile && (
                    <small className="muted-text" style={{ display: "block", marginTop: "0.3rem" }}>
                      Selected: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                    </small>
                  )}
                </div>

                <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
                  <button
                    type="submit"
                    className="admin-btn admin-btn--primary"
                    disabled={submitting}
                  >
                    {submitting ? "Uploading & Saving..." : "Save Certificate →"}
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
