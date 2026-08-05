import { FaStar, FaCheckCircle } from "react-icons/fa";
import StarRating from "./StarRating";

function formatReviewDate(timestamp) {
  if (!timestamp) return "";
  const date =
    timestamp?.seconds != null
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function ReviewCard({ review }) {
  const collegeBranch = [review.college, review.branch].filter(Boolean).join(" · ");

  return (
    <article className="review-card">
      {review.featured && (
        <span className="review-card__featured-badge">
          <FaStar /> Featured
        </span>
      )}

      <div className="review-card__header">
        <div className="review-card__avatar">
          {review.profilePhoto ? (
            <img src={review.profilePhoto} alt={review.name} />
          ) : (
            <span>{getInitials(review.name)}</span>
          )}
        </div>

        <div className="review-card__meta">
          <div className="review-card__name-row">
            <h4>{review.name}</h4>
            {review.verifiedAttendee && (
              <span className="review-card__verified">
                <FaCheckCircle /> Verified Attendee
              </span>
            )}
          </div>
          {collegeBranch && <p className="review-card__college">{collegeBranch}</p>}
          <StarRating value={review.rating} readOnly size="sm" />
        </div>

        <time className="review-card__date" dateTime={formatReviewDate(review.createdAt)}>
          {formatReviewDate(review.createdAt)}
        </time>
      </div>

      {review.title && <h5 className="review-card__title">{review.title}</h5>}
      {review.message && <p className="review-card__message">{review.message}</p>}
    </article>
  );
}
