import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiPlus,
  FiTrash2,
  FiUploadCloud,
  FiEye,
  FiSave,
  FiCalendar,
  FiCheckCircle,
  FiX,
  FiAlertCircle,
  FiSettings,
  FiList,
  FiLock,
} from "react-icons/fi";
import { getPoll, updatePoll, toMillis } from "../../../Firebase/pollService";
import { uploadToCloudinary } from "../../../utils/cloudinary";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { useToast } from "../../components/Toast";
import SkeletonLoader from "../../components/SkeletonLoader";

import "../style/admin.css";
import "./CreatePoll.css";

function toLocalDatetimeString(val) {
  const ms = toMillis(val);
  if (!ms) return "";
  const date = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function EditPoll() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasVotes, setHasVotes] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Campus Life");
  const [bannerImage, setBannerImage] = useState("");
  const [status, setStatus] = useState("active");
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [showLiveResults, setShowLiveResults] = useState(true);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [options, setOptions] = useState([]);

  useEffect(() => {
    async function loadPoll() {
      try {
        const poll = await getPoll(id);
        if (!poll) {
          toast.error("Poll not found.");
          navigate("/admin/polls");
          return;
        }

        setTitle(poll.title || "");
        setDescription(poll.description || "");
        setCategory(poll.category || "Campus Life");
        setBannerImage(poll.bannerImage || "");
        setStatus(poll.status || "active");
        setAllowMultiple(Boolean(poll.allowMultiple));
        setShowLiveResults(poll.showLiveResults !== false);
        setStartAt(toLocalDatetimeString(poll.startAt));
        setEndAt(toLocalDatetimeString(poll.endAt));
        setOptions(poll.options || []);
        setHasVotes((poll.totalVotes || 0) > 0);
      } catch (err) {
        toast.error("Failed to load poll: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadPoll();
  }, [id, navigate, toast]);

  const handleAddOption = () => {
    if (hasVotes) {
      toast.warning("Cannot add options after voting has already begun.");
      return;
    }
    if (options.length >= 10) {
      toast.warning("Maximum 10 options allowed per poll.");
      return;
    }
    setOptions((prev) => [
      ...prev,
      { id: `opt_${Date.now()}_${prev.length + 1}`, text: "", imageUrl: "", voteCount: 0 },
    ]);
  };

  const handleRemoveOption = (index) => {
    if (hasVotes) {
      toast.warning("Cannot delete options from a poll with recorded votes.");
      return;
    }
    if (options.length <= 2) {
      toast.warning("A poll must have at least 2 options.");
      return;
    }
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOptionTextChange = (index, text) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, text } : opt))
    );
  };

  const handleOptionImageUrlChange = (index, imageUrl) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, imageUrl } : opt))
    );
  };

  const handleOptionImageUpload = async (index, file) => {
    if (!file) return;
    setUploadingIdx(index);
    try {
      const res = await uploadToCloudinary(file);
      handleOptionImageUrlChange(index, res.secure_url);
      toast.success("Option image updated!");
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploadingIdx(null);
    }
  };

  const applyEndPreset = (hours) => {
    const sDate = startAt ? new Date(startAt) : new Date();
    const newEnd = new Date(sDate.getTime() + hours * 60 * 60 * 1000);
    setEndAt(toLocalDatetimeString(newEnd));
  };

  const handleUpdate = async () => {
    if (!title.trim()) {
      toast.error("Poll title cannot be empty.");
      return;
    }

    const validOptions = options.map((o) => ({ ...o, text: o.text.trim() }));
    for (let i = 0; i < validOptions.length; i++) {
      if (!validOptions[i].text) {
        toast.error(`Option ${i + 1} text cannot be empty.`);
        return;
      }
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (endDate <= startDate) {
      toast.error("Closing date must be after the start date.");
      return;
    }

    setSubmitting(true);
    try {
      await updatePoll(id, {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        bannerImage: bannerImage.trim(),
        options: validOptions,
        status,
        allowMultiple: hasVotes ? allowMultiple : allowMultiple,
        showLiveResults,
        startAt: startDate,
        endAt: endDate,
      });

      toast.success("Poll updated successfully!");
      navigate("/admin/polls");
    } catch (err) {
      toast.error("Failed to update poll: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <main className="create-poll-content">
          <Topbar title="Edit Poll" subtitle="Loading poll details..." />
          <SkeletonLoader height={320} count={2} />
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="create-poll-content">
        <Topbar title="Edit Poll" subtitle={`Modifying poll: ${title}`} />

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
              Edit Poll
            </h1>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="poll-btn-secondary"
              onClick={() => setShowPreview(true)}
            >
              <FiEye /> Preview
            </button>
          </div>
        </div>

        {/* Warning if votes already exist */}
        {hasVotes && (
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "14px",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              color: "#92400e",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "14px",
            }}
          >
            <FiLock style={{ fontSize: "20px", flexShrink: 0 }} />
            <div>
              <strong>Voting Integrity Lock Active:</strong> Votes have already been cast in this poll.
              Option IDs and ballot structures cannot be deleted or re-keyed. You may still extend the closing deadline, edit typos, and adjust visibility.
            </div>
          </div>
        )}

        {/* Section 1: Basic Info */}
        <div className="create-poll-card">
          <div className="section-heading-row">
            <h3>
              <FiList style={{ color: "#c48b18" }} /> 1. Poll Details
            </h3>
          </div>

          <div className="form-group-custom">
            <label htmlFor="edit-poll-title">
              Poll Title <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              id="edit-poll-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input-custom"
            />
          </div>

          <div className="form-group-custom">
            <label htmlFor="edit-poll-desc">Description</label>
            <textarea
              id="edit-poll-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea-custom"
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group-custom">
              <label htmlFor="edit-poll-status">Status</label>
              <select
                id="edit-poll-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="form-select-custom"
              >
                <option value="active">Active (Accepting Votes)</option>
                <option value="scheduled">Scheduled</option>
                <option value="closed">Closed (Voting Ended)</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="form-group-custom">
              <label htmlFor="edit-poll-category">Category</label>
              <select
                id="edit-poll-category"
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
                {hasVotes
                  ? "Option titles and images can be refined, but options cannot be deleted while votes exist."
                  : "Customize the choices available to voters."}
              </p>
            </div>
          </div>

          <div className="options-list-builder">
            {options.map((opt, idx) => (
              <div key={opt.id || idx} className="option-builder-card">
                <div className="option-num-badge">{idx + 1}</div>

                <div className="option-fields-row">
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                    className="option-text-input"
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
                      placeholder="Image URL"
                      value={opt.imageUrl || ""}
                      onChange={(e) => handleOptionImageUrlChange(idx, e.target.value)}
                      className="option-url-input"
                    />

                    {opt.imageUrl && (
                      <button
                        type="button"
                        onClick={() => handleOptionImageUrlChange(idx, "")}
                        style={{ background: "none", border: "none", color: "#ef4444", fontSize: "12px", cursor: "pointer" }}
                      >
                        Remove Image
                      </button>
                    )}

                    {hasVotes && (
                      <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "auto" }}>
                        Current votes: <strong>{opt.voteCount || 0}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {!hasVotes && (
                  <button
                    type="button"
                    className="btn-remove-option"
                    disabled={options.length <= 2}
                    onClick={() => handleRemoveOption(idx)}
                    title="Remove option"
                  >
                    <FiTrash2 />
                  </button>
                )}
              </div>
            ))}
          </div>

          {!hasVotes && (
            <button type="button" className="btn-add-option" onClick={handleAddOption}>
              <FiPlus /> Add Another Option
            </button>
          )}
        </div>

        {/* Section 3: Rules & Schedule */}
        <div className="create-poll-card">
          <div className="section-heading-row">
            <h3>
              <FiSettings style={{ color: "#6366f1" }} /> 3. Voting Rules & Schedule
            </h3>
          </div>

          <div className="toggle-setting-row">
            <div className="toggle-meta">
              <h4>Allow Multiple Choices</h4>
              <p>Allow voters to select more than one option.</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                disabled={hasVotes}
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
              />
              <span className="slider" />
            </label>
          </div>

          <div className="toggle-setting-row">
            <div className="toggle-meta">
              <h4>Show Live Results to Public</h4>
              <p>Allow voters to inspect live vote distribution percentages.</p>
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

          <div className="form-grid-2" style={{ marginTop: "24px" }}>
            <div className="form-group-custom">
              <label htmlFor="edit-poll-start">
                <FiCalendar style={{ marginRight: "6px" }} /> Start Date & Time
              </label>
              <input
                id="edit-poll-start"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="form-input-custom"
              />
            </div>

            <div className="form-group-custom">
              <label htmlFor="edit-poll-end">
                <FiCalendar style={{ marginRight: "6px" }} /> Closing Date & Time
              </label>
              <input
                id="edit-poll-end"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="form-input-custom"
              />
              <div className="preset-chips">
                <button type="button" className="preset-chip" onClick={() => applyEndPreset(24)}>
                  +24h Extension
                </button>
                <button type="button" className="preset-chip" onClick={() => applyEndPreset(72)}>
                  +3 Days Extension
                </button>
                <button type="button" className="preset-chip" onClick={() => applyEndPreset(168)}>
                  +7 Days Extension
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="create-poll-footer-bar">
          <Link to="/admin/polls" className="poll-btn-secondary">
            Cancel
          </Link>
          <button
            type="button"
            className="poll-btn-primary"
            disabled={submitting}
            onClick={handleUpdate}
          >
            <FiSave /> {submitting ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>

        {/* Live Preview Modal */}
        {showPreview && (
          <div className="poll-modal-backdrop" onClick={() => setShowPreview(false)}>
            <div className="poll-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="poll-modal-header">
                <h3 className="poll-modal-title">Live Preview</h3>
                <button
                  type="button"
                  className="poll-modal-close"
                  onClick={() => setShowPreview(false)}
                >
                  <FiX />
                </button>
              </div>
              <div className="poll-modal-body">
                <h2 style={{ fontSize: "18px", margin: "0 0 8px 0" }}>{title}</h2>
                {description && <p style={{ color: "#475569", fontSize: "14px" }}>{description}</p>}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "16px 0" }}>
                  {options.map((opt) => (
                    <div
                      key={opt.id}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        background: "#f8fafc",
                      }}
                    >
                      <input type={allowMultiple ? "checkbox" : "radio"} disabled />
                      {opt.imageUrl && (
                        <img
                          src={opt.imageUrl}
                          alt=""
                          style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover" }}
                        />
                      )}
                      <span style={{ fontWeight: 600, fontSize: "14px" }}>{opt.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
