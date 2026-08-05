import { useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import RichEditor from "../components/editor/RichEditor";
import SlugInput from "../components/SlugInput";
import AutosaveIndicator from "../components/AutosaveIndicator";
import MediaLibrary from "../components/media/MediaLibrary";
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

  const [featuredImage, setFeaturedImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);

  // Created blog ID if autosave creates a draft document in background
  const createdDocIdRef = useRef(null);

  // Action loading states
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Tiptap JSON content state
  const [contentJson, setContentJson] = useState(null);
  const [contentExcerpt, setContentExcerpt] = useState("");

  const currentBlogData = useMemo(() => {
    return {
      title: title.trim(),
      category,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      slug: slug.trim(),
      seo,
      publishDate,
      status: "Draft",
      featuredImage,
      contentJson,
    };
  }, [title, category, tags, slug, seo, publishDate, featuredImage, contentJson]);

  // Async Autosave Handler
  const handleAutosave = useCallback(
    async (dataToSave) => {
      if (!dataToSave.title) return;

      const payload = {
        title: dataToSave.title,
        category: dataToSave.category,
        tags: dataToSave.tags,
        slug: dataToSave.slug,
        seo: dataToSave.seo,
        publishDate: dataToSave.publishDate || new Date().toISOString().split("T")[0],
        status: "Draft",
        featuredImage: dataToSave.featuredImage,
        excerpt: contentExcerpt.trim().substring(0, 180),
        content: dataToSave.contentJson,
      };

      if (createdDocIdRef.current) {
        await updateBlogService(createdDocIdRef.current, payload);
      } else {
        const result = await publishBlog(payload);
        createdDocIdRef.current = result.id;
      }
    },
    [contentExcerpt]
  );

  // 20-Second Autosave Hook
  const {
    status: autosaveStatus,
    lastSavedTime,
    errorMessage: autosaveError,
    hasUnsavedChanges,
    retrySave,
  } = useAutosave({
    data: currentBlogData,
    onSave: handleAutosave,
    interval: 20000,
    enabled: !!title.trim(),
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const imageUrl = await uploadImage(file);
      setFeaturedImage(imageUrl);
      toast.success("Featured image uploaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const removeImage = () => {
    setFeaturedImage("");
    toast.info("Featured image removed.");
  };

  const handleEditorChange = (json, html, text) => {
    setContentJson(json);
    setContentExcerpt(text || "");
  };

  // --- Save as Draft ---
  const handleSaveDraft = async () => {
    if (!title.trim() && !contentJson) {
      toast.warning("Please enter a blog title or write some content before saving draft.");
      return;
    }

    try {
      setSavingDraft(true);
      const blogData = {
        title: title.trim() || "Untitled Draft",
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
        status: "Published",
        author: "Admin",
        excerpt: contentExcerpt.trim().substring(0, 180),
        content: contentJson,
      };

      if (createdDocIdRef.current) {
        await updateBlogService(createdDocIdRef.current, blogData);
      } else {
        await publishBlog(blogData);
      }

      toast.success("🚀 Blog Published Successfully!");
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
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
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
                  disabled={savingDraft || publishing}
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
                />

                <RichEditor
                  value={contentJson}
                  onChange={handleEditorChange}
                  placeholder="Write your story here with rich formatting..."
                />
              </section>

              <aside className="blog-sidebar">
                <div className="card">
                  <h3>Featured Image</h3>

                  {uploadingImage ? (
                    <p>Uploading image...</p>
                  ) : featuredImage ? (
                    <div className="featured-image-preview">
                      <img
                        src={featuredImage}
                        alt="Featured"
                        style={{
                          width: "100%",
                          borderRadius: "8px",
                          marginBottom: "10px",
                        }}
                      />

                      <button
                        type="button"
                        className="draft-btn"
                        onClick={removeImage}
                      >
                        ❌ Remove Image
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <label className="upload-btn" style={{ cursor: "pointer", textAlign: "center" }}>
                        📤 Upload Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ display: "none" }}
                        />
                      </label>
                      <button
                        type="button"
                        className="draft-btn"
                        style={{ background: "#eff6ff", color: "#2563eb", borderColor: "#bfdbfe" }}
                        onClick={() => setShowMediaModal(true)}
                      >
                        📁 Media Library
                      </button>
                    </div>
                  )}
                </div>

                <div className="card">
                  <h3>Category</h3>

                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
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
                  />
                </div>

                <div className="card">
                  <h3>Publish Date</h3>

                  <input
                    type="date"
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                  />
                </div>

                <div className="card">
                  <h3>Status</h3>

                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
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

      {/* Media Library Modal for Featured Image Selection */}
      {showMediaModal && (
        <MediaLibrary
          isModalMode={true}
          onSelectImage={(item) => setFeaturedImage(item.url)}
          onCloseModal={() => setShowMediaModal(false)}
        />
      )}
    </div>
  );
}

export default AddBlog;
