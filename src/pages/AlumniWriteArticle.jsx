import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  FaGraduationCap,
  FaUser,
  FaEnvelope,
  FaLinkedin,
  FaBriefcase,
  FaBuilding,
  FaImage,
  FaCloudUploadAlt,
  FaCheckCircle,
  FaArrowLeft,
  FaExclamationTriangle,
  FaSpinner,
  FaPaperPlane,
} from "react-icons/fa";
import { uploadImage } from "../Admin/pages/services/imageUpload";
import {
  submitAlumniArticle,
  resubmitAlumniArticle,
  getAlumniSubmissionById,
  ALUMNI_CATEGORIES,
  SUBMISSION_STATUSES,
} from "../Firebase/alumniArticleService";

import "./AlumniWriteArticle.css";

const SITE_URL = "https://www.abhyudaya.org";

export default function AlumniWriteArticle() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const editToken = searchParams.get("token");

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    category: "Alumni Stories",
    excerpt: "",
    content: "",
    featuredImage: "",
    author: {
      name: "",
      graduationYear: new Date().getFullYear().toString(),
      branch: "Computer Science & Engineering",
      organization: "",
      designation: "",
      linkedin: "",
      email: "",
      profilePhoto: "",
    },
  });

  // UI States
  const [isEditing, setIsEditing] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(Boolean(editId));
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submittedData, setSubmittedData] = useState(null);

  // Load existing submission if editing / resubmitting
  const loadExisting = useCallback(async () => {
    if (!editId) return;
    try {
      setLoadingInitial(true);
      const sub = await getAlumniSubmissionById(editId);
      if (!sub) {
        setErrorMsg("Submission not found. Please verify your link.");
        return;
      }
      setExistingSubmission(sub);
      setIsEditing(true);

      setFormData({
        title: sub.title || "",
        category: sub.category || "Alumni Stories",
        excerpt: sub.excerpt || "",
        content: sub.content || "",
        featuredImage: sub.featuredImage || "",
        author: {
          name: sub.author?.name || "",
          graduationYear: sub.author?.graduationYear || "",
          branch: sub.author?.branch || "",
          organization: sub.author?.organization || "",
          designation: sub.author?.designation || "",
          linkedin: sub.author?.linkedin || "",
          email: sub.author?.email || "",
          profilePhoto: sub.author?.profilePhoto || "",
        },
      });
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load article submission.");
    } finally {
      setLoadingInitial(false);
    }
  }, [editId]);

  useEffect(() => {
    if (editId) {
      loadExisting();
    }
  }, [editId, loadExisting]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAuthorChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      author: { ...prev.author, [field]: value },
    }));
  };

  // Upload Featured Image
  const handleFeaturedImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg("");
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload a valid image file (JPG, PNG, WebP).");
      return;
    }

    try {
      setUploadingImage(true);
      const url = await uploadImage(file);
      handleInputChange("featuredImage", url);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to upload featured image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Upload Profile Photo
  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg("");
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload a valid profile photo image file (JPG, PNG, WebP).");
      return;
    }

    try {
      setUploadingPhoto(true);
      const url = await uploadImage(file);
      handleAuthorChange("profilePhoto", url);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to upload profile photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    // Validate mandatory fields
    if (!formData.author.name.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!formData.author.graduationYear.trim()) {
      setErrorMsg("Please enter your graduation year.");
      return;
    }
    if (!formData.author.branch.trim()) {
      setErrorMsg("Please enter your branch/stream.");
      return;
    }
    if (!formData.title.trim()) {
      setErrorMsg("Please enter an article title.");
      return;
    }
    if (!formData.excerpt.trim()) {
      setErrorMsg("Please enter a short excerpt or summary.");
      return;
    }
    if (!formData.content.trim()) {
      setErrorMsg("Please enter your article content.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && editId) {
        await resubmitAlumniArticle(editId, editToken, formData);
        setSubmittedData({
          id: editId,
          slug: existingSubmission?.slug || "",
          editToken: editToken || existingSubmission?.editToken,
          isResubmit: true,
        });
      } else {
        const res = await submitAlumniArticle(formData);
        setSubmittedData({
          id: res.id,
          slug: res.slug,
          editToken: res.editToken,
          isResubmit: false,
        });
      }
    } catch (err) {
      console.error("Submission error:", err);
      setErrorMsg(err.message || "Failed to submit article. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="alumni-write-page">
        <div className="alumni-write-container loading-state">
          <FaSpinner className="spin-icon" />
          <p>Loading submission details...</p>
        </div>
      </div>
    );
  }

  // Success Confirmation State
  if (submittedData) {
    const editUrl = `${window.location.origin}/blog/write?edit=${submittedData.id}&token=${submittedData.editToken}`;

    return (
      <div className="alumni-write-page">
        <Helmet>
          <title>Article Submitted | Abhyudaya Club</title>
        </Helmet>

        <div className="alumni-write-container success-view">
          <div className="success-card">
            <div className="success-icon-wrap">
              <FaCheckCircle />
            </div>

            <h1>
              {submittedData.isResubmit
                ? "Article Resubmitted Successfully!"
                : "Thank You! Article Submitted"}
            </h1>

            <p className="success-lead">
              Your article, <strong>"{formData.title}"</strong>, has been sent to the Abhyudaya Editorial Team for review.
            </p>

            <div className="author-credit-box">
              <div className="credit-label">Publication Author Credit:</div>
              <div className="credit-author-name">{formData.author.name}</div>
              <div className="credit-author-sub">
                B.Tech {formData.author.branch} • Class of {formData.author.graduationYear}
                {formData.author.organization && ` • ${formData.author.designation ? `${formData.author.designation} at ` : ""}${formData.author.organization}`}
              </div>
            </div>

            <div className="editorial-timeline-card">
              <h3>What Happens Next?</h3>
              <ol className="timeline-steps">
                <li>
                  <strong>1. Editorial Review:</strong> Our student editorial board reads through your submission to verify formatting and alignment.
                </li>
                <li>
                  <strong>2. Revisions (if needed):</strong> If minor tweaks are needed, the admin will send feedback to your email or update the submission.
                </li>
                <li>
                  <strong>3. Published with Full Attribution:</strong> Once approved, the post goes live on the Abhyudaya website, proudly crediting you with an "ALUMNI CONTRIBUTION" badge!
                </li>
              </ol>
            </div>

            <div className="tracking-link-box">
              <span className="tracking-label">Bookmark this link to view or update your submission:</span>
              <input
                type="text"
                readOnly
                value={editUrl}
                className="tracking-input"
                onClick={(e) => e.target.select()}
              />
              <small>Save this private link in case changes are requested.</small>
            </div>

            <div className="success-actions">
              <Link to="/blog" className="return-blog-btn">
                ← Return to Blog
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="alumni-write-page">
      <Helmet>
        <title>
          {isEditing
            ? "Resubmit Alumni Article | Abhyudaya Club"
            : "Write for Abhyudaya | Share Your Alumni Story"}
        </title>
        <meta
          name="description"
          content="Share your career journey, college memories, insights, and lessons with the Abhyudaya & MPEC community."
        />
        <link rel="canonical" href={`${SITE_URL}/blog/write`} />
      </Helmet>

      <div className="alumni-write-container">
        {/* Navigation Breadcrumb */}
        <div className="alumni-top-nav">
          <Link to="/blog" className="alumni-back-link">
            <FaArrowLeft />
            <span>Back to Blog</span>
          </Link>
        </div>

        {/* Hero Banner */}
        <header className="alumni-write-hero">
          <div className="alumni-hero-pill">
            <FaGraduationCap />
            <span>ALUMNI VOICES • WRITE FOR ABHYUDAYA</span>
          </div>

          <h1>
            {isEditing
              ? "Update & Resubmit Your Story"
              : "Share Your Story With Abhyudaya"}
          </h1>

          <p className="alumni-hero-subtitle">
            Are you an alumnus of Abhyudaya / MPEC? Inspire current students and fellow alumni by contributing your professional journey, industry wisdom, technical insights, or campus memories.
          </p>
        </header>

        {/* Feedback Alert if Admin Requested Changes */}
        {isEditing && existingSubmission?.adminFeedback && (
          <div className="changes-feedback-alert">
            <FaExclamationTriangle className="alert-icon" />
            <div>
              <strong>Editorial Team Requested Changes:</strong>
              <p>"{existingSubmission.adminFeedback}"</p>
              <span className="feedback-tip">
                Please make the requested updates below and click <strong>Resubmit Article</strong>.
              </span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="alumni-form-error" role="alert">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="alumni-submission-form">
          {/* ================= SECTION 1: AUTHOR PROFILE ================= */}
          <div className="form-card-section">
            <div className="section-title-wrap">
              <span className="section-step-num">01</span>
              <div>
                <h2>Your Profile (Author Information)</h2>
                <p>
                  You will be credited as the author on the live article. Your name, graduation year, and organization will appear alongside your story.
                </p>
              </div>
            </div>

            <div className="form-grid-two">
              <div className="form-field-group">
                <label>
                  Full Name <span className="req">*</span>
                </label>
                <div className="input-with-icon">
                  <FaUser className="field-icon" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formData.author.name}
                    onChange={(e) => handleAuthorChange("name", e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field-group">
                <label>
                  Graduation Year <span className="req">*</span>
                </label>
                <div className="input-with-icon">
                  <FaGraduationCap className="field-icon" />
                  <input
                    type="number"
                    required
                    min="1990"
                    max="2035"
                    placeholder="e.g. 2024"
                    value={formData.author.graduationYear}
                    onChange={(e) => handleAuthorChange("graduationYear", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-grid-two">
              <div className="form-field-group">
                <label>
                  Branch / Stream <span className="req">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Science, Mechanical, EC, IT"
                  value={formData.author.branch}
                  onChange={(e) => handleAuthorChange("branch", e.target.value)}
                />
              </div>

              <div className="form-field-group">
                <label>Email Address</label>
                <div className="input-with-icon">
                  <FaEnvelope className="field-icon" />
                  <input
                    type="email"
                    placeholder="For editorial updates & verification"
                    value={formData.author.email}
                    onChange={(e) => handleAuthorChange("email", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-grid-two">
              <div className="form-field-group">
                <label>Current Organization / Company</label>
                <div className="input-with-icon">
                  <FaBuilding className="field-icon" />
                  <input
                    type="text"
                    placeholder="e.g. Microsoft, Deloitte, TCS, Freelance"
                    value={formData.author.organization}
                    onChange={(e) => handleAuthorChange("organization", e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field-group">
                <label>Current Designation / Role</label>
                <div className="input-with-icon">
                  <FaBriefcase className="field-icon" />
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer, Product Manager"
                    value={formData.author.designation}
                    onChange={(e) => handleAuthorChange("designation", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-grid-two">
              <div className="form-field-group">
                <label>LinkedIn Profile URL</label>
                <div className="input-with-icon">
                  <FaLinkedin className="field-icon" />
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={formData.author.linkedin}
                    onChange={(e) => handleAuthorChange("linkedin", e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field-group">
                <label>Profile Photo</label>
                <div className="photo-upload-row">
                  {formData.author.profilePhoto ? (
                    <img
                      src={formData.author.profilePhoto}
                      alt="Profile preview"
                      className="photo-preview-thumb"
                    />
                  ) : null}

                  <label className="custom-file-upload-btn">
                    <FaCloudUploadAlt />
                    <span>{uploadingPhoto ? "Uploading..." : "Upload Photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePhotoUpload}
                      disabled={uploadingPhoto}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ================= SECTION 2: ARTICLE DETAILS ================= */}
          <div className="form-card-section">
            <div className="section-title-wrap">
              <span className="section-step-num">02</span>
              <div>
                <h2>Your Article</h2>
                <p>
                  Share your knowledge, reflections, career advice, or nostalgic memories.
                </p>
              </div>
            </div>

            <div className="form-field-group">
              <label>
                Article Title <span className="req">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. From College Labs to Silicon Valley: My Journey in Engineering"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                className="large-title-input"
              />
            </div>

            <div className="form-grid-two">
              <div className="form-field-group">
                <label>
                  Category <span className="req">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                  required
                >
                  {ALUMNI_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field-group">
                <label>Featured Header Image</label>
                <div className="photo-upload-row">
                  {formData.featuredImage ? (
                    <img
                      src={formData.featuredImage}
                      alt="Header preview"
                      className="header-preview-thumb"
                    />
                  ) : null}

                  <label className="custom-file-upload-btn">
                    <FaImage />
                    <span>{uploadingImage ? "Uploading..." : "Upload Image"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFeaturedImageUpload}
                      disabled={uploadingImage}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="form-field-group">
              <label>
                Short Summary / Excerpt <span className="req">*</span>
              </label>
              <textarea
                rows="3"
                required
                placeholder="A brief 1-2 sentence preview that appears on the blog card..."
                value={formData.excerpt}
                onChange={(e) => handleInputChange("excerpt", e.target.value)}
              />
            </div>

            <div className="form-field-group">
              <label>
                Article Content <span className="req">*</span>
              </label>
              <textarea
                rows="14"
                required
                placeholder="Write your article here. Use blank lines between paragraphs. Feel free to include headings, personal anecdotes, lessons learned, and guidance for junior students..."
                value={formData.content}
                onChange={(e) => handleInputChange("content", e.target.value)}
                className="content-textarea"
              />
              <span className="field-hint">
                Tip: Separate paragraphs with a blank line for optimal readability.
              </span>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="form-submit-footer">
            <button
              type="submit"
              className="submit-article-btn"
              disabled={submitting || uploadingImage || uploadingPhoto}
            >
              {submitting ? (
                <>
                  <FaSpinner className="spin-icon" />
                  <span>Submitting Article...</span>
                </>
              ) : (
                <>
                  <FaPaperPlane />
                  <span>
                    {isEditing
                      ? "Resubmit Article for Review"
                      : "Submit Article for Review"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
