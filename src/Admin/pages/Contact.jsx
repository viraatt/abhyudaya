import { useEffect, useMemo, useState } from "react";
import {
  FaSearch,
  FaSync,
  FaEnvelope,
  FaEnvelopeOpen,
  FaReply,
  FaTrash,
  FaEye,
  FaTimes,
  FaPhoneAlt,
  FaCheckCircle,
} from "react-icons/fa";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import SkeletonLoader from "../components/SkeletonLoader";
import { useToast } from "../components/Toast";
import {
  getContactMessages,
  updateMessageStatus,
  deleteContactMessage,
} from "../../Firebase/contactService";
import "./style/admin.css";
import "./Contact.css";

const ITEMS_PER_PAGE = 10;

function formatTimestamp(ts) {
  if (!ts) return "—";
  let date;
  if (ts?.seconds) {
    date = new Date(ts.seconds * 1000);
  } else if (ts?.toDate && typeof ts.toDate === "function") {
    date = ts.toDate();
  } else {
    date = new Date(ts);
  }

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function ContactMessages() {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc"); // 'desc' | 'asc'
  const [currentPage, setCurrentPage] = useState(1);

  const loadMessages = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getContactMessages();
      setMessages(data);
      if (isManualRefresh) {
        toast.success("Messages refreshed.");
      }
    } catch (err) {
      console.error("Error loading contact messages:", err);
      toast.error("Failed to load contact messages.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    const total = messages.length;
    const unread = messages.filter((m) => m.status === "unread").length;
    const read = messages.filter((m) => m.status === "read").length;
    const replied = messages.filter((m) => m.status === "replied").length;
    return { total, unread, read, replied };
  }, [messages]);

  // Filter and sort messages
  const filteredMessages = useMemo(() => {
    return messages
      .filter((msg) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          msg.name?.toLowerCase().includes(query) ||
          msg.email?.toLowerCase().includes(query) ||
          msg.phone?.toLowerCase().includes(query) ||
          msg.subject?.toLowerCase().includes(query) ||
          msg.message?.toLowerCase().includes(query);

        const matchesStatus =
          statusFilter === "all" || (msg.status || "unread") === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const aTime =
          a.createdAt?.seconds ||
          (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
        const bTime =
          b.createdAt?.seconds ||
          (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
        return sortOrder === "desc" ? bTime - aTime : aTime - bTime;
      });
  }, [messages, searchQuery, statusFilter, sortOrder]);

  // Reset page when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortOrder]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredMessages.length / ITEMS_PER_PAGE) || 1;
  const paginatedMessages = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMessages.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMessages, currentPage]);

  const handleStatusChange = async (msgId, newStatus, silent = false) => {
    try {
      await updateMessageStatus(msgId, newStatus);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, status: newStatus } : m))
      );
      if (selectedMessage && selectedMessage.id === msgId) {
        setSelectedMessage((prev) => ({ ...prev, status: newStatus }));
      }
      if (!silent) {
        toast.success(`Message marked as ${newStatus}.`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update message status.");
    }
  };

  const handleDelete = async (msg) => {
    if (!window.confirm(`Are you sure you want to delete message from "${msg.name}"?`)) {
      return;
    }
    try {
      await deleteContactMessage(msg.id);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      if (selectedMessage && selectedMessage.id === msg.id) {
        setSelectedMessage(null);
      }
      toast.success("Message deleted successfully.");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to delete message.");
    }
  };

  const handleViewMessage = (msg) => {
    setSelectedMessage(msg);
    // Auto-mark as read if unread
    if (msg.status === "unread") {
      handleStatusChange(msg.id, "read", true);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          {/* Header */}
          <div className="contact-inbox-header">
            <div className="contact-inbox-title">
              <h2>📩 Contact Messages & Enquiries</h2>
              <p>Review, reply to, and manage inquiries submitted by website visitors.</p>
            </div>
            <div className="contact-header-actions">
              <button
                type="button"
                className="contact-btn-refresh"
                onClick={() => loadMessages(true)}
                disabled={refreshing || loading}
                title="Refresh messages list"
              >
                <FaSync className={refreshing ? "spin-icon" : ""} />
                <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="contact-stats-grid">
            <div className="contact-stat-card">
              <div
                className="contact-stat-icon"
                style={{ background: "#eff6ff", color: "#2563eb" }}
              >
                <FaEnvelope />
              </div>
              <div className="contact-stat-info">
                <span className="contact-stat-label">Total Messages</span>
                <span className="contact-stat-num">{stats.total}</span>
              </div>
            </div>

            <div className="contact-stat-card">
              <div
                className="contact-stat-icon"
                style={{ background: "#fef2f2", color: "#dc2626" }}
              >
                <FaEnvelope />
              </div>
              <div className="contact-stat-info">
                <span className="contact-stat-label">Unread</span>
                <span className="contact-stat-num" style={{ color: "#dc2626" }}>
                  {stats.unread}
                </span>
              </div>
            </div>

            <div className="contact-stat-card">
              <div
                className="contact-stat-icon"
                style={{ background: "#f1f5f9", color: "#475569" }}
              >
                <FaEnvelopeOpen />
              </div>
              <div className="contact-stat-info">
                <span className="contact-stat-label">Read</span>
                <span className="contact-stat-num">{stats.read}</span>
              </div>
            </div>

            <div className="contact-stat-card">
              <div
                className="contact-stat-icon"
                style={{ background: "#f0fdf4", color: "#16a34a" }}
              >
                <FaCheckCircle />
              </div>
              <div className="contact-stat-info">
                <span className="contact-stat-label">Replied</span>
                <span className="contact-stat-num" style={{ color: "#16a34a" }}>
                  {stats.replied}
                </span>
              </div>
            </div>
          </div>

          {/* Control Bar: Search, Filters, Sort */}
          <div className="contact-controls-bar">
            <div className="contact-search-box">
              <FaSearch className="contact-search-icon" />
              <input
                type="text"
                className="contact-search-input"
                placeholder="Search by name, email, phone, subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="contact-filter-group">
              {[
                { key: "all", label: "All", count: stats.total },
                { key: "unread", label: "Unread", count: stats.unread },
                { key: "read", label: "Read", count: stats.read },
                { key: "replied", label: "Replied", count: stats.replied },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  className={`contact-filter-pill ${statusFilter === key ? "active" : ""}`}
                  onClick={() => setStatusFilter(key)}
                >
                  {label}
                  <span className="contact-filter-count">{count}</span>
                </button>
              ))}
            </div>

            <div>
              <select
                className="contact-sort-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                aria-label="Sort Order"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Messages Table or Loading/Empty */}
          {loading ? (
            <SkeletonLoader type="table" count={6} />
          ) : filteredMessages.length === 0 ? (
            <div className="contact-empty-state">
              <div className="contact-empty-icon">📩</div>
              <h3>No Messages Found</h3>
              <p>
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search terms or filter criteria."
                  : "Inquiries submitted via the Contact form will appear here."}
              </p>
              {(searchQuery || statusFilter !== "all") && (
                <button
                  type="button"
                  className="contact-filter-pill active"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="contact-table-card">
              <div className="contact-table-wrapper">
                <table className="contact-table">
                  <thead>
                    <tr>
                      <th style={{ width: "22%" }}>Sender</th>
                      <th style={{ width: "20%" }}>Subject</th>
                      <th style={{ width: "26%" }}>Message Preview</th>
                      <th style={{ width: "14%" }}>Date & Time</th>
                      <th style={{ width: "8%" }}>Status</th>
                      <th style={{ width: "10%", textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMessages.map((msg) => {
                      const isUnread = msg.status === "unread";
                      return (
                        <tr key={msg.id} className={isUnread ? "row-unread" : ""}>
                          <td>
                            <div className="contact-sender-cell">
                              <span className="contact-sender-name">{msg.name}</span>
                              <span className="contact-sender-email">{msg.email}</span>
                              {msg.phone && (
                                <span className="contact-sender-phone">
                                  📞 {msg.phone}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="contact-subject-cell" title={msg.subject || "General Inquiry"}>
                              {msg.subject || "General Inquiry"}
                            </div>
                          </td>
                          <td>
                            <div className="contact-preview-cell" title={msg.message}>
                              {msg.message}
                            </div>
                          </td>
                          <td>
                            <span className="contact-date-cell">
                              {formatTimestamp(msg.createdAt)}
                            </span>
                          </td>
                          <td>
                            <span className={`contact-status-badge ${msg.status || "unread"}`}>
                              <span className="status-dot" />
                              {msg.status || "unread"}
                            </span>
                          </td>
                          <td>
                            <div className="contact-actions-cell" style={{ justifyContent: "center" }}>
                              <button
                                type="button"
                                className="contact-action-btn view-btn"
                                onClick={() => handleViewMessage(msg)}
                                title="View full message details"
                              >
                                <FaEye />
                              </button>
                              <a
                                href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(
                                  msg.subject || "Abhyudaya Club Inquiry"
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="contact-action-btn reply-btn"
                                title="Reply via Email client"
                                onClick={() => {
                                  if (msg.status !== "replied") {
                                    handleStatusChange(msg.id, "replied", true);
                                  }
                                }}
                              >
                                <FaReply />
                              </a>
                              <button
                                type="button"
                                className="contact-action-btn delete-btn"
                                onClick={() => handleDelete(msg)}
                                title="Delete inquiry"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="contact-pagination-bar">
                <div>
                  Showing{" "}
                  <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to{" "}
                  <strong>
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredMessages.length)}
                  </strong>{" "}
                  of <strong>{filteredMessages.length}</strong> inquiries
                </div>

                {totalPages > 1 && (
                  <div className="contact-pagination-controls">
                    <button
                      type="button"
                      className="contact-page-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    >
                      ‹ Prev
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        className={`contact-page-btn ${
                          currentPage === pageNum ? "active" : ""
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    ))}

                    <button
                      type="button"
                      className="contact-page-btn"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    >
                      Next ›
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Message Detail Modal */}
        {selectedMessage && (
          <div
            className="contact-modal-overlay"
            onClick={() => setSelectedMessage(null)}
          >
            <div
              className="contact-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="contact-modal-header">
                <div>
                  <span
                    className={`contact-status-badge ${selectedMessage.status || "unread"}`}
                    style={{ marginBottom: "8px" }}
                  >
                    <span className="status-dot" />
                    {selectedMessage.status || "unread"}
                  </span>
                  <h3>{selectedMessage.subject || "General Inquiry"}</h3>
                </div>
                <button
                  type="button"
                  className="contact-modal-close"
                  onClick={() => setSelectedMessage(null)}
                  aria-label="Close modal"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="contact-modal-body">
                <div className="contact-modal-info-grid">
                  <div className="contact-info-item">
                    <span className="contact-info-label">Sender Name</span>
                    <span className="contact-info-value">{selectedMessage.name}</span>
                  </div>

                  <div className="contact-info-item">
                    <span className="contact-info-label">Email Address</span>
                    <span className="contact-info-value">
                      <a href={`mailto:${selectedMessage.email}`}>
                        {selectedMessage.email}
                      </a>
                    </span>
                  </div>

                  {selectedMessage.phone && (
                    <div className="contact-info-item">
                      <span className="contact-info-label">Phone Number</span>
                      <span className="contact-info-value">
                        <a href={`tel:${selectedMessage.phone}`}>
                          <FaPhoneAlt style={{ fontSize: "11px", marginRight: "4px" }} />
                          {selectedMessage.phone}
                        </a>
                      </span>
                    </div>
                  )}

                  <div className="contact-info-item">
                    <span className="contact-info-label">Date & Time</span>
                    <span className="contact-info-value">
                      {formatTimestamp(selectedMessage.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="contact-info-item">
                  <span className="contact-info-label" style={{ marginBottom: "6px" }}>
                    Full Message
                  </span>
                  <div className="contact-message-box">
                    {selectedMessage.message}
                  </div>
                </div>

                <div className="contact-status-changer">
                  <label htmlFor="modal-status-select">Update Status:</label>
                  <select
                    id="modal-status-select"
                    className="contact-sort-select"
                    value={selectedMessage.status || "read"}
                    onChange={(e) =>
                      handleStatusChange(selectedMessage.id, e.target.value)
                    }
                  >
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                    <option value="replied">Replied</option>
                  </select>
                </div>
              </div>

              <div className="contact-modal-footer">
                <button
                  type="button"
                  className="modal-del-btn"
                  onClick={() => handleDelete(selectedMessage)}
                >
                  <FaTrash /> Delete Message
                </button>

                <div className="contact-modal-actions-right">
                  <button
                    type="button"
                    className="contact-page-btn"
                    style={{ height: "40px", padding: "0 16px" }}
                    onClick={() => setSelectedMessage(null)}
                  >
                    Close
                  </button>
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(
                      selectedMessage.subject || "Abhyudaya Club Inquiry"
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="modal-reply-btn"
                    onClick={() => {
                      if (selectedMessage.status !== "replied") {
                        handleStatusChange(selectedMessage.id, "replied", true);
                      }
                    }}
                  >
                    <FaReply /> Reply via Email
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
