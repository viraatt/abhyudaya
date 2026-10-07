import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheck,
  FaRocket,
  FaExclamationTriangle,
  FaTimes,
  FaTrash,
  FaLinkedin,
  FaEnvelope,
  FaGraduationCap,
  FaExternalLinkAlt,
  FaUserGraduate,
  FaSpinner,
} from "react-icons/fa";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import SkeletonLoader from "../components/SkeletonLoader";
import { useToast } from "../components/Toast";
import { useAuth } from "../../context/AuthContext";
import { ROLES, normalizeRole } from "../config/roles";
import {
  getAlumniSubmissionById,
  approveAlumniArticle,
  requestChangesAlumniArticle,
  rejectAlumniArticle,
  publishAlumniArticleToBlog,
  deleteAlumniSubmission,
  SUBMISSION_STATUSES,
} from "../../Firebase/alumniArticleService";

import "./style/admin.css";
import "./ReviewAlumniArticle.css";

export default function ReviewAlumniArticle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuth();
  const isSuper = normalizeRole(currentUser?.role) === ROLES.SUPER_ADMIN;

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals for workflow actions
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [feedbackInput, setFeedbackInput] = useState("");

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionInput, setRejectionInput] = useState("");

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchArticle = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAlumniSubmissionById(id);
      if (!data) {
        toast.error("Alumni article submission not found.");
        navigate("/admin/alumni-articles");
        return;
      }
      setArticle(data);
      if (data.adminFeedback) {
        setFeedbackInput(data.adminFeedback);
      }
      if (data.rejectionReason) {
        setRejectionInput(data.rejectionReason);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading article.");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  const reviewerInfo = {
    uid: currentUser?.uid || null,
    name: currentUser?.name || currentUser?.email || "Admin",
    email: currentUser?.email || "",
    role: currentUser?.role || "admin",
  };

  // Handle Approve (approves and publishes to live blog)
  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await approveAlumniArticle(id, reviewerInfo);
      setShowApproveModal(false);
      toast.success("🚀 Article approved and published to Abhyudaya Blog!");
      await fetchArticle();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to approve article.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Publish
  const handlePublish = async () => {
    setActionLoading(true);
    try {
      await publishAlumniArticleToBlog(id, reviewerInfo);
      setShowPublishModal(false);
      toast.success("🚀 Article published to Abhyudaya Blog!");
      await fetchArticle();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to publish article.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Approve & Publish in one step (Super Admin only)
  const handleApproveAndPublish = async () => {
    return handleApprove();
  };

  // Handle Request Changes
  const handleSubmitChanges = async (e) => {
    e.preventDefault();
    if (!feedbackInput.trim()) {
      toast.error("Please provide feedback for the alumni.");
      return;
    }

    setActionLoading(true);
    try {
      await requestChangesAlumniArticle(id, reviewerInfo, feedbackInput);
      toast.info("Changes requested. Author can now update and resubmit.");
      setShowChangesModal(false);
      await fetchArticle();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to request changes.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject
  const handleSubmitReject = async (e) => {
    e.preventDefault();
    if (!rejectionInput.trim()) {
      toast.error("Please provide a reason for declining this article.");
      return;
    }

    setActionLoading(true);
    try {
      await rejectAlumniArticle(id, reviewerInfo, rejectionInput);
      toast.error("Article submission rejected.");
      setShowRejectModal(false);
      await fetchArticle();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to reject article.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await deleteAlumniSubmission(id);
      setShowDeleteModal(false);
      toast.success("Submission deleted.");
      navigate("/admin/alumni-articles");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete submission.");
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="dashboard-main">
          <Topbar />
          <div className="dashboard-content">
            <SkeletonLoader type="article" />
          </div>
        </div>
      </div>
    );
  }

  if (!article) return null;

  const isPublished = article.status === SUBMISSION_STATUSES.PUBLISHED;
  const isApproved = article.status === SUBMISSION_STATUSES.APPROVED;
  const isPending =
    article.status === SUBMISSION_STATUSES.PENDING ||
    article.status === SUBMISSION_STATUSES.RESUBMITTED;
  const isChangesRequested = article.status === SUBMISSION_STATUSES.CHANGES_REQUESTED;
  const isRejected = article.status === SUBMISSION_STATUSES.REJECTED;

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div className="review-page-container">
            {/* Top Navigation */}
            <div className="review-top-bar">
              <Link to="/admin/alumni-articles" className="back-link">
                <FaArrowLeft />
                <span>Back to Alumni Submissions</span>
              </Link>

              <div className="status-indicator-badge">
                Status: <strong>{article.status.replace("_", " ").toUpperCase()}</strong>
              </div>
            </div>

            {/* Banner Notifications */}
            {isPublished && (
              <div className="review-notice-banner published">
                <div>
                  <strong>🚀 Published &amp; Live on Website</strong>
                  <p>This alumni story is live in the Abhyudaya Blog with {article.author?.name} credited as author.</p>
                </div>
                <a
                  href={`/blog/${article.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-live-btn"
                >
                  <span>View Live Post</span>
                  <FaExternalLinkAlt />
                </a>
              </div>
            )}

            {isChangesRequested && article.adminFeedback && (
              <div className="review-notice-banner warning">
                <div>
                  <strong>⚠️ Revision Requested from Author</strong>
                  <p><strong>Feedback Sent:</strong> "{article.adminFeedback}"</p>
                </div>
              </div>
            )}

            {isRejected && article.rejectionReason && (
              <div className="review-notice-banner danger">
                <div>
                  <strong>❌ Submission Rejected</strong>
                  <p><strong>Reason:</strong> "{article.rejectionReason}"</p>
                </div>
              </div>
            )}

            {article.status === SUBMISSION_STATUSES.RESUBMITTED && (
              <div className="review-notice-banner info">
                <div>
                  <strong>🔄 Resubmitted by Author</strong>
                  <p>The author has updated their article and resubmitted it for your review.</p>
                </div>
              </div>
            )}

            {/* Main Content Layout */}
            <div className="review-grid-layout">
              {/* Left Column: Article Content */}
              <div className="review-article-column">
                <div className="review-article-card">
                  <div className="article-header-meta">
                    <span className="alumni-badge">
                      <FaGraduationCap /> ALUMNI CONTRIBUTION
                    </span>
                    <span className="category-tag">{article.category}</span>
                  </div>

                  <h1 className="review-article-title">{article.title}</h1>

                  <div className="review-article-excerpt-box">
                    <strong>Excerpt / Summary:</strong>
                    <p>{article.excerpt}</p>
                  </div>

                  {article.featuredImage ? (
                    <div className="review-featured-img-wrap">
                      <img
                        src={article.featuredImage}
                        alt={article.title}
                        className="review-featured-img"
                      />
                    </div>
                  ) : (
                    <div className="no-image-notice">
                      No featured image provided. This article can be approved without one.
                    </div>
                  )}

                  <div className="review-body-divider" />

                  <div className="review-article-body">
                    <h3>Article Content</h3>
                    <div className="article-prose-render">
                      {(() => {
                        const content = article.content;
                        if (!content) {
                          return <p style={{ color: "#94a3b8" }}>No content provided.</p>;
                        }
                        // TipTap JSON object — extract plain text from nodes
                        if (typeof content === "object" && content !== null) {
                          const extractText = (node) => {
                            if (!node) return "";
                            if (node.text) return node.text;
                            if (node.type === "image") return `[Image: ${node.attrs?.alt || ""}]`;
                            if (Array.isArray(node.content)) {
                              return node.content.map(extractText).join("");
                            }
                            return "";
                          };
                          const paragraphs = Array.isArray(content.content)
                            ? content.content.map((node) => extractText(node)).filter(Boolean)
                            : [extractText(content)].filter(Boolean);
                          return paragraphs.length > 0
                            ? paragraphs.map((para, idx) => <p key={idx}>{para}</p>)
                            : <p style={{ color: "#94a3b8" }}>Content is empty.</p>;
                        }
                        // HTML string
                        if (typeof content === "string" && content.trim().startsWith("<")) {
                          return (
                            <div
                              dangerouslySetInnerHTML={{ __html: content }}
                              style={{ lineHeight: 1.7 }}
                            />
                          );
                        }
                        // Plain text
                        if (typeof content === "string") {
                          return content.split("\n\n").map((para, idx) => (
                            <p key={idx}>{para}</p>
                          ));
                        }
                        return <p style={{ color: "#94a3b8" }}>Unable to render content.</p>;
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Author Details & Action Controls */}
              <div className="review-sidebar-column">
                {/* Actions Card */}
                <div className="review-action-card">
                  <h3>Editorial Actions</h3>
                  <p className="actions-subtext">
                    Review content quality, verify alumni details, and decide whether to publish or request revisions.
                  </p>

                  <div className="action-buttons-stack">
                    {/* Approve & Publish actions: SUPER ADMIN ONLY */}
                    {isSuper ? (
                      <>
                        {(isApproved || isPublished) ? (
                          <a
                            href={`/blog/${article.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="action-btn publish"
                            style={{ textDecoration: "none" }}
                          >
                            <FaRocket />
                            <span>View Live Post →</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            className="action-btn approve"
                            onClick={() => setShowApproveModal(true)}
                            disabled={actionLoading}
                          >
                            {actionLoading ? <FaSpinner className="spin" /> : <FaCheck />}
                            <span>Approve &amp; Publish Article</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <div style={{ background: "rgba(100, 116, 139, 0.2)", padding: "10px 12px", borderRadius: "6px", fontSize: "12px", color: "#94a3b8", lineHeight: "1.4" }}>
                        🔒 Only <strong>Super Admin</strong> has authority to approve and publish alumni articles.
                      </div>
                    )}

                    {/* Request changes */}
                    <button
                      type="button"
                      className="action-btn changes"
                      onClick={() => setShowChangesModal(true)}
                      disabled={actionLoading}
                    >
                      <FaExclamationTriangle />
                      <span>Request Changes</span>
                    </button>

                    {/* Reject button */}
                    {!isRejected && (
                      <button
                        type="button"
                        className="action-btn reject"
                        onClick={() => setShowRejectModal(true)}
                        disabled={actionLoading}
                      >
                        <FaTimes />
                        <span>Reject Article</span>
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      type="button"
                      className="action-btn delete"
                      onClick={() => setShowDeleteModal(true)}
                      disabled={actionLoading}
                    >
                      <FaTrash />
                      <span>Delete Submission</span>
                    </button>
                  </div>
                </div>

                {/* Alumni Author Profile Card */}
                <div className="review-author-card">
                  <div className="author-card-header">
                    <FaUserGraduate className="author-header-icon" />
                    <h3>Alumni Contributor</h3>
                  </div>

                  <div className="author-profile-summary">
                    <div className="author-avatar-stage">
                      {article.author?.profilePhoto ? (
                        <img
                          src={article.author.profilePhoto}
                          alt={article.author.name}
                          className="author-avatar-img"
                        />
                      ) : (
                        <div className="author-avatar-fallback">
                          {article.author?.name?.charAt(0).toUpperCase() || "A"}
                        </div>
                      )}
                    </div>

                    <div className="author-info-stage">
                      <h4 className="author-name-title">{article.author?.name}</h4>
                      <p className="author-academic-line">
                        {[
                          article.author?.branch ? `B.Tech ${article.author.branch}` : null,
                          article.author?.graduationYear ? `Class of ${article.author.graduationYear}` : null,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    </div>
                  </div>

                  <div className="author-details-list">
                    {(article.author?.organization || article.author?.designation) && (
                      <div className="author-detail-item">
                        <span className="detail-key">Current Role</span>
                        <span className="detail-val">
                          {[article.author.designation, article.author.organization]
                            .filter(Boolean)
                            .join(" at ")}
                        </span>
                      </div>
                    )}

                    {article.author?.email && (
                      <div className="author-detail-item">
                        <span className="detail-key">Email</span>
                        <a href={`mailto:${article.author.email}`} className="detail-val link">
                          <FaEnvelope /> {article.author.email}
                        </a>
                      </div>
                    )}

                    {article.author?.linkedin && (
                      <div className="author-detail-item">
                        <span className="detail-key">LinkedIn</span>
                        <a
                          href={article.author.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="detail-val link"
                        >
                          <FaLinkedin /> View Profile ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submission Audit Metadata */}
                <div className="review-meta-card">
                  <h4>Submission Details</h4>
                  <ul>
                    <li>
                      <span>Submitted:</span>{" "}
                      <strong>{article.submittedDateFormatted}</strong>
                    </li>
                    {article.reviewedBy && (
                      <li>
                        <span>Reviewed By:</span>{" "}
                        <strong>{article.reviewedBy.name || article.reviewedBy.email}</strong>
                      </li>
                    )}
                    {article.reviewedDateFormatted && (
                      <li>
                        <span>Reviewed On:</span>{" "}
                        <strong>{article.reviewedDateFormatted}</strong>
                      </li>
                    )}
                    <li>
                      <span>Author Display:</span>{" "}
                      <strong style={{ color: "#facc15" }}>{article.author?.name}</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Modal: Request Changes */}
          {showChangesModal && (
            <div className="review-modal-backdrop" onClick={() => setShowChangesModal(false)}>
              <div className="review-modal-card" onClick={(e) => e.stopPropagation()}>
                <h3>Request Changes from Author</h3>
                <p>
                  Explain to {article.author?.name} what edits are required. They will be able to review your feedback, make adjustments, and resubmit.
                </p>

                <form onSubmit={handleSubmitChanges}>
                  <textarea
                    rows="5"
                    className="modal-textarea"
                    placeholder="e.g. Please add more details about your final-year project, the tech stack used, and how it helped in campus placement."
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    required
                  />

                  <div className="modal-actions-row">
                    <button
                      type="button"
                      className="modal-cancel-btn"
                      onClick={() => setShowChangesModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="modal-submit-btn changes"
                      disabled={actionLoading}
                    >
                      {actionLoading ? "Submitting..." : "Send Feedback & Request Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Reject Submission */}
          {showRejectModal && (
            <div className="review-modal-backdrop" onClick={() => setShowRejectModal(false)}>
              <div className="review-modal-card" onClick={(e) => e.stopPropagation()}>
                <h3>Reject Article Submission</h3>
                <p>
                  Please specify the reason for declining this article submission.
                </p>

                <form onSubmit={handleSubmitReject}>
                  <textarea
                    rows="4"
                    className="modal-textarea"
                    placeholder="e.g. Content does not align with Abhyudaya editorial guidelines or is incomplete."
                    value={rejectionInput}
                    onChange={(e) => setRejectionInput(e.target.value)}
                    required
                  />

                  <div className="modal-actions-row">
                    <button
                      type="button"
                      className="modal-cancel-btn"
                      onClick={() => setShowRejectModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="modal-submit-btn reject"
                      disabled={actionLoading}
                    >
                      {actionLoading ? "Processing..." : "Confirm Rejection"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Approve Confirmation */}
          {showApproveModal && (
            <div className="review-modal-backdrop" onClick={() => setShowApproveModal(false)}>
              <div className="review-modal-card" onClick={(e) => e.stopPropagation()}>
                <h3>Approve Alumni Article</h3>
                <p>
                  Are you sure you want to approve <strong>"{article.title}"</strong> submitted by <strong>{article.author?.name}</strong>?
                </p>
                <p style={{ color: "var(--ink-soft, #4a4f6b)", fontSize: "13px" }}>
                  Once approved, this article will immediately be published live to the public Abhyudaya Blog and will appear in the alumni author&apos;s dashboard.
                </p>
                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={() => setShowApproveModal(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="modal-submit-btn approve"
                    onClick={handleApprove}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Approving..." : "Confirm Approval"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Publish Confirmation */}
          {showPublishModal && (
            <div className="review-modal-backdrop" onClick={() => setShowPublishModal(false)}>
              <div className="review-modal-card" onClick={(e) => e.stopPropagation()}>
                <h3>🚀 Publish to Live Abhyudaya Blog</h3>
                <p>
                  You are about to publish <strong>"{article.title}"</strong> to the live blog.
                </p>
                <p style={{ color: "#facc15", fontSize: "13px", fontWeight: "600" }}>
                  ✓ Author attribution will permanently be credited to {article.author?.name} (Class of {article.author?.graduationYear}, {article.author?.branch}).
                </p>
                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={() => setShowPublishModal(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="modal-submit-btn publish"
                    onClick={handlePublish}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Publishing..." : "Publish Live Now"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Delete Confirmation */}
          {showDeleteModal && (
            <div className="review-modal-backdrop" onClick={() => setShowDeleteModal(false)}>
              <div className="review-modal-card" onClick={(e) => e.stopPropagation()}>
                <h3 style={{ color: "#f87171" }}>Delete Submission</h3>
                <p>
                  Are you sure you want to permanently delete this submission by <strong>{article.author?.name}</strong>?
                </p>
                <p style={{ color: "#ef4444", fontSize: "12.5px" }}>
                  ⚠️ This action cannot be undone.
                </p>
                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="modal-submit-btn delete"
                    onClick={handleDelete}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Deleting..." : "Permanently Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
