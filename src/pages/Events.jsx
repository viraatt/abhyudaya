import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import PageHero from "../components/PageHero.jsx";
import EventCard from "../components/EventCard.jsx";
import { getEventsPage } from "../Firebase/eventService.js";
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
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadEventsData() {
      try {
        setLoading(true);
        setError(null);
        const res = await getEventsPage({ pageSize: 6, onlyPublished: true });
        setEvents(res.events);
        setLastDoc(res.lastDoc);
        setHasMore(res.hasMore);
      } catch (err) {
        console.error("Error loading events from Firestore:", err);
        setError("Unable to load events at this moment. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadEventsData();
  }, []);

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || !lastDoc) return;
    try {
      setLoadingMore(true);
      const res = await getEventsPage({
        pageSize: 6,
        lastDoc,
        onlyPublished: true,
      });
      setEvents((prev) => [...prev, ...res.events]);
      setLastDoc(res.lastDoc);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error("Error loading more events:", err);
    } finally {
      setLoadingMore(false);
    }
  };

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
            <>
              {events.map((event, index) => (
                <EventCard
                  key={event.id || event.slug || index}
                  event={event}
                  reverse={index % 2 === 1}
                />
              ))}

              {hasMore && (
                <div style={{ display: "flex", justifyContent: "center", marginTop: "32px" }}>
                  <button
                    type="button"
                    className="event-button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    style={{ border: "none", cursor: "pointer" }}
                  >
                    {loadingMore ? "Loading..." : "Load More Events"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}