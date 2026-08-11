import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import PageHero from "../components/PageHero.jsx";
import BreadcrumbSchema from "../components/seo/schemas/BreadcrumbSchema.jsx";
import { getPublishedAnnouncements } from "../Firebase/announcementService.js";
import { getEventById } from "../Firebase/eventService.js";
import { countRegistrations } from "../Firebase/registrationService.js";
import { getRegistrationStatus, formatDate } from "../utils/registrationStatus.js";
import "./Announcements.css";

const SITE_URL = "https://www.abhyudayaclub.in";

const TYPE_LABELS = {
  general: "📢 General",
  event: "🎯 Event",
  important: "⚠️ Important",
  deadline: "📅 Deadline",
  achievement: "🏆 Achievement",
};

/**
 * Safely resolves a CTA link.
 * - Internal links (starting with "/") use react-router <Link>.
 * - External links open in a new tab with rel="noopener noreferrer".
 */
function isInternalLink(href) {
  return typeof href === "string" && href.startsWith("/");
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [eventData, setEventData] = useState({}); // linkedEventId -> { event, count }

  const loadAnnouncements = useCallback(() => {
    setLoading(true);
    setError(false);

    getPublishedAnnouncements()
      .then(async (data) => {
        setAnnouncements(data);

        // Fetch linked event + registration count for event-type announcements
        const linkedEvents = data
          .filter((a) => a.type === "event" && a.linkedEventId)
          .map((a) => a.linkedEventId);
        const unique = [...new Set(linkedEvents)];

        const map = {};
        await Promise.all(
          unique.map(async (eventId) => {
            try {
              const [event, count] = await Promise.all([
                getEventById(eventId),
                countRegistrations(eventId),
              ]);
              if (event) map[eventId] = { event, count };
            } catch {
              // ignore
            }
          })
        );
        setEventData(map);
      })
      .catch((err) => {
        console.error("Failed to load announcements:", err);
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let mounted = true;

    getPublishedAnnouncements()
      .then(async (data) => {
        if (!mounted) return;
        setAnnouncements(data);

        // Fetch linked event + registration count for event-type announcements
        const linkedEvents = data
          .filter((a) => a.type === "event" && a.linkedEventId)
          .map((a) => a.linkedEventId);
        const unique = [...new Set(linkedEvents)];

        const map = {};
        await Promise.all(
          unique.map(async (eventId) => {
            try {
              const [event, count] = await Promise.all([
                getEventById(eventId),
                countRegistrations(eventId),
              ]);
              if (event) map[eventId] = { event, count };
            } catch {
              // ignore
            }
          })
        );
        if (mounted) setEventData(map);
      })
      .catch((err) => {
        console.error("Failed to load announcements:", err);
        if (mounted) setError(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const breadcrumbItems = [
    { name: "Home", url: SITE_URL },
    { name: "Announcements", url: `${SITE_URL}/announcements` },
  ];

  return (
    <>
      <Helmet>
        <title>Announcements | Abhyudaya Club</title>
        <meta
          name="description"
          content="Stay updated with the latest news, events, opportunities, and updates from Abhyudaya Club."
        />
        <link rel="canonical" href={`${SITE_URL}/announcements`} />
        <meta name="robots" content="index,follow" />
      </Helmet>

      <BreadcrumbSchema items={breadcrumbItems} />

      <PageHero
        eyebrow="ABHYUDAYA CLUB"
        title="Announcements"
        lede="Stay updated with the latest news, events, opportunities, and updates from Abhyudaya Club."
      />

      <main className="announcements-page">
        <div className="wrap">
          {loading ? (
            <div className="announcements-loading" role="status" aria-live="polite">
              <span className="announcements-loading-spinner" aria-hidden="true" />
              <p>Loading announcements...</p>
            </div>
          ) : error ? (
            <div className="announcements-empty" role="alert">
              <p>Failed to load announcements. Please try again later.</p>
              <button
                type="button"
                className="announcements-retry-btn"
                onClick={loadAnnouncements}
              >
                Try Again
              </button>
            </div>
          ) : announcements.length === 0 ? (
            <div className="announcements-empty">
              <p>No announcements available at the moment.</p>
            </div>
          ) : (
            <div className="announcements-list">
              {announcements.map((ann, index) => (
                <article
                  className={`announcement-card ${
                    index === 0 ? "announcement-card--latest" : ""
                  }`}
                  key={ann.id}
                >
                  {index === 0 && (
                    <span className="announcement-latest-badge">Latest</span>
                  )}

                  <div className="announcement-card-top">
                    <span className={`announcement-type announcement-type-${ann.type}`}>
                      {TYPE_LABELS[ann.type] || TYPE_LABELS.general}
                    </span>
                    <span className="announcement-date">
                      {formatDate(ann.createdAt)}
                    </span>
                  </div>

                  <h2 className="announcement-title">{ann.title}</h2>
                  <p className="announcement-message">{ann.message}</p>

                  {ann.type === "event" &&
                    ann.linkedEventId &&
                    eventData[ann.linkedEventId] && (
                      <div className="announcement-event-card">
                        <div className="announcement-event-name">
                          🎯 {eventData[ann.linkedEventId].event.title}
                        </div>

                        {(() => {
                          const { event, count } = eventData[ann.linkedEventId];
                          const status = getRegistrationStatus(event, count);
                          return (
                            <>
                              <div className="announcement-event-status" style={{ color: status.color }}>
                                {status.label}
                              </div>

                              <div className="announcement-event-count">
                                <strong>{count}</strong>
                                {event.maxRegistrations
                                  ? ` / ${event.maxRegistrations}`
                                  : ""}{" "}
                                registered
                              </div>

                              {event.maxRegistrations && (
                                <div className="announcement-progress-bar">
                                  <div
                                    className="announcement-progress-fill"
                                    style={{
                                      width: `${Math.min(
                                        (count / Number(event.maxRegistrations)) * 100,
                                        100
                                      )}%`,
                                    }}
                                  />
                                </div>
                              )}

                              {event.registrationDeadline && (
                                <div className="announcement-event-deadline">
                                  Closes: {formatDate(event.registrationDeadline)}
                                </div>
                              )}
                            </>
                          );
                        })()}

                        <div className="announcement-event-actions">
                          {eventData[ann.linkedEventId].event.slug && (
                            <Link
                              to={`/events/${eventData[ann.linkedEventId].event.slug}`}
                              className="announcement-cta announcement-event-details-btn"
                            >
                              View Event Details →
                            </Link>
                          )}
                          <Link
                            to={`/register/${ann.linkedEventId}`}
                            className="announcement-cta announcement-register-btn"
                          >
                            Start Registration →
                          </Link>
                          <button
                            type="button"
                            className="announcement-share-btn"
                            onClick={() => {
                              const text = `Register for ${eventData[ann.linkedEventId].event.title} at Abhyudaya Club!\n\n${window.location.origin}/register/${ann.linkedEventId}`;
                              if (navigator.share) {
                                navigator.share({
                                  title: `Register for ${eventData[ann.linkedEventId].event.title}`,
                                  text,
                                  url: `${window.location.origin}/register/${ann.linkedEventId}`,
                                }).catch(() => {});
                              } else {
                                navigator.clipboard.writeText(text);
                              }
                            }}
                          >
                            📤 Share
                          </button>
                        </div>
                      </div>
                    )}

                  {ann.ctaText && ann.ctaLink && (
                    isInternalLink(ann.ctaLink) ? (
                      <Link
                        to={ann.ctaLink}
                        className="announcement-cta"
                      >
                        {ann.ctaText} →
                      </Link>
                    ) : (
                      <a
                        href={ann.ctaLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="announcement-cta"
                      >
                        {ann.ctaText} →
                      </a>
                    )
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}