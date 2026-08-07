/**
 * BlogPostingSchema.jsx
 * Full BlogPosting JSON-LD for individual blog articles.
 *
 * Usage:
 *   <BlogPostingSchema blog={blog} canonicalUrl={canonicalUrl} />
 */

import { Helmet } from "react-helmet-async";

const SITE_URL = "https://www.abhyudayaclub.in";
const ORG_NAME = "Abhyudaya Club";

/**
 * Strips HTML tags from a string to produce plain text.
 */
function stripHtml(html = "") {
  if (typeof html !== "string") return "";
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Estimates word count from blog content (Tiptap JSON or HTML string).
 */
function estimateWordCount(content) {
  if (!content) return undefined;
  let text = "";
  if (typeof content === "object") {
    // Tiptap JSON — walk content tree
    function extractText(node) {
      if (!node) return "";
      if (node.text) return node.text + " ";
      if (Array.isArray(node.content)) {
        return node.content.map(extractText).join("");
      }
      return "";
    }
    text = extractText(content);
  } else if (typeof content === "string") {
    text = stripHtml(content);
  }
  return text.trim().split(/\s+/).filter(Boolean).length || undefined;
}

export default function BlogPostingSchema({ blog, canonicalUrl }) {
  if (!blog) return null;

  const wordCount = estimateWordCount(blog.content);
  const tags = Array.isArray(blog.tags) ? blog.tags : [];
  const keywords = [
    blog.category,
    blog.title,
    "Abhyudaya Club",
    "MPEC Kanpur",
    ...tags,
  ]
    .filter(Boolean)
    .join(", ");

  const description =
    blog.seo ||
    blog.excerpt ||
    stripHtml(typeof blog.content === "string" ? blog.content : "").slice(0, 160);

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": canonicalUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    headline: blog.title,
    name: blog.title,
    description: description,
    url: canonicalUrl,
    image: {
      "@type": "ImageObject",
      url: blog.featuredImage || `${SITE_URL}/og-image.png`,
      width: 1200,
      height: 630,
    },
    author: {
      "@type": "Person",
      name: blog.author || "Abhyudaya Club",
    },
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: ORG_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/favicon.png`,
        width: 512,
        height: 512,
      },
    },
    ...(blog.dateISO && { datePublished: blog.dateISO }),
    ...(blog.updatedDateISO
      ? { dateModified: blog.updatedDateISO }
      : blog.dateISO
      ? { dateModified: blog.dateISO }
      : {}),
    articleSection: blog.category || "Blog",
    keywords: keywords,
    ...(wordCount && { wordCount }),
    inLanguage: "en-IN",
    isPartOf: {
      "@type": "Blog",
      "@id": `${SITE_URL}/blog`,
      name: "Abhyudaya Club Blog",
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
