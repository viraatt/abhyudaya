import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaSync,
  FaEye,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaExclamationCircle,
  FaRocket,
  FaGraduationCap,
  FaTrash,
} from "react-icons/fa";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import SkeletonLoader from "../components/SkeletonLoader";
import { useToast } from "../components/Toast";
import {
  getAlumniSubmissions,
  deleteAlumniSubmission,
  SUBMISSION_STATUSES,
} from "../../Firebase/alumniArticleService";

import "./style/admin.css";
import "./AlumniArticles.css";

export default function AlumniArticles() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const urlStatus = searchParams.get("status") || "all";
  const [activeTab, setActiveTab] = useState(urlStatus.toLowerCase());

  useEffect(() => {
    if (urlStatus) {
      setActiveTab(urlStatus.toLowerCase());
    }
  }, [urlStatus]);

  const handleTabChange = (status) => {
    setActiveTab(status);
    if (status === "all") {
      searchParams.delete("status");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ status });
    }
  };

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAlumniSubmissions();
      setSubmissions(data);
    } catch (err) {
      console.error("Failed to fetch alumni submissions:", err);
      toast.error("Failed to load alumni articles.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleDelete = async (e, id, title) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the submission "${title}"?`)) {
      return;
    }
    try {
      await deleteAlumniSubmission(id);
      setSubmissions((prev) => prev.filter((item) => item.id !== id));
      toast.success("Submission deleted successfully.");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete submission.");
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = submissions.length;
    const pending = submissions.filter(
      (s) =>
        s.status === SUBMISSION_STATUSES.PENDING ||
        s.status === SUBMISSION_STATUSES.RESUBMITTED
    ).length;
    const changesRequested = submissions.filter(
      (s) => s.status === SUBMISSION_STATUSES.CHANGES_REQUESTED
    ).length;
    const approved = submissions.filter(
      (s) => s.status === SUBMISSION_STATUSES.APPROVED
    ).length;
    const rejected = submissions.filter(
      (s) => s.status === SUBMISSION_STATUSES.REJECTED
    ).length;
    const published = submissions.filter(
      (s) => s.status === SUBMISSION_STATUSES.PUBLISHED
    ).length;

    return { total, pending, changesRequested, approved, rejected, published };
  }, [submissions]);

  // Filtering
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // Status match
      let matchesStatus = true;
      if (activeTab === "pending") {
        matchesStatus =
          sub.status === SUBMISSION_STATUSES.PENDING ||
          sub.status === SUBMISSION_STATUSES.RESUBMITTED;
      } else if (activeTab === "approved") {
        matchesStatus = sub.status === SUBMISSION_STATUSES.APPROVED;
      } else if (activeTab === "rejected") {
        matchesStatus = sub.status === SUBMISSION_STATUSES.REJECTED;
      } else if (activeTab === "published") {
        matchesStatus = sub.status === SUBMISSION_STATUSES.PUBLISHED;
      } else if (activeTab === "changes_requested") {
        matchesStatus = sub.status === SUBMISSION_STATUSES.CHANGES_REQUESTED;
      }

      // Search match
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (sub.title || "").toLowerCase().includes(q) ||
        (sub.author?.name || "").toLowerCase().includes(q) ||
        (sub.author?.branch || "").toLowerCase().includes(q) ||
        (sub.author?.organization || "").toLowerCase().includes(q) ||
        (sub.category || "").toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [submissions, activeTab, searchQuery]);

  const getStatusBadge = (status) => {
    switch (status) {
      case SUBMISSION_STATUSES.APPROVED:
        return <span className="status-pill published"><FaCheckCircle /> Approved</span>;
      case SUBMISSION_STATUSES.PUBLISHED:
        return <span className="status-pill published" style={{ background: "#059669", color: "#fff" }}><FaRocket /> Published</span>;
      case SUBMISSION_STATUSES.CHANGES_REQUESTED:
        return <span className="status-pill draft" style={{ background: "#d97706", color: "#fff" }}><FaExclamationCircle /> Changes Requested</span>;
      case SUBMISSION_STATUSES.RESUBMITTED:
        return <span className="status-pill draft" style={{ background: "#2563eb", color: "#fff" }}><FaClock /> Resubmitted</span>;
      case SUBMISSION_STATUSES.REJECTED:
        return <span className="status-pill archived"><FaTimesCircle /> Rejected</span>;
      case SUBMISSION_STATUSES.PENDING:
      default:
        return <span className="status-pill draft"><FaClock /> Pending Review</span>;
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div className="admin-alumni-dashboard">
            {/* Header */}
            <div className="admin-alumni-header">
              <div>
                <div className="admin-alumni-eyebrow">
                  <FaGraduationCap />
                  <span>ALUMNI CONTRIBUTION SYSTEM</span>
                </div>
                <h1>Alumni Articles</h1>
                <p>Review, verify, and publish stories submitted by MPEC alumni.</p>
              </div>

              <div className="header-actions">
                <button
                  type="button"
                  className="refresh-btn"
                  onClick={fetchSubmissions}
                  aria-label="Refresh submissions"
                >
                  <FaSync />
                  <span>Refresh</span>
                </button>

                <a
                  href="/blog/write"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-form-btn"
                  title="Open public contribution form in new tab"
                >
                  <span>Public Form ↗</span>
                </a>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="alumni-stats-grid">
              <div
                className={`alumni-stat-card ${activeTab === "all" ? "active" : ""}`}
                onClick={() => handleTabChange("all")}
              >
                <div className="stat-label">Total Submissions</div>
                <div className="stat-value">{stats.total}</div>
                <div className="stat-subtext">All submitted articles</div>
              </div>

              <div
                className={`alumni-stat-card pending ${activeTab === "pending" ? "active" : ""}`}
                onClick={() => handleTabChange("pending")}
              >
                <div className="stat-label">Pending Review</div>
                <div className="stat-value yellow">{stats.pending}</div>
                <div className="stat-subtext">Awaiting admin review</div>
              </div>

              <div
                className={`alumni-stat-card approved ${activeTab === "approved" ? "active" : ""}`}
                onClick={() => handleTabChange("approved")}
              >
                <div className="stat-label">Approved</div>
                <div className="stat-value green">{stats.approved}</div>
                <div className="stat-subtext">Ready to be published</div>
              </div>

              <div
                className={`alumni-stat-card published ${activeTab === "published" ? "active" : ""}`}
                onClick={() => handleTabChange("published")}
              >
                <div className="stat-label">Published</div>
                <div className="stat-value emerald">{stats.published}</div>
                <div className="stat-subtext">Live on Abhyudaya Blog</div>
              </div>

              <div
                className={`alumni-stat-card rejected ${activeTab === "rejected" ? "active" : ""}`}
                onClick={() => handleTabChange("rejected")}
              >
                <div className="stat-label">Rejected</div>
                <div className="stat-value red">{stats.rejected}</div>
                <div className="stat-subtext">Declined articles</div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="admin-alumni-filter-bar">
              <div className="status-tabs" role="tablist" aria-label="Submission status filter">
                {[
                  { key: "all", label: "All" },
                  { key: "pending", label: `Pending (${stats.pending})` },
                  { key: "approved", label: `Approved (${stats.approved})` },
                  { key: "published", label: `Published (${stats.published})` },
                  { key: "changes_requested", label: `Changes (${stats.changesRequested})` },
                  { key: "rejected", label: `Rejected (${stats.rejected})` },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === t.key}
                    className={`filter-tab-btn ${activeTab === t.key ? "active" : ""}`}
                    onClick={() => handleTabChange(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="search-input-wrapper">
                <FaSearch className="search-icon" aria-hidden="true" />
                <input
                  type="text"
                  className="search-input-field"
                  placeholder="Search by title, alumni name, branch, org..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search alumni articles"
                />
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <SkeletonLoader type="table" rows={6} />
            ) : filteredSubmissions.length === 0 ? (
              <div className="empty-state-box">
                <h2>No Alumni Articles Found</h2>
                <p>
                  No articles match the current filter (<strong>{activeTab}</strong>).
                </p>
              </div>
            ) : (
              <div className="admin-alumni-table-container">
                <table className="admin-alumni-table" aria-label="Alumni submissions list">
                  <thead>
                    <tr>
                      <th scope="col">Article Title</th>
                      <th scope="col">Alumni Author</th>
                      <th scope="col">Category</th>
                      <th scope="col">Submitted</th>
                      <th scope="col">Status</th>
                      <th scope="col" style={{ width: "180px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredSubmissions.map((sub) => (
                      <tr
                        key={sub.id}
                        className="clickable-row"
                        onClick={() => navigate(`/admin/alumni-articles/review/${sub.id}`)}
                      >
                        <td>
                          <div className="admin-alumni-title-cell">
                            <strong className="admin-alumni-title-text">
                              {sub.title}
                            </strong>
                            <span className="admin-alumni-slug-text">
                              /{sub.slug || sub.id}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="admin-alumni-author-cell">
                            <strong className="author-name">
                              {sub.author?.name || "Alumnus"}
                            </strong>
                            <span className="author-meta">
                              {[
                                sub.author?.branch ? `B.Tech ${sub.author.branch}` : null,
                                sub.author?.graduationYear ? `'${String(sub.author.graduationYear).slice(-2)}` : null,
                              ].filter(Boolean).join(" • ")}
                            </span>
                            {sub.author?.organization && (
                              <span className="author-org">
                                {[sub.author.designation, sub.author.organization].filter(Boolean).join(" at ")}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <span className="category-pill">{sub.category || "Alumni Stories"}</span>
                        </td>

                        <td>{sub.submittedDateFormatted}</td>

                        <td>{getStatusBadge(sub.status)}</td>

                        <td>
                          <div
                            className="alumni-row-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              to={`/admin/alumni-articles/review/${sub.id}`}
                              className="review-btn"
                              title="Review Article"
                            >
                              <FaEye />
                              <span>Review</span>
                            </Link>

                            <button
                              type="button"
                              className="delete-sub-btn"
                              onClick={(e) => handleDelete(e, sub.id, sub.title)}
                              title="Delete Submission"
                              aria-label="Delete Submission"
                            >
                              <FaTrash />
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
