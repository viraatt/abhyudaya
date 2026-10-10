import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { FaCloudUploadAlt, FaImages, FaTrash, FaSpinner, FaPaperPlane, FaExclamationTriangle, FaExternalLinkAlt } from "react-icons/fa";
import { db } from "../../Firebase/firebase";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import RichEditor from "../components/editor/RichEditor";
import SlugInput from "../components/SlugInput";
import AutosaveIndicator from "../components/AutosaveIndicator";
import MediaLibrary from "../components/media/MediaLibrary";
import ErrorBoundary from "../components/ErrorBoundary";
import FeaturedImageUpload from "../components/FeaturedImageUpload";
import { useToast } from "../components/Toast";
import { useAutosave } from "../hooks/useAutosave";
import { useAuth } from "../../context/AuthContext";
import { ROLES, normalizeRole } from "../config/roles";
import {
  saveAlumniArticleDraft,
  submitAlumniArticleForApproval,
  syncAlumniSubmissionFromBlog,
  unpublishAlumniArticle,
  ALUMNI_CATEGORIES,
  SUBMISSION_STATUSES,
} from "../../Firebase/alumniArticleService";

import "./style/admin.css";
import "./addBlog.css";
import { uploadImage } from "./services/imageUpload";
import { updateBlogService, updateBlogStatusService } from "./services/blogService";
import { resolveAuthorName } from "../../utils/authorHelper";

