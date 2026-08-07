import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, "../firebase-service-account.json");

let db = null;

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }
  db = getFirestore();
} else {
  console.warn("⚠️ firebase-service-account.json not found. Dynamic Firebase content will be skipped during build sitemap generation.");
}

const BASE_URL = "https://www.abhyudayaclub.in";

async function generateSitemapsAndFeeds() {
  console.log("🚀 Generating Sitemaps, Feeds, Image & News Sitemaps...");

  const staticPages = [
    { url: "/", priority: "1.0", changefreq: "daily" },
    { url: "/about", priority: "0.8", changefreq: "monthly" },
    { url: "/events", priority: "0.9", changefreq: "weekly" },
    { url: "/blog", priority: "0.9", changefreq: "daily" },
    { url: "/team", priority: "0.7", changefreq: "monthly" },
    { url: "/gallery", priority: "0.8", changefreq: "weekly" },
    { url: "/contact", priority: "0.7", changefreq: "monthly" },
    { url: "/join", priority: "0.8", changefreq: "monthly" },
  ];

  let mainSitemapUrls = "";
  let imageSitemapUrls = "";
  let newsSitemapUrls = "";
  let rssItems = "";

  const nowISO = new Date().toISOString();

  // Static Pages
  for (const page of staticPages) {
    mainSitemapUrls += `
  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${nowISO}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  }

  let publishedBlogs = [];
  let publishedEvents = [];

  if (db) {
    try {
      // 1. Fetch Published Blogs
      const blogSnapshot = await db
        .collection("blogs")
        .where("status", "==", "Published")
        .get();

      blogSnapshot.forEach((doc) => {
        const blog = doc.data();
        if (!blog.slug) return;
        publishedBlogs.push({ id: doc.id, ...blog });
      });

      // 2. Fetch Published Events
      const eventSnapshot = await db
        .collection("events")
        .where("status", "==", "Published")
        .get();

      eventSnapshot.forEach((doc) => {
        const ev = doc.data();
        if (!ev.slug) return;
        publishedEvents.push({ id: doc.id, ...ev });
      });
    } catch (err) {
      console.warn("Error fetching Firestore collections:", err.message);
    }
  }

  // Build Blog Sitemaps & Feeds
  for (const blog of publishedBlogs) {
    const blogUrl = `${BASE_URL}/blog/${blog.slug}`;
    const lastMod = blog.updatedAt?.toDate
      ? blog.updatedAt.toDate().toISOString()
      : blog.createdAt?.toDate
      ? blog.createdAt.toDate().toISOString()
      : nowISO;

    mainSitemapUrls += `
  <url>
    <loc>${blogUrl}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;

    // Image Sitemap entry
    if (blog.featuredImage) {
      imageSitemapUrls += `
  <url>
    <loc>${blogUrl}</loc>
    <image:image>
      <image:loc>${blog.featuredImage}</image:loc>
      <image:title>${escapeXml(blog.title)}</image:title>
    </image:image>
  </url>`;
    }

    // News Sitemap (last 48 hours)
    const createdDate = blog.createdAt?.toDate ? blog.createdAt.toDate() : new Date();
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    if (createdDate >= twoDaysAgo) {
      newsSitemapUrls += `
  <url>
    <loc>${blogUrl}</loc>
    <news:news>
      <news:publication>
        <news:name>Abhyudaya Club Blog</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${createdDate.toISOString()}</news:publication_date>
      <news:title>${escapeXml(blog.title)}</news:title>
    </news:news>
  </url>`;
    }

    // RSS Feed item
    const pubDate = createdDate.toUTCString();
    const excerpt = escapeXml(blog.excerpt || blog.seo || blog.title);
    rssItems += `
    <item>
      <title>${escapeXml(blog.title)}</title>
      <link>${blogUrl}</link>
      <guid isPermaLink="true">${blogUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${excerpt}</description>
      <category>${escapeXml(blog.category || "Blog")}</category>
      ${blog.featuredImage ? `<media:content url="${blog.featuredImage}" medium="image" />` : ""}
    </item>`;
  }

  // Build Event Sitemaps
  for (const ev of publishedEvents) {
    const eventUrl = `${BASE_URL}/events/${ev.slug}`;
    const lastMod = ev.updatedAt?.toDate
      ? ev.updatedAt.toDate().toISOString()
      : ev.createdAt?.toDate
      ? ev.createdAt.toDate().toISOString()
      : nowISO;

    mainSitemapUrls += `
  <url>
    <loc>${eventUrl}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;

    if (ev.image || ev.banner) {
      imageSitemapUrls += `
  <url>
    <loc>${eventUrl}</loc>
    <image:image>
      <image:loc>${ev.image || ev.banner}</image:loc>
      <image:title>${escapeXml(ev.title)}</image:title>
    </image:image>
  </url>`;
    }
  }

  // 1. Write Main Sitemap.xml
  const mainSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${mainSitemapUrls}
</urlset>`;
  fs.writeFileSync(path.join(__dirname, "../public/sitemap.xml"), mainSitemap, "utf8");

  // 2. Write Image Sitemap.xml
  const imageSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${imageSitemapUrls}
</urlset>`;
  fs.writeFileSync(path.join(__dirname, "../public/sitemap-images.xml"), imageSitemap, "utf8");

  // 3. Write News Sitemap.xml
  const newsSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${newsSitemapUrls}
</urlset>`;
  fs.writeFileSync(path.join(__dirname, "../public/sitemap-news.xml"), newsSitemap, "utf8");

  // 4. Write RSS Feed.xml
  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Abhyudaya Club Blog</title>
    <link>${BASE_URL}/blog</link>
    <description>Official Blog of Abhyudaya Club — Science &amp; Literary Club of MPEC Kanpur</description>
    <language>en-in</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${rssItems}
  </channel>
</rss>`;
  fs.writeFileSync(path.join(__dirname, "../public/feed.xml"), rssFeed, "utf8");

  console.log("✅ All sitemaps (main, image, news) and RSS feed generated successfully!");
}

function escapeXml(unsafe = "") {
  if (typeof unsafe !== "string") return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

generateSitemapsAndFeeds()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Failed to generate sitemaps and feeds");
    console.error(err);
    process.exit(1);
  });