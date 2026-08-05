import StarRating from "./StarRating";

const STAR_LABELS = {
  5: "★★★★★",
  4: "★★★★☆",
  3: "★★★☆☆",
  2: "★★☆☆☆",
  1: "★☆☆☆☆",
};

export default function ReviewSummary({ stats }) {
  const { average, total, breakdown } = stats;

  return (
    <div className="review-summary">
      <div className="review-summary__score">
        <span className="review-summary__average">{average > 0 ? average.toFixed(1) : "—"}</span>
        <StarRating value={average} readOnly size="lg" />
        <p className="review-summary__total">
          {total} review{total !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="review-summary__breakdown">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = breakdown[star] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;

          return (
            <div key={star} className="review-summary__row">
              <span className="review-summary__stars-label">{STAR_LABELS[star]}</span>
              <div className="review-summary__bar">
                <div
                  className="review-summary__bar-fill"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="review-summary__count">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
