/**
 * EventSchema.jsx
 * JSON-LD Event schema for individual event detail pages.
 *
 * Usage:
 *   <EventSchema event={event} canonicalUrl={url} />
 */

import { Helmet } from "react-helmet-async";

const SITE_URL = "https://www.abhyudayaclub.in";

export default function EventSchema({ event, canonicalUrl }) {
  if (!event) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description || event.tagline || event.subtitle || "",
    url: canonicalUrl,
    image: event.image || event.banner || `${SITE_URL}/og-image.png`,
    organizer: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Abhyudaya Club",
      url: SITE_URL,
    },
    location: {
      "@type": "Place",
      name: event.venue || "Maharana Pratap Engineering College",
      address: {
        "@type": "PostalAddress",
        streetAddress: event.location || "Maharana Pratap Engineering College",
        addressLocality: "Kanpur",
        addressRegion: "Uttar Pradesh",
        addressCountry: "IN",
      },
    },
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    ...(event.createdAt?.toDate
      ? {
          startDate: event.createdAt.toDate().toISOString().split("T")[0],
        }
      : {}),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
