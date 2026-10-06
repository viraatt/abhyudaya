<<<<<<< ours
/* global process */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import serveHandler from "serve-handler";
import puppeteer from "puppeteer";
import { initializeApp, cert, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIR = path.join(ROOT, "dist");

function initializeFirebase() {
  if (getApps().length) return getFirestore();
  const credentialJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(ROOT, "firebase-service-account.json");
  if (credentialJson) initializeApp({ credential: cert(JSON.parse(credentialJson)) });
  else if (fs.existsSync(credentialPath)) initializeApp({ credential: cert(JSON.parse(fs.readFileSync(credentialPath, "utf8"))) });
  else if (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT) initializeApp({ credential: applicationDefault() });
  else throw new Error("Firebase build credentials are required. Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS.");
  return getFirestore();
}

async function getRoutesToPrerender(db) {
  const routes = [
    { path: "/", dataReady: true, canonical: "/" },
    { path: "/about", canonical: "/about" },
    { path: "/events", dataReady: true, canonical: "/events", imageSelector: ".event-showcase-image img" },
    { path: "/blog", dataReady: true, canonical: "/blog", imageSelector: ".blog-card-image img, .featured-image img" },
    { path: "/team", dataReady: true, canonical: "/team", imageSelector: ".faculty-card__image, .leadership-card__image, .core-team-card__img, .executive-card__image, .webdev-team-card__img" },
    { path: "/gallery", dataReady: true, canonical: "/gallery", imageSelector: ".collage-img" },
    { path: "/announcements", dataReady: true, canonical: "/announcements" },
    { path: "/contact", canonical: "/contact" },
    { path: "/join", canonical: "/join" },
  ];
  const [blogs, events, albums] = await Promise.all([
    db.collection("blogs").where("status", "==", "Published").get(),
    db.collection("events").where("status", "==", "Published").get(),
    db.collection("gallery").where("status", "==", "Published").get(),
  ]);
  blogs.forEach((doc) => {
    const item = doc.data();
    if (item.slug) routes.push({ path: `/blog/${encodeURIComponent(item.slug)}`, dataReady: true, canonical: `/blog/${encodeURIComponent(item.slug)}`, imageSelector: ".details-featured-image" });
  });
  events.forEach((doc) => {
    const item = doc.data();
    if (item.slug) {
      const slug = item.slug === "antariksh-spradha" ? "antariksh-spardha" : item.slug;
      routes.push({ path: `/events/${encodeURIComponent(slug)}`, dataReady: true, canonical: `/events/${encodeURIComponent(slug)}`, imageSelector: ".event-hero__image" });
=======
import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, "../dist");
const BASE_URL = "https://www.abhyudayaclub.in";

// ─────────────────────────────────────────────────────────────
// Firebase Admin Initialization (Safe & Optional)
// ─────────────────────────────────────────────────────────────
let db = null;

function initFirebase() {
  if (db) return db;

  const serviceAccountPath = path.join(__dirname, "../firebase-service-account.json");
  let serviceAccount = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch {
      if (fs.existsSync(process.env.FIREBASE_SERVICE_ACCOUNT)) {
        serviceAccount = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT, "utf8"));
      }
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch {
      // ignore
    }
  } else if (fs.existsSync(serviceAccountPath)) {
    try {
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    } catch {
      // ignore
    }
  }

  if (serviceAccount) {
    try {
      if (!getApps().length) {
        initializeApp({
          credential: cert(serviceAccount),
        });
      }
      db = getFirestore();
      console.log("🔥 Firebase Admin connected for dynamic route pre-rendering.");
    } catch (err) {
      console.warn("⚠️ Failed to initialize Firebase Admin:", err.message);
    }
  } else {
    console.log("ℹ️ No Firebase credentials found. Prerendering will cover all core static routes.");
  }

  return db;
}

// ─────────────────────────────────────────────────────────────
// Route Metadata Definitions for Static Fallback
// ─────────────────────────────────────────────────────────────
const STATIC_PAGE_META = {
  "/": {
    title: "Abhyudaya Club | MPEC Kanpur",
    description:
      "Abhyudaya Club — the Science & Literary Club of Maharana Pratap Engineering College (MPEC) Kanpur, under the Department of Basic Sciences & Humanities.",
  },
  "/about": {
    title: "About Us | Abhyudaya Club",
    description:
      "Learn about Abhyudaya Club, the official Science & Literary club of Maharana Pratap Engineering College (MPEC), Kanpur.",
  },
  "/events": {
    title: "Events & Workshops | Abhyudaya Club",
    description:
      "Explore exciting technical and cultural events, hackathons, and workshops organized by Abhyudaya Club at MPEC Kanpur.",
  },
  "/announcements": {
    title: "Announcements & Notices | Abhyudaya Club",
    description:
      "Stay up to date with the latest announcements, contest results, and important notices from Abhyudaya Club.",
  },
  "/blog": {
    title: "Blog & Editorial | Abhyudaya Club",
    description:
      "Read insightful articles, technical deep dives, scientific reviews, and literary pieces penned by members and students of Abhyudaya Club.",
  },
  "/team": {
    title: "Our Team & Leadership | Abhyudaya Club",
    description:
      "Meet the faculty advisors, student coordinators, and executive committee members leading Abhyudaya Club at MPEC Kanpur.",
  },
  "/gallery": {
    title: "Event Gallery | Abhyudaya Club",
    description:
      "Visual memories, photo albums, and event highlights from past workshops, summits, and festivals at Abhyudaya Club.",
  },
  "/contact": {
    title: "Contact Us | Abhyudaya Club",
    description:
      "Get in touch with the student leadership and faculty advisors of Abhyudaya Club for partnerships, event queries, or suggestions.",
  },
  "/join": {
    title: "Join the Club | Abhyudaya Club",
    description:
      "Apply to become an active member of Abhyudaya Club and grow your technical, literary, and leadership potential.",
  },
  "/verify": {
    title: "Verify Certificate | Abhyudaya Club",
    description:
      "Verify the authenticity of participation and merit certificates issued by Abhyudaya Club, MPEC Kanpur.",
  },
  "/time-capsule": {
    title: "Digital Time Capsule | Abhyudaya Club",
    description:
      "Leave your thoughts, wishes, and memories sealed in the Abhyudaya Club Digital Time Capsule to be unlocked in the future.",
  },
};

const GALLERY_ALBUMS = [
  { slug: "techbloom-2", title: "TechBloom 2.0 Flagship Fest Photo Album" },
  { slug: "antariksh-spardha", title: "Antariksh Spardha Astronomy Fest Photo Album" },
  { slug: "aeromodelling-workshop", title: "Aeromodelling & RC Flying Workshop Photo Album" },
  { slug: "web-dev-workshop", title: "Fullstack Web Development Boot Camp Photo Album" },
  { slug: "communicraft-summit", title: "CommuniCraft Leadership Summit Photo Album" },
  { slug: "poster-verse", title: "Poster Verse Art Exhibition Photo Album" },
];

function escapeHtml(unsafe = "") {
  if (typeof unsafe !== "string") return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function getRoutesWithMetadata() {
  const routes = [];

  // 1. Static Routes
  for (const [route, meta] of Object.entries(STATIC_PAGE_META)) {
    routes.push({
      route,
      title: meta.title,
      description: meta.description,
      canonical: `${BASE_URL}${route === "/" ? "" : route}`,
      image: `${BASE_URL}/og-image.jpg`,
      type: "website",
    });
  }

  // 2. Gallery Album Routes
  for (const alb of GALLERY_ALBUMS) {
    routes.push({
      route: `/gallery/${alb.slug}`,
      title: `${alb.title} | Abhyudaya Club`,
      description: `Explore photos and memories from ${alb.title} hosted by Abhyudaya Club at MPEC Kanpur.`,
      canonical: `${BASE_URL}/gallery/${alb.slug}`,
      image: `${BASE_URL}/og-image.jpg`,
      type: "website",
    });
  }

  // 3. Dynamic Firestore Routes
  const firestore = initFirebase();
  if (firestore) {
    try {
      // Blogs
      const blogSnap = await firestore
        .collection("blogs")
        .where("status", "==", "Published")
        .get();

      blogSnap.forEach((doc) => {
        const blog = doc.data();
        if (!blog.slug) return;
        routes.push({
          route: `/blog/${blog.slug}`,
          title: `${blog.title || "Blog Post"} | Abhyudaya Club Blog`,
          description:
            blog.excerpt ||
            blog.seo ||
            blog.title ||
            "Read this article on the Abhyudaya Club official blog.",
          canonical: `${BASE_URL}/blog/${blog.slug}`,
          image: blog.featuredImage || blog.image || `${BASE_URL}/og-image.jpg`,
          type: "article",
        });
      });

      // Events
      const eventSnap = await firestore
        .collection("events")
        .where("status", "==", "Published")
        .get();

      eventSnap.forEach((doc) => {
        const ev = doc.data();
        if (!ev.slug) return;
        routes.push({
          route: `/events/${ev.slug}`,
          title: `${ev.title || "Event"} | Abhyudaya Club Events`,
          description:
            ev.shortDescription ||
            ev.description ||
            ev.title ||
            "Event details and registration for Abhyudaya Club.",
          canonical: `${BASE_URL}/events/${ev.slug}`,
          image: ev.banner || ev.image || `${BASE_URL}/og-image.jpg`,
          type: "website",
        });
      });
    } catch (err) {
      console.warn("⚠️ Could not fetch Firestore routes for prerendering:", err.message);
>>>>>>> theirs
    }
  });
  albums.forEach((doc) => {
    const item = doc.data();
    if (item.slug) routes.push({ path: `/gallery/${encodeURIComponent(item.slug)}`, dataReady: true, canonical: `/gallery/${encodeURIComponent(item.slug)}`, imageSelector: ".gallery-clean-media" });
  });
  if (albums.empty) {
    const staticSource = fs.readFileSync(path.join(ROOT, "src/data/staticGalleryAlbums.js"), "utf8");
    const staticSlugs = [...staticSource.matchAll(/^\s*slug:\s*["']([^"']+)["'],?\s*$/gm)].map((match) => match[1]);
    unique(staticSlugs).forEach((slug) => routes.push({ path: `/gallery/${encodeURIComponent(slug)}`, dataReady: true, canonical: `/gallery/${encodeURIComponent(slug)}`, imageSelector: ".gallery-clean-media" }));
  }
<<<<<<< ours
  return [...new Map(routes.map((route) => [route.path, route])).values()];
}

function unique(values) { return [...new Set(values)]; }

function findSystemBrowser() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    path.join(process.env.LOCALAPPDATA || "", "Microsoft\\Edge\\Application\\msedge.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function prerender() {
  if (!fs.existsSync(path.join(DIST_DIR, "index.html"))) throw new Error("dist/index.html is missing. Vite must build before prerendering.");
  const db = initializeFirebase();
  const routes = await getRoutesToPrerender(db);
  const server = http.createServer((req, res) => serveHandler(req, res, {
    public: DIST_DIR,
    rewrites: [{ source: "**", destination: "/index.html" }],
  }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  let browser;
  try {
    const executablePath = findSystemBrowser();
=======

  return routes;
}

// ─────────────────────────────────────────────────────────────
// Static Fallback Generator (Lightweight, Fast, Zero Dependencies)
// ─────────────────────────────────────────────────────────────
function injectMeta(htmlTemplate, meta) {
  let html = htmlTemplate;

  // 1. <title>
  if (meta.title) {
    html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);
  }

  // 2. <meta name="description">
  if (meta.description) {
    html = html.replace(
      /<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(meta.description)}" />`
    );
  }

  // 3. <link rel="canonical">
  if (meta.canonical) {
    html = html.replace(
      /<link\s+rel=["']canonical["']\s+href=["'].*?["']\s*\/?>/i,
      `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`
    );
  }

  // 4. Open Graph tags
  if (meta.title) {
    html = html.replace(
      /<meta\s+property=["']og:title["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta property="og:title" content="${escapeHtml(meta.title)}" />`
    );
    html = html.replace(
      /<meta\s+name=["']twitter:title["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`
    );
  }

  if (meta.description) {
    html = html.replace(
      /<meta\s+property=["']og:description["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta property="og:description" content="${escapeHtml(meta.description)}" />`
    );
    html = html.replace(
      /<meta\s+name=["']twitter:description["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`
    );
  }

  if (meta.canonical) {
    html = html.replace(
      /<meta\s+property=["']og:url["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`
    );
  }

  if (meta.image) {
    html = html.replace(
      /<meta\s+property=["']og:image["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta property="og:image" content="${escapeHtml(meta.image)}" />`
    );
    html = html.replace(
      /<meta\s+name=["']twitter:image["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta name="twitter:image" content="${escapeHtml(meta.image)}" />`
    );
  }

  if (meta.type) {
    html = html.replace(
      /<meta\s+property=["']og:type["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta property="og:type" content="${escapeHtml(meta.type)}" />`
    );
  }

  // 5. Provide lightweight noscript fallback for crawlers inside <div id="root">
  if (meta.route !== "/") {
    const noscriptContent = `<noscript><div style="padding:2rem;font-family:sans-serif;max-width:800px;margin:0 auto;"><h1>${escapeHtml(meta.title)}</h1><p>${escapeHtml(meta.description)}</p></div></noscript>`;
    html = html.replace(
      /<div id=["']root["']>[\s\S]*?<\/div>/i,
      `<div id="root">${noscriptContent}</div>`
    );
  }

  return html;
}

async function prerenderStatic() {
  console.log("⚡ Executing Lightweight Static HTML Pre-rendering for SEO...");

  const baseHtmlPath = path.join(DIST_DIR, "index.html");
  if (!fs.existsSync(baseHtmlPath)) {
    console.warn("⚠️ dist/index.html not found. Run 'npm run build' before prerendering.");
    return;
  }

  const baseHtml = fs.readFileSync(baseHtmlPath, "utf8");
  const routes = await getRoutesWithMetadata();
  console.log(`📌 Pre-rendering ${routes.length} routes with static SEO templates...`);

  let count = 0;
  for (const item of routes) {
    const customizedHtml = injectMeta(baseHtml, item);

    const routeDir = item.route === "/" ? DIST_DIR : path.join(DIST_DIR, item.route.replace(/^\//, ""));
    fs.mkdirSync(routeDir, { recursive: true });

    const filePath = item.route === "/" ? baseHtmlPath : path.join(routeDir, "index.html");
    fs.writeFileSync(filePath, customizedHtml, "utf8");
    count++;
  }

  console.log(`✅ Static pre-rendering complete! Generated ${count} route files with optimized SEO meta tags.`);
}

// ─────────────────────────────────────────────────────────────
// Browser-based Snapshotting (Optional / Local Dev Only)
// ─────────────────────────────────────────────────────────────
function findSystemBrowser() {
  const candidatePaths = [
    // Windows paths
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    // macOS paths
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    // Linux paths
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];

  for (const p of candidatePaths) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }
  return undefined;
}

async function prerenderWithBrowser() {
  console.log("🌐 Attempting browser-based snapshot prerendering...");

  // Dynamically import dependencies so build never fails if they are missing
  const puppeteerModule = await import("puppeteer").catch(() => null);
  const serveHandlerModule = await import("serve-handler").catch(() => null);

  const puppeteer = puppeteerModule?.default || puppeteerModule;
  const serveHandler = serveHandlerModule?.default || serveHandlerModule;

  if (!puppeteer || !serveHandler) {
    throw new Error("Puppeteer or serve-handler is not installed.");
  }

  const server = http.createServer((req, res) => {
    return serveHandler(req, res, {
      public: DIST_DIR,
      rewrites: [{ source: "**", destination: "/index.html" }],
    });
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const PORT = server.address().port;

  let browser;
  try {
    const execPath = findSystemBrowser();
>>>>>>> theirs
    browser = await puppeteer.launch({
      ...(executablePath ? { executablePath } : {}),
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
<<<<<<< ours
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(45000);
    page.setDefaultTimeout(45000);
    page.on("console", (message) => {
      if (message.type() === "error") console.warn(`[browser] ${message.text()}`);
    });

    for (const route of routes) {
      const targetUrl = `http://127.0.0.1:${port}${route.path}`;
      try {
        await page.evaluateOnNewDocument(() => {
          window.__PRERENDER__ = true;
          window.__PRERENDER_READY__ = false;
        });
        const response = await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
        if (!response || response.status() >= 400) throw new Error(`HTTP ${response?.status() || "no response"}`);
        await page.waitForFunction(() => document.querySelector("#root > *") !== null, { timeout: 45000 });
        if (route.dataReady) {
          await page.waitForFunction(() => window.__PRERENDER_READY__ === true, { timeout: 60000 });
        }
        if (route.canonical) {
          await page.waitForFunction((path) => {
            const canonical = document.querySelector('link[rel="canonical"]')?.href;
            return canonical === `https://www.abhyudayaclub.in${path}`;
          }, { timeout: 15000 }, route.canonical);
        }
        if (route.imageSelector) {
          await page.waitForFunction((selector) => document.querySelectorAll(selector).length > 0, { timeout: 10000 }, route.imageSelector);
        }
        const result = await page.evaluate((selector) => ({
          html: document.documentElement.outerHTML,
          images: selector ? document.querySelectorAll(selector).length : document.querySelectorAll("#root img[src]").length,
          title: document.title,
        }), route.imageSelector);
        if (route.dataReady && route.imageSelector && result.images === 0) {
          throw new Error(`Page rendered no images for selector ${route.imageSelector}`);
        }
        const outputDir = route.path === "/" ? DIST_DIR : path.join(DIST_DIR, route.path.replace(/^\//, ""));
        fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(path.join(outputDir, "index.html"), result.html, "utf8");
        console.log(`Prerendered ${route.path}: ${result.images} relevant images; ${result.title}`);
      } catch (error) {
        throw new Error(`Prerender failed for ${route.path}: ${error.message}`);
      }
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

prerender().catch((error) => {
  console.error("Prerendering failed:", error);
  process.exitCode = 1;
});
=======
  } catch (err) {
    server.close();
    throw err;
  }

  try {
    const routesWithMeta = await getRoutesWithMetadata();
    const page = await browser.newPage();

    for (const item of routesWithMeta) {
      try {
        const targetUrl = `http://localhost:${PORT}${item.route}`;
        await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
        await new Promise((r) => setTimeout(r, 1000));

        const html = await page.content();
        const routeDir = item.route === "/" ? DIST_DIR : path.join(DIST_DIR, item.route.replace(/^\//, ""));
        fs.mkdirSync(routeDir, { recursive: true });

        const filePath = item.route === "/" ? path.join(DIST_DIR, "index.html") : path.join(routeDir, "index.html");
        fs.writeFileSync(filePath, html, "utf8");
      } catch (err) {
        console.warn(`  └─ Snapshot skipped for ${item.route}: ${err.message}`);
      }
    }
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  console.log("✨ Browser pre-rendering finished successfully.");
}

// ─────────────────────────────────────────────────────────────
// Main Execution
// ─────────────────────────────────────────────────────────────
async function main() {
  const isVercel = Boolean(process.env.VERCEL);
  const isCI = Boolean(process.env.CI);
  const skipDownload = process.env.PUPPETEER_SKIP_DOWNLOAD === "true";
  const explicitBrowser = process.argv.includes("--browser");

  // In Vercel, CI, or when PUPPETEER_SKIP_DOWNLOAD is set: always use the lightweight static fallback!
  const shouldSkipBrowser = (isVercel || isCI || skipDownload) && !explicitBrowser;

  if (shouldSkipBrowser) {
    console.log("⚡ Vercel/CI environment or PUPPETEER_SKIP_DOWNLOAD detected.");
    console.log("🚀 Using zero-dependency static HTML pre-renderer (bypassing headless browser).");
    await prerenderStatic();
    return;
  }

  try {
    await prerenderWithBrowser();
  } catch (err) {
    console.warn(`⚠️ Browser snapshotting unavailable (${err.message}).`);
    console.log("⚡ Gracefully falling back to static HTML pre-renderer...");
    await prerenderStatic();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Unexpected error during prerendering:", err);
    // Exit with 0 so prerendering never halts production deployment
    process.exit(0);
  });
>>>>>>> theirs
