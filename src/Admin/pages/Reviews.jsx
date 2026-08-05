import { useEffect, useMemo, useState } from "react";
import { FaSearch, FaStar, FaRegStar, FaTrash, FaEye } from "react-icons/fa";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import SkeletonLoader from "../components/SkeletonLoader";
import { useToast } from "../components/Toast";
import {
  getAllReviews,
  updateReviewStatus,
  toggleReviewFeatured,
  toggleReviewVerified,
  deleteReview,
} from "../../Firebase/reviewService";
import { getEvents } from "../../Firebase/eventService";
import "./style/admin.css";
import "./Reviews.css";

function formatDate(ts) {
  if (!ts) return "—";
  const date = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusStyle(status) {
  const styles = {
    pending: { bg: "rgba(245, 158, 11, 0.2)", color: "#fbbf24" },
    approved: { bg: "rgba(34, 197, 94, 0.2)", color: "#4ade80" },
    rejected: { bg: "rgba(239, 68, 68, 0.2)", color: "#f87171" },
  };
  return styles[status] || styles.pending;
}

export default function Reviews() {
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);

  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadData = async () => {
    try {
      setLoading(true);
      const [reviewData, eventData] = await Promise.all([getAllReviews(), getEvents()]);
      setReviews(reviewData);
      setEvents(eventData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      const queryText = search.trim().toLowerCase();
      const matchesSearch =
        !queryText ||
        review.name?.toLowerCase().includes(queryText) ||
        review.title?.toLowerCase().includes(queryText) ||
        review.message?.toLowerCase().includes(queryText) ||
        review.eventTitle?.toLowerCase().includes(queryText);

      const matchesEvent =
        eventFilter === "all" || review.eventId === eventFilter;

      const matchesRating =
        ratingFilter === "all" || Number(review.rating) === Number(ratingFilter);

      const matchesStatus =
        statusFilter === "all" || review.status === statusFilter;

      return matchesSearch && matchesEvent && matchesRating && matchesStatus;
    });
  }, [reviews, search, eventFilter, ratingFilter, statusFilter]);

  const handleStatusChange = async (review, status) => {
    try {
      await updateReviewStatus(review.id, status);
      toast.success(`Review ${status}.`);
      await loadData();
      if (selectedReview?.id === review.id) {
        setSelectedReview({ ...selectedReview, status });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update review status.");
    }
  };

  const handleFeaturedToggle = async (review) => {
    try {
      const nextFeatured = !review.featured;
      await toggleReviewFeatured(review.id, nextFeatured);
      toast.success(nextFeatured ? "Review marked as featured." : "Review unfeatured.");
      await loadData();
      if (selectedReview?.id === review.id) {
        setSelectedReview({ ...selectedReview, featured: nextFeatured });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update featured status.");
    }
  };

  const handleVerifiedToggle = async (review) => {
    try {
      const nextVerified = !review.verifiedAttendee;
      await toggleReviewVerified(review.id, nextVerified);
      toast.success(
        nextVerified ? "Marked as verified attendee." : "Removed verified attendee badge."
      );
      await loadData();
      if (selectedReview?.id === review.id) {
        setSelectedReview({ ...selectedReview, verifiedAttendee: nextVerified });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update verified status.");
    }
  };

  const handleDelete = async (review) => {
    if (!window.confirm(`Delete review from ${review.name}?`)) return;
    try {
      await deleteReview(review.id);
      toast.success("Review deleted.");
      if (selectedReview?.id === review.id) {
        setSelectedReview(null);
      }
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete review.");
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div className="events-header">
            <div className="events-title">
              <h2>⭐ Event Reviews</h2>
              <p>Manage attendee reviews and testimonials across all events.</p>
            </div>
          </div>

          <div className="admin-reviews-filters">
            <div className="admin-reviews-search">
              <FaSearch />
              <input
                type="text"
                placeholder="Search by name, title, message, or event..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="admin-reviews-select"
            >
              <option value="all">All Events</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>

            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="admin-reviews-select"
            >
              <option value="all">All Ratings</option>
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>
                  {rating} Star{rating > 1 ? "s" : ""}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-reviews-select"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {loading ? (
            <SkeletonLoader type="table" count={6} />
          ) : filteredReviews.length === 0 ? (
            <div className="empty-card">
              <div style={{ fontSize: "70px" }}>⭐</div>
              <h3>No Reviews Found</h3>
              <p>Reviews submitted on event pages will appear here for moderation.</p>
            </div>
          ) : (
            <div className="users-table admin-reviews-table">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#1e293b", textAlign: "left" }}>
                    <th style={{ padding: "12px" }}>Reviewer</th>
                    <th style={{ padding: "12px" }}>Event</th>
                    <th style={{ padding: "12px" }}>Rating</th>
                    <th style={{ padding: "12px" }}>Status</th>
                    <th style={{ padding: "12px" }}>Date</th>
                    <th style={{ padding: "12px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.map((review) => {
                    const status = statusStyle(review.status);
                    return (
                      <tr key={review.id} style={{ borderBottom: "1px solid #334155" }}>
                        <td style={{ padding: "12px" }}>
                          <div>{review.name}</div>
                          <small style={{ color: "#94a3b8" }}>
                            {review.title || "No title"}
                          </small>
                        </td>
                        <td style={{ padding: "12px" }}>
                          {review.eventTitle || "Unknown Event"}
                        </td>
                        <td style={{ padding: "12px", color: "#fbbf24" }}>
                          {"★".repeat(review.rating || 0)}
                          {"☆".repeat(5 - (review.rating || 0))}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              textTransform: "capitalize",
                              background: status.bg,
                              color: status.color,
                            }}
                          >
                            {review.status || "pending"}
                          </span>
                          {review.featured && (
                            <span className="admin-reviews-featured-tag">Featured</span>
                          )}
                        </td>
                        <td style={{ padding: "12px" }}>{formatDate(review.createdAt)}</td>
                        <td style={{ padding: "12px" }}>
                          <div className="admin-reviews-actions">
                            <button
                              type="button"
                              className="filter-btn"
                              style={{ background: "#3b82f6", color: "#fff" }}
                              onClick={() => setSelectedReview(review)}
                              title="View details"
                            >
                              <FaEye />
                            </button>
                            {review.status !== "approved" && (
                              <button
                                type="button"
                                className="filter-btn"
                                style={{ background: "#16a34a", color: "#fff" }}
                                onClick={() => handleStatusChange(review, "approved")}
                              >
                                Approve
                              </button>
                            )}
                            {review.status !== "rejected" && (
                              <button
                                type="button"
                                className="filter-btn"
                                style={{ background: "#dc2626", color: "#fff" }}
                                onClick={() => handleStatusChange(review, "rejected")}
                              >
                                Reject
                              </button>
                            )}
                            <button
                              type="button"
                              className="filter-btn"
                              onClick={() => handleFeaturedToggle(review)}
                              title={review.featured ? "Unfeature" : "Mark featured"}
                            >
                              {review.featured ? <FaStar color="#fbbf24" /> : <FaRegStar />}
                            </button>
                            <button
                              type="button"
                              className="filter-btn"
                              onClick={() => handleDelete(review)}
                              title="Delete review"
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
          )}
        </div>

        {selectedReview && (
          <div className="modal-overlay" onClick={() => setSelectedReview(null)}>
            <div
              className="modal admin-reviews-modal"
              style={{ maxWidth: "640px", width: "90%" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ marginBottom: "8px" }}>{selectedReview.title || "Review Details"}</h2>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "16px" }}>
                By <strong>{selectedReview.name}</strong>
                {selectedReview.email && ` · ${selectedReview.email}`}
                {selectedReview.college && ` · ${selectedReview.college}`}
                {selectedReview.branch && ` · ${selectedReview.branch}`}
              </div>

              <div className="admin-reviews-modal-meta">
                <span>Event: {selectedReview.eventTitle || "Unknown"}</span>
                <span>Rating: {"★".repeat(selectedReview.rating || 0)}</span>
                <span>Date: {formatDate(selectedReview.createdAt)}</span>
              </div>

              <div className="admin-reviews-modal-body">{selectedReview.message}</div>

              <div className="admin-reviews-modal-footer">
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span>Status:</span>
                  <select
                    value={selectedReview.status || "pending"}
                    onChange={(e) => handleStatusChange(selectedReview, e.target.value)}
                    className="admin-reviews-select"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="save"
                    onClick={() => handleFeaturedToggle(selectedReview)}
                  >
                    {selectedReview.featured ? "Unfeature" : "Mark Featured"}
                  </button>
                  <button
                    type="button"
                    className="save"
                    onClick={() => handleVerifiedToggle(selectedReview)}
                  >
                    {selectedReview.verifiedAttendee ? "Remove Verified" : "Mark Verified"}
                  </button>
                  <button type="button" className="cancel" onClick={() => setSelectedReview(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
