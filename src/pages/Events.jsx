import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import PageHero from "../components/PageHero.jsx";
import EventCard from "../components/EventCard.jsx";
import eventCategories from "../data/eventCategories";
import { getEvents } from "../Firebase/eventService.js";
import "./Events.css";

export default function Events() {
  const [dbEvents, setDbEvents] = useState([]);

  useEffect(() => {
    async function loadDbEvents() {
      try {
        const data = await getEvents();
        setDbEvents(data);
      } catch (err) {
        console.error("Error loading events from Firestore:", err);
      }
    }
    loadDbEvents();
  }, []);

  const formattedDbEvents = dbEvents.map((ev) => ({
    id: ev.id,
    name: ev.title,
    title: ev.title,
    description: ev.description,
    date: ev.date,
    location: ev.location,
    photo: ev.banner,
    image: ev.banner,
    kind: "Special Event",
  }));

  const allEvents = [...formattedDbEvents, ...eventCategories];

  return (
    <>
      <Helmet>
        <title>Events | Abhyudaya Club — Fests, Workshops & Competitions at MPEC Kanpur</title>
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
        title="Fests, Workshops & Experiences"
        lede="Discover Abhyudaya Club's flagship festivals, technical workshops, competitions and community initiatives."
      />

      <section className="section">
        <div className="wrap">
          <div className="events-grid">
            {allEvents.map((event, index) => (
              <EventCard
                key={event.id || event.slug}
                event={event}
                reverse={index % 2 === 1}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}