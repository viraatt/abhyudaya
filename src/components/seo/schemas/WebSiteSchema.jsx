/**
 * WebSiteSchema.jsx
 * JSON-LD WebSite schema with SearchAction (Sitelinks Search Box).
 * Render once — on the Home page.
 */

import { Helmet } from "react-helmet-async";

const SITE_URL = "https://www.abhyudayaclub.in";

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "Abhyudaya Club",
  url: SITE_URL,
  description:
    "Official website of Abhyudaya Club — the Science & Literary Club of Maharana Pratap Engineering College (MPEC) Kanpur.",
  inLanguage: "en-IN",
  publisher: {
    "@id": `${SITE_URL}/#organization`,
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/blog?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function WebSiteSchema() {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
    </Helmet>
  );
}
