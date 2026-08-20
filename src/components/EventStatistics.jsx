import { memo } from "react";

/**
 * Reusable, Dynamic Event Statistics Component
 * 
 * Props:
 * - stats: Array of { key, value, label } OR normalized event object
 * - layout: "hero" | "section" | "compact" (default: "hero")
 */
function EventStatistics({ stats = [], layout = "hero", className = "" }) {
  // Normalize input if an event object was passed instead of an array
  let statsArray = [];
  if (Array.isArray(stats)) {
    statsArray = stats;
  } else if (stats && typeof stats === "object" && Array.isArray(stats.statistics)) {
    statsArray = stats.statistics;
  }

  // Gracefully render nothing if no statistics are present
  if (!statsArray || statsArray.length === 0) {
    return null;
  }

  // 1. Compact inline layout (for Event Cards in listings)
  if (layout === "compact") {
    return (
      <div className={`event-metrics ${className}`}>
        {statsArray.map((st) => (
          <div key={st.key} className="event-metric-item">
            <strong>{st.value}</strong>
            <span>{st.label}</span>
          </div>
        ))}
      </div>
    );
  }

  // 2. Section layout (for "Key Impact & Metrics" on white/light background)
  if (layout === "section") {
    return (
      <div className={`event-stats-section-grid ${className}`}>
        {statsArray.map((st) => (
          <div key={st.key} className="event-stat-card light">
            <strong className="stat-number">{st.value}</strong>
            <span className="stat-label">{st.label}</span>
          </div>
        ))}
      </div>
    );
  }

  // 3. Hero layout (for Event Details Hero overlay)
  return (
    <div className={`hero-stats ${className}`}>
      {statsArray.map((st) => (
        <div key={st.key} className="hero-stat-card">
          <strong className="stat-number">{st.value}</strong>
          <span className="stat-label">{st.label}</span>
        </div>
      ))}
    </div>
  );
}

export default memo(EventStatistics);
