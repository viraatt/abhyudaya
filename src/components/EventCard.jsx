import { Link } from "react-router-dom";

export default function EventCard({ event, reverse }) {
  return (
    <section className={`event-showcase ${reverse ? "reverse" : ""}`}>

      <div className="event-showcase-image">

        <img
          src={event.image}
          alt={event.title}
        />

      </div>

      <div className="event-showcase-content">

        <span className="event-category">
          {event.icon} {event.subtitle}
        </span>

        <h2>{event.title}</h2>

        <p className="event-tagline">
          {event.tagline}
        </p>

        <p className="event-description">
          {event.description}
        </p>

        <div className="event-metrics">

          <div>
            <strong>{event.participants}</strong>
            <span>Participants</span>
          </div>

          <div>
            <strong>{event.events}</strong>
            <span>Activities</span>
          </div>

          <div>
            <strong>{event.editions}</strong>
            <span>Editions</span>
          </div>

        </div>

        <Link
          to={`/events/${event.slug}`}
          className="event-button"
        >
          Explore Event →
        </Link>

      </div>

    </section>
  );
}