import { useEffect, useMemo, useState, useCallback } from "react";
import {
  getApprovedReviewsPage,
  computeReviewStats,
} from "../../Firebase/reviewService";
import ReviewSummary from "./ReviewSummary";
import ReviewCard from "./ReviewCard";
import ReviewForm from "./ReviewForm";
import StarRating from "./StarRating";
import "./Reviews.css";

function ReviewSkeleton() {
  return (
    <div className="review-card review-card--skeleton">
      <div className="review-skeleton__header">
        <div className="review-skeleton__avatar" />
        <div className="review-skeleton__lines">
          <div className="review-skeleton__line review-skeleton__line--short" />
          <div className="review-skeleton__line" />
        </div>
      </div>
      <div className="review-skeleton__line review-skeleton__line--title" />
      <div className="review-skeleton__line" />
      <div className="review-skeleton__line review-skeleton__line--medium" />
    </div>
  );
}

export default function EventReviews({ event }) {
  const eventId = event?.id || event?.slug;
  const [reviews, setReviews] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchInitialReviews = useCallback(async () => {
    if (!eventId) {
      setReviews([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await getApprovedReviewsPage({
        eventId,
        pageSize: 5,
      });
      setReviews(res.reviews);
      setLastDoc(res.lastDoc);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error("Failed to load reviews:", err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchInitialReviews();
  }, [fetchInitialReviews]);

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || !lastDoc) return;
    try {
      setLoadingMore(true);
      const res = await getApprovedReviewsPage({
        eventId,
        pageSize: 5,
        lastDoc,
      });
      setReviews((prev) => [...prev, ...res.reviews]);
      setLastDoc(res.lastDoc);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error("Error loading more reviews:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const stats = useMemo(() => computeReviewStats(reviews), [reviews]);

  return (
    <section className="event-section alt-bg event-reviews-section">
      <div className="wrap">
        {loading ? (
          <div className="event-reviews-layout">
            <div className="review-summary review-summary--skeleton">
              <div className="review-skeleton__line review-skeleton__line--score" />
              <div className="review-skeleton__line" />
              <div className="review-skeleton__line review-skeleton__line--medium" />
            </div>
            <div className="event-reviews-list">
              {[1, 2, 3].map((item) => (
                <ReviewSkeleton key={item} />
              ))}
            </div>
          </div>
        ) : (
          reviews.length > 0 && (
            <div className="event-reviews-wrapper" style={{ marginBottom: "40px" }}>
              <div className="event-reviews-header">
                <h2>Reviews &amp; Feedback</h2>
                <p>See what attendees are saying about {event?.title}.</p>
              </div>

              <div className="event-reviews-layout">
                <ReviewSummary stats={stats} />
                <div className="event-reviews-list">
                  {reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                  {hasMore && (
                    <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
                      <button
                        type="button"
                        className="reviews-load-more-btn"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                      >
                        {loadingMore ? "Loading..." : "Load More Reviews"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}

        {/* COMPACT REVIEW CTA CARD */}
        <div className="review-compact-card">
          <h3 className="review-compact-title">Share Your Experience</h3>
          <p className="review-compact-subtitle">
            Tell us what you thought about {event?.title || "this event"}.
          </p>
          <div className="review-compact-stars">
            <StarRating value={5} readOnly size="md" />
          </div>
          <button
            type="button"
            className="review-compact-btn"
            onClick={() => setIsModalOpen(true)}
          >
            Leave a Review
          </button>
        </div>
      </div>

      {/* REVIEW FORM MODAL */}
      {isModalOpen && (
        <div className="review-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="review-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="review-modal-close"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close modal"
            >
              ✕
            </button>
            <ReviewForm event={event} onSubmitted={() => setIsModalOpen(false)} />
          </div>
        </div>
      )}
    </section>
  );
}
