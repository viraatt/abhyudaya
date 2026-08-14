import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { createCertificate } from "../../../Firebase/certificateService";
import { uploadPdfToCloudinary } from "../../../services/cloudinaryService";
import "../style/admin.css";
import "./Certificates.css";

export default function AddCertificate() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Form State
  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [certificateType, setCertificateType] = useState("Participation");
  const [certificateId, setCertificateId] = useState("");
  const [pdfFile, setPdfFile] = useState(null);

  // UI & Submission State
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Auto-generate Certificate ID helper
  const handleAutoGenerateId = () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const autoId = `ABH-CERT${year}-${randomNum}`;
    setCertificateId(autoId);
  };

  // Drag & drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (submitting) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file) => {
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setErrorMessage("Selected file must be a PDF document.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("PDF file size must be less than 10MB.");
      return;
    }

    setErrorMessage("");
    setPdfFile(file);
  };

  const handleRemoveFile = () => {
    setPdfFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!name.trim() || !rollNo.trim() || !eventName.trim() || !certificateId.trim()) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (!pdfFile) {
      setErrorMessage("Please select a PDF certificate file.");
      return;
    }

    const isPdf =
      pdfFile.type === "application/pdf" ||
      pdfFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setErrorMessage("Selected file must be a PDF document.");
      return;
    }

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

      setSuccessMessage("✓ Certificate added successfully! Redirecting...");
      setStatusMessage("Certificate added successfully! Redirecting...");
      setTimeout(() => {
        navigate("/admin/certificates");
      }, 1200);
    } catch (err) {
      console.error("Add certificate error:", err);
      setErrorMessage(
        err.message || "Unable to upload certificate. Please check the PDF and try again."
      );
      setSubmitting(false);
    }
  };

  // Helper for human-readable file sizes
  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div className="certs-page">

            {/* Page Header */}
            <div className="page-header cert-add-header">
              <div className="page-title">
                <h2>Add New Certificate</h2>
                <p>Upload a certificate PDF and associate it with a student record.</p>
              </div>

              <Link
                to="/admin/certificates"
                className="admin-btn admin-btn--outline"
              >
                ← Back to Certificates
              </Link>
            </div>

            {/* Main Form Container */}
            <div className="cert-form-card">

              {/* Error Alert */}
              {errorMessage && (
                <div className="cert-alert cert-alert--error" role="alert">
                  <span className="cert-alert-icon">⚠️</span>
                  <div>
                    <strong>Unable to process request</strong>
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Success Alert */}
              {successMessage && (
                <div className="cert-alert cert-alert--success" role="status">
                  <span className="cert-alert-icon">✓</span>
                  <div>
                    <strong>Success!</strong>
                    <p>{successMessage}</p>
                  </div>
                </div>
              )}

              {/* Progress Indicator */}
              {submitting && (
                <div className="cert-progress-card">
                  <div className="cert-progress-header">
                    <span className="cert-progress-text">{statusMessage}</span>
                    <span className="cert-progress-pct">{uploadProgress}%</span>
                  </div>
                  <div className="cert-progress-bar">
                    <div
                      className="cert-progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>

                {/* ── SECTION 1: Student Information ── */}
                <div className="cert-form-section">
                  <div className="cert-section-header">
                    <span className="cert-section-badge">1</span>
                    <div>
                      <h3 className="cert-section-title">Student Information</h3>
                      <p className="cert-section-desc">Enter student identification and registry details.</p>
                    </div>
                  </div>

                  <div className="cert-grid-2">
                    {/* Student Full Name */}
                    <div className="cert-field-group">
                      <label htmlFor="studentName" className="cert-field-label">
                        STUDENT NAME <span className="cert-req">*</span>
                      </label>
                      <input
                        id="studentName"
                        type="text"
                        className="cert-field-input"
                        placeholder="e.g. Ishan Shukla"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={submitting}
                        required
                      />
                    </div>

                    {/* Roll Number */}
                    <div className="cert-field-group">
                      <label htmlFor="rollNo" className="cert-field-label">
                        ROLL NUMBER <span className="cert-req">*</span>
                      </label>
                      <input
                        id="rollNo"
                        type="text"
                        className="cert-field-input"
                        placeholder="e.g. 2301234567"
                        value={rollNo}
                        onChange={(e) => setRollNo(e.target.value)}
                        disabled={submitting}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* ── SECTION 2: Event Information ── */}
                <div className="cert-form-section">
                  <div className="cert-section-header">
                    <span className="cert-section-badge">2</span>
                    <div>
                      <h3 className="cert-section-title">Event Information</h3>
                      <p className="cert-section-desc">Specify event details and certificate identifier.</p>
                    </div>
                  </div>

                  <div className="cert-grid-2">
                    {/* Event Name */}
                    <div className="cert-field-group">
                      <label htmlFor="eventName" className="cert-field-label">
                        EVENT NAME <span className="cert-req">*</span>
                      </label>
                      <input
                        id="eventName"
                        type="text"
                        className="cert-field-input"
                        placeholder="e.g. Techbloom 2026"
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                        disabled={submitting}
                        required
                      />
                    </div>

                    {/* Event Date */}
                    <div className="cert-field-group">
                      <label htmlFor="eventDate" className="cert-field-label">
                        EVENT DATE
                      </label>
                      <input
                        id="eventDate"
                        type="date"
                        className="cert-field-input"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        disabled={submitting}
                      />
                    </div>

                    {/* Certificate Type */}
                    <div className="cert-field-group">
                      <label htmlFor="certificateType" className="cert-field-label">
                        CERTIFICATE TYPE <span className="cert-req">*</span>
                      </label>
                      <div className="cert-select-wrap">
                        <select
                          id="certificateType"
                          className="cert-field-input cert-field-select"
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
                    </div>

                    {/* Certificate ID */}
                    <div className="cert-field-group">
                      <div className="cert-label-row">
                        <label htmlFor="certificateId" className="cert-field-label">
                          CERTIFICATE ID <span className="cert-req">*</span>
                        </label>
                        <button
                          type="button"
                          className="cert-autogen-btn"
                          onClick={handleAutoGenerateId}
                          disabled={submitting}
                          title="Generate a unique random Certificate ID"
                        >
                          ⚡ Auto Generate
                        </button>
                      </div>
                      <input
                        id="certificateId"
                        type="text"
                        className="cert-field-input"
                        placeholder="e.g. ABH-TB26-0001"
                        value={certificateId}
                        onChange={(e) => setCertificateId(e.target.value)}
                        disabled={submitting}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* ── SECTION 3: Certificate File ── */}
                <div className="cert-form-section">
                  <div className="cert-section-header">
                    <span className="cert-section-badge">3</span>
                    <div>
                      <h3 className="cert-section-title">Certificate PDF</h3>
                      <p className="cert-section-desc">Upload official certificate PDF file to Cloudinary.</p>
                    </div>
                  </div>

                  {/* Hidden input element */}
                  <input
                    ref={fileInputRef}
                    id="pdfFileInput"
                    type="file"
                    accept=".pdf,application/pdf"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelection(e.target.files[0]);
                      }
                    }}
                    disabled={submitting}
                  />

                  {!pdfFile ? (
                    /* Drag & Drop Dropzone */
                    <div
                      className={`cert-dropzone ${dragActive ? "cert-dropzone--active" : ""}`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => !submitting && fileInputRef.current?.click()}
                      tabIndex={0}
                      role="button"
                      aria-label="Upload Certificate PDF. Drag and drop or click to browse."
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " ") && !submitting) {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                    >
                      <div className="cert-dropzone-icon" aria-hidden="true">
                        📄
                      </div>
                      <h4 className="cert-dropzone-title">Upload Certificate PDF</h4>
                      <p className="cert-dropzone-subtitle">
                        Drag &amp; drop your PDF here or <span className="cert-dropzone-link">Browse</span>
                      </p>
                      <span className="cert-dropzone-subtext">PDF • Maximum 10 MB</span>
                    </div>
                  ) : (
                    /* Selected File View */
                    <div className="cert-file-card">
                      <div className="cert-file-info">
                        <div className="cert-file-icon" aria-hidden="true">
                          📄
                        </div>
                        <div className="cert-file-details">
                          <span className="cert-file-name">{pdfFile.name}</span>
                          <span className="cert-file-meta">
                            {formatFileSize(pdfFile.size)} • PDF Document
                          </span>
                        </div>
                      </div>

                      <div className="cert-file-actions">
                        <span className="cert-file-status">✓ Ready to upload</span>
                        <button
                          type="button"
                          className="cert-file-remove-btn"
                          onClick={handleRemoveFile}
                          disabled={submitting}
                          aria-label="Remove selected PDF file"
                        >
                          Remove ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Action Buttons */}
                <div className="cert-form-actions">
                  <Link
                    to="/admin/certificates"
                    className="admin-btn admin-btn--outline cert-cancel-btn"
                  >
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    className="admin-btn admin-btn--primary cert-submit-btn"
                    disabled={
                      submitting ||
                      !name.trim() ||
                      !rollNo.trim() ||
                      !eventName.trim() ||
                      !certificateId.trim() ||
                      !pdfFile
                    }
                  >
                    {submitting ? (
                      <>
                        <span className="cert-btn-spinner" aria-hidden="true" />
                        Uploading Certificate...
                      </>
                    ) : (
                      "Upload Certificate →"
                    )}
                  </button>
                </div>

              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
