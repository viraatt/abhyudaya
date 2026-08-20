import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { normalizeEvent } from "../utils/eventNormalizer";
import EventStatistics from "./EventStatistics";

function EventCard({ event: rawEvent, reverse }) {
  const event = useMemo(() => normalizeEvent(rawEvent), [rawEvent]);

  if (!event) return null;

  const image       = event.image || event.banner || "";
  const icon        = event.icon  || "📅";
  const subtitle    = event.subtitle || event.category || "Special Event";
  const title       = event.title || "";
  const tagline     = event.tagline || "";
  const description = event.shortDescription || event.description || "";
  const ctaText     = event.ctaText || "Explore Event →";
  const ctaLink     = event.ctaLink || `/events/${event.slug || event.id}`;

  return (
    <section className={`event-showcase ${reverse ? "reverse" : ""}`}>
      <div className="event-showcase-image">
        {image ? (
          <img src={image} alt={title} loading="lazy" decoding="async" />
        ) : (
          <div className="event-image-placeholder">
            <span>{icon}</span>
          </div>
        )}
      </div>

      <div className="event-showcase-content">
        <span className="event-category">
          {icon} {subtitle}
        </span>

        <h2>{title}</h2>

        {tagline && (
          <p className="event-tagline">{tagline}</p>
        )}

        {description && (
          <p className="event-description">{description}</p>
        )}

        {/* Dynamic Statistics Component */}
        <EventStatistics stats={event.statistics} layout="compact" />

        {ctaLink.startsWith("http") ? (
          <a
            href={ctaLink}
            className="event-button"
            target="_blank"
            rel="noopener noreferrer"
          >
            {ctaText}
          </a>
        ) : (
          <Link to={ctaLink} className="event-button">
            {ctaText}
          </Link>
        )}
      </div>
    </section>
  );
}

export default memo(EventCard);