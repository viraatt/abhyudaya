import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import PageHero from "../components/PageHero.jsx";
import EventCard from "../components/EventCard.jsx";
import { getEvents } from "../Firebase/eventService.js";
import "./Events.css";

function EventCardSkeleton({ reverse }) {
  return (
    <div className={`event-skeleton-item ${reverse ? "reverse-skel" : ""}`}>
      <div className="event-skel-image event-skel-line" />
      <div className="event-skel-content">
        <div className="event-skel-line event-skel-badge" />
        <div className="event-skel-line event-skel-title" />
        <div className="event-skel-line event-skel-tagline" />
        <div className="event-skel-line event-skel-desc-1" />
        <div className="event-skel-line event-skel-desc-2" />
        <div className="event-skel-line event-skel-desc-3" />
        <div className="event-skel-metrics">
          <div className="event-skel-metric">
            <div className="event-skel-line event-skel-metric-val" />
            <div className="event-skel-line event-skel-metric-lbl" />
          </div>
          <div className="event-skel-metric">
            <div className="event-skel-line event-skel-metric-val" />
            <div className="event-skel-line event-skel-metric-lbl" />
          </div>
          <div className="event-skel-metric">
            <div className="event-skel-line event-skel-metric-val" />
            <div className="event-skel-line event-skel-metric-lbl" />
          </div>
        </div>
        <div className="event-skel-line event-skel-btn" />
      </div>
    </div>
  );
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadEventsData() {
      try {
        setLoading(true);
        setError(null);
        // Query Firestore for Published events only (allowFallback: false)
        const data = await getEvents({ onlyPublished: true, allowFallback: false });
        setEvents(data);
      } catch (err) {
        console.error("Error loading events from Firestore:", err);
        setError("Unable to load events at this moment. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadEventsData();
  }, []);

  return (
    <>
      <Helmet>
        <title>Events | Abhyudaya Club — Fests, Workshops &amp; Competitions at MPEC Kanpur</title>
        <meta name="description" content="Explore Abhyudaya Club events — TechBloom, CommuniCraft, Antariksh Spardha, Industrial Visits, Workshops, coding competitions, quizzes, and more at Maharana Pratap Engineering College, Kanpur." />
        <link rel="canonical" href="https://abhyudayaclub.in/events" />
        <meta property="og:title" content="Events | Abhyudaya Club — MPEC Kanpur" />
        <meta property="og:description" content="Discover all Abhyudaya Club events: TechBloom, CommuniCraft, Antariksh Spardha, Industrial Visits, Workshops, and student competitions." />
        <meta property="og:url" content="https://abhyudayaclub.in/events" />
        <meta property="og:image" content="https://abhyudayaclub.in/favicon.png" />
        <meta name="twitter:title" content="Events | Abhyudaya Club — MPEC Kanpur" />
        <meta name="twitter:description" content="TechBloom, CommuniCraft, Antariksh Spardha, Industrial Visits, Workshops, and more at MPEC Kanpur." />
        <meta name="twitter:image" content="https://abhyudayaclub.in/favicon.png" />
      </Helmet>

      <PageHero
        eyebrow="What We Run"
        title="Fests, Workshops &amp; Experiences"
        lede="Discover Abhyudaya Club's flagship festivals, technical workshops, competitions and community initiatives."
      />

      <div className="events-page">
        <div className="events-list">
          {loading ? (
            <div aria-label="Loading events..." role="status">
              <EventCardSkeleton reverse={false} />
              <EventCardSkeleton reverse={true} />
            </div>
          ) : error ? (
            <div className="events-empty-state">
              <span className="empty-emoji">⚠️</span>
              <h2>Something went wrong</h2>
              <p>{error}</p>
              <button
                type="button"
                className="event-button"
                onClick={() => window.location.reload()}
                style={{ marginTop: "24px", cursor: "pointer", border: "none" }}
              >
                Retry Loading
              </button>
            </div>
          ) : events.length === 0 ? (
            <div className="events-empty-state">
              <span className="empty-emoji">📅</span>
              <h2>No Published Events Yet</h2>
              <p>Check back soon! New fests, workshops, and competitions will be announced here shortly.</p>
            </div>
          ) : (
            events.map((event, index) => (
              <EventCard
                key={event.id || event.slug || index}
                event={event}
                reverse={index % 2 === 1}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}