function EditBlog() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuth();
  const isAlumniUser = normalizeRole(currentUser?.role) === ROLES.ALUMNI;
  const isSuperAdmin = normalizeRole(currentUser?.role) === ROLES.SUPER_ADMIN;

  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Club News");
  const [tags, setTags] = useState("");
  const [slug, setSlug] = useState("");
  const [seo, setSeo] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [status, setStatus] = useState("Draft");
  const [adminFeedback, setAdminFeedback] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [articleMetadata, setArticleMetadata] = useState(null);

  // Editor States
  const [contentJson, setContentJson] = useState(null);
  const [contentExcerpt, setContentExcerpt] = useState("");

  // Featured Image
  const [featuredImage, setFeaturedImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);

  // Save / Action Loaders
  const [saving, setSaving] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Fetch Blog / Alumni Article Data
  useEffect(() => {
    async function loadBlog() {
      try {
        setLoading(true);

        if (isAlumniUser) {
          // Fetch from alumniSubmissions
          const docRef = doc(db, "alumniSubmissions", id);
          const snapshot = await getDoc(docRef);

          if (!snapshot.exists()) {
            toast.error("Article submission not found.");
            navigate("/admin/blogs");
            return;
          }

          const data = snapshot.data();

          // Authorization check: must be author
          if (
            currentUser?.uid &&
            data.authorUid &&
            data.authorUid !== currentUser.uid &&
            data.authorId !== currentUser.uid
          ) {
            toast.error("You are not authorized to edit this article.");
            navigate("/admin/blogs");
            return;
          }

          setTitle(data.title || "");
          setCategory(data.category || "Alumni Stories");
          setTags(Array.isArray(data.tags) ? data.tags.join(", ") : "");
          setSlug(data.slug || "");
          setSeo(data.seo || "");
          setFeaturedImage(data.featuredImage || "");
          setStatus(data.status || "draft");
          setContentExcerpt(data.excerpt || "");
          setAdminFeedback(data.adminFeedback || "");
          setRejectionReason(data.rejectionReason || "");

          // RichEditor content could be JSON or string
          setContentJson(typeof data.content === "object" ? data.content : data.content);
        } else {
          // Standard admin blog fetch
          const docRef = doc(db, "blogs", id);
          const snapshot = await getDoc(docRef);

          if (!snapshot.exists()) {
            toast.error("Blog post not found.");
            navigate("/admin/blogs");
            return;
          }

          const data = snapshot.data();
          setArticleMetadata(data);
          setTitle(data.title || "");
          setCategory(data.category || "Club News");
          setTags(Array.isArray(data.tags) ? data.tags.join(", ") : "");
          setSlug(data.slug || "");
          setSeo(data.seo || "");
          setPublishDate(data.publishDate || "");
          setStatus(data.status || "Draft");
          setFeaturedImage(data.featuredImage || "");
          setContentJson(data.content || null);
          setContentExcerpt(data.excerpt || "");
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load article.");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadBlog();
    }
  }, [id, navigate, toast, isAlumniUser, currentUser]);

  // Is editable check for alumni (can only edit if draft or changes_requested)
  const isEditableForAlumni = useMemo(() => {
    if (!isAlumniUser) return true;
    const st = (status || "").toLowerCase();
    return st === "draft" || st === "changes_requested" || st === "published" || st === "approved";
  }, [isAlumniUser, status]);

  // Callback to compute blog data payload for autosave
  const getAutosaveData = useCallback(() => {
    return {
      title: title.trim(),
      category,
      featuredImage,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      slug: slug.trim(),
      seo,
      publishDate,
      status,
      author: isAlumniUser ? resolveAuthorName(null, currentUser) : "Admin",
      ...(articleMetadata?.isAlumniContribution ? {
        author: articleMetadata.author || articleMetadata.alumniAuthor?.name || "Abhyudaya Alumni",
        isAlumniContribution: true,
        alumniAuthor: articleMetadata.alumniAuthor || null,
        authorUid: articleMetadata.authorUid || articleMetadata.authorId || null,
        authorId: articleMetadata.authorId || articleMetadata.authorUid || null,
        submissionId: articleMetadata.submissionId || null,
      } : {}),
      excerpt: contentExcerpt.trim().substring(0, 180),
      content: contentJson,
    };
  }, [title, category, featuredImage, tags, slug, seo, publishDate, status, contentExcerpt, contentJson, isAlumniUser, currentUser, articleMetadata]);

  // Handle autosave callback from hook
  const handleAutosave = useCallback(
    async (blogData) => {
      if (isAlumniUser) {
        if (!isEditableForAlumni) return id;
        await saveAlumniArticleDraft(id, {
          title,
          category,
          featuredImage,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          slug,
          seo,
          excerpt: contentExcerpt.trim().substring(0, 180),
          content: contentJson,
        }, currentUser);
        return id;
      } else {
        await updateBlogService(id, blogData);
        if (isSuperAdmin && articleMetadata?.isAlumniContribution && articleMetadata.submissionId) {
          await syncAlumniSubmissionFromBlog(articleMetadata.submissionId, id, blogData, currentUser);
        }
        return id;
      }
    },
    [id, isAlumniUser, isEditableForAlumni, isSuperAdmin, articleMetadata, title, category, featuredImage, tags, slug, seo, contentExcerpt, contentJson, currentUser]
  );

  // Use Autosave Hook (30 sec interval)
  const {
    autosaveStatus,
    lastSavedTime,
    autosaveError,
    hasUnsavedChanges,
    retrySave,
  } = useAutosave(getAutosaveData, handleAutosave, {
    enabled: !loading && Boolean(id) && (!isAlumniUser || isEditableForAlumni),
    interval: 30000,
  });

  // Handle Editor Change
  const handleEditorChange = useCallback(({ json, text }) => {
    setContentJson(json);
    setContentExcerpt(text || "");
  }, []);

  // Upload Featured Image
  const handleImageUpload = async (fileOrEvent) => {
    const file = fileOrEvent?.target?.files
      ? fileOrEvent.target.files[0]
      : fileOrEvent;
    if (!file) return;

    try {
      setUploadingImage(true);
      const url = await uploadImage(file);
      setFeaturedImage(url);
      toast.success("Featured image updated!");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setFeaturedImage("");
    toast.info("Featured image removed.");
  };

  const handleSelectMediaImage = (mediaItem) => {
    if (mediaItem && mediaItem.url) {
      setFeaturedImage(mediaItem.url);
      setShowMediaModal(false);
      toast.success("Featured image selected from Media Library!");
    }
  };

  // Manual Save (Draft for alumni, Draft/Published for Admin)
  const handleSave = async (targetStatus = status) => {
    if (isAlumniUser) {
      try {
        setSaving(true);
        const articleData = {
          title: title.trim(),
          category,
          featuredImage,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          slug: slug.trim(),
          seo,
          excerpt: contentExcerpt.trim().substring(0, 180),
          content: contentJson,
        };

        await saveAlumniArticleDraft(id, articleData, currentUser);
        toast.success(status === "published" ? "Article updated successfully." : "Draft saved successfully.");
      } catch (err) {
        console.error(err);
        toast.error(err.message || "Failed to save article draft.");
      } finally {
        setSaving(false);
      }
      return;
    }

    // Admin save
    try {
      setSaving(true);
      const blogData = {
        title: title.trim(),
        category,
        featuredImage,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        slug: slug.trim(),
        seo,
        publishDate: publishDate || new Date().toISOString().split("T")[0],
        status: targetStatus,
        author: articleMetadata?.isAlumniContribution
          ? (articleMetadata.author || articleMetadata.alumniAuthor?.name || "Abhyudaya Alumni")
          : "Admin",
        excerpt: contentExcerpt.trim().substring(0, 180),
        content: contentJson,
        ...(articleMetadata?.isAlumniContribution ? {
          isAlumniContribution: true,
          alumniAuthor: articleMetadata.alumniAuthor || null,
          authorUid: articleMetadata.authorUid || articleMetadata.authorId || null,
          authorId: articleMetadata.authorId || articleMetadata.authorUid || null,
          submissionId: articleMetadata.submissionId || null,
        } : {}),
      };

      await updateBlogService(id, blogData);
      if (isSuperAdmin && articleMetadata?.isAlumniContribution && articleMetadata.submissionId) {
        await syncAlumniSubmissionFromBlog(articleMetadata.submissionId, id, blogData, currentUser);
      }
      setStatus(targetStatus);
      toast.success(
        targetStatus === "Published"
          ? "🚀 Blog Post Published!"
          : "💾 Changes Saved Successfully!"
      );
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save blog post.");
    } finally {
      setSaving(false);
    }
  };

  // Submit / Resubmit for Approval (Alumni Only)
  const handleSubmitForApproval = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title for your article.");
      return;
    }
    if (!contentExcerpt.trim() && !contentJson) {
      toast.error("Please write your article content before submitting.");
      return;
    }

    try {
      setSubmittingApproval(true);
      const articleData = {
        title: title.trim(),
        category,
        featuredImage,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        slug: slug.trim(),
        seo,
        excerpt: contentExcerpt.trim().substring(0, 180),
        content: contentJson,
        author: currentUser,
        authorUid: currentUser?.uid || null,
        authorId: currentUser?.uid || null,
        authorEmail: currentUser?.email || "",
        authorProfilePhoto: currentUser?.profilePhoto || currentUser?.photoURL || "",
      };

      await submitAlumniArticleForApproval(id, articleData, currentUser);
      setStatus("pending");
      toast.success("📨 Article submitted for approval! Super Admin will review it.");
      navigate("/admin/blogs");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to submit article for approval.");
    } finally {
      setSubmittingApproval(false);
    }
  };

  // Unpublish (Admins Only)
  const handleUnpublish = async () => {
    try {
      setUnpublishing(true);
      if (articleMetadata?.isAlumniContribution && articleMetadata.submissionId) {
        await unpublishAlumniArticle(articleMetadata.submissionId, currentUser);
      } else {
        await updateBlogStatusService(id, "Draft");
      }
      setStatus("Draft");
      toast.info("Blog unpublished and moved to Drafts.");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to unpublish blog.");
    } finally {
      setUnpublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="dashboard-main">
          <Topbar />
          <div className="dashboard-content">
            <p>Loading blog post...</p>
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
          <div className="create-post">
            <div className="create-header">
              <div className="header-left">
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                  <h1>{isAlumniUser ? "Edit Article" : "Edit Blog"}</h1>
                  <span className={`status-pill ${status.toLowerCase()}`}>
                    {status === "pending"
                      ? "Pending Approval"
                      : status === "changes_requested"
                      ? "Changes Requested"
                      : status}
                  </span>
                  <AutosaveIndicator
                    status={autosaveStatus}
                    lastSavedTime={lastSavedTime}
                    errorMessage={autosaveError}
                    hasUnsavedChanges={hasUnsavedChanges}
                    onRetry={retrySave}
                  />
                </div>
                <p>Editing {isAlumniUser ? "article" : "post"}: <strong>{title || "Untitled"}</strong></p>
              </div>

              <div className="header-buttons">
                {isAlumniUser ? (
                  <>
                    {isEditableForAlumni && (
                      <>
                        <button
                          type="button"
                          className="draft-btn"
                          onClick={() => handleSave()}
                          disabled={saving || submittingApproval}
                        >
                          {saving ? "Saving..." : status === "published" ? "💾 Save Changes" : "💾 Save Draft"}
                        </button>

                        {status !== "published" && status !== "approved" && <button
                          type="button"
                          className="publish-btn"
                          style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
                          onClick={handleSubmitForApproval}
                          disabled={submittingApproval || saving}
                        >
                          {submittingApproval
                            ? "Submitting..."
                            : status === "changes_requested"
                            ? "📨 Resubmit for Approval"
                            : "📨 Submit for Approval"}
                        </button>}
                      </>
                    )}

                    {status === "published" && (
                      <Link
                        to={`/blog/${slug}`}
                        className="publish-btn"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
                      >
                        <FaExternalLinkAlt /> View Live Article
                      </Link>
                    )}

                    {status === "pending" && (
                      <div style={{ color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}>
                        ⏳ Under Review by Super Admin
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {status === "Draft" && (
                      <>
                        <button
                          type="button"
                          className="draft-btn"
                          onClick={() => handleSave("Draft")}
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "💾 Save Draft"}
                        </button>

                        <button
                          type="button"
                          className="publish-btn"
                          onClick={() => handleSave("Published")}
                          disabled={saving}
                        >
                          {saving ? "Publishing..." : "🚀 Publish"}
                        </button>
                      </>
                    )}

                    {status === "Published" && (
                      <>
                        <button
                          type="button"
                          className="draft-btn"
                          onClick={handleUnpublish}
                          disabled={unpublishing || saving}
                        >
                          {unpublishing ? "Unpublishing..." : "↩ Unpublish to Draft"}
                        </button>

                        <button
                          type="button"
                          className="publish-btn"
                          onClick={() => handleSave("Published")}
                          disabled={saving || unpublishing}
                        >
                          {saving ? "Saving..." : "💾 Update Post"}
                        </button>
                      </>
                    )}

                    {status === "Archived" && (
                      <button
                        type="button"
                        className="publish-btn"
                        onClick={() => handleSave("Draft")}
                        disabled={saving}
                      >
                        Restore to Draft
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Alumni Feedback & Status Alert Banners */}
            {isAlumniUser && status === "changes_requested" && (
              <div style={{ background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.4)", borderRadius: "8px", padding: "14px 18px", marginBottom: "18px", color: "#fef3c7" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", fontSize: "15px", color: "#fbbf24" }}>
                  <FaExclamationTriangle />
                  <span>Super Admin Feedback (Changes Requested):</span>
                </div>
                <p style={{ margin: "8px 0 0", color: "#fde68a", fontSize: "14px", lineHeight: "1.5" }}>
                  {adminFeedback || "Please update your article according to editorial standards and click 'Resubmit for Approval'."}
                </p>
              </div>
            )}

            {isAlumniUser && status === "pending" && (
              <div style={{ background: "rgba(59, 130, 246, 0.12)", border: "1px solid rgba(59, 130, 246, 0.35)", borderRadius: "8px", padding: "14px 18px", marginBottom: "18px", color: "#bfdbfe" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", fontSize: "15px", color: "#60a5fa" }}>
                  <span>⏳ Submission Under Review</span>
                </div>
                <p style={{ margin: "8px 0 0", color: "#93c5fd", fontSize: "14px", lineHeight: "1.5" }}>
                  Your article is currently being reviewed by Super Admin. Submissions cannot be edited while awaiting approval.
                </p>
              </div>
            )}

            {isAlumniUser && (status === "published" || status === "approved") && (
              <div style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: "8px", padding: "14px 18px", marginBottom: "18px", color: "#d1fae5" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", fontSize: "15px", color: "#34d399" }}>
                  <span>🚀 Article Published Live</span>
                </div>
                <p style={{ margin: "8px 0 0", color: "#a7f3d0", fontSize: "14px" }}>
                  This article has been approved and published to the Abhyudaya Blog. <Link to={`/blog/${slug}`} target="_blank" style={{ color: "#6ee7b7", textDecoration: "underline" }}>View live post →</Link>
                </p>
              </div>
            )}

            {isAlumniUser && status === "rejected" && (
              <div style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: "8px", padding: "14px 18px", marginBottom: "18px", color: "#fee2e2" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", fontSize: "15px", color: "#f87171" }}>
                  <span>❌ Submission Not Selected</span>
                </div>
                <p style={{ margin: "8px 0 0", color: "#fca5a5", fontSize: "14px" }}>
                  {rejectionReason || "This submission was not selected for publication."}
                </p>
              </div>
            )}

            <div className="editor-layout">
              <section className="editor-section">
                <input
                  type="text"
                  className="title-input"
                  placeholder="Enter Blog Title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isAlumniUser && !isEditableForAlumni}
                  aria-label="Blog title"
                />

                <ErrorBoundary>
                  <RichEditor
                    value={contentJson}
                    onChange={handleEditorChange}
                    readOnly={isAlumniUser && !isEditableForAlumni}
                    placeholder="Write your story here..."
                  />
                </ErrorBoundary>
              </section>

              <aside className="blog-sidebar" aria-label="Blog post settings">
                <div className="card">
                  <h3>Featured Image</h3>

                  <FeaturedImageUpload
                    imageUrl={featuredImage}
                    onImageChange={handleImageUpload}
                    onRemove={removeImage}
                    onOpenMediaLibrary={() => setShowMediaModal(true)}
                    uploading={uploadingImage}
                    disabled={isAlumniUser && !isEditableForAlumni}
                  />
                </div>

                <div className="card">
                  <h3>Category</h3>

                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={isAlumniUser && !isEditableForAlumni}
                    aria-label="Category"
                  >
                    {isAlumniUser ? (
                      ALUMNI_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))
                    ) : (
                      <>
                        <option>Club News</option>
                        <option>Workshop</option>
                        <option>Technology</option>
                        <option>Events</option>
                        <option>Achievement</option>
                        <option>Alumni Stories</option>
                      </>
                    )}
                  </select>
                </div>

                {isAlumniUser && (
                  <div className="card">
                    <h3>Alumni Author</h3>
                    <div style={{ fontSize: "13px", color: "#e2e8f0", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <strong>{resolveAuthorName(null, currentUser)}</strong>
                      <span style={{ color: "#94a3b8" }}>
                        {currentUser?.branch || "Engineering"} • Class of {currentUser?.graduationYear || "Alumni"}
                      </span>
                      {currentUser?.organization && (
                        <span style={{ color: "#94a3b8" }}>
                          {currentUser?.designation ? `${currentUser.designation} at ` : ""}{currentUser.organization}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="card">
                  <h3>Tags</h3>

                  <input
                    type="text"
                    placeholder="React, Firebase, AI"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    disabled={isAlumniUser && !isEditableForAlumni}
                    aria-label="Tags separated by comma"
                  />
                </div>

                <div className="card">
                  <SlugInput
                    title={title}
                    slug={slug}
                    onSlugChange={setSlug}
                  />
                </div>

                <div className="card">
                  <h3>Short Excerpt</h3>

                  <textarea
                    rows="3"
                    placeholder="Brief description for blog card..."
                    value={contentExcerpt}
                    onChange={(e) => setContentExcerpt(e.target.value)}
                    disabled={isAlumniUser && !isEditableForAlumni}
                    aria-label="Article excerpt"
                  />
                </div>

                <div className="card">
                  <h3>SEO Description</h3>

                  <textarea
                    rows="3"
                    placeholder="Write SEO description..."
                    value={seo}
                    onChange={(e) => setSeo(e.target.value)}
                    disabled={isAlumniUser && !isEditableForAlumni}
                    aria-label="SEO meta description"
                  />
                </div>

                {!isAlumniUser && (
                  <div className="card">
                    <h3>Publish Date</h3>

                    <input
                      type="date"
                      value={publishDate}
                      onChange={(e) => setPublishDate(e.target.value)}
                      aria-label="Publish Date"
                    />
                  </div>
                )}

                {!isAlumniUser ? (
                  <div className="card">
                    <h3>Status</h3>

                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      aria-label="Post Status"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Published">Published</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                ) : (
                  <div className="card" style={{ borderLeft: "3px solid #3b82f6" }}>
                    <h3 style={{ color: "#60a5fa" }}>Approval Workflow</h3>
                    <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5, margin: "6px 0 0" }}>
                      Current status: <strong>{status}</strong>. Only Super Admin has final authority to publish articles to the public blog.
                    </p>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      </div>

      {/* Media Library Modal */}
      {showMediaModal && (
        <div className="media-modal-backdrop" onClick={() => setShowMediaModal(false)}>
          <div className="media-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <MediaLibrary
              isModalMode={true}
              onSelectImage={handleSelectMediaImage}
              onCloseModal={() => setShowMediaModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default EditBlog;
