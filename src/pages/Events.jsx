import { useEffect, useState } from "react";
import { getEvents } from "../Firebase/eventService";
import PageHero from "../components/PageHero.jsx";
import EventModal from "../components/EventModal.jsx";
import "./Events.css";

export default function Events() {
  const [activeEvent, setActiveEvent] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await getEvents();
        setEvents(data);
      } catch (error) {
        console.error("Failed to load events:", error);
      }
    }

    loadEvents();
  }, []);

  return (
    <>
      <PageHero
        eyebrow="What We Run"
        title="Fests, Workshops & Experiences"
        lede="Discover Abhyudaya Club's flagship fest, technical workshops, competitions and community events."
      />

      <section className="section">
        <div className="wrap">

          <div className="events-grid">

            {events.length === 0 ? (
              <h2 style={{ textAlign: "center" }}>
                No Events Available
              </h2>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="event-card"
                  onClick={() => setActiveEvent(event)}
                >
                  {event.banner && (
                    <img
                      src={event.banner}
                      alt={event.title}
                      className="event-banner"
                    />
                  )}

                  <div className="event-content">

                    <span className="event-type">
                      📅 Event
                    </span>

                    <h3>{event.title}</h3>

                    <p>{event.description}</p>

                    <span className="event-link">
                      📅 {event.date}
                    </span>

                    <br />

                    <span className="event-link">
                      📍 {event.location}
                    </span>

                  </div>
                </div>
              ))
            )}

          </div>

        </div>
      </section>

      <EventModal
        event={activeEvent}
        onClose={() => setActiveEvent(null)}
      />
    </>
  );
}