/* global process */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

import { initializeApp, cert, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIR = path.join(ROOT, "dist");
const BASE_URL = "https://www.abhyudayaclub.in";

// ─────────────────────────────────────────────────────────────
// Firebase Admin Initialization (Safe & Optional)
// ─────────────────────────────────────────────────────────────
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
  return [...new Map(routes.map((route) => [route.path, route])).values()];
}

// ─────────────────────────────────────────────────────────────
// Static Fallback Generator (Zero Dependencies, Vercel/CI Safe)
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

  // 5. Provide lightweight noscript fallback for non-JS crawlers inside <div id="root">
  // Preserves React bundle so the app mounts and hydrates without hydration mismatch
  if (meta.path !== "/") {
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
  const db = initializeFirebase();
  const routes = await getRoutesToPrerender(db);
  console.log(`📌 Pre-rendering ${routes.length} routes with static SEO templates...`);

  let count = 0;
  for (const item of routes) {
    const customizedHtml = injectMeta(baseHtml, item);
    const routeDir = item.path === "/" ? DIST_DIR : path.join(DIST_DIR, item.path.replace(/^\//, ""));
    fs.mkdirSync(routeDir, { recursive: true });

    const filePath = item.path === "/" ? baseHtmlPath : path.join(routeDir, "index.html");
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
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
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

  for (const p of candidatePaths) {
    if (p && fs.existsSync(p)) return p;
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

  const server = http.createServer((req, res) =>
    serveHandler(req, res, {
      public: DIST_DIR,
      rewrites: [{ source: "**", destination: "/index.html" }],
    })
  );

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
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(45000);
    page.setDefaultTimeout(45000);
    page.on("console", (message) => {
      if (message.type() === "error") console.warn(`[browser] ${message.text()}`);
    });

    const db = initializeFirebase();
    const routes = await getRoutesToPrerender(db);

    for (const route of routes) {
      const targetUrl = `http://127.0.0.1:${port}${route.path}`;
      try {
        await page.evaluateOnNewDocument(() => {
          window.__PRERENDER__ = true;
          window.__PRERENDER_READY__ = false;
        });

        const response = await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
        if (!response || response.status() >= 400) {
          throw new Error(`HTTP ${response?.status() || "no response"}`);
        }

        await page.waitForFunction(() => document.querySelector("#root > *") !== null, { timeout: 15000 });

        if (route.dataReady) {
          await page.waitForFunction(() => window.__PRERENDER_READY__ === true, { timeout: 20000 }).catch(() => { });
        }

        const result = await page.evaluate((selector) => ({
          html: document.documentElement.outerHTML,
          images: selector ? document.querySelectorAll(selector).length : document.querySelectorAll("#root img[src]").length,
          title: document.title,
        }), route.imageSelector);

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

  // In Vercel, CI, or by default: run the lightweight zero-dependency static HTML prerenderer
  const shouldRunStatic = (isVercel || isCI || skipDownload || !explicitBrowser);

  if (shouldRunStatic) {
    if (isVercel || isCI || skipDownload) {
      console.log("⚡ Vercel/CI environment or PUPPETEER_SKIP_DOWNLOAD detected.");
    }
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
