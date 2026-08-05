import { useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaCloudUploadAlt, FaImages, FaTrash, FaSpinner } from "react-icons/fa";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import RichEditor from "../components/editor/RichEditor";
import SlugInput from "../components/SlugInput";
import AutosaveIndicator from "../components/AutosaveIndicator";
import MediaLibrary from "../components/media/MediaLibrary";
import ErrorBoundary from "../components/ErrorBoundary";
import { useToast } from "../components/Toast";
import { useAutosave } from "../hooks/useAutosave";

import "./style/admin.css";
import "./addBlog.css";

import { publishBlog, updateBlogService } from "./services/blogService";
import { uploadImage } from "./services/imageUpload";

function AddBlog() {
  const navigate = useNavigate();
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Club News");
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

  // Created Doc Ref for Autosave & Manual Saves
  const createdDocIdRef = useRef(null);

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
      author: "Admin",
      excerpt: contentExcerpt.trim().substring(0, 180),
      content: contentJson,
    };
  }, [title, category, featuredImage, tags, slug, seo, publishDate, contentExcerpt, contentJson]);

  // Handle autosave callback from custom hook
  const handleAutosave = useCallback(async (blogData) => {
    if (createdDocIdRef.current) {
      await updateBlogService(createdDocIdRef.current, blogData);
      return createdDocIdRef.current;
    } else {
      const result = await publishBlog(blogData);
      createdDocIdRef.current = result.id;
      return result.id;
    }
  }, []);

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
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save draft.");
    } finally {
      setSavingDraft(false);
    }
  };

  // --- Publish Blog ---
  const handlePublish = async () => {
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
                  <h1>Create Blog</h1>
                  <AutosaveIndicator
                    status={autosaveStatus}
                    lastSavedTime={lastSavedTime}
                    errorMessage={autosaveError}
                    hasUnsavedChanges={hasUnsavedChanges}
                    onRetry={retrySave}
                  />
                </div>
                <p>Write and manage blog posts for Abhyudaya Club.</p>
              </div>

              <div className="header-buttons">
                <button
                  type="button"
                  className="draft-btn"
                  onClick={handleSaveDraft}
                  disabled={savingDraft || publishing}
                >
                  {savingDraft ? "Saving Draft..." : "💾 Save Draft"}
                </button>

                <button
                  type="button"
                  className="publish-btn"
                  onClick={handlePublish}
                  disabled={publishing || savingDraft}
                >
                  {publishing ? "Publishing..." : "🚀 Publish Post"}
                </button>
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

                {/* Slug Generator Component */}
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
