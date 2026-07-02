import { useState, useEffect } from 'react'
import { events } from '../data/club.js'
import PageHero from '../components/PageHero.jsx'
import EventModal from '../components/EventModal.jsx'
import './Events.css'

export default function Events() {
  const [activeEvent, setActiveEvent] = useState(null)

  return (
    <>
      <PageHero
        eyebrow="What we run"
        title="Fests, quizzes, workshops, and everything between."
        lede="From TechBloom 2.0's flagship weekend to smaller workshops through the year, here's what Abhyudaya has put on — and what's coming back."
      />

      <section className="section">
        <div className="wrap">
          <div className="events-list">
            {events.map((ev) => {
              const hasSubEvents = ev.subEvents && ev.subEvents.length > 0

              return (
                <article
                  key={ev.slug}
                  className={`event-row ${ev.featured ? 'event-row--featured' : ''} ${hasSubEvents ? 'event-row--clickable' : ''}`}
                  onClick={hasSubEvents ? () => setActiveEvent(ev) : undefined}
                >
                  <div className="event-row__kind">
                    <span className="eyebrow">{ev.kind}</span>
                  </div>
                  <div className="event-row__body">
                    <h3>{ev.name}</h3>
                    <p>{ev.detail}</p>

                    {hasSubEvents && (
                      <span className="event-row__cta">
                        See {ev.subEvents.length} events inside
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path
                            d="M5 3L9 7L5 11"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <EventModal event={activeEvent} onClose={() => setActiveEvent(null)} />
    </>
  )
}