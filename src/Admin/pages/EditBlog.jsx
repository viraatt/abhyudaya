import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { FaCloudUploadAlt, FaImages, FaTrash, FaSpinner } from "react-icons/fa";
import { db } from "../../Firebase/firebase";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import RichEditor from "../components/editor/RichEditor";
import SlugInput from "../components/SlugInput";
import AutosaveIndicator from "../components/AutosaveIndicator";
import MediaLibrary from "../components/media/MediaLibrary";
import ErrorBoundary from "../components/ErrorBoundary";
import { useToast } from "../Toast";
import { useAutosave } from "../hooks/useAutosave";

import "./style/admin.css";
import "./addBlog.css";
import { uploadImage } from "./services/imageUpload";
import { updateBlogService, updateBlogStatusService } from "./services/blogService";

function EditBlog() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Club News");
  const [tags, setTags] = useState("");
  const [slug, setSlug] = useState("");
  const [seo, setSeo] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [status, setStatus] = useState("Draft");

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

  // Fetch Blog Data
  useEffect(() => {
    async function loadBlog() {
      try {
        setLoading(true);
        const docRef = doc(db, "blogs", id);
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
          toast.error("Blog post not found.");
          navigate("/admin/blogs");
          return;
        }

        const data = snapshot.data();
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
      } catch (err) {
        console.error(err);
        toast.error("Failed to load blog post.");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadBlog();
    }
  }, [id, navigate, toast]);

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
      author: "Admin",
      excerpt: contentExcerpt.trim().substring(0, 180),
      content: contentJson,
    };
  }, [title, category, featuredImage, tags, slug, seo, publishDate, status, contentExcerpt, contentJson]);

  // Handle autosave callback from hook
  const handleAutosave = useCallback(
    async (blogData) => {
      await updateBlogService(id, blogData);
      return id;
    },
    [id]
  );

  // Use Autosave Hook (30 sec interval)
  const {
    autosaveStatus,
    lastSavedTime,
    autosaveError,
    hasUnsavedChanges,
    retrySave,
  } = useAutosave(getAutosaveData, handleAutosave, {
    enabled: !loading && Boolean(id),
    interval: 30000,
  });

  // Handle Editor Change
  const handleEditorChange = useCallback(({ json, text }) => {
    setContentJson(json);
    setContentExcerpt(text || "");
  }, []);

  // Upload Featured Image
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
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

  // Manual Save (Draft or Published)
  const handleSave = async (targetStatus = status) => {
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
        author: "Admin",
        excerpt: contentExcerpt.trim().substring(0, 180),
        content: contentJson,
      };

      await updateBlogService(id, blogData);
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

  // Unpublish (Revert to Draft)
  const handleUnpublish = async () => {
    try {
      setUnpublishing(true);
      await updateBlogStatusService(id, "Draft");
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
                  <h1>Edit Blog</h1>
                  <span className={`status-pill ${status.toLowerCase()}`}>
                    {status}
                  </span>
                  <AutosaveIndicator
                    status={autosaveStatus}
                    lastSavedTime={lastSavedTime}
                    errorMessage={autosaveError}
                    hasUnsavedChanges={hasUnsavedChanges}
                    onRetry={retrySave}
                  />
                </div>
                <p>Editing post: <strong>{title || "Untitled"}</strong></p>
              </div>

              <div className="header-buttons">
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
                    placeholder="Write your story here..."
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
                    <option>Club News</option>
                    <option>Workshop</option>
                    <option>Technology</option>
                    <option>Events</option>
                    <option>Achievement</option>
                  </select>
                </div>

                <div className="card">
                  <h3>Tags</h3>

                  <input
                    type="text"
                    placeholder="React, Firebase, AI"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
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
                  <h3>SEO Description</h3>

                  <textarea
                    rows="4"
                    placeholder="Write SEO description..."
                    value={seo}
                    onChange={(e) => setSeo(e.target.value)}
                    aria-label="SEO meta description"
                  />
                </div>

                <div className="card">
                  <h3>Publish Date</h3>

                  <input
                    type="date"
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                    aria-label="Publish Date"
                  />
                </div>

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