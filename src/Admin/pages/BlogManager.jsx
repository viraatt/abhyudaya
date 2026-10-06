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
  FaExternalLinkAlt,
  FaExclamationTriangle,
  FaClock,
  FaCheckCircle,
  FaRocket,
} from "react-icons/fa";
import { db } from "../../Firebase/firebase";
import { useAuth } from "../../context/AuthContext";
import { ROLES, normalizeRole } from "../config/roles";
import {
  getAlumniSubmissionsByAuthor,
  deleteAlumniSubmission,
  SUBMISSION_STATUSES,
} from "../../Firebase/alumniArticleService";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import SkeletonLoader from "../components/SkeletonLoader";
import { useToast } from "../components/Toast";
import { updateBlogStatusService } from "./services/blogService";

import "./style/admin.css";
import "./BlogManager.css";

function BlogManager() {
  const { currentUser } = useAuth();
  const currentRole = normalizeRole(currentUser?.role);
  const isAlumniUser = currentRole === ROLES.ALUMNI;
  const isSuperAdmin = currentRole === ROLES.SUPER_ADMIN;

  const toast = useToast();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    try {
      if (isAlumniUser) {
        // Alumni only see their own submitted articles
        if (currentUser?.uid) {
          const data = await getAlumniSubmissionsByAuthor(currentUser.uid);
          setBlogs(data);
        } else {
          setBlogs([]);
        }
      } else {
        // Admins see all posts
        const q = query(collection(db, "blogs"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        setBlogs(data);
      }
    } catch (error) {
      console.error("Failed to fetch blogs:", error);
      toast.error("Unable to load blogs.");
    } finally {
      setLoading(false);
    }
  }, [isAlumniUser, currentUser, toast]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  const handleDelete = async (id, isDraft = false) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this article?"
    );
    if (!confirmDelete) return;

    try {
      if (isAlumniUser) {
        await deleteAlumniSubmission(id);
      } else {
        await deleteDoc(doc(db, "blogs", id));
      }
      setBlogs((prev) => prev.filter((blog) => blog.id !== id));
      toast.success("Article deleted successfully.");
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error("Failed to delete article.");
    }
  };

  const handleStatusChange = async (id, newStatus, isAlumniContribution = false) => {
    // CRITICAL: Blog Admin must NOT publish alumni-submitted articles
    if (isAlumniContribution && !isSuperAdmin && newStatus === "Published") {
      toast.error("Only Super Admin has authority to publish alumni articles.");
      return;
    }

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
    if (!timestamp) return "-";
    if (timestamp?.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    if (typeof timestamp === "string") return timestamp;
    return "-";
  };

  // Status mapping for Alumni
  const normalizeAlumniStatus = (st = "") => {
    const s = String(st).toLowerCase();
    if (s === "pending" || s === "resubmitted") return "Pending Approval";
    if (s === "changes_requested") return "Changes Requested";
    if (s === "draft") return "Draft";
    if (s === "approved") return "Approved";
    if (s === "published") return "Published";
    if (s === "rejected") return "Rejected";
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  // Memoized Filtering Logic
  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      let matchesStatus = true;

      if (isAlumniUser) {
        const normalized = normalizeAlumniStatus(blog.status);
        matchesStatus = statusFilter === "All" || normalized.toLowerCase() === statusFilter.toLowerCase();
      } else {
        matchesStatus =
          statusFilter === "All" ||
          (blog.status || "Draft").toLowerCase() === statusFilter.toLowerCase();
      }

      const matchesSearch =
        !searchQuery.trim() ||
        (blog.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (blog.slug || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (blog.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (blog.author || "").toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [blogs, statusFilter, searchQuery, isAlumniUser]);

  const alumniCount = useMemo(
    () => blogs.filter((b) => b.isAlumniContribution).length,
    [blogs]
  );

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
                  {isAlumniUser ? (
                    <>
                      My Articles: <strong>{blogs.length}</strong>
                      {" • "}
                      Showing: <strong>{filteredBlogs.length}</strong>
                    </>
                  ) : (
                    <>
                      Total Posts: <strong>{blogs.length}</strong>
                      {" • "}
                      Alumni Articles: <strong>{alumniCount}</strong>
                      {" • "}
                      Showing: <strong>{filteredBlogs.length}</strong>
                    </>
                  )}
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
                  <span>{isAlumniUser ? "Write Article" : "New Blog Post"}</span>
                </Link>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="admin-blog-filter-bar">
              <div className="status-tabs" role="tablist" aria-label="Blog status filter">
                {(isAlumniUser
                  ? ["All", "Draft", "Pending Approval", "Changes Requested", "Approved", "Published", "Rejected"]
                  : ["All", "Published", "Draft", "Archived"]
                ).map((st) => (
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
                  placeholder={isAlumniUser ? "Search your articles..." : "Search by title, slug, category..."}
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
                <h2>{isAlumniUser ? "No Articles Found" : "No Blogs Found"}</h2>
                <p>
                  {isAlumniUser
                    ? "You haven't written any articles matching this filter. Click 'Write Article' to share your story!"
                    : "No blog posts match your criteria. Click 'New Blog Post' to create one."}
                </p>
              </div>
            ) : isAlumniUser ? (
              <div className="admin-blog-table-container">
                <table className="admin-blog-table" aria-label="My articles list">
                  <thead>
                    <tr>
                      <th scope="col">Title &amp; Category</th>
                      <th scope="col">Status</th>
                      <th scope="col">Date</th>
                      <th scope="col" style={{ width: "220px" }}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredBlogs.map((article) => {
                      const normalizedStatus = normalizeAlumniStatus(article.status);
                      const isEditable = article.status === "draft" || article.status === "changes_requested";
                      const isLive = article.status === "published";

                      return (
                        <tr key={article.id}>
                          <td>
                            <div className="admin-blog-title-cell">
                              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "#38bdf8", marginBottom: "2px" }}>
                                {article.category || "Alumni Stories"}
                              </span>
                              <strong className="admin-blog-title-text">
                                {article.title}
                              </strong>
                              {article.excerpt && (
                                <span className="admin-blog-slug-text">
                                  {article.excerpt.slice(0, 80)}…
                                </span>
                              )}

                              {article.status === "changes_requested" && article.adminFeedback && (
                                <div style={{ marginTop: "6px", fontSize: "12px", color: "#fbbf24", background: "rgba(245, 158, 11, 0.1)", padding: "4px 8px", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                  <FaExclamationTriangle /> Feedback: {article.adminFeedback}
                                </div>
                              )}
                            </div>
                          </td>

                          <td>
                            <span
                              className={`status-pill ${String(article.status || "draft").toLowerCase().replace(/[\s_]+/g, "-")}`}
                            >
                              {normalizedStatus}
                            </span>
                          </td>

                          <td>{formatDate(article.submittedAt || article.createdAt)}</td>

                          <td>
                            <div className="action-buttons-group">
                              {isEditable && (
                                <Link
                                  to={`/admin/blogs/edit/${article.id}`}
                                  className="action-btn-pill btn-edit"
                                  title="Edit article"
                                >
                                  <FaEdit />
                                  <span>Edit</span>
                                </Link>
                              )}

                              {isLive && (
                                <Link
                                  to={`/blog/${article.slug}`}
                                  className="action-btn-pill btn-publish"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View live post"
                                >
                                  <FaExternalLinkAlt />
                                  <span>View Live</span>
                                </Link>
                              )}

                              {!isEditable && !isLive && (
                                <span className="action-btn-pill" style={{ opacity: 0.6, cursor: "default" }}>
                                  {article.status === "pending" || article.status === "resubmitted" ? "Under Review" : normalizedStatus}
                                </span>
                              )}

                              {article.status === "draft" && (
                                <button
                                  type="button"
                                  className="action-btn-pill btn-delete"
                                  onClick={() => handleDelete(article.id, true)}
                                  title="Delete draft"
                                >
                                  <FaTrash />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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

                        <td>
                          {blog.isAlumniContribution ? (
                            <div className="alumni-author-tag-wrapper">
                              <span className="alumni-author-badge">🎓 Alumni</span>
                              <span className="alumni-author-name">{blog.author}</span>
                            </div>
                          ) : (
                            blog.author || "Admin"
                          )}
                        </td>

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
                                onClick={() => handleStatusChange(blog.id, "Draft", blog.isAlumniContribution)}
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
                                onClick={() => handleStatusChange(blog.id, "Published", blog.isAlumniContribution)}
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