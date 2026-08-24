import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import PageHero from "../components/PageHero.jsx";
import { getEventsPage } from "../Firebase/eventService.js";
import "./RegisterEvent.css";

export default function RegisterEvent() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadEvents() {
      try {
        setLoading(true);
        setError(null);
        const res = await getEventsPage({ pageSize: 12, onlyPublished: true });
        setEvents(res.events);
      } catch (err) {
        console.error("Error loading events for registration:", err);
        setError("Unable to load events at this moment. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  return (
    <>
      <Helmet>
        <title>Register for an Event | Abhyudaya Club</title>
        <meta
          name="description"
          content="Choose an Abhyudaya Club event and register online. Fests, workshops, and competitions at MPEC Kanpur."
        />
        <meta name="robots" content="index,follow" />
      </Helmet>

      <PageHero
        eyebrow="Get Involved"
        title="Register for an Event"
        lede="Pick an event below to complete your registration with Abhyudaya Club."
      />

      <div className="register-event-page">
        <div className="register-event-grid">
          {loading ? (
            <div className="register-event-loading" role="status" aria-label="Loading events...">
              Loading events...
            </div>
          ) : error ? (
            <div className="register-event-empty">
              <span className="register-event-emoji">⚠️</span>
              <h2>Something went wrong</h2>
              <p>{error}</p>
              <button
                type="button"
                className="register-event-btn"
                onClick={() => window.location.reload()}
              >
                Retry Loading
              </button>
            </div>
          ) : events.length === 0 ? (
            <div className="register-event-empty">
              <span className="register-event-emoji">📅</span>
              <h2>No Open Registrations</h2>
              <p>
                There are no events accepting registrations right now. Check back soon!
              </p>
              <Link to="/events" className="register-event-btn">
                ← Back to Events
              </Link>
            </div>
          ) : (
            events.map((event) => (
              <Link
                key={event.id || event.slug}
                to={`/register/${event.id || event.slug}`}
                className="register-event-card"
              >
                <span className="register-event-card-icon">{event.icon || "📅"}</span>
                <div className="register-event-card-body">
                  <span className="register-event-card-category">
                    {event.subtitle || event.category || "Abhyudaya Event"}
                  </span>
                  <h3 className="register-event-card-title">{event.title}</h3>
                  {event.tagline && (
                    <p className="register-event-card-tagline">{event.tagline}</p>
                  )}
                </div>
                <span className="register-event-card-cta">Register →</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  );
}