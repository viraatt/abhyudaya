/**
 * CollectionPageSchema.jsx
 * JSON-LD CollectionPage schema for the /blog listing page.
 *
 * Usage:
 *   <CollectionPageSchema blogs={blogs} />
 */

import { Helmet } from "react-helmet-async";

const SITE_URL = "https://www.abhyudayaclub.in";

export default function CollectionPageSchema({ blogs = [] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/blog`,
    name: "Abhyudaya Club Blog — Stories, Insights & Event Reports",
    description:
      "Discover inspiring articles, technical insights, workshop recaps, competition highlights, and exciting moments from the Abhyudaya Club community at MPEC Kanpur.",
    url: `${SITE_URL}/blog`,
    inLanguage: "en-IN",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
    },
    about: {
      "@id": `${SITE_URL}/#organization`,
    },
    ...(blogs.length > 0 && {
      hasPart: blogs.slice(0, 10).map((blog) => ({
        "@type": "BlogPosting",
        headline: blog.title,
        url: `${SITE_URL}/blog/${blog.slug || blog.id}`,
        ...(blog.featuredImage && { image: blog.featuredImage }),
        ...(blog.dateISO && { datePublished: blog.dateISO }),
        author: {
          "@type": "Person",
          name: blog.author || "Abhyudaya Club",
        },
      })),
    }),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
