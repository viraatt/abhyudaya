import { FaStar } from "react-icons/fa";
import "./Reviews.css";

export default function StarRating({
  value = 0,
  onChange,
  size = "md",
  readOnly = false,
  label,
}) {
  const stars = [1, 2, 3, 4, 5];
  const interactive = !readOnly && typeof onChange === "function";

  return (
    <div
      className={`star-rating star-rating--${size}${interactive ? " star-rating--interactive" : ""}`}
      role={interactive ? "radiogroup" : "img"}
      aria-label={label || `Rating: ${value} out of 5 stars`}
    >
      {stars.map((star) => {
        const filled = star <= Math.round(value);
        return (
          <button
            key={star}
            type="button"
            className={`star-rating__star${filled ? " star-rating__star--filled" : ""}`}
            onClick={() => interactive && onChange(star)}
            disabled={!interactive}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            aria-pressed={interactive ? value === star : undefined}
          >
            <FaStar />
          </button>
        );
      })}
    </div>
  );
}
