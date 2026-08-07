/**
 * BreadcrumbSchema.jsx
 * Reusable JSON-LD BreadcrumbList schema builder.
 *
 * Usage:
 *   <BreadcrumbSchema
 *     items={[
 *       { name: "Home", url: "https://www.abhyudayaclub.in/" },
 *       { name: "Blog", url: "https://www.abhyudayaclub.in/blog" },
 *       { name: "My Post Title", url: "https://www.abhyudayaclub.in/blog/my-post" },
 *     ]}
 *   />
 */

import { Helmet } from "react-helmet-async";

export default function BreadcrumbSchema({ items = [] }) {
  if (!items.length) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
