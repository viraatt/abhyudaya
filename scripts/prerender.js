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
  try {
    if (credentialJson) initializeApp({ credential: cert(JSON.parse(credentialJson)) });
    else if (fs.existsSync(credentialPath)) initializeApp({ credential: cert(JSON.parse(fs.readFileSync(credentialPath, "utf8"))) });
    else if (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT) initializeApp({ credential: applicationDefault() });
    else return null;
    return getFirestore();
  } catch (err) {
    console.warn("[prerender] Warning: Could not initialize Firebase Admin credentials:", err.message);
    return null;
  }
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

  if (!db) {
    console.warn("[prerender] Warning: Firebase build credentials are not available. Prerendering static/public routes.");
    try {
      const staticSource = fs.readFileSync(path.join(ROOT, "src/data/staticGalleryAlbums.js"), "utf8");
      const staticSlugs = [...staticSource.matchAll(/^\s*slug:\s*["']([^"']+)["'],?\s*$/gm)].map((match) => match[1]);
      unique(staticSlugs).forEach((slug) => routes.push({ path: `/gallery/${encodeURIComponent(slug)}`, dataReady: true, canonical: `/gallery/${encodeURIComponent(slug)}`, imageSelector: ".gallery-clean-media" }));
    } catch {
      // ignore
    }
    return [...new Map(routes.map((route) => [route.path, route])).values()];
  }

  try {
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
  } catch (err) {
    console.warn("[prerender] Warning: Could not fetch dynamic routes from Firebase:", err.message);
  }
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
    browser = await puppeteer.launch({
      ...(executablePath ? { executablePath } : {}),
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  } catch (launchErr) {
    console.warn("[prerender] Warning: Could not launch headless browser for prerendering, continuing build:", launchErr.message);
    await new Promise((resolve) => server.close(resolve));
    return;
  }
  try {
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
        console.warn(`[prerender] Warning: Prerender skipped for ${route.path}: ${error.message}`);
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
