import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../Firebase/firebase";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import RichEditor from "../components/editor/RichEditor";

import "./style/admin.css";
import "./addBlog.css";
import { uploadImage } from "./services/imageUpload";

function EditBlog() {
  const { id } = useParams();
  const navigate = useNavigate();

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

  // Tiptap JSON content state
  const [contentJson, setContentJson] = useState(null);
  const [contentExcerpt, setContentExcerpt] = useState("");

  useEffect(() => {
    loadBlog();
  }, [id]);

  const loadBlog = async () => {
    try {
      setLoading(true);
      const ref = doc(db, "blogs", id);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        alert("Blog not found.");
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
    } catch (error) {
      console.error(error);
      alert("Failed to load blog.");
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
        alert("Image upload failed.");
        return;
      }
      setFeaturedImage(url);
    } catch (error) {
      console.error(error);
      alert("Image upload failed.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const removeImage = () => {
    setFeaturedImage("");
  };

  const handleUpdate = async () => {
    if (!title.trim()) {
      alert("Please enter blog title.");
      return;
    }

    try {
      await updateDoc(doc(db, "blogs", id), {
        title: title.trim(),
        category,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        slug:
          slug.trim() ||
          title
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),
        seo,
        publishDate,
        status,
        featuredImage,
        excerpt: contentExcerpt.trim().substring(0, 180),
        content: contentJson, // Stored strictly as Tiptap JSON
      });

      alert("✅ Blog Updated Successfully");
      navigate("/admin/blogs");
    } catch (error) {
      console.error(error);
      alert("Failed to update blog.");
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
              <h2>Loading Blog...</h2>
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
                <h1>Edit Blog</h1>
                <p>Update your existing blog and save the changes.</p>
              </div>

              <div className="header-buttons">
                <button
                  className="draft-btn"
                  onClick={() => navigate("/admin/blogs")}
                >
                  ← Back
                </button>

                <button className="publish-btn" onClick={handleUpdate}>
                  💾 Update Blog
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
                  placeholder="Write your story here..."
                />
              </section>

              <aside className="blog-sidebar">
                <div className="card">
                  <h3>Featured Image</h3>

                  {featuredImage && (
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
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />

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
                  <h3>URL Slug</h3>

                  <input
                    type="text"
                    placeholder="my-first-blog"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                </div>

                <div className="card">
                  <h3>SEO Description</h3>

                  <textarea
                    rows="5"
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
                  <h3>Author</h3>

                  <input type="text" value="Admin" readOnly />
                </div>

                <div className="card">
                  <h3>Status</h3>

                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option>Draft</option>
                    <option>Published</option>
                    <option>Scheduled</option>
                  </select>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditBlog;