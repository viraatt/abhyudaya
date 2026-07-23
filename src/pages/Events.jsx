import PageHero from "../components/PageHero.jsx";
import EventCard from "../components/EventCard.jsx";
import eventCategories from "../data/eventCategories";
import "./Events.css";

export default function Events() {
  return (
    <>
      <PageHero
        eyebrow="What We Run"
        title="Fests, Workshops & Experiences"
        lede="Discover Abhyudaya Club's flagship festivals, technical workshops, competitions and community initiatives."
      />

      <section className="section">
        <div className="wrap">
          <div className="events-grid">
            {eventCategories.map((event) => (
              <EventCard
                key={event.id}
                event={event}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}