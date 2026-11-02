import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FiCheckSquare,
  FiPlus,
  FiSearch,
  FiEye,
  FiEdit,
  FiCopy,
  FiTrash2,
  FiBarChart2,
  FiArchive,
  FiClock,
  FiLock,
  FiShare2,
  FiExternalLink,
  FiX,
  FiAlertCircle,
  FiDownload,
} from "react-icons/fi";
import { useAuth } from "../../../context/AuthContext";
import {
  subscribeAllPolls,
  deletePoll,
  closePoll,
  archivePoll,
  duplicatePoll,
  formatPollDateTime,
  exportPollResultsCSV,
  computePollStatus,
} from "../../../Firebase/pollService";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { useToast } from "../../components/Toast";
import SkeletonLoader from "../../components/SkeletonLoader";

import "../style/admin.css";
import "./PollManager.css";

const TABS = [
  { id: "all", label: "All Polls" },
  { id: "active", label: "Active Live" },
  { id: "scheduled", label: "Scheduled" },
  { id: "closed", label: "Closed" },
  { id: "draft", label: "Drafts" },
  { id: "archived", label: "Archived" },
];

export default function PollManager() {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [previewPoll, setPreviewPoll] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Sync tab with query param
  const activeTab = searchParams.get("status") || "all";

  const handleTabChange = (tabId) => {
    if (tabId === "all") {
      setSearchParams({});
    } else {
      setSearchParams({ status: tabId });
    }
  };

  // Real-time listener for all polls
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeAllPolls(
      (data) => {
        setPolls(data);
        setLoading(false);
      },
      (err) => {
        toast.error("Failed to load polls: " + err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [toast]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    let total = polls.length;
    let active = 0;
    let votes = 0;
    let participants = 0;

    polls.forEach((p) => {
      const status = computePollStatus(p);
      if (status === "active") active++;
      votes += p.totalVotes || 0;
      participants += p.totalParticipants || 0;
    });

    return { total, active, votes, participants };
  }, [polls]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = { all: polls.length, active: 0, scheduled: 0, closed: 0, draft: 0, archived: 0 };
    polls.forEach((p) => {
      const status = computePollStatus(p);
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });
    return counts;
  }, [polls]);

  // Available categories
  const categories = useMemo(() => {
    const cats = new Set(["all"]);
    polls.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [polls]);

  // Filtered & Sorted Polls
  const filteredPolls = useMemo(() => {
    return polls
      .filter((poll) => {
        const computed = computePollStatus(poll);

        // Tab match
        if (activeTab === "active" && computed !== "active") return false;
        if (activeTab === "scheduled" && computed !== "scheduled") return false;
        if (activeTab === "closed" && computed !== "closed") return false;
        if (activeTab === "draft" && computed !== "draft") return false;
        if (activeTab === "archived" && computed !== "archived") return false;

        // Category filter
        if (categoryFilter !== "all" && poll.category !== categoryFilter) return false;

        // Search text
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchTitle = (poll.title || "").toLowerCase().includes(q);
          const matchDesc = (poll.description || "").toLowerCase().includes(q);
          const matchOptions = (poll.options || []).some((o) => (o.text || "").toLowerCase().includes(q));
          if (!matchTitle && !matchDesc && !matchOptions) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        }
        if (sortBy === "most-votes") {
          return (b.totalVotes || 0) - (a.totalVotes || 0);
        }
        if (sortBy === "closing-soon") {
          const endA = a.endAt?.seconds || 0;
          const endB = b.endAt?.seconds || 0;
          return endA - endB;
        }
        return 0;
      });
  }, [polls, activeTab, categoryFilter, search, sortBy]);

  // Actions
  const handleClosePoll = async (poll) => {
    if (!window.confirm(`Are you sure you want to close the poll "${poll.title}" now? Students will no longer be able to vote.`)) {
      return;
    }
    setActionLoadingId(poll.id);
    try {
      await closePoll(poll.id);
      toast.success("Poll closed successfully.");
    } catch (err) {
      toast.error("Failed to close poll: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDuplicate = async (poll) => {
    setActionLoadingId(poll.id);
    try {
      await duplicatePoll(poll.id, currentUser);
      toast.success("Poll duplicated as draft.");
    } catch (err) {
      toast.error("Failed to duplicate poll: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleArchiveToggle = async (poll) => {
    const isArchived = poll.archived || poll.status === "archived";
    setActionLoadingId(poll.id);
    try {
      await archivePoll(poll.id, !isArchived);
      toast.success(isArchived ? "Poll unarchived." : "Poll archived.");
    } catch (err) {
      toast.error("Failed to update archive status: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (poll) => {
    if (!window.confirm(`Permanently delete poll "${poll.title}"? This cannot be undone and will delete all vote records.`)) {
      return;
    }
    setActionLoadingId(poll.id);
    try {
      await deletePoll(poll.id);
      toast.success("Poll deleted permanently.");
    } catch (err) {
      toast.error("Failed to delete poll: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCopyLink = (poll) => {
    const publicUrl = `${window.location.origin}/polls/${poll.id}`;
    navigator.clipboard.writeText(publicUrl);
    toast.success("Public voting link copied to clipboard!");
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="poll-manager__content">
        <Topbar
          title="Poll Management"
          subtitle="Create, monitor real-time votes, schedule, and review campus opinions"
        />

        {/* Top Header Row */}
        <div className="poll-header-row">
          <div className="poll-header-info">
            <h1>
              <FiCheckSquare style={{ color: "#c48b18" }} /> Campus Polls & Live Voting
            </h1>
            <p>Manage interactive live polls, voter access controls, and real-time result broadcasting</p>
          </div>
          <div className="poll-header-actions">
            <Link to="/admin/polls/create" className="poll-btn-primary">
              <FiPlus /> Create New Poll
            </Link>
            <Link to="/polls" target="_blank" rel="noopener noreferrer" className="poll-btn-secondary">
              <FiExternalLink /> Public Polls Hub
            </Link>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="poll-stats-grid">
          <div className="poll-stat-card">
            <div className="poll-stat-icon-wrap">
              <FiCheckSquare />
            </div>
            <div className="poll-stat-meta">
              <span className="poll-stat-label">Total Polls</span>
              <span className="poll-stat-value">{stats.total}</span>
            </div>
          </div>

          <div className="poll-stat-card stat-active">
            <div className="poll-stat-icon-wrap">
              <FiClock />
            </div>
            <div className="poll-stat-meta">
              <span className="poll-stat-label">Active & Live Now</span>
              <span className="poll-stat-value">{stats.active}</span>
            </div>
          </div>

          <div className="poll-stat-card stat-votes">
            <div className="poll-stat-icon-wrap">
              <FiBarChart2 />
            </div>
            <div className="poll-stat-meta">
              <span className="poll-stat-label">Total Votes Cast</span>
              <span className="poll-stat-value">{stats.votes.toLocaleString()}</span>
            </div>
          </div>

          <div className="poll-stat-card stat-participants">
            <div className="poll-stat-icon-wrap">
              <FiEye />
            </div>
            <div className="poll-stat-meta">
              <span className="poll-stat-label">Total Participants</span>
              <span className="poll-stat-value">{stats.participants.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Tabs and Search Controls */}
        <div className="poll-control-card">
          <div className="poll-tabs-list" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`poll-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
                <span className="poll-tab-badge">{tabCounts[tab.id] || 0}</span>
              </button>
            ))}
          </div>

          <div className="poll-filter-row">
            <div className="poll-search-wrap">
              <FiSearch className="poll-search-icon" />
              <input
                type="text"
                placeholder="Search polls by title, description, or option..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="poll-search-input"
              />
            </div>

            <div className="poll-filter-selects">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="poll-select"
                aria-label="Filter by Category"
              >
                <option value="all">All Categories</option>
                {categories
                  .filter((c) => c !== "all")
                  .map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="poll-select"
                aria-label="Sort Polls"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="most-votes">Sort: Most Votes</option>
                <option value="closing-soon">Sort: Closing Soonest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading ? (
          <div className="poll-cards-grid">
            <SkeletonLoader height={240} count={3} />
          </div>
        ) : filteredPolls.length === 0 ? (
          <div className="poll-empty-state">
            <div className="poll-empty-icon">
              <FiCheckSquare />
            </div>
            <h3 className="poll-empty-title">No polls found</h3>
            <p className="poll-empty-sub">
              {search
                ? `No polls matching "${search}". Try adjusting your filters.`
                : "No polls exist in this view yet. Launch your first student poll!"}
            </p>
            <Link to="/admin/polls/create" className="poll-btn-primary">
              <FiPlus /> Create Poll Now
            </Link>
          </div>
        ) : (
          <div className="poll-cards-grid">
            {filteredPolls.map((poll) => {
              const status = computePollStatus(poll);
              const totalVotes = poll.totalVotes || 0;
              const participants = poll.totalParticipants || 0;
              const isLoading = actionLoadingId === poll.id;

              // Find top leading option
              let topOptionId = null;
              let maxVotes = 0;
              (poll.options || []).forEach((opt) => {
                if ((opt.voteCount || 0) > maxVotes) {
                  maxVotes = opt.voteCount;
                  topOptionId = opt.id;
                }
              });

              return (
                <div key={poll.id} className="poll-admin-card">
                  {/* Card Header */}
                  <div className="poll-card-top">
                    <div className="poll-card-title-area">
                      <div className="poll-card-badges">
                        <span className={`poll-badge badge-${status}`}>
                          {status === "active" && "Live"}
                          {status === "scheduled" && "Scheduled"}
                          {status === "closed" && "Closed"}
                          {status === "draft" && "Draft"}
                          {status === "archived" && "Archived"}
                        </span>
                        <span className="poll-badge badge-tag">
                          {poll.allowMultiple ? "Multi-choice" : "Single-choice"}
                        </span>
                        <span className="poll-badge badge-tag">
                          {poll.showLiveResults ? "Public Results" : "Hidden Results"}
                        </span>
                        {poll.category && (
                          <span className="poll-badge badge-tag">{poll.category}</span>
                        )}
                      </div>

                      <h2 className="poll-card-title">{poll.title}</h2>
                      {poll.description && (
                        <p className="poll-card-desc">{poll.description}</p>
                      )}
                    </div>

                    {/* Actions Toolbar */}
                    <div className="poll-card-actions">
                      <button
                        type="button"
                        className="poll-action-icon-btn"
                        title="Live Preview"
                        onClick={() => setPreviewPoll(poll)}
                        aria-label="Preview Poll"
                      >
                        <FiEye />
                      </button>

                      <Link
                        to={`/admin/polls/analytics/${poll.id}`}
                        className="poll-action-icon-btn"
                        title="Detailed Analytics"
                        aria-label="Poll Analytics"
                      >
                        <FiBarChart2 />
                      </Link>

                      <Link
                        to={`/admin/polls/edit/${poll.id}`}
                        className="poll-action-icon-btn"
                        title="Edit Poll"
                        aria-label="Edit Poll"
                      >
                        <FiEdit />
                      </Link>

                      <button
                        type="button"
                        className="poll-action-icon-btn"
                        title="Duplicate as Draft"
                        disabled={isLoading}
                        onClick={() => handleDuplicate(poll)}
                        aria-label="Duplicate Poll"
                      >
                        <FiCopy />
                      </button>

                      <button
                        type="button"
                        className="poll-action-icon-btn"
                        title="Copy Public Link"
                        onClick={() => handleCopyLink(poll)}
                        aria-label="Copy Public Link"
                      >
                        <FiShare2 />
                      </button>

                      {status === "active" && (
                        <button
                          type="button"
                          className="poll-action-icon-btn"
                          title="Close Poll Early"
                          disabled={isLoading}
                          onClick={() => handleClosePoll(poll)}
                          aria-label="Close Poll Early"
                        >
                          <FiLock />
                        </button>
                      )}

                      <button
                        type="button"
                        className="poll-action-icon-btn"
                        title={poll.archived ? "Unarchive Poll" : "Archive Poll"}
                        disabled={isLoading}
                        onClick={() => handleArchiveToggle(poll)}
                        aria-label="Archive Poll"
                      >
                        <FiArchive />
                      </button>

                      <button
                        type="button"
                        className="poll-action-icon-btn btn-delete"
                        title="Delete Poll"
                        disabled={isLoading}
                        onClick={() => handleDelete(poll)}
                        aria-label="Delete Poll"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>

                  {/* Options Progress Visualizer */}
                  <div className="poll-options-preview">
                    {(poll.options || []).map((opt, idx) => {
                      const count = opt.voteCount || 0;
                      const percentage =
                        totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                      const isLeading = count > 0 && opt.id === topOptionId;

                      return (
                        <div key={opt.id || idx} className="poll-option-row">
                          <div className="poll-option-meta">
                            <div className="poll-option-text-wrap">
                              {opt.imageUrl && (
                                <img
                                  src={opt.imageUrl}
                                  alt=""
                                  className="poll-option-thumb"
                                />
                              )}
                              <span>
                                <strong>{opt.text}</strong>
                                {isLeading && " 👑"}
                              </span>
                            </div>
                            <span>
                              {count} votes ({percentage}%)
                            </span>
                          </div>
                          <div className="poll-bar-track">
                            <div
                              className={`poll-bar-fill ${isLeading ? "leading" : ""}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Card Footer */}
                  <div className="poll-card-footer">
                    <div className="poll-footer-meta-left">
                      <span className="poll-meta-item">
                        <FiEye /> {participants} participant{participants !== 1 ? "s" : ""}
                      </span>
                      <span className="poll-meta-item">
                        <FiCheckSquare /> {totalVotes} total vote{totalVotes !== 1 ? "s" : ""}
                      </span>
                      <span className="poll-meta-item">
                        <FiClock /> Starts: {formatPollDateTime(poll.startAt)}
                      </span>
                      <span className="poll-meta-item">
                        <FiLock /> Closes: {formatPollDateTime(poll.endAt)}
                      </span>
                    </div>

                    <div className="poll-footer-meta-right">
                      <button
                        type="button"
                        className="poll-btn-secondary"
                        style={{ padding: "6px 12px", fontSize: "12px" }}
                        onClick={() => exportPollResultsCSV(poll)}
                      >
                        <FiDownload /> Export CSV
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Live Preview */}
        {previewPoll && (
          <div className="poll-modal-backdrop" onClick={() => setPreviewPoll(null)}>
            <div className="poll-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="poll-modal-header">
                <h3 className="poll-modal-title">Live Voter Preview</h3>
                <button
                  type="button"
                  className="poll-modal-close"
                  onClick={() => setPreviewPoll(null)}
                >
                  <FiX />
                </button>
              </div>
              <div className="poll-modal-body">
                <div style={{ marginBottom: "16px" }}>
                  <span className={`poll-badge badge-${computePollStatus(previewPoll)}`}>
                    {computePollStatus(previewPoll).toUpperCase()}
                  </span>
                  <span className="poll-badge badge-tag" style={{ marginLeft: "8px" }}>
                    {previewPoll.allowMultiple ? "Multiple Choice" : "Single Choice"}
                  </span>
                </div>
                <h2 style={{ fontSize: "20px", margin: "0 0 8px 0" }}>{previewPoll.title}</h2>
                {previewPoll.description && (
                  <p style={{ color: "#475569", fontSize: "14px", lineHeight: "1.5", margin: "0 0 20px 0" }}>
                    {previewPoll.description}
                  </p>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                  {(previewPoll.options || []).map((opt) => (
                    <div
                      key={opt.id}
                      style={{
                        padding: "14px 16px",
                        borderRadius: "12px",
                        border: "1.5px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        background: "#f8fafc",
                      }}
                    >
                      <input
                        type={previewPoll.allowMultiple ? "checkbox" : "radio"}
                        disabled
                        style={{ cursor: "default" }}
                      />
                      {opt.imageUrl && (
                        <img
                          src={opt.imageUrl}
                          alt=""
                          style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "cover" }}
                        />
                      )}
                      <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "14px" }}>
                        {opt.text}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "10px",
                    background: "#ecfdf5",
                    color: "#065f46",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <FiAlertCircle />
                  This is a simulation preview. Live student voting occurs on the public portal.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
