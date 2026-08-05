import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../Firebase/firebase";

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
  const [featuredImage, setFeaturedImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);

  // Action loading states
  const [saving, setSaving] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);

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
      status,
      featuredImage,
      contentJson,
    };
  }, [title, category, tags, slug, seo, publishDate, status, featuredImage, contentJson]);

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
        status: dataToSave.status || "Draft",
        featuredImage: dataToSave.featuredImage,
        excerpt: contentExcerpt.trim().substring(0, 180),
        content: dataToSave.contentJson,
      };

      await updateBlogService(id, payload);
    },
    [id, contentExcerpt]
  );

  const {
    status: autosaveStatus,
    lastSavedTime,
    errorMessage: autosaveError,
    hasUnsavedChanges,
    retrySave,
    setLastSavedData,
  } = useAutosave({
    data: currentBlogData,
    onSave: handleAutosave,
    interval: 20000,
    enabled: !loading && !!title.trim(),
  });

  useEffect(() => {
    loadBlog();
  }, [id]);

  const loadBlog = async () => {
    try {
      setLoading(true);
      const ref = doc(db, "blogs", id);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        toast.error("Blog not found.");
        navigate("/admin/blogs");
        return;
      }

      const blog = snap.data();

      setTitle(blog.title || "");
      setCategory(blog.category || "Club News");
      setTags((blog.tags || []).join(", "));
      setSlug(blog.slug || "");
      setSeo(blog.seo || "");
      setPublishDate(blog.publishDate || "");
      setStatus(blog.status || "Draft");
      setFeaturedImage(blog.featuredImage || "");
      setContentJson(blog.content || null);
      if (blog.excerpt) setContentExcerpt(blog.excerpt);

      setLastSavedData({
        title: (blog.title || "").trim(),
        category: blog.category || "Club News",
        tags: (blog.tags || []).map((t) => t.trim()).filter(Boolean),
        slug: (blog.slug || "").trim(),
        seo: blog.seo || "",
        publishDate: blog.publishDate || "",
        status: blog.status || "Draft",
        featuredImage: blog.featuredImage || "",
        contentJson: blog.content || null,
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to load blog.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditorChange = (json, html, text) => {
    setContentJson(json);
    setContentExcerpt(text || "");
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const url = await uploadImage(file);
      if (!url) {
        toast.error("Image upload failed.");
        return;
      }
      setFeaturedImage(url);
      toast.success("Featured image uploaded!");
    } catch (error) {
      console.error(error);
      toast.error("Image upload failed.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const removeImage = () => {
    setFeaturedImage("");
    toast.info("Featured image removed.");
  };

  const handleSave = async (targetStatus = status) => {
    try {
      setSaving(true);
      const blogData = {
        title: title.trim(),
        category,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        slug: slug.trim(),
        seo,
        publishDate: publishDate || new Date().toISOString().split("T")[0],
        status: targetStatus,
        featuredImage,
        excerpt: contentExcerpt.trim().substring(0, 180),
        content: contentJson,
      };

      await updateBlogService(id, blogData);
      setStatus(targetStatus);
      setLastSavedData(currentBlogData);

      if (targetStatus === "Published") {
        toast.success("🚀 Blog Published Successfully!");
      } else if (targetStatus === "Draft") {
        toast.success("💾 Draft Saved Successfully!");
      } else {
        toast.success("✅ Blog Updated Successfully!");
      }

      navigate("/admin/blogs");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to save blog changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    try {
      setUnpublishing(true);
      await updateBlogStatusService(id, "Draft");
      setStatus("Draft");
      toast.info("Blog unpublished and moved to Drafts.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to unpublish blog.");
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
            <div className="empty">
              <h2>Loading Blog Data...</h2>
            </div>
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
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <h1>Edit Blog</h1>
                  <AutosaveIndicator
                    status={autosaveStatus}
                    lastSavedTime={lastSavedTime}
                    errorMessage={autosaveError}
                    hasUnsavedChanges={hasUnsavedChanges}
                    onRetry={retrySave}
                  />
                </div>
                <p>
                  Current Status:{" "}
                  <strong className={`status ${(status || "draft").toLowerCase()}`}>
                    {status}
                  </strong>
                </p>
              </div>

              <div className="header-buttons">
                <button
                  type="button"
                  className="draft-btn"
                  onClick={() => navigate("/admin/blogs")}
                >
                  ← Back
                </button>

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
                />

                <RichEditor
                  value={contentJson}
                  onChange={handleEditorChange}
                  placeholder="Write your story here..."
                />
              </section>

              <aside className="blog-sidebar">
                <div className="card">
                  <h3>Featured Image</h3>

                  {featuredImage ? (
                    <div className="image-preview">
                      <img
                        src={featuredImage}
                        alt="Featured"
                        style={{
                          width: "100%",
                          borderRadius: "8px",
                          marginBottom: "8px",
                        }}
                      />

                      <button
                        type="button"
                        className="draft-btn"
                        onClick={removeImage}
                        style={{ marginBottom: "8px" }}
                      >
                        ❌ Remove Image
                      </button>
                    </div>
                  ) : null}

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />

                    <button
                      type="button"
                      className="draft-btn"
                      style={{ background: "#eff6ff", color: "#2563eb", borderColor: "#bfdbfe" }}
                      onClick={() => setShowMediaModal(true)}
                    >
                      📁 Choose from Media Library
                    </button>
                  </div>

                  {uploadingImage && <p>Uploading image...</p>}
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

                <div className="card">
                  <SlugInput
                    title={title}
                    slug={slug}
                    onSlugChange={setSlug}
                    currentBlogId={id}
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

export default EditBlog;