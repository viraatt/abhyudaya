import { useState } from 'react'
import { events } from '../data/club.js'
import PageHero from '../components/PageHero.jsx'
import EventModal from '../components/EventModal.jsx'
import './Events.css'

export default function Events() {
  const [activeEvent, setActiveEvent] = useState(null)

  const featured = events.find((event) => event.featured)
  const otherEvents = events.filter((event) => !event.featured)

  return (
    <>
      <PageHero
        eyebrow="What We Run"
        title="Fests, Workshops & Experiences"
        lede="Discover Abhyudaya Club's flagship fest, technical workshops, competitions and community events."
      />

      <section className="section">
        <div className="wrap">

          {featured && (
            <div
              className="featured-event"
              onClick={() => setActiveEvent(featured)}
            >
              <div className="featured-content">

                <span className="featured-badge">
                  ⭐ Flagship Event
                </span>

                <h2>{featured.name}</h2>

                <p>{featured.detail}</p>

                <div className="featured-stats">
                  <div>
                    <strong>{featured.subEvents?.length || 0}</strong>
                    <span>Competitions</span>
                  </div>

                  <div>
                    <strong>Workshops</strong>
                    <span>Hands-on Learning</span>
                  </div>

                  <div>
                    <strong>Live</strong>
                    <span>Activities</span>
                  </div>
                </div>

                <button className="featured-btn">
                  Explore Events →
                </button>

              </div>
            </div>
          )}

          <div className="events-grid">

            {otherEvents.map((event) => (

              <div
                key={event.slug}
                className="event-card"
                onClick={() => setActiveEvent(event)}
              >

                <span className="event-type">
                  {event.kind}
                </span>

                <h3>{event.name}</h3>

                <p>{event.summary}</p>

                <span className="event-link">
                  View Details →
                </span>

              </div>

            ))}

          </div>

        </div>
      </section>

      <EventModal
        event={activeEvent}
        onClose={() => setActiveEvent(null)}
      />
    </>
  )
}
