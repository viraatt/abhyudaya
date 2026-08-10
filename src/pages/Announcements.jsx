import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import PageHero from "../components/PageHero.jsx";
import BreadcrumbSchema from "../components/seo/schemas/BreadcrumbSchema.jsx";
import { getPublishedAnnouncements } from "../Firebase/announcementService.js";
import "./Announcements.css";

const SITE_URL = "https://www.abhyudayaclub.in";

const TYPE_LABELS = {
  general: "📢 General",
  event: "🎯 Event",
  important: "⚠️ Important",
  deadline: "📅 Deadline",
  achievement: "🏆 Achievement",
};

function formatDate(ts) {
  if (!ts) return "";
  if (ts?.seconds) {
    return new Date(ts.seconds * 1000).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  const d = new Date(ts);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    getPublishedAnnouncements()
      .then((data) => {
        if (mounted) setAnnouncements(data);
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
          content="Latest announcements from Abhyudaya Club — events, deadlines, achievements, and important updates."
        />
        <link rel="canonical" href={`${SITE_URL}/announcements`} />
        <meta name="robots" content="index,follow" />
      </Helmet>

      <BreadcrumbSchema items={breadcrumbItems} />

      <PageHero
        eyebrow="ABHYUDAYA CLUB"
        title="Announcements"
        lede="Latest updates, events, deadlines, and achievements from the club."
      />

      <main className="announcements-page">
        <div className="wrap">
          {loading ? (
            <div className="announcements-loading">
              <p>Loading announcements...</p>
            </div>
          ) : error ? (
            <div className="announcements-empty">
              <p>Failed to load announcements. Please try again later.</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="announcements-empty">
              <p>No announcements right now. Check back soon!</p>
            </div>
          ) : (
            <div className="announcements-list">
              {announcements.map((ann) => (
                <article className="announcement-card" key={ann.id}>
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

                  {ann.type === "event" && ann.linkedEventId && (
                    <Link
                      to={`/register/${ann.linkedEventId}`}
                      className="announcement-cta announcement-register-btn"
                    >
                      Start Registration →
                    </Link>
                  )}

                  {ann.ctaText && ann.ctaLink && (
                    <a
                      href={ann.ctaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="announcement-cta"
                    >
                      {ann.ctaText} →
                    </a>
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