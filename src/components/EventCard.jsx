import { Link } from "react-router-dom";

export default function EventCard({ event, reverse }) {
  // Support both static (hardcoded) and dynamic (Firestore) data shapes
  const image        = event.image || event.banner || "";
  const icon         = event.icon  || "📅";
  const subtitle     = event.subtitle || event.category || "";
  const title        = event.title || "";
  const tagline      = event.tagline || "";
  const description  = event.shortDescription || event.description || "";
  const participants = event.participants || "";
  const activities   = event.events || "";
  const editions     = event.editions || "";
  const ctaText      = event.ctaText || "Explore Event →";
  const ctaLink      = event.ctaLink || `/events/${event.slug || event.id}`;

  return (
    <section className={`event-showcase ${reverse ? "reverse" : ""}`}>

      <div className="event-showcase-image">
        {image ? (
          <img src={image} alt={title} loading="lazy" />
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

        <div className="event-metrics">
          {participants && (
            <div>
              <strong>{participants}</strong>
              <span>{event.participantsLabel || "Participants"}</span>
            </div>
          )}

          {activities && (
            <div>
              <strong>{activities}</strong>
              <span>{event.eventsLabel || "Activities"}</span>
            </div>
          )}

          {editions && (
            <div>
              <strong>{editions}</strong>
              <span>{event.editionsLabel || "Editions"}</span>
            </div>
          )}
        </div>

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