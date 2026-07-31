import { useState } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import "./style/admin.css";
import "./addBlog.css";

import Toolbar from "../../components/blog/Toolbar";
import EditorCanvas from "../../components/blog/EditorCanvas";

import { publishBlog } from "./services/blogService";
import { uploadImage } from "./services/imageUpload";
import Image from "@tiptap/extension-image";
function AddBlog() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Club News");
  const [tags, setTags] = useState("");
  const [slug, setSlug] = useState("");
  const [seo, setSeo] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [status, setStatus] = useState("Draft");

  const [featuredImage, setFeaturedImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      // Enables inline images inserted via the toolbar's Insert Image button.
      // Images become part of the saved HTML content, not a separate field.
      Image.configure({
        HTMLAttributes: {
          class: "editor-inline-image",
        },
      }),
    ],
    content: `
      <h2>Welcome to Abhyudaya Blog Editor</h2>
      <p>Start writing your article here...</p>
    `,
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploadingImage(true);

      const imageUrl = await uploadImage(file);

      setFeaturedImage(imageUrl);
    } catch (err) {
      console.error(err);

      alert("❌ Failed to upload image.");
    } finally {
      setUploadingImage(false);

      e.target.value = "";
    }
  };

  const removeImage = () => {
    setFeaturedImage("");
  };

  const resetForm = () => {
    setTitle("");
    setCategory("Club News");
    setTags("");
    setSlug("");
    setSeo("");
    setPublishDate("");
    setStatus("Draft");
    setFeaturedImage("");

    if (editor) {
      editor.commands.clearContent();
    }
  };

  const handlePublish = async () => {
    if (!editor) {
      alert("Editor is loading...");
      return;
    }

    if (!title.trim()) {
      alert("Please enter blog title.");
      return;
    }

    if (!featuredImage) {
      alert("Please upload a featured image.");
      return;
    }

    try {
      const blog = {
        title: title.trim(),

        category,

        featuredImage,

        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),

        slug:
          slug.trim() ||
          title
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),

        seo,

        publishDate,

        status,

        author: "Admin",

        excerpt: editor
          .getText()
          .trim()
          .substring(0, 180),

        content: editor.getHTML(),
      };

      const blogId = await publishBlog(blog);

      console.log(blogId);

      alert("✅ Blog Published Successfully");

      resetForm();

    } catch (err) {
      console.error(err);

      alert("❌ Failed to publish blog.");
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
                <h1>Create Blog</h1>
                <p>
                  Write and publish blogs for
                  Abhyudaya Club.
                </p>
              </div>

              <div className="header-buttons">

                <button
                  className="draft-btn"
                >
                  💾 Save Draft
                </button>

                <button
                  className="preview-btn"
                >
                  👁 Preview
                </button>

                <button
                  className="publish-btn"
                  onClick={handlePublish}
                >
                  🚀 Publish
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
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                />

                <Toolbar editor={editor} />

                <div className="editor-area">
                  <EditorCanvas editor={editor} />
                </div>

              </section>

             <aside className="blog-sidebar">

                <div className="card">
                  <h3>Featured Image</h3>

                  {uploadingImage ? (
                    <p>Uploading...</p>
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
                        className="draft-btn"
                        onClick={removeImage}
                      >
                        ❌ Remove Image
                      </button>
                    </div>
                  ) : (
                    <label className="upload-btn" style={{ cursor: "pointer" }}>
                      📤 Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: "none" }}
                      />
                    </label>
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
                    onChange={(e) =>
                      setPublishDate(e.target.value)
                    }
                  />
                </div>

                <div className="card">
                  <h3>Author</h3>

                  <input
                    type="text"
                    value="Admin"
                    readOnly
                  />
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

export default AddBlog;
