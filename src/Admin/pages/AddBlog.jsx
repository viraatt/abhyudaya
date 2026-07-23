import { useState } from "react";
import "./addBlog.css";
import { db } from "../../Firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function AddBlog() {
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    author: "",
    readTime: "",
    excerpt: "",
    content: "",
  });

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      let imageUrl = "";

      // Upload Image to Cloudinary
      if (image) {
        const data = new FormData();
        data.append("file", image);
        data.append("upload_preset", "abhyudaya_blog");

        const response = await fetch(
          "https://api.cloudinary.com/v1_1/cn1lzsvp/image/upload",
          {
            method: "POST",
            body: data,
          }
        );

        const uploaded = await response.json();

        if (!uploaded.secure_url) {
          throw new Error("Image upload failed.");
        }

        imageUrl = uploaded.secure_url;
      }

      // Save Blog to Firestore
      await addDoc(collection(db, "blogs"), {
        title: formData.title,
        category: formData.category,
        author: formData.author,
        readTime: formData.readTime,
        excerpt: formData.excerpt,
        content: formData.content,
        image: imageUrl,

        slug: formData.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),

        featured: false,
        status: "published",
        views: 0,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      alert("✅ Blog Published Successfully!");

      setFormData({
        title: "",
        category: "",
        author: "",
        readTime: "",
        excerpt: "",
        content: "",
      });

      setImage(null);
      setPreview("");

      const fileInput = document.querySelector(
        'input[type="file"]'
      );

      if (fileInput) fileInput.value = "";

    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };
    return (
    <div className="add-blog-page">
      <div className="add-blog-card">
        <div className="page-header">
          <h1>Create Blog</h1>
          <p>
            Write and publish engaging articles for the Abhyudaya Club website.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Blog Headline</label>

            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter an attractive headline..."
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>

              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="">Select Category</option>
                <option>Technology</option>
                <option>Events</option>
                <option>Science</option>
                <option>Literature</option>
                <option>Achievements</option>
              </select>
            </div>

            <div className="form-group">
              <label>Author</label>

              <input
                type="text"
                name="author"
                value={formData.author}
                onChange={handleChange}
                placeholder="Enter author's name"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Reading Time</label>

            <input
              type="text"
              name="readTime"
              value={formData.readTime}
              onChange={handleChange}
              placeholder="Example: 5 min read"
            />
          </div>

          <div className="form-group">
            <label>Featured Image</label>

            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              required
            />

            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="image-preview"
              />
            )}
          </div>

          <div className="form-group">
            <label>Short Description</label>

            <textarea
              rows="3"
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              placeholder="Write a short summary of your article..."
              required
            />
          </div>

          <div className="form-group">
            <label>Blog Content</label>

            <textarea
              rows="10"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="Start writing your blog here..."
              required
            />
          </div>

          <button
            type="submit"
            className="save-blog-btn"
            disabled={loading}
          >
            {loading ? "Publishing..." : "Publish Blog"}
          </button>
        </form>
      </div>
    </div>
  );
}