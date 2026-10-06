import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaCloudUploadAlt, FaImages, FaTrash, FaSpinner } from "react-icons/fa";
import { doc, getDoc } from "firebase/firestore";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import RichEditor from "../components/editor/RichEditor";
import SlugInput from "../components/SlugInput";
import AutosaveIndicator from "../components/AutosaveIndicator";
import MediaLibrary from "../components/media/MediaLibrary";
import ErrorBoundary from "../components/ErrorBoundary";
import { useToast } from "../components/Toast";
import { useAutosave } from "../hooks/useAutosave";
import { useAuth } from "../../context/AuthContext";
import { ROLES, normalizeRole } from "../config/roles";
import {
  saveAlumniArticleDraft,
  submitAlumniArticleForApproval,
  ALUMNI_CATEGORIES,
} from "../../Firebase/alumniArticleService";
import { db } from "../../Firebase/firebase";

import "./style/admin.css";
import "./addBlog.css";

import { publishBlog, updateBlogService } from "./services/blogService";
import { uploadImage } from "./services/imageUpload";

function AddBlog() {
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuth();
  const isAlumniUser = normalizeRole(currentUser?.role) === ROLES.ALUMNI;

  // ── Alumni profile fetched live from Firestore ──────────────────────────
  // null = loading, false = error, object = loaded profile
  const [alumniProfile, setAlumniProfile] = useState(null);
  const [alumniProfileLoading, setAlumniProfileLoading] = useState(false);

  useEffect(() => {
    if (!isAlumniUser || !currentUser?.uid) return;

    let cancelled = false;
    setAlumniProfileLoading(true);
    setAlumniProfile(null);

    (async () => {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (cancelled) return;

        if (!userSnap.exists()) {
          setAlumniProfile(false); // signals "doc not found" error
          return;
        }

        const data = userSnap.data();
        // Resolve display name: Firestore name fields → Firebase Auth displayName → email prefix
        const resolvedName =
          data.name ||
          data.displayName ||
          data.fullName ||
          data.authorName ||
          currentUser.displayName ||
          (currentUser.email ? currentUser.email.split("@")[0] : "") ||
          "";

        // Resolve branch: try multiple common field names
        const resolvedBranch =
          data.branch ||
          data.department ||
          data.course ||
          data.program ||
          "";

        setAlumniProfile({
          uid: currentUser.uid,
          name: resolvedName,
          email: currentUser.email || data.email || "",
          graduationYear: data.graduationYear || "",
          branch: resolvedBranch,
          organization: data.organization || "",
          designation: data.designation || "",
          linkedin: data.linkedin || "",
          profilePhoto: data.profilePhoto || data.photoURL || currentUser.photoURL || "",
        });
      } catch (err) {
        if (!cancelled) {
          console.error("[AddBlog] Failed to load alumni profile:", err);
          setAlumniProfile(false);
        }
      } finally {
        if (!cancelled) setAlumniProfileLoading(false);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAlumniUser, currentUser?.uid]);
  // ────────────────────────────────────────────────────────────────────────

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(isAlumniUser ? "Alumni Stories" : "Club News");
  const [tags, setTags] = useState("");
  const [slug, setSlug] = useState("");
  const [seo, setSeo] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [status, setStatus] = useState("Draft");

  // Rich Text Editor State
  const [contentJson, setContentJson] = useState(null);
  const [contentExcerpt, setContentExcerpt] = useState("");

  // Featured Image
  const [featuredImage, setFeaturedImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);

  // Draft / Publish Action Loading States
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Created Doc Ref for Autosave & Manual Saves
  const createdDocIdRef = useRef(null);

  // Update default category when role is detected
  useEffect(() => {
    if (isAlumniUser && category === "Club News") {
      setCategory("Alumni Stories");
    }
  }, [isAlumniUser, category]);

  // Callback to compute blog data payload for autosave hook
  const getAutosaveData = useCallback(() => {
    return {
      title: title.trim(),
      category,
      featuredImage,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      slug: slug.trim(),
      seo,
      publishDate: publishDate || new Date().toISOString().split("T")[0],
      status: "Draft",
      author: isAlumniUser
        ? (alumniProfile && alumniProfile !== false ? alumniProfile.name : (currentUser?.displayName || ""))
        : "Admin",
      excerpt: contentExcerpt.trim().substring(0, 180),
      content: contentJson,
    };
  }, [title, category, featuredImage, tags, slug, seo, publishDate, contentExcerpt, contentJson, isAlumniUser, alumniProfile, currentUser]);

  // Handle autosave callback from custom hook
  const handleAutosave = useCallback(async (blogData) => {
    if (isAlumniUser) {
      // Use the dynamically loaded profile; fall back to currentUser if still loading
      const authorUser = (alumniProfile && alumniProfile !== false) ? alumniProfile : currentUser;
      const res = await saveAlumniArticleDraft(createdDocIdRef.current, {
        title,
        category,
        featuredImage,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        slug,
        seo,
        excerpt: contentExcerpt.trim().substring(0, 180),
        content: contentJson,
        // Top-level author fields attached to the article document
        authorId: currentUser?.uid || null,
        authorEmail: currentUser?.email || "",
        authorProfilePhoto: authorUser?.profilePhoto || "",
      }, authorUser);
      createdDocIdRef.current = res.id;
      return res.id;
    } else {
      if (createdDocIdRef.current) {
        await updateBlogService(createdDocIdRef.current, blogData);
        return createdDocIdRef.current;
      } else {
        const result = await publishBlog(blogData);
        createdDocIdRef.current = result.id;
        return result.id;
      }
    }
  }, [isAlumniUser, title, category, featuredImage, tags, slug, seo, contentExcerpt, contentJson, currentUser, alumniProfile]);

  // Use Autosave Hook (30 sec interval)
  const {
    autosaveStatus,
    lastSavedTime,
    autosaveError,
    hasUnsavedChanges,
    retrySave,
  } = useAutosave(getAutosaveData, handleAutosave, {
    enabled: true,
    interval: 30000,
  });

  // Handle Editor Changes
  const handleEditorChange = useCallback(({ json, text }) => {
    setContentJson(json);
    setContentExcerpt(text || "");
  }, []);

  // Upload Featured Image from device
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const url = await uploadImage(file);
      setFeaturedImage(url);
      toast.success("Image uploaded successfully!");
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

  // --- Save Draft (Manual) ---
  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true);
      if (isAlumniUser) {
        // Use the dynamically loaded Firestore profile as source of truth
        const authorUser = (alumniProfile && alumniProfile !== false) ? alumniProfile : currentUser;
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
          // Top-level fields for the submission document
          authorId: currentUser?.uid || null,
          authorEmail: currentUser?.email || "",
          authorProfilePhoto: authorUser?.profilePhoto || "",
        };
        const result = await saveAlumniArticleDraft(createdDocIdRef.current, articleData, authorUser);
        createdDocIdRef.current = result.id;
        toast.success("💾 Draft Saved Successfully!");
        navigate(`/admin/blogs/edit/${result.id}`);
      } else {
        const blogData = {
          title: title.trim(),
          category,
          featuredImage,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          slug: slug.trim(),
          seo,
          publishDate,
          status: "Draft",
          author: "Admin",
          excerpt: contentExcerpt.trim().substring(0, 180),
          content: contentJson,
        };

        if (createdDocIdRef.current) {
          await updateBlogService(createdDocIdRef.current, blogData);
          toast.success("💾 Draft Saved Successfully!");
          navigate(`/admin/blogs/edit/${createdDocIdRef.current}`);
        } else {
          const result = await publishBlog(blogData);
          toast.success("💾 Draft Saved Successfully!");
          navigate(`/admin/blogs/edit/${result.id}`);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save draft.");
    } finally {
      setSavingDraft(false);
    }
  };

  // --- Submit for Approval (Alumni Only) ---
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
      // Use the dynamically loaded Firestore profile as source of truth
      const authorUser = (alumniProfile && alumniProfile !== false) ? alumniProfile : currentUser;
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
        // Top-level fields attached to the submission document
        authorId: currentUser?.uid || null,
        authorEmail: currentUser?.email || "",
        authorProfilePhoto: authorUser?.profilePhoto || "",
      };

      await submitAlumniArticleForApproval(createdDocIdRef.current, articleData, authorUser);
      toast.success("📨 Article submitted for approval! Super Admin will review it.");
      navigate("/admin/blogs");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to submit article for approval.");
    } finally {
      setSubmittingApproval(false);
    }
  };

  // --- Publish Blog (Admins Only - Alumni NEVER can call this) ---
  const handlePublish = async () => {
    if (isAlumniUser) {
      toast.error("Alumni contributors cannot publish articles directly. Please click 'Submit for Approval'.");
      return;
    }

    try {
      setPublishing(true);
      const targetStatus = status === "Archived" ? "Archived" : "Published";
      const blogData = {
        title: title.trim(),
        category,
        featuredImage,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        slug: slug.trim(),
        seo,
        publishDate: publishDate || new Date().toISOString().split("T")[0],
        status: targetStatus,
        author: "Admin",
        excerpt: contentExcerpt.trim().substring(0, 180),
        content: contentJson,
      };

      if (createdDocIdRef.current) {
        await updateBlogService(createdDocIdRef.current, blogData);
      } else {
        await publishBlog(blogData);
      }

      toast.success(
        targetStatus === "Published"
          ? "🚀 Blog Published Successfully!"
          : "📦 Blog Post Saved!"
      );
      navigate("/admin/blogs");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to publish blog.");
    } finally {
      setPublishing(false);
    }
  };

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
                  <h1>{isAlumniUser ? "Write Article" : "Create Blog"}</h1>
                  <AutosaveIndicator
                    status={autosaveStatus}
                    lastSavedTime={lastSavedTime}
                    errorMessage={autosaveError}
                    hasUnsavedChanges={hasUnsavedChanges}
                    onRetry={retrySave}
                  />
                </div>
                <p>
                  {isAlumniUser
                    ? "Share your journey and insights with the Abhyudaya community. Save a draft or submit for Super Admin approval."
                    : "Write and manage blog posts for Abhyudaya Club."}
                </p>
              </div>

              <div className="header-buttons">
                <button
                  type="button"
                  className="draft-btn"
                  onClick={handleSaveDraft}
                  disabled={savingDraft || publishing || submittingApproval}
                >
                  {savingDraft ? "Saving Draft..." : "💾 Save Draft"}
                </button>

                {isAlumniUser ? (
                  <button
                    type="button"
                    className="publish-btn"
                    style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
                    onClick={handleSubmitForApproval}
                    disabled={submittingApproval || savingDraft}
                  >
                    {submittingApproval ? "Submitting..." : "📨 Submit for Approval"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="publish-btn"
                    onClick={handlePublish}
                    disabled={publishing || savingDraft}
                  >
                    {publishing ? "Publishing..." : "🚀 Publish Post"}
                  </button>
                )}
              </div>
            </div>

            <div className="editor-layout">
              <section className="editor-section">
                <input
                  type="text"
                  className="title-input"
                  placeholder="Enter Blog Title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-label="Blog title"
                />

                <ErrorBoundary>
                  <RichEditor
                    value={contentJson}
                    onChange={handleEditorChange}
                    placeholder="Write your story here with rich formatting..."
                  />
                </ErrorBoundary>
              </section>

              <aside className="blog-sidebar" aria-label="Blog post settings">
                <div className="card">
                  <h3>Featured Image</h3>

                  {uploadingImage ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#2563eb", fontSize: "14px", fontWeight: 600, padding: "10px 0" }}>
                      <FaSpinner className="spin" /> Uploading image...
                    </div>
                  ) : featuredImage ? (
                    <div className="featured-image-preview">
                      <img
                        src={featuredImage}
                        alt="Featured post visual"
                      />

                      <button
                        type="button"
                        className="remove-image-btn"
                        onClick={removeImage}
                      >
                        <FaTrash /> Remove Image
                      </button>
                    </div>
                  ) : (
                    <div className="featured-image-box">
                      <label className="upload-btn-primary" style={{ cursor: "pointer" }}>
                        <FaCloudUploadAlt style={{ fontSize: "18px" }} /> Upload Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ display: "none" }}
                        />
                      </label>
                      <button
                        type="button"
                        className="media-library-btn"
                        onClick={() => setShowMediaModal(true)}
                      >
                        <FaImages /> Choose from Library
                      </button>
                    </div>
                  )}
                </div>

                <div className="card">
                  <h3>Category</h3>

                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
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

                    {/* ── Loading state ── */}
                    {alumniProfileLoading && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#94a3b8", padding: "4px 0" }}>
                        <FaSpinner className="spin" style={{ flexShrink: 0 }} />
                        Loading author information…
                      </div>
                    )}

                    {/* ── Error / doc missing ── */}
                    {!alumniProfileLoading && alumniProfile === false && (
                      <p style={{ fontSize: "13px", color: "#f87171", margin: 0, lineHeight: 1.45 }}>
                        Unable to load alumni profile. Please contact the administrator.
                      </p>
                    )}

                    {/* ── Loaded successfully ── */}
                    {!alumniProfileLoading && alumniProfile && alumniProfile !== false && (
                      <div style={{ fontSize: "13px", color: "#e2e8f0", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <strong>{alumniProfile.name || <em style={{ color: "#94a3b8" }}>Name not set</em>}</strong>
                        {(alumniProfile.branch || alumniProfile.graduationYear) && (
                          <span style={{ color: "#94a3b8" }}>
                            {alumniProfile.branch
                              ? alumniProfile.graduationYear
                                ? `${alumniProfile.branch} • Class of ${alumniProfile.graduationYear}`
                                : alumniProfile.branch
                              : `Class of ${alumniProfile.graduationYear}`}
                          </span>
                        )}
                        {alumniProfile.organization && (
                          <span style={{ color: "#94a3b8" }}>
                            {alumniProfile.designation ? `${alumniProfile.designation} at ` : ""}{alumniProfile.organization}
                          </span>
                        )}
                        <span style={{ color: "#64748b", fontSize: "12px", marginTop: "2px" }}>
                          {alumniProfile.email}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="card">
                  <h3>Tags</h3>

                  <input
                    type="text"
                    placeholder="Career, Industry, Placement"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    aria-label="Tags separated by comma"
                  />
                </div>

                {/* Slug Generator Component */}
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
                      Your article will be saved as <strong>Draft</strong> or sent to <strong>Pending Approval</strong>. Only Super Admin has authority to approve and publish to the public blog.
                    </p>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      </div>

      {/* Media Library Picker Modal */}
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

export default AddBlog;
