/**
 * OrganizationSchema.jsx
 * JSON-LD Organization schema for Abhyudaya Club.
 * Render once on the Home page (and optionally in Layout).
 */

import { Helmet } from "react-helmet-async";

const SITE_URL = "https://www.abhyudayaclub.in";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Abhyudaya Club",
  alternateName: "Abhyudaya Club MPEC",
  description:
    "Abhyudaya Club is the official Science & Literary Club of Maharana Pratap Engineering College (MPEC) Kanpur, operating under the Department of Basic Sciences & Humanities.",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/favicon.png`,
    width: 512,
    height: 512,
  },
  image: `${SITE_URL}/og-image.png`,
  email: "abhyudayaclubmpec@gmail.com",
  foundingLocation: {
    "@type": "Place",
    name: "Maharana Pratap Engineering College, Kanpur",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Kanpur",
      addressRegion: "Uttar Pradesh",
      addressCountry: "IN",
    },
  },
  sameAs: [
    "https://www.instagram.com/abhyudaya_official/",
    "https://www.linkedin.com/company/abhyudayaclubmpec/",
  ],
  parentOrganization: {
    "@type": "EducationalOrganization",
    name: "Maharana Pratap Engineering College",
    alternateName: "MPEC Kanpur",
    url: "https://mpec.ac.in",
  },
};

export default function OrganizationSchema() {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
    </Helmet>
  );
}
