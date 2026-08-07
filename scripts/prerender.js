import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import serveHandler from "serve-handler";
import puppeteer from "puppeteer";

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, "../dist");

// Initialize Firebase Admin (optional fallback)
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
}

async function getRoutesToPrerender() {
  const staticRoutes = [
    "/",
    "/about",
    "/events",
    "/blog",
    "/team",
    "/gallery",
    "/contact",
    "/join",
  ];

  const dynamicRoutes = [];

  if (db) {
    try {
      // Published blogs
      const blogSnap = await db
        .collection("blogs")
        .where("status", "==", "Published")
        .get();
      blogSnap.forEach((doc) => {
        const blog = doc.data();
        if (blog.slug) dynamicRoutes.push(`/blog/${blog.slug}`);
      });

      // Published events
      const eventSnap = await db
        .collection("events")
        .where("status", "==", "Published")
        .get();
      eventSnap.forEach((doc) => {
        const ev = doc.data();
        if (ev.slug) dynamicRoutes.push(`/events/${ev.slug}`);
      });
    } catch (err) {
      console.warn("⚠️ Could not fetch Firestore routes for pre-rendering:", err.message);
    }
  }

  return [...staticRoutes, ...dynamicRoutes];
}

function findSystemBrowser() {
  const candidatePaths = [
    // Chrome paths
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
    // Edge paths
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];

  for (const p of candidatePaths) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }
  return undefined;
}

async function prerender() {
  console.log("⚡ Starting Static Pre-rendering for SEO...");

  if (!fs.existsSync(DIST_DIR)) {
    console.error("❌ dist directory does not exist. Run vite build first!");
    process.exit(1);
  }

  // 1. Start local server serving the dist directory on dynamic port
  const server = http.createServer((req, res) => {
    return serveHandler(req, res, {
      public: DIST_DIR,
      rewrites: [{ source: "**", destination: "/index.html" }],
    });
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const PORT = server.address().port;
  console.log(`📡 Local preview server running at http://localhost:${PORT}`);

  // 2. Launch Puppeteer
  let browser;
  const execPath = findSystemBrowser();
  if (execPath) {
    console.log(`🔍 Using browser: ${execPath}`);
  }

  try {
    browser = await puppeteer.launch({
      executablePath: execPath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  } catch (err) {
    console.error("❌ Failed to launch Puppeteer:", err.message);
    server.close();
    process.exit(1);
  }

  const routes = await getRoutesToPrerender();
  console.log(`📌 Found ${routes.length} routes to pre-render:`, routes);

  const page = await browser.newPage();

  for (const route of routes) {
    try {
      const targetUrl = `http://localhost:${PORT}${route}`;
      console.log(`🌐 Snapshotting: ${route}`);

      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      // Wait 1.2s for React components and Firestore initial data to hydrate into DOM
      await new Promise((r) => setTimeout(r, 1200));

      const html = await page.content();

      // Write to dist/<route>/index.html
      const routeDir = route === "/" ? DIST_DIR : path.join(DIST_DIR, route.slice(1));
      fs.mkdirSync(routeDir, { recursive: true });

      const filePath = route === "/" ? path.join(DIST_DIR, "index.html") : path.join(routeDir, "index.html");
      fs.writeFileSync(filePath, html, "utf8");

      console.log(`  └─ Saved ${filePath.replace(DIST_DIR, "")}`);
    } catch (err) {
      console.error(`  └─ ❌ Error snapshotting ${route}:`, err.message);
    }
  }

  await browser.close();
  server.close();
  console.log("✨ Pre-rendering complete! Every route now has pre-rendered static HTML for Googlebot.");
}

prerender()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Pre-rendering failed:", err);
    process.exit(1);
  });
