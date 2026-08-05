import React from "react";
import "./SkeletonLoader.css";

export default function SkeletonLoader({ type = "table", count = 6, rows = 5 }) {
  if (type === "table") {
    return (
      <div className="skeleton-table-wrapper" role="status" aria-label="Loading content...">
        <div className="skeleton-table-header">
          <div className="skeleton-line header-cell" style={{ width: "30%" }} />
          <div className="skeleton-line header-cell" style={{ width: "15%" }} />
          <div className="skeleton-line header-cell" style={{ width: "15%" }} />
          <div className="skeleton-line header-cell" style={{ width: "15%" }} />
          <div className="skeleton-line header-cell" style={{ width: "25%" }} />
        </div>
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="skeleton-table-row">
            <div className="skeleton-cell" style={{ width: "30%" }}>
              <div className="skeleton-line title" />
              <div className="skeleton-line subtext" />
            </div>
            <div className="skeleton-cell" style={{ width: "15%" }}>
              <div className="skeleton-line pill" />
            </div>
            <div className="skeleton-cell" style={{ width: "15%" }}>
              <div className="skeleton-line pill" />
            </div>
            <div className="skeleton-cell" style={{ width: "15%" }}>
              <div className="skeleton-line text" />
            </div>
            <div className="skeleton-cell" style={{ width: "25%" }}>
              <div className="skeleton-line btn-group" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "grid") {
    return (
      <div className="skeleton-grid-wrapper" role="status" aria-label="Loading media library...">
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="skeleton-grid-card">
            <div className="skeleton-box thumb" />
            <div className="skeleton-card-meta">
              <div className="skeleton-line title" />
              <div className="skeleton-line subtext" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <div className="skeleton-line text" role="status" aria-label="Loading..." />;
}
