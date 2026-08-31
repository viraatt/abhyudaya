import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getEventBySlug, getEvents } from "../Firebase/eventService.js";
import { getEventStatus, formatDate } from "../utils/registrationStatus.js";
import { normalizeEvent } from "../utils/eventNormalizer.js";
import EventStatistics from "../components/EventStatistics.jsx";
import EventReviews from "../components/reviews/EventReviews.jsx";
import EventCard from "../components/EventCard.jsx";
import EventSchema from "../components/seo/schemas/EventSchema.jsx";
import BreadcrumbSchema from "../components/seo/schemas/BreadcrumbSchema.jsx";
import "./EventDetails.css";

const SITE_URL = "https://www.abhyudayaclub.in";

export default function EventDetails() {
  const { slug } = useParams();
  const [rawEvent, setRawEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* Normalize event data */
  const event = useMemo(() => normalizeEvent(rawEvent), [rawEvent]);

  /* Lightbox State for Gallery */
  const [lightboxImg, setLightboxImg] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  /* Related Events State */
  const [relatedEvents, setRelatedEvents] = useState([]);

  useEffect(() => {
    async function fetchEventDetails() {
      try {
        setLoading(true);
        setError(null);
        const data = await getEventBySlug(slug);
        setRawEvent(data);
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

  /* Fetch Related Events */
  useEffect(() => {
    async function fetchRelated() {
      if (!event) return;
      try {
        const allEvents = await getEvents({ pageSize: 6, allowFallback: true });
        if (Array.isArray(allEvents)) {
          const filtered = allEvents
            .filter(
              (item) =>
                item.slug !== (event.slug || slug) &&
                String(item.id) !== String(event.id || slug)
            )
            .slice(0, 3);
          setRelatedEvents(filtered);
        }
      } catch (err) {
        console.warn("Failed to fetch related events:", err);
      }
    }

    fetchRelated();
  }, [event, slug]);

  if (loading) {
    return (
      <section className="event-not-found">
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <h2>Loading Event Details...</h2>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="event-not-found">
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <h1 style={{ fontSize: "2.4rem", color: "#0f172a", marginBottom: "12px" }}>Unable to Load Event</h1>
          <p style={{ color: "#64748b", marginBottom: "24px" }}>Please check your connection and try again.</p>
          <Link to="/events" style={{ display: "inline-block", padding: "12px 28px", background: "#2563eb", color: "#fff", borderRadius: "999px", fontWeight: 600, textDecoration: "none" }}>
            ← Back to Events
          </Link>
        </div>
      </section>
    );
  }

  if (!event) {
    return (
      <>
        <Helmet>
          <title>Event Not Found | Abhyudaya Club</title>
          <meta name="robots" content="noindex,follow" />
        </Helmet>
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
      </>
    );
  }

  const { isUpcoming, isOngoing, isCompleted } = getEventStatus(event);

  const heroImage =
    event.banner ||
    event.image ||
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1400";

  const canonicalUrl = `${SITE_URL}/events/${event.slug || event.id}`;
  const metaDescription =
    event.shortDescription ||
    event.description ||
    `Explore ${event.title} organized by Abhyudaya Club at MPEC Kanpur.`;

  const breadcrumbItems = [
    { name: "Home", url: SITE_URL },
    { name: "Events", url: `${SITE_URL}/events` },
    { name: event.title, url: canonicalUrl },
  ];

  const openLightbox = (imgUrl, index) => {
    setLightboxImg(imgUrl);
    setLightboxIndex(index);
  };

  return (
    <div className="event-details-page">
      <Helmet>
        <title>{`${event.title} | Abhyudaya Club`}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${event.title} | Abhyudaya Club`} />
        <meta property="og:description" content={event.tagline || metaDescription} />
        <meta property="og:image" content={heroImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Abhyudaya Club" />
        <meta property="og:locale" content="en_IN" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${event.title} | Abhyudaya Club`} />
        <meta name="twitter:description" content={event.tagline || metaDescription} />
        <meta name="twitter:image" content={heroImage} />
      </Helmet>

      {/* JSON-LD Structured Data */}
      <EventSchema event={event} canonicalUrl={canonicalUrl} />
      <BreadcrumbSchema items={breadcrumbItems} />

      {/* 1. HERO BANNER */}
      <section
        className="event-hero"
        style={{
          backgroundImage: `url(${heroImage})`,
        }}
      >
        <div className="event-hero-overlay">
          <div className="wrap">
            {/* Top Navigation & Status Badges */}
            <div className="event-top-row">
              <Link to="/events" className="event-back-link">
                ← Back to Events
              </Link>
            </div>

            <div className="hero-badge-group">
              <span className="hero-chip">
                {event.icon || "📅"} {event.badgeText || event.subtitle || event.category || "Special Event"}
              </span>

              {isCompleted && (
                <span className="hero-status-badge status-completed">
                  ✓ Completed
                </span>
              )}
              {isOngoing && (
                <span className="hero-status-badge status-ongoing">
                  ● Live Now
                </span>
              )}
              {isUpcoming && (
                <span className="hero-status-badge status-upcoming">
                  ● Registration Open
                </span>
              )}

              {/* Pricing badge */}
              <span className={`hero-price-badge ${event.isPaid ? "paid" : "free"}`}>
                {event.isPaid
                  ? `₹${Number(event.feeAmount).toLocaleString("en-IN")} / Person`
                  : "Free Entry"}
              </span>
            </div>

            <h1>{event.title}</h1>

            {/* Short Editorial Description (15-20 words max) */}
            {event.shortDescription && (
              <p className="hero-short-description">
                {event.shortDescription}
              </p>
            )}

            {/* Date & Location Metadata */}
            {(event.eventStartDate || event.registrationDeadline || event.venue || event.location) && (
              <div className="hero-meta-row">
                {(event.eventStartDate || event.registrationDeadline) && (
                  <span className="hero-meta-tag">
                    📅 {formatDate(event.eventStartDate || event.registrationDeadline)}
                    {event.eventEndDate ? ` – ${formatDate(event.eventEndDate)}` : ""}
                  </span>
                )}
                {(event.venue || event.location) && (
                  <span className="hero-meta-tag">
                    📍 {[event.venue, event.location].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>
            )}

            {/* HERO STATS (Dynamic Component) */}
            <EventStatistics stats={event.statistics} layout="hero" />

            {/* COMPLETED EVENT HERO ACTION BUTTONS */}
            {isCompleted && (
              <div className="hero-archive-actions">
                {event.gallery && event.gallery.length > 0 && (
                  <a href="#gallery-section" className="hero-action-btn primary">
                    View Gallery ↓
                  </a>
                )}
                {event.highlights && event.highlights.length > 0 && (
                  <a href="#highlights-section" className="hero-action-btn secondary">
                    Explore Highlights ↓
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. ABOUT & HIGHLIGHTS */}
      <section className="event-section" id="highlights-section">
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
      {event.hasStats && (
        <section className="event-section">
          <div className="wrap">
            <h2>Key Impact &amp; Metrics</h2>
            <div style={{ marginTop: "20px" }}>
              <EventStatistics stats={event.statistics} layout="section" />
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
                    <h3>{item.title || item.name || "Schedule Item"}</h3>
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
                    <img
                      src={speaker.image}
                      alt={`${speaker.name} — ${speaker.designation || "Speaker"}`}
                      className="event-speaker-img"
                      loading="lazy"
                      decoding="async"
                      width="120"
                      height="120"
                    />
                  ) : (
                    <div className="event-speaker-img-placeholder" aria-hidden="true">👤</div>
                  )}

                  <h3>{speaker.name}</h3>

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
                      aria-label={`${speaker.name} LinkedIn profile`}
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
        <section className="event-section alt-bg" id="gallery-section">
          <div className="wrap">
            <h2>Glimpses &amp; Highlights</h2>
            <div className="event-gallery-grid">
              {event.gallery.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="event-gallery-item"
                  onClick={() => openLightbox(imgUrl, idx)}
                  title="Click to expand"
                >
                  <img
                    src={imgUrl}
                    alt={`${event.title} — glimpse ${idx + 1}`}
                    loading="lazy"
                    decoding="async"
                    width="400"
                    height="300"
                  />
                  <div className="event-gallery-hover-overlay">
                    <span>🔍 View Image</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 8. REGISTRATION / ARCHIVE SHOWCASE SECTION */}
      <section className="event-section">
        <div className="wrap">
          {isCompleted ? (
            /* COMPLETED EVENT ARCHIVE SHOWCASE CARD */
            <div className="event-archive-card">
              <div className="event-archive-info">
                <span className="event-archive-chip">✨ Event Concluded</span>
                <h2>{event.title} Showcase</h2>
                <p>
                  This event has successfully concluded. Thank you to all attendees, speakers, and coordinators who contributed to its success!
                </p>
              </div>
              <div className="event-archive-actions-box">
                {event.gallery && event.gallery.length > 0 && (
                  <a href="#gallery-section" className="event-archive-action-btn primary">
                    View Photo Gallery
                  </a>
                )}
                {event.highlights && event.highlights.length > 0 && (
                  <a href="#highlights-section" className="event-archive-action-btn outline">
                    Explore Highlights
                  </a>
                )}
              </div>
            </div>
          ) : (
            /* UPCOMING / ONGOING REGISTRATION CARD */
            <div className="event-registration-card">
              <div className="event-registration-info">
                <h2>Join {event.title}</h2>
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
                <Link
                  to={event.ctaLink || `/register/${event.slug || event.id}` || "/contact"}
                  className="event-reg-btn"
                >
                  {event.ctaText || "Register Now →"}
                </Link>
              </div>
            </div>
          )}
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
                  <h3>❓ {faq.question}</h3>
                  <p>{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 11. REVIEWS & FEEDBACK */}
      <EventReviews event={event} />

      {/* 12. RELATED EVENTS */}
      {relatedEvents && relatedEvents.length > 0 && (
        <section className="event-section alt-bg related-events-section">
          <div className="wrap">
            <div className="related-events-header">
              <h2>Explore More Events</h2>
              <p>Discover other flagship festivals, technical workshops, and club experiences.</p>
            </div>
            <div className="related-events-grid">
              {relatedEvents.map((relItem, idx) => (
                <EventCard key={relItem.id || relItem.slug || idx} event={relItem} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 13. CTA BANNER */}
      <section className="event-cta-banner">
        <div className="wrap">
          <h2>Experience {event.title} Live</h2>
          <p>
            Don't miss out on Abhyudaya Club's premier experiences, competitions, and technical learning opportunities.
          </p>
          <Link to={event.ctaLink || "/join"} className="event-cta-btn">
            {event.ctaText || "Explore & Participate →"}
          </Link>
        </div>
      </section>

      {/* GALLERY LIGHTBOX MODAL */}
      {lightboxImg && (
        <div className="event-lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <div className="event-lightbox-dialog" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="event-lightbox-close-btn"
              onClick={() => setLightboxImg(null)}
              aria-label="Close lightbox"
            >
              ✕
            </button>
            <img src={lightboxImg} alt={`${event.title} expanded view`} className="event-lightbox-img" />
            {event.gallery.length > 1 && (
              <div className="event-lightbox-controls">
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = (lightboxIndex - 1 + event.gallery.length) % event.gallery.length;
                    setLightboxIndex(nextIdx);
                    setLightboxImg(event.gallery[nextIdx]);
                  }}
                >
                  ‹ Prev
                </button>
                <span>{lightboxIndex + 1} / {event.gallery.length}</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = (lightboxIndex + 1) % event.gallery.length;
                    setLightboxIndex(nextIdx);
                    setLightboxImg(event.gallery[nextIdx]);
                  }}
                >
                  Next ›
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
