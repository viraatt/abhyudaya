import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";

import { db } from "../../Firebase/firebase";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import "./style/admin.css";
import "./BlogManager.css";

function BlogManager() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    setLoading(true);

    try {
      const q = query(
        collection(db, "blogs"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

      setBlogs(data);
    } catch (error) {
      console.error("Failed to fetch blogs:", error);
      alert("Unable to load blogs.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this blog?"
    );

    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "blogs", id));

      setBlogs((prevBlogs) =>
        prevBlogs.filter((blog) => blog.id !== id)
      );

      alert("Blog deleted successfully.");
    } catch (error) {
      console.error("Delete Error:", error);
      alert("Failed to delete blog.");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return "-";

    return new Date(timestamp.seconds * 1000).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  return (
        <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div className="blog-manager">

            <div className="blog-header">
              <div>
                <h1>Blog Manager</h1>

                <p>
                  Total Blogs : <strong>{blogs.length}</strong>
                </p>
              </div>

              <div className="header-actions">
                <button
                  className="refresh-btn"
                  onClick={fetchBlogs}
                >
                  🔄 Refresh
                </button>

                <Link
                  to="/admin/blogs/add"
                  className="new-blog-btn"
                >
                  + New Blog
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="empty">
                <h2>Loading Blogs...</h2>
              </div>
            ) : blogs.length === 0 ? (
              <div className="empty">
                <h2>No Blogs Found</h2>

                <p>
                  Click <strong>New Blog</strong> to publish your first blog.
                </p>
              </div>
            ) : (
              <table className="blog-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Author</th>
                    <th>Date</th>
                    <th style={{ width: "170px" }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {blogs.map((blog) => (
                    <tr key={blog.id}>

                      <td>
                        <div className="blog-title">
                          <strong>{blog.title}</strong>

                          <span>
                            {blog.slug || blog.id}
                          </span>
                        </div>
                      </td>

                      <td>{blog.category || "-"}</td>

                      <td>
                        <span
                          className={`status ${(blog.status || "draft").toLowerCase()}`}
                        >
                          {blog.status || "Draft"}
                        </span>
                      </td>

                      <td>{blog.author || "Admin"}</td>

                      <td>{formatDate(blog.createdAt)}</td>

                      <td>
                        <div className="action-buttons">

                          <Link
                            to={`/admin/blogs/edit/${blog.id}`}
                            className="edit-btn"
                          >
                            ✏ Edit
                          </Link>

                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(blog.id)}
                          >
                            🗑 Delete
                          </button>

                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default BlogManager;