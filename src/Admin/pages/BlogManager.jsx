import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaSync,
  FaSearch,
  FaPaperPlane,
  FaUndo,
} from "react-icons/fa";
import { db } from "../../Firebase/firebase";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import SkeletonLoader from "../components/SkeletonLoader";
import { useToast } from "../components/Toast";
import { updateBlogStatusService } from "./services/blogService";

import "./style/admin.css";
import "./BlogManager.css";

function BlogManager() {
  const toast = useToast();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "blogs"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setBlogs(data);
    } catch (error) {
      console.error("Failed to fetch blogs:", error);
      toast.error("Unable to load blogs.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this blog post?"
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "blogs", id));
      setBlogs((prev) => prev.filter((blog) => blog.id !== id));
      toast.success("Blog post deleted successfully.");
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error("Failed to delete blog.");
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateBlogStatusService(id, newStatus);
      setBlogs((prev) =>
        prev.map((blog) => (blog.id === id ? { ...blog, status: newStatus } : blog))
      );

      if (newStatus === "Published") {
        toast.success("🚀 Blog published!");
      } else if (newStatus === "Draft") {
        toast.info("Blog moved to Drafts.");
      } else {
        toast.info(`Blog status updated to ${newStatus}.`);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update blog status.");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return "-";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Memoized Filtering Logic
  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      const matchesStatus =
        statusFilter === "All" ||
        (blog.status || "Draft").toLowerCase() === statusFilter.toLowerCase();
      const matchesSearch =
        !searchQuery.trim() ||
        (blog.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (blog.slug || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (blog.category || "").toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [blogs, statusFilter, searchQuery]);

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div className="admin-blog-manager">
            {/* Header */}
            <div className="admin-blog-header">
              <div>
                <h1>Blog Manager</h1>
                <p>
                  Total Posts: <strong>{blogs.length}</strong> | Showing:{" "}
                  <strong>{filteredBlogs.length}</strong>
                </p>
              </div>

              <div className="header-actions">
                <button
                  type="button"
                  className="refresh-btn"
                  onClick={fetchBlogs}
                  aria-label="Refresh blog list"
                >
                  <FaSync />
                  <span>Refresh</span>
                </button>

                <Link to="/admin/blogs/add" className="new-blog-btn">
                  <FaPlus />
                  <span>New Blog Post</span>
                </Link>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="admin-blog-filter-bar">
              <div className="status-tabs" role="tablist" aria-label="Blog status filter">
                {["All", "Published", "Draft", "Archived"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === st}
                    className={`filter-tab-btn ${
                      statusFilter === st ? "active" : ""
                    }`}
                    onClick={() => setStatusFilter(st)}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="search-input-wrapper">
                <FaSearch className="search-icon" aria-hidden="true" />
                <input
                  type="text"
                  className="search-input-field"
                  placeholder="Search by title, slug, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search blog posts"
                />
              </div>
            </div>

            {/* Table / Skeleton Loading State */}
            {loading ? (
              <SkeletonLoader type="table" rows={6} />
            ) : filteredBlogs.length === 0 ? (
              <div className="empty-state-box">
                <h2>No Blogs Found</h2>
                <p>
                  No blog posts match your criteria. Click{" "}
                  <strong>New Blog Post</strong> to create one.
                </p>
              </div>
            ) : (
              <div className="admin-blog-table-container">
                <table className="admin-blog-table" aria-label="Blog posts list">
                  <thead>
                    <tr>
                      <th scope="col">Title &amp; Slug</th>
                      <th scope="col">Category</th>
                      <th scope="col">Status</th>
                      <th scope="col">Author</th>
                      <th scope="col">Date</th>
                      <th scope="col" style={{ width: "260px" }}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredBlogs.map((blog) => (
                      <tr key={blog.id}>
                        <td>
                          <div className="admin-blog-title-cell">
                            <strong className="admin-blog-title-text">
                              {blog.title}
                            </strong>
                            <span className="admin-blog-slug-text">
                              /{blog.slug || blog.id}
                            </span>
                          </div>
                        </td>

                        <td>{blog.category || "-"}</td>

                        <td>
                          <span
                            className={`status-pill ${(
                              blog.status || "draft"
                            ).toLowerCase()}`}
                          >
                            {blog.status || "Draft"}
                          </span>
                        </td>

                        <td>{blog.author || "Admin"}</td>

                        <td>{formatDate(blog.createdAt)}</td>

                        <td>
                          <div className="action-buttons-group">
                            <Link
                              to={`/admin/blogs/edit/${blog.id}`}
                              className="action-btn-pill btn-edit"
                              title="Edit post"
                              aria-label={`Edit ${blog.title}`}
                            >
                              <FaEdit />
                              <span>Edit</span>
                            </Link>

                            {blog.status === "Published" ? (
                              <button
                                type="button"
                                className="action-btn-pill btn-unpublish"
                                onClick={() => handleStatusChange(blog.id, "Draft")}
                                title="Unpublish post"
                                aria-label={`Unpublish ${blog.title}`}
                              >
                                <FaUndo />
                                <span>Unpublish</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="action-btn-pill btn-publish"
                                onClick={() => handleStatusChange(blog.id, "Published")}
                                title="Publish post"
                                aria-label={`Publish ${blog.title}`}
                              >
                                <FaPaperPlane />
                                <span>Publish</span>
                              </button>
                            )}

                            <button
                              type="button"
                              className="action-btn-pill btn-delete"
                              onClick={() => handleDelete(blog.id)}
                              title="Delete post"
                              aria-label={`Delete ${blog.title}`}
                            >
                              <FaTrash />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BlogManager;