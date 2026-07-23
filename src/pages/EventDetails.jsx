import { useParams } from "react-router-dom";
import eventCategories from "../data/eventCategories";
import "./EventDetails.css";

export default function EventDetails() {
  const { slug } = useParams();

  const event = eventCategories.find(
    (item) => item.slug === slug
  );

  if (!event) {
    return (
      <section className="event-not-found">
        <h1>Event Not Found</h1>
      </section>
    );
  }

  return (
    <>
      {/* HERO */}

      <section
        className="event-hero"
        style={{
          backgroundImage: `url(${event.image})`,
        }}
      >
        <div className="event-hero-overlay">

          <div className="wrap">

            <span className="hero-chip">
              {event.icon} {event.subtitle}
            </span>

            <h1>{event.title}</h1>

            <p>{event.description}</p>

            <div className="hero-stats">

              <div>
                <strong>{event.since}</strong>
                <span>Since</span>
              </div>

              <div>
                <strong>{event.participants}</strong>
                <span>Participants</span>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ABOUT */}

      <section className="event-section">

        <div className="wrap">

          <h2>About {event.title}</h2>

          <p>
            This section will contain the complete details of the
            event. Here you will later add:
          </p>

          <ul>

            <li>Overview</li>

            <li>Objectives</li>

            <li>Event Schedule</li>

            <li>Gallery</li>

            <li>Previous Editions</li>

            <li>Winners</li>

            <li>Registration</li>

            <li>Faculty Coordinators</li>

          </ul>

        </div>

      </section>
    </>
  );
}