import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getEventBySlug } from "../Firebase/eventService.js";
import EventReviews from "../components/reviews/EventReviews.jsx";
import "./EventDetails.css";

export default function EventDetails() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchEventDetails() {
      try {
        setLoading(true);
        setError(null);
        const data = await getEventBySlug(slug);
        setEvent(data);
      } catch (err) {
        console.error("Error loading event details:", err);
        setError("Failed to load event details.");
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchEventDetails();
    }
  }, [slug]);

  if (loading) {
    return (
      <section className="event-not-found">
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <h2>Loading Event Details...</h2>
        </div>
      </section>
    );
  }

  if (error || !event) {
    return (
      <section className="event-not-found">
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <h1 style={{ fontSize: "2.4rem", color: "#0f172a", marginBottom: "12px" }}>Event Not Found</h1>
          <p style={{ color: "#64748b", marginBottom: "24px" }}>
            The event you are looking for does not exist or has been removed.
          </p>
          <Link
            to="/events"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              background: "#2563eb",
              color: "#fff",
              borderRadius: "999px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            ← Back to Events
          </Link>
        </div>
      </section>
    );
  }

  const heroImage = event.image || event.banner || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1400";

  return (
    <>
      <Helmet>
        <title>{`${event.title} | Abhyudaya Club — MPEC Kanpur`}</title>
        <meta name="description" content={event.shortDescription || event.description || `${event.title} organized by Abhyudaya Club at MPEC Kanpur.`} />
        <link rel="canonical" href={`https://abhyudayaclub.in/events/${event.slug || slug}`} />
        <meta property="og:title" content={`${event.title} | Abhyudaya Club`} />
        <meta property="og:description" content={event.tagline || event.shortDescription || event.description} />
        <meta property="og:image" content={heroImage} />
        <meta property="og:url" content={`https://abhyudayaclub.in/events/${event.slug || slug}`} />
      </Helmet>

      {/* 1. HERO BANNER */}
      <section
        className="event-hero"
        style={{
          backgroundImage: `url(${heroImage})`,
        }}
      >
        <div className="event-hero-overlay">
          <div className="wrap">
            <span className="hero-chip">
              {event.icon || "📅"} {event.badgeText || event.subtitle || event.category || "Special Event"}
            </span>

            <h1>{event.title}</h1>

            {event.tagline && (
              <p style={{ fontSize: "1.25rem", color: "#60a5fa", fontWeight: 700, marginBottom: "12px" }}>
                {event.tagline}
              </p>
            )}

            <p>{event.shortDescription || event.description}</p>

            {/* HERO STATS */}
            <div className="hero-stats">
              {event.since && (
                <div>
                  <strong>{event.since}</strong>
                  <span>Since</span>
                </div>
              )}

              {event.participants && (
                <div>
                  <strong>{event.participants}</strong>
                  <span>{event.participantsLabel || "Participants"}</span>
                </div>
              )}

              {event.events && (
                <div>
                  <strong>{event.events}</strong>
                  <span>{event.eventsLabel || "Activities"}</span>
                </div>
              )}

              {event.editions && (
                <div>
                  <strong>{event.editions}</strong>
                  <span>{event.editionsLabel || "Editions"}</span>
                </div>
              )}

              {event.competitions && (
                <div>
                  <strong>{event.competitions}</strong>
                  <span>{event.competitionsLabel || "Competitions"}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. ABOUT & HIGHLIGHTS */}
      <section className="event-section">
        <div className="wrap">
          <h2>About {event.title}</h2>

          <p style={{ fontSize: "1.08rem", lineHeight: "1.9", color: "#475569" }}>
            {event.longDescription || event.description}
          </p>

          {event.highlights && event.highlights.length > 0 && (
            <>
              <h3 style={{ fontSize: "1.4rem", color: "#0f172a", marginTop: "32px", marginBottom: "16px", fontWeight: 700 }}>
                Key Highlights &amp; Activities
              </h3>
              <ul>
                {event.highlights.map((item, idx) => (
                  <li key={idx}>✨ {item}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* 3. OBJECTIVES (if available) */}
      {event.objectives && event.objectives.length > 0 && (
        <section className="event-section alt-bg">
          <div className="wrap">
            <h2>Event Objectives</h2>
            <div className="event-objectives-grid">
              {event.objectives.map((obj, idx) => (
                <div key={idx} className="event-objective-card">
                  <div className="event-objective-icon">🎯</div>
                  <p>{obj}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. DEDICATED STATISTICS SECTION */}
      {(event.participants || event.events || event.editions || event.competitions || event.years) && (
        <section className="event-section">
          <div className="wrap">
            <h2>Key Impact &amp; Metrics</h2>
            <div className="hero-stats" style={{ marginTop: "20px" }}>
              {event.participants && (
                <div style={{ background: "white", borderColor: "#e2e8f0" }}>
                  <strong style={{ color: "#2563eb" }}>{event.participants}</strong>
                  <span style={{ color: "#64748b" }}>{event.participantsLabel || "Participants"}</span>
                </div>
              )}
              {event.events && (
                <div style={{ background: "white", borderColor: "#e2e8f0" }}>
                  <strong style={{ color: "#2563eb" }}>{event.events}</strong>
                  <span style={{ color: "#64748b" }}>{event.eventsLabel || "Activities"}</span>
                </div>
              )}
              {event.editions && (
                <div style={{ background: "white", borderColor: "#e2e8f0" }}>
                  <strong style={{ color: "#2563eb" }}>{event.editions}</strong>
                  <span style={{ color: "#64748b" }}>{event.editionsLabel || "Editions"}</span>
                </div>
              )}
              {event.competitions && (
                <div style={{ background: "white", borderColor: "#e2e8f0" }}>
                  <strong style={{ color: "#2563eb" }}>{event.competitions}</strong>
                  <span style={{ color: "#64748b" }}>{event.competitionsLabel || "Competitions"}</span>
                </div>
              )}
              {event.years && (
                <div style={{ background: "white", borderColor: "#e2e8f0" }}>
                  <strong style={{ color: "#2563eb" }}>{event.years}</strong>
                  <span style={{ color: "#64748b" }}>{event.yearsLabel || "Years Active"}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 5. SCHEDULE (if available) */}
      {event.schedule && event.schedule.length > 0 && (
        <section className="event-section alt-bg">
          <div className="wrap">
            <h2>Event Schedule</h2>
            <div className="event-schedule-list">
              {event.schedule.map((item, idx) => (
                <div key={idx} className="event-schedule-item">
                  <span className="event-schedule-time">{item.time || `Session ${idx + 1}`}</span>
                  <div className="event-schedule-info">
                    <h4>{item.title || item.name || "Schedule Item"}</h4>
                    {item.description && <p>{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. SPEAKERS (if available) */}
      {event.speakers && event.speakers.length > 0 && (
        <section className="event-section">
          <div className="wrap">
            <h2>Featured Speakers &amp; Mentors</h2>
            <div className="event-speakers-grid">
              {event.speakers.map((speaker, idx) => (
                <div key={idx} className="event-speaker-card">
                  {speaker.image ? (
                    <img src={speaker.image} alt={speaker.name} className="event-speaker-img" />
                  ) : (
                    <div className="event-speaker-img-placeholder">👤</div>
                  )}

                  <h4>{speaker.name}</h4>

                  {(speaker.designation || speaker.role) && (
                    <p className="event-speaker-designation">
                      {speaker.designation || speaker.role}
                    </p>
                  )}

                  {(speaker.company || speaker.organization) && (
                    <small className="event-speaker-company">
                      🏢 {speaker.company || speaker.organization}
                    </small>
                  )}

                  {speaker.bio && (
                    <p className="event-speaker-bio">
                      {speaker.bio}
                    </p>
                  )}

                  {speaker.linkedin && (
                    <a
                      href={speaker.linkedin.startsWith("http") ? speaker.linkedin : `https://${speaker.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="event-speaker-linkedin-btn"
                    >
                      LinkedIn Profile →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7. GALLERY (if available) */}
      {event.gallery && event.gallery.length > 0 && (
        <section className="event-section alt-bg">
          <div className="wrap">
            <h2>Glimpses &amp; Highlights</h2>
            <div className="event-gallery-grid">
              {event.gallery.map((imgUrl, idx) => (
                <div key={idx} className="event-gallery-item">
                  <img src={imgUrl} alt={`${event.title} glimpse ${idx + 1}`} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 8. REGISTRATION SECTION */}
      <section className="event-section">
        <div className="wrap">
          <div className="event-registration-card">
            <div className="event-registration-info">
              <h3>Join {event.title}</h3>
              <p>Ready to participate? Register now or contact our coordinators for further details.</p>
              <div className="event-reg-meta">
                {event.registrationDeadline && (
                  <div className="event-reg-meta-item">
                    <span>⏰ Deadline:</span>
                    <strong>{event.registrationDeadline}</strong>
                  </div>
                )}
                {event.venue && (
                  <div className="event-reg-meta-item">
                    <span>📍 Venue:</span>
                    <strong>{event.venue}</strong>
                  </div>
                )}
                {event.location && (
                  <div className="event-reg-meta-item">
                    <span>🏢 Location:</span>
                    <strong>{event.location}</strong>
                  </div>
                )}
              </div>
            </div>
            <div>
              <Link to={event.ctaLink || "/contact"} className="event-reg-btn">
                {event.ctaText || "Register Now →"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 9. DOWNLOADS (if available) */}
      {event.downloads && event.downloads.length > 0 && (
        <section className="event-section alt-bg">
          <div className="wrap">
            <h2>Downloads &amp; Resources</h2>
            <div className="event-downloads-list">
              {event.downloads.map((item, idx) => (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="event-download-item"
                >
                  <span>📄 {item.title || `Resource ${idx + 1}`}</span>
                  <span>Download ↓</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 10. FAQS (if available) */}
      {event.faqs && event.faqs.length > 0 && (
        <section className="event-section">
          <div className="wrap">
            <h2>Frequently Asked Questions</h2>
            <div className="event-faqs-list">
              {event.faqs.map((faq, idx) => (
                <div key={idx} className="event-faq-item">
                  <h4>❓ {faq.question}</h4>
                  <p>{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 11. REVIEWS & FEEDBACK */}
      <EventReviews event={event} />

      {/* 12. CTA BANNER */}
      <section className="event-cta-banner">
        <div className="wrap">
          <h2>Experience {event.title} Live</h2>
          <p>
            Don't miss out on Abhyudaya Club's premier experiences, competitions, and technical learning opportunities.
          </p>
          <Link to={event.ctaLink || "/join"} className="event-cta-btn">
            {event.ctaText || "Explore &amp; Participate →"}
          </Link>
        </div>
      </section>
    </>
  );
}