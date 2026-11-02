import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiPlus,
  FiTrash2,
  FiUploadCloud,
  FiEye,
  FiSave,
  FiSend,
  FiCalendar,
  FiCheckCircle,
  FiX,
  FiAlertCircle,
  FiSettings,
  FiList,
} from "react-icons/fi";
import { useAuth } from "../../../context/AuthContext";
import { createPoll } from "../../../Firebase/pollService";
import { uploadToCloudinary } from "../../../utils/cloudinary";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { useToast } from "../../components/Toast";

import "../style/admin.css";
import "./CreatePoll.css";

// Helper: Format Date for datetime-local input (YYYY-MM-DDTHH:mm)
function toLocalDatetimeString(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function CreatePoll() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();

  const now = new Date();
  const oneWeekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Campus Life");
  const [bannerImage, setBannerImage] = useState("");
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [showLiveResults, setShowLiveResults] = useState(true);

  const [startAt, setStartAt] = useState(toLocalDatetimeString(now));
  const [endAt, setEndAt] = useState(toLocalDatetimeString(oneWeekLater));

  const [options, setOptions] = useState([
    { id: "opt_1", text: "", imageUrl: "" },
    { id: "opt_2", text: "", imageUrl: "" },
  ]);

  const [uploadingIdx, setUploadingIdx] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Add new option
  const handleAddOption = () => {
    if (options.length >= 10) {
      toast.warning("Maximum 10 options allowed per poll.");
      return;
    }
    setOptions((prev) => [
      ...prev,
      { id: `opt_${Date.now()}_${prev.length + 1}`, text: "", imageUrl: "" },
    ]);
  };

  // Remove option
  const handleRemoveOption = (index) => {
    if (options.length <= 2) {
      toast.warning("A poll must have at least 2 options.");
      return;
    }
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  // Update option text
  const handleOptionTextChange = (index, text) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, text } : opt))
    );
  };

  // Update option image URL
  const handleOptionImageUrlChange = (index, imageUrl) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, imageUrl } : opt))
    );
  };

  // Handle option image file upload
  const handleOptionImageUpload = async (index, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    setUploadingIdx(index);
    try {
      const res = await uploadToCloudinary(file);
      handleOptionImageUrlChange(index, res.secure_url);
      toast.success("Option image uploaded successfully!");
    } catch (err) {
      toast.error("Image upload failed: " + err.message);
    } finally {
      setUploadingIdx(null);
    }
  };

  // Datetime presets for endAt
  const applyEndPreset = (hours) => {
    const sDate = startAt ? new Date(startAt) : new Date();
    const newEnd = new Date(sDate.getTime() + hours * 60 * 60 * 1000);
    setEndAt(toLocalDatetimeString(newEnd));
  };

  // Validate form
  const validateForm = () => {
    if (!title.trim()) {
      toast.error("Please provide a poll title.");
      return false;
    }

    const validOptions = options.map((o) => ({ ...o, text: o.text.trim() }));
    if (validOptions.length < 2) {
      toast.error("A poll requires at least 2 voting options.");
      return false;
    }

    for (let i = 0; i < validOptions.length; i++) {
      if (!validOptions[i].text) {
        toast.error(`Option ${i + 1} cannot be empty.`);
        return false;
      }
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      toast.error("Please select valid start and end dates.");
      return false;
    }

    if (endDate <= startDate) {
      toast.error("Closing date must be after the start date.");
      return false;
    }

    return true;
  };

  // Handle save
  const handleSave = async (targetStatus) => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const startDate = new Date(startAt);
      const isScheduled = targetStatus === "active" && startDate.getTime() > Date.now() + 60000;
      const finalStatus = isScheduled ? "scheduled" : targetStatus;

      await createPoll(
        {
          title: title.trim(),
          description: description.trim(),
          category: category.trim(),
          bannerImage: bannerImage.trim(),
          options: options.map((o) => ({
            id: o.id,
            text: o.text.trim(),
            imageUrl: o.imageUrl ? o.imageUrl.trim() : "",
          })),
          allowMultiple,
          showLiveResults,
          startAt: startDate,
          endAt: new Date(endAt),
          status: finalStatus,
        },
        currentUser
      );

      toast.success(
        finalStatus === "draft"
          ? "Poll saved as draft!"
          : finalStatus === "scheduled"
          ? "Poll scheduled successfully!"
          : "Poll published and live for voting!"
      );

      navigate("/admin/polls");
    } catch (err) {
      toast.error("Failed to create poll: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="create-poll-content">
        <Topbar
          title="Create New Poll"
          subtitle="Define student polling questions, options, schedule, and live result parameters"
        />

        {/* Back navigation & Header */}
        <div className="poll-header-row" style={{ marginBottom: "20px" }}>
          <div>
            <Link
              to="/admin/polls"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#64748b",
                textDecoration: "none",
                marginBottom: "8px",
              }}
            >
              <FiArrowLeft /> Back to Poll Management
            </Link>
            <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
              New Campus Poll
            </h1>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="poll-btn-secondary"
              onClick={() => setShowPreview(true)}
            >
              <FiEye /> Preview Poll
            </button>
          </div>
        </div>

        {/* Section 1: Basic Information */}
        <div className="create-poll-card">
          <div className="section-heading-row">
            <h3>
              <FiList style={{ color: "#c48b18" }} /> 1. Poll Information
            </h3>
          </div>

          <div className="form-group-custom">
            <label htmlFor="poll-title">
              Poll Title <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              id="poll-title"
              type="text"
              placeholder="e.g. Which technical workshop should Abhyudaya host next month?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input-custom"
              maxLength={150}
            />
            <span className="field-hint">Keep it clear, concise, and engaging for students.</span>
          </div>

          <div className="form-group-custom">
            <label htmlFor="poll-desc">Description / Context (Optional)</label>
            <textarea
              id="poll-desc"
              rows={3}
              placeholder="Provide background context or explain why this poll matters..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea-custom"
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group-custom">
              <label htmlFor="poll-category">Category</label>
              <select
                id="poll-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="form-select-custom"
              >
                <option value="Campus Life">Campus Life</option>
                <option value="Technical Events">Technical Events</option>
                <option value="Workshops">Workshops</option>
                <option value="Cultural Fest">Cultural Fest</option>
                <option value="Clubs & Sports">Clubs & Sports</option>
                <option value="General">General</option>
              </select>
            </div>

            <div className="form-group-custom">
              <label htmlFor="poll-banner">Banner Image URL (Optional)</label>
              <input
                id="poll-banner"
                type="url"
                placeholder="https://..."
                value={bannerImage}
                onChange={(e) => setBannerImage(e.target.value)}
                className="form-input-custom"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Voting Options */}
        <div className="create-poll-card">
          <div className="section-heading-row">
            <div>
              <h3>
                <FiCheckCircle style={{ color: "#10b981" }} /> 2. Voting Options
              </h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                Add at least 2 distinct choices. You can optionally attach an image to each option.
              </p>
            </div>
          </div>

          <div className="options-list-builder">
            {options.map((opt, idx) => (
              <div key={opt.id} className="option-builder-card">
                <div className="option-num-badge">{idx + 1}</div>

                <div className="option-fields-row">
                  <input
                    type="text"
                    placeholder={`Option ${idx + 1} text (e.g. AI & Machine Learning Workshop)`}
                    value={opt.text}
                    onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                    className="option-text-input"
                    maxLength={100}
                  />

                  <div className="option-image-controls">
                    {opt.imageUrl && (
                      <div className="option-img-preview-box">
                        <img src={opt.imageUrl} alt="" />
                      </div>
                    )}

                    <label className="option-upload-btn-label">
                      <FiUploadCloud />
                      <span>{uploadingIdx === idx ? "Uploading..." : "Upload Image"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleOptionImageUpload(idx, e.target.files[0]);
                          }
                        }}
                      />
                    </label>

                    <input
                      type="url"
                      placeholder="Or paste image URL (optional)"
                      value={opt.imageUrl}
                      onChange={(e) => handleOptionImageUrlChange(idx, e.target.value)}
                      className="option-url-input"
                    />

                    {opt.imageUrl && (
                      <button
                        type="button"
                        onClick={() => handleOptionImageUrlChange(idx, "")}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        Remove Image
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-remove-option"
                  disabled={options.length <= 2}
                  onClick={() => handleRemoveOption(idx)}
                  title="Remove option"
                  aria-label="Remove option"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn-add-option"
            onClick={handleAddOption}
          >
            <FiPlus /> Add Another Option
          </button>
        </div>

        {/* Section 3: Voting Rules & Schedule */}
        <div className="create-poll-card">
          <div className="section-heading-row">
            <h3>
              <FiSettings style={{ color: "#6366f1" }} /> 3. Voting Rules & Schedule
            </h3>
          </div>

          {/* Single vs Multiple Choice */}
          <div className="toggle-setting-row">
            <div className="toggle-meta">
              <h4>Allow Multiple Choices</h4>
              <p>When enabled, students can select more than one option per ballot.</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
              />
              <span className="slider" />
            </label>
          </div>

          {/* Show Live Results */}
          <div className="toggle-setting-row">
            <div className="toggle-meta">
              <h4>Show Live Results to Public</h4>
              <p>When enabled, voters see real-time percentage charts. If disabled, results stay secret until poll closes.</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={showLiveResults}
                onChange={(e) => setShowLiveResults(e.target.checked)}
              />
              <span className="slider" />
            </label>
          </div>

          {/* Schedule Datetimes */}
          <div className="form-grid-2" style={{ marginTop: "24px" }}>
            <div className="form-group-custom">
              <label htmlFor="poll-start">
                <FiCalendar style={{ marginRight: "6px" }} /> Start Date & Time
              </label>
              <input
                id="poll-start"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="form-input-custom"
              />
              <span className="field-hint">If set in the future, the poll will automatically be scheduled.</span>
            </div>

            <div className="form-group-custom">
              <label htmlFor="poll-end">
                <FiCalendar style={{ marginRight: "6px" }} /> Closing Date & Time
              </label>
              <input
                id="poll-end"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="form-input-custom"
              />

              <div className="preset-chips">
                <span style={{ fontSize: "12px", color: "#64748b" }}>Quick Presets:</span>
                <button type="button" className="preset-chip" onClick={() => applyEndPreset(24)}>
                  +24 Hours
                </button>
                <button type="button" className="preset-chip" onClick={() => applyEndPreset(72)}>
                  +3 Days
                </button>
                <button type="button" className="preset-chip" onClick={() => applyEndPreset(168)}>
                  +7 Days
                </button>
                <button type="button" className="preset-chip" onClick={() => applyEndPreset(720)}>
                  +30 Days
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Submission Actions */}
        <div className="create-poll-footer-bar">
          <Link to="/admin/polls" className="poll-btn-secondary">
            Cancel
          </Link>

          <div className="create-poll-footer-actions">
            <button
              type="button"
              className="poll-btn-secondary"
              disabled={submitting}
              onClick={() => handleSave("draft")}
            >
              <FiSave /> {submitting ? "Saving..." : "Save as Draft"}
            </button>

            <button
              type="button"
              className="poll-btn-primary"
              disabled={submitting}
              onClick={() => handleSave("active")}
            >
              <FiSend /> {submitting ? "Publishing..." : "Publish / Schedule Poll"}
            </button>
          </div>
        </div>

        {/* Live Preview Modal */}
        {showPreview && (
          <div className="poll-modal-backdrop" onClick={() => setShowPreview(false)}>
            <div className="poll-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="poll-modal-header">
                <h3 className="poll-modal-title">Live Voter Preview</h3>
                <button
                  type="button"
                  className="poll-modal-close"
                  onClick={() => setShowPreview(false)}
                >
                  <FiX />
                </button>
              </div>
              <div className="poll-modal-body">
                <div style={{ marginBottom: "16px" }}>
                  <span className="poll-badge badge-active">Live Simulation</span>
                  <span className="poll-badge badge-tag" style={{ marginLeft: "8px" }}>
                    {allowMultiple ? "Multiple Choice" : "Single Choice"}
                  </span>
                  <span className="poll-badge badge-tag" style={{ marginLeft: "8px" }}>
                    {showLiveResults ? "Public Results" : "Hidden Results"}
                  </span>
                </div>

                <h2 style={{ fontSize: "20px", margin: "0 0 8px 0" }}>
                  {title.trim() || "Untitled Poll Question"}
                </h2>
                {description && (
                  <p style={{ color: "#475569", fontSize: "14px", lineHeight: "1.5", margin: "0 0 20px 0" }}>
                    {description}
                  </p>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                  {options.map((opt, i) => (
                    <div
                      key={opt.id}
                      style={{
                        padding: "14px 16px",
                        borderRadius: "12px",
                        border: "1.5px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        background: "#f8fafc",
                      }}
                    >
                      <input
                        type={allowMultiple ? "checkbox" : "radio"}
                        disabled
                        style={{ cursor: "default" }}
                      />
                      {opt.imageUrl && (
                        <img
                          src={opt.imageUrl}
                          alt=""
                          style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "cover" }}
                        />
                      )}
                      <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "14px" }}>
                        {opt.text || `Option ${i + 1}`}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "10px",
                    background: "#ecfdf5",
                    color: "#065f46",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <FiAlertCircle />
                  This is how the poll will appear to students on the public website.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
