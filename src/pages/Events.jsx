import { events } from '../data/club.js'
import PageHero from '../components/PageHero.jsx'
import './Events.css'

export default function Events() {
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
            {events.map((ev) => (
              <article className={`event-row ${ev.featured ? 'event-row--featured' : ''}`} key={ev.slug}>
                <div className="event-row__kind">
                  <span className="eyebrow">{ev.kind}</span>
                </div>
                <div className="event-row__body">
                  <h3>{ev.name}</h3>
                  <p>{ev.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
