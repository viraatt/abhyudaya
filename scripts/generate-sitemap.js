import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import serviceAccount from "../firebase-service-account.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

const BASE_URL = "https://abhyudayaclub.in";

async function generateSitemap() {
  console.log("🚀 Generating sitemap...");

  const staticPages = [
    "/",
    "/about",
    "/events",
    "/team",
    "/gallery",
    "/blog",
    "/contact",
    "/join",
  ];

  let urls = "";

  // Static pages
  for (const page of staticPages) {
    urls += `
  <url>
    <loc>${BASE_URL}${page}</loc>
    <changefreq>weekly</changefreq>
    <priority>${page === "/" ? "1.0" : "0.8"}</priority>
  </url>`;
  }

  // Published blogs
  const snapshot = await db
    .collection("blogs")
    .where("status", "==", "Published")
    .get();

  snapshot.forEach((doc) => {
    const blog = doc.data();

    if (!blog.slug) return;

    urls += `
  <url>
    <loc>${BASE_URL}/blog/${blog.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  const outputPath = path.join(__dirname, "../public/sitemap.xml");

  fs.writeFileSync(outputPath, sitemap, "utf8");

  console.log("✅ Sitemap created successfully!");
  console.log(outputPath);
}

generateSitemap()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Failed to generate sitemap");
    console.error(err);
    process.exit(1);
  });