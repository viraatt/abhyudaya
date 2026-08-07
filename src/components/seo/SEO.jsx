/**
 * SEO.jsx — Reusable per-page SEO component using react-helmet-async.
 *
 * Usage:
 *   <SEO
 *     title="Blog Title | Abhyudaya Club"
 *     description="..."
 *     canonical="https://www.abhyudayaclub.in/blog/my-post"
 *     ogImage="https://..."
 *     ogType="article"
 *     noindex={false}
 *   />
 */

import { Helmet } from "react-helmet-async";

const SITE_URL = "https://www.abhyudayaclub.in";
const SITE_NAME = "Abhyudaya Club";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
const DEFAULT_DESCRIPTION =
  "Abhyudaya Club — the official Science & Literary Club of Maharana Pratap Engineering College (MPEC) Kanpur. Explore events, workshops, blogs and student initiatives.";

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  noindex = false,
  keywords = "",
  author = "Abhyudaya Club",
  // Article-specific
  publishedTime,
  modifiedTime,
  articleSection,
  // Pass additional <Helmet> children via this prop
  children,
}) {
  const pageTitle = title || `${SITE_NAME} | Science & Literary Club of MPEC Kanpur`;
  const robotsContent = noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";

  return (
    <Helmet>
      {/* Core */}
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="author" content={author} />
      <meta name="robots" content={robotsContent} />
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical || SITE_URL} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_IN" />

      {/* Article-specific OG */}
      {publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {articleSection && (
        <meta property="article:section" content={articleSection} />
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Geo */}
      <meta name="geo.region" content="IN-UP" />
      <meta name="geo.placename" content="Kanpur, Uttar Pradesh, India" />

      {/* Render any extra head elements passed as children */}
      {children}
    </Helmet>
  );
}
