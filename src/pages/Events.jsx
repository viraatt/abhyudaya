import { Helmet } from "react-helmet-async";
import PageHero from "../components/PageHero.jsx";
import EventCard from "../components/EventCard.jsx";
import eventCategories from "../data/eventCategories";
import "./Events.css";

export default function Events() {
  return (
    <>
      <Helmet>
        <title>Events | Abhyudaya Club — Fests, Workshops & Competitions at MPEC Kanpur</title>
        <meta name="description" content="Explore Abhyudaya Club events — TechBloom, CommuniCraft, coding competitions, workshops, quizzes, and more at Maharana Pratap Engineering College, Kanpur." />
        <link rel="canonical" href="https://abhyudayaclub.in/events" />
        <meta property="og:title" content="Events | Abhyudaya Club — MPEC Kanpur" />
        <meta property="og:description" content="Discover all Abhyudaya Club events: TechBloom, CommuniCraft, workshops, quizzes, and student competitions." />
        <meta property="og:url" content="https://abhyudayaclub.in/events" />
        <meta property="og:image" content="https://abhyudayaclub.in/favicon.png" />
        <meta name="twitter:title" content="Events | Abhyudaya Club — MPEC Kanpur" />
        <meta name="twitter:description" content="TechBloom, CommuniCraft, workshops, quizzes and more at MPEC Kanpur." />
        <meta name="twitter:image" content="https://abhyudayaclub.in/favicon.png" />
      </Helmet>

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