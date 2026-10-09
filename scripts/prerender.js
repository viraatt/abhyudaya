/* global process */

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

import {
  initializeApp,
  cert,
  applicationDefault,
  getApps,
} from "firebase-admin/app";

import { getFirestore } from "firebase-admin/firestore";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const DIST_DIR = path.join(ROOT, "dist");
const BASE_URL = "https://www.abhyudayaclub.in";

/* =========================================================
   Helpers
========================================================= */

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getBlogSocialImage(blog) {
  const value = blog.featuredImage || blog.image;
  return getPublicHttpsUrl(value) || `${BASE_URL}/abhyudaya-logo.png`;
}

function getPublicHttpsUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const imageUrl = new URL(value.trim());
    if (imageUrl.protocol === "https:" && imageUrl.hostname && !imageUrl.username && !imageUrl.password) {
      return imageUrl.href;
    }
  } catch {
    // Local, relative, blob, and malformed URLs are not safe crawler image URLs.
  }

  return null;
}

function getBlogDescription(blog) {
  const description = blog.seo || blog.excerpt;
  if (typeof description === "string" && description.trim()) {
    return description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
  }
  const text = articleText(blog.content);
  if (text) return text.slice(0, 300);
  return blog.title || "Read the latest article from Abhyudaya Club.";
}

/* =========================================================
   Firebase Admin Initialization
   Firebase is OPTIONAL during production builds.
========================================================= */

function initializeFirebase() {
  if (getApps().length) {
    return getFirestore();
  }

  const credentialJson = process.env.FIREBASE_SERVICE_ACCOUNT;

  const credentialPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(ROOT, "firebase-service-account.json");

  try {
    if (credentialJson) {
      console.log(
        "[prerender] Using FIREBASE_SERVICE_ACCOUNT."
      );

      initializeApp({
        credential: cert(JSON.parse(credentialJson)),
      });

      return getFirestore();
    }

    if (fs.existsSync(credentialPath)) {
      console.log(
        "[prerender] Using Firebase service-account file."
      );

      initializeApp({
        credential: cert(
          JSON.parse(
            fs.readFileSync(credentialPath, "utf8")
          )
        ),
      });

      return getFirestore();
    }

    if (
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT
    ) {
      console.log(
        "[prerender] Using Google Application Default Credentials."
      );

      initializeApp({
        credential: applicationDefault(),
      });

      return getFirestore();
    }

    console.warn(
      "[prerender] Firebase Admin credentials are not available."
    );

    console.warn(
      "[prerender] Continuing with static routes only."
    );

    return null;
  } catch (error) {
    console.warn(
      "[prerender] Firebase initialization failed."
    );

    console.warn(
      `[prerender] ${error.message}`
    );

    console.warn(
      "[prerender] Continuing with static routes only."
    );

    return null;
  }
}

/* =========================================================
   Static Gallery Fallback
========================================================= */

function getStaticGallerySlugs() {
  const staticGalleryPath = path.join(
    ROOT,
    "src/data/staticGalleryAlbums.js"
  );

  if (!fs.existsSync(staticGalleryPath)) {
    return [];
  }

  try {
    const source = fs.readFileSync(
      staticGalleryPath,
      "utf8"
    );

    return unique(
      [
        ...source.matchAll(
          /slug:\s*["']([^"']+)["']/g
        ),
      ].map((match) => match[1])
    );
  } catch (error) {
    console.warn(
      "[prerender] Could not read static gallery data:",
      error.message
    );

    return [];
  }
}

/* =========================================================
   Route Generation
========================================================= */

async function getRoutesToPrerender(db) {
  const routes = [
    {
      path: "/",
      dataReady: true,
      canonical: "/",
    },

    {
      path: "/about",
      canonical: "/about",
    },

    {
      path: "/events",
      dataReady: true,
      canonical: "/events",
      imageSelector:
        ".event-showcase-image img",
    },

    {
      path: "/blog",
      dataReady: true,
      canonical: "/blog",
      imageSelector:
        ".blog-card-image img, .featured-image img",
    },

    {
      path: "/team",
      dataReady: true,
      canonical: "/team",
      imageSelector:
        ".faculty-card__image, .leadership-card__image, .core-team-card__img, .executive-card__image, .webdev-team-card__img",
    },

    {
      path: "/gallery",
      dataReady: true,
      canonical: "/gallery",
      title: "Photography Archive & Event Albums | Abhyudaya Club",
      description: "Explore the digital memory archive of Abhyudaya Club — curated annual albums of TechBloom, Antariksh Spardha, workshops, robotics, and celebrations at MPEC Kanpur.",
      imageSelector: ".collage-img",
    },

    {
      path: "/announcements",
      dataReady: true,
      canonical: "/announcements",
    },

    {
      path: "/contact",
      canonical: "/contact",
    },

    {
      path: "/join",
      canonical: "/join",
    },
  ];

  /*
   * IMPORTANT:
   * Firebase is optional.
   *
   * If Firebase Admin credentials are unavailable,
   * return the static/public route set instead of
   * failing the production build.
   */

  if (!db) {
    console.warn(
      "[prerender] Firebase unavailable."
    );

    console.log(
      "[prerender] Adding static gallery routes."
    );

    const staticSlugs =
      getStaticGallerySlugs();

    staticSlugs.forEach((slug) => {
      routes.push({
        path: `/gallery/${encodeURIComponent(
          slug
        )}`,
        dataReady: true,
        canonical: `/gallery/${encodeURIComponent(
          slug
        )}`,
        imageSelector:
          ".gallery-clean-media",
      });
    });

    return [
      ...new Map(
        routes.map((route) => [
          route.path,
          route,
        ])
      ).values(),
    ];
  }

  /*
   * Firebase is available.
   * Keep the existing dynamic route generation.
   */

  try {
    const [
      blogs,
      events,
      albums,
    ] = await Promise.all([
      db
        .collection("blogs")
        .where("status", "==", "Published")
        .get(),

      db
        .collection("events")
        .where("status", "==", "Published")
        .get(),

      db
        .collection("gallery")
        .where("status", "==", "Published")
        .get(),
    ]);

    blogs.forEach((doc) => {
      const item = doc.data();

      if (item.slug) {
        const slug = encodeURIComponent(
          item.slug
        );

        routes.push({
          path: `/blog/${slug}`,
          dataReady: true,
          canonical: `/blog/${slug}`,
          imageSelector:
            ".details-featured-image",
        });
      }
    });

    events.forEach((doc) => {
      const item = doc.data();

      if (item.slug) {
        const slug =
          item.slug === "antariksh-spradha"
            ? "antariksh-spardha"
            : item.slug;

        const encodedSlug =
          encodeURIComponent(slug);

        routes.push({
          path: `/events/${encodedSlug}`,
          dataReady: true,
          canonical: `/events/${encodedSlug}`,
          imageSelector:
            ".event-hero__image",
        });
      }
    });

    const publishedGalleryAlbums = albums.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const galleryRoute = routes.find((route) => route.path === "/gallery");
    if (galleryRoute) galleryRoute.galleryAlbums = publishedGalleryAlbums;

    publishedGalleryAlbums.forEach((item) => {

      if (item.slug) {
        const slug = encodeURIComponent(
          item.slug
        );

        routes.push({
          path: `/gallery/${slug}`,
          dataReady: true,
          canonical: `/gallery/${slug}`,
          title: `${item.title || "Event Album"} — Event Photos & Gallery | Abhyudaya Club`,
          description: item.description || `Browse event photographs from ${item.title || "Abhyudaya Club"}.`,
          image: getPublicHttpsUrl(item.coverImage),
          imageAlt: item.title || "Abhyudaya Club event album",
          galleryAlbum: item,
          imageSelector:
            ".gallery-clean-media",
        });
      }
    });

    /*
     * If Firebase gallery is empty,
     * fall back to static gallery data.
     */

    if (albums.empty) {
      console.log(
        "[prerender] Firebase gallery is empty. Using static gallery routes."
      );

      getStaticGallerySlugs().forEach(
        (slug) => {
          routes.push({
            path: `/gallery/${encodeURIComponent(
              slug
            )}`,
            dataReady: true,
            canonical: `/gallery/${encodeURIComponent(
              slug
            )}`,
            imageSelector:
              ".gallery-clean-media",
          });
        }
      );
    }
  } catch (error) {
    /*
     * Firebase may be configured but temporarily
     * unavailable. Do not break production build.
     */

    console.warn(
      "[prerender] Firebase route query failed:"
    );

    console.warn(
      `[prerender] ${error.message}`
    );

    console.warn(
      "[prerender] Continuing with static routes."
    );

    getStaticGallerySlugs().forEach(
      (slug) => {
        routes.push({
          path: `/gallery/${encodeURIComponent(
            slug
          )}`,
          dataReady: true,
          canonical: `/gallery/${encodeURIComponent(
            slug
          )}`,
          imageSelector:
            ".gallery-clean-media",
        });
      }
    );
  }

  return [
    ...new Map(
      routes.map((route) => [
        route.path,
        route,
      ])
    ).values(),
  ];
}

/* =========================================================
   Static SEO HTML Injection
========================================================= */

function injectMeta(htmlTemplate, meta) {
  let html = htmlTemplate;

  if (meta.title) {
    html = html.replace(
      /<title>.*?<\/title>/i,
      `<title>${escapeHtml(
        meta.title
      )}</title>`
    );
  }

  if (meta.description) {
    html = html.replace(
      /<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(
        meta.description
      )}" />`
    );
  }

  if (meta.canonical) {
    html = html.replace(
      /<link\s+rel=["']canonical["']\s+href=["'].*?["']\s*\/?>/i,
      `<link rel="canonical" href="${escapeHtml(
        `${BASE_URL}${meta.canonical}`
      )}" />`
    );
  }

  if (meta.title) {
    html = html.replace(
      /<meta\s+property=["']og:title["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta property="og:title" content="${escapeHtml(
        meta.title
      )}" />`
    );

    html = html.replace(
      /<meta\s+name=["']twitter:title["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta name="twitter:title" content="${escapeHtml(
        meta.title
      )}" />`
    );
  }

  if (meta.description) {
    html = html.replace(
      /<meta\s+property=["']og:description["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta property="og:description" content="${escapeHtml(
        meta.description
      )}" />`
    );

    html = html.replace(
      /<meta\s+name=["']twitter:description["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta name="twitter:description" content="${escapeHtml(
        meta.description
      )}" />`
    );
  }

  if (meta.canonical) {
    html = html.replace(
      /<meta\s+property=["']og:url["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta property="og:url" content="${escapeHtml(
        `${BASE_URL}${meta.canonical}`
      )}" />`
    );
  }

  if (meta.image) {
    html = html.replace(
      /<meta\s+property=["']og:image["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta property="og:image" content="${escapeHtml(
        meta.image
      )}" />`
    );

    html = html.replace(
      /<meta\s+name=["']twitter:image["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta name="twitter:image" content="${escapeHtml(
        meta.image
      )}" />`
    );
  }

  if (meta.type) {
    html = html.replace(
      /<meta\s+property=["']og:type["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta property="og:type" content="${escapeHtml(
        meta.type
      )}" />`
    );
  }

  /*
   * Lightweight fallback for crawlers without JS.
   */

  if (meta.path !== "/" && !meta.blog && !meta.blogListing) {
    const galleryContent = meta.galleryAlbum
      ? renderGalleryAlbumFallback(meta.galleryAlbum)
      : Array.isArray(meta.galleryAlbums)
        ? renderGalleryListingFallback(meta.galleryAlbums)
        : "";
    const noscriptContent = `
      <noscript>
        ${galleryContent || `<div style="padding:2rem;font-family:sans-serif;max-width:800px;margin:0 auto;">
          <h1>${escapeHtml(meta.title || "Abhyudaya Club")}</h1>
          <p>${escapeHtml(meta.description || "Abhyudaya Club — Science & Literary Club of MPEC Kanpur")}</p>
        </div>`}
      </noscript>
    `;

    html = html.replace(
      /<div id=["']root["']>[\s\S]*?<\/div>/i,
      `<div id="root">${noscriptContent}</div>`
    );
  }

  return html;
}

function renderGalleryListingFallback(albums) {
  const seenImages = new Set();
  const entries = albums.flatMap((album) => {
    const imageUrl = getPublicHttpsUrl(
      album.coverImage || album.photos?.[0]?.src || album.photos?.[0]?.thumbnailSrc
    );
    if (!imageUrl || seenImages.has(imageUrl) || !album.slug) return [];
    seenImages.add(imageUrl);

    const title = album.title || "Abhyudaya Club event album";
    const href = `/gallery/${encodeURIComponent(album.slug)}`;
    return [`<li><a href="${escapeHtml(href)}"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(`${title} cover`)}"${getImageDimensions(album.width, album.height)} loading="lazy"><span>${escapeHtml(title)}</span></a></li>`];
  });

  return `<main style="padding:2rem;font-family:sans-serif;max-width:1200px;margin:0 auto;"><h1>Photography Archive &amp; Event Albums</h1><p>Explore event photographs from Abhyudaya Club at MPEC Kanpur.</p><ul>${entries.join("")}</ul></main>`;
}

function renderGalleryAlbumFallback(album) {
  const seenImages = new Set();
  const photos = (Array.isArray(album.photos) ? album.photos : [])
    .filter((photo) => !photo.isVideo)
    .flatMap((photo, index) => {
      const imageUrl = getPublicHttpsUrl(photo.src || photo.thumbnailSrc || photo.rawSrc);
      if (!imageUrl || seenImages.has(imageUrl)) return [];
      seenImages.add(imageUrl);

      const title = photo.title || `${album.title || "Event album"} photo ${index + 1}`;
      return [`<figure><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}"${getImageDimensions(photo.width, photo.height)} loading="lazy"><figcaption>${escapeHtml(title)}</figcaption></figure>`];
    });

  return `<main style="padding:2rem;font-family:sans-serif;max-width:1200px;margin:0 auto;"><p><a href="/gallery">Back to all event albums</a></p><h1>${escapeHtml(album.title || "Event Album")}</h1><p>${escapeHtml(album.description || "")}</p>${photos.join("")}</main>`;
}

function getImageDimensions(width, height) {
  const validWidth = Number.isFinite(Number(width)) && Number(width) > 0
    ? ` width="${Math.round(Number(width))}"`
    : "";
  const validHeight = Number.isFinite(Number(height)) && Number(height) > 0
    ? ` height="${Math.round(Number(height))}"`
    : "";
  return `${validWidth}${validHeight}`;
}

/* =========================================================
   Static Pre-render
========================================================= */

async function prerenderStatic() {
  console.log(
    "⚡ Executing Lightweight Static HTML Pre-rendering for SEO..."
  );

  const baseHtmlPath = path.join(
    DIST_DIR,
    "index.html"
  );

  if (!fs.existsSync(baseHtmlPath)) {
    console.warn(
      "⚠️ dist/index.html not found. Run 'npm run build' before prerendering."
    );

    return;
  }

  const baseHtml = fs.readFileSync(
    baseHtmlPath,
    "utf8"
  );

  /*
   * Firebase is optional.
   */

  const db = initializeFirebase();

  const routes =
    await getRoutesToPrerender(db);

  console.log(
    `📌 Pre-rendering ${routes.length} routes with static SEO templates...`
  );

  let count = 0;

  for (const item of routes) {
    const customizedHtml =
      injectMeta(baseHtml, item);

    const routeDir =
      item.path === "/"
        ? DIST_DIR
        : path.join(
            DIST_DIR,
            item.path.replace(/^\//, "")
          );

    fs.mkdirSync(routeDir, {
      recursive: true,
    });

    const filePath =
      item.path === "/"
        ? baseHtmlPath
        : path.join(
            routeDir,
            "index.html"
          );

    fs.writeFileSync(
      filePath,
      customizedHtml,
      "utf8"
    );

    count++;
  }

  console.log(
    `✅ Static pre-rendering complete! Generated ${count} route files with optimized SEO meta tags.`
  );
}

/* =========================================================
   Browser Detection
========================================================= */

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

    path.join(
      process.env.LOCALAPPDATA || "",
      "Microsoft\\Edge\\Application\\msedge.exe"
    ),

    path.join(
      process.env.LOCALAPPDATA || "",
      "Google\\Chrome\\Application\\chrome.exe"
    ),
  ].filter(Boolean);

  for (const candidate of candidatePaths) {
    if (
      candidate &&
      fs.existsSync(candidate)
    ) {
      return candidate;
    }
  }

  return undefined;
}

/* =========================================================
   Browser Pre-render
========================================================= */

async function prerenderWithBrowser() {
  console.log(
    "🌐 Attempting browser-based snapshot prerendering..."
  );

  const puppeteerModule =
    await import("puppeteer").catch(
      () => null
    );

  const serveHandlerModule =
    await import("serve-handler").catch(
      () => null
    );

  const puppeteer =
    puppeteerModule?.default ||
    puppeteerModule;

  const serveHandler =
    serveHandlerModule?.default ||
    serveHandlerModule;

  if (!puppeteer || !serveHandler) {
    throw new Error(
      "Puppeteer or serve-handler is not installed."
    );
  }

  const server = http.createServer(
    (req, res) =>
      serveHandler(req, res, {
        public: DIST_DIR,
        rewrites: [
          {
            source: "**",
            destination: "/index.html",
          },
        ],
      })
  );

  await new Promise((resolve) =>
    server.listen(
      0,
      "127.0.0.1",
      resolve
    )
  );

  const port =
    server.address().port;

  let browser;

  try {
    const executablePath =
      findSystemBrowser();

    browser = await puppeteer.launch({
      ...(executablePath
        ? { executablePath }
        : {}),
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page =
      await browser.newPage();

    page.setDefaultNavigationTimeout(
      45000
    );

    page.setDefaultTimeout(
      45000
    );

    page.on(
      "console",
      (message) => {
        if (
          message.type() === "error"
        ) {
          console.warn(
            `[browser] ${message.text()}`
          );
        }
      }
    );

    /*
     * Firebase is optional here too.
     */

    const db = initializeFirebase();

    const routes =
      await getRoutesToPrerender(db);

    for (const route of routes) {
      const targetUrl =
        `http://127.0.0.1:${port}${route.path}`;

      try {
        await page.evaluateOnNewDocument(
          () => {
            window.__PRERENDER__ = true;
            window.__PRERENDER_READY__ =
              false;
          }
        );

        const response =
          await page.goto(
            targetUrl,
            {
              waitUntil:
                "domcontentloaded",
            }
          );

        if (
          !response ||
          response.status() >= 400
        ) {
          throw new Error(
            `HTTP ${
              response?.status() ||
              "no response"
            }`
          );
        }

        await page.waitForFunction(
          () =>
            document.querySelector(
              "#root > *"
            ) !== null,
          {
            timeout: 15000,
          }
        );

        if (route.dataReady) {
          await page
            .waitForFunction(
              () =>
                window.__PRERENDER_READY__ ===
                true,
              {
                timeout: 20000,
              }
            )
            .catch(() => {});
        }

        const result =
          await page.evaluate(
            (selector) => ({
              html:
                document.documentElement
                  .outerHTML,

              images: selector
                ? document.querySelectorAll(
                    selector
                  ).length
                : document.querySelectorAll(
                    "#root img[src]"
                  ).length,

              title:
                document.title,
            }),
            route.imageSelector
          );

        const outputDir =
          route.path === "/"
            ? DIST_DIR
            : path.join(
                DIST_DIR,
                route.path.replace(
                  /^\//,
                  ""
                )
              );

        fs.mkdirSync(outputDir, {
          recursive: true,
        });

        fs.writeFileSync(
          path.join(
            outputDir,
            "index.html"
          ),
          result.html,
          "utf8"
        );

        console.log(
          `Prerendered ${route.path}: ${result.images} relevant images; ${result.title}`
        );
      } catch (error) {
        throw new Error(
          `Prerender failed for ${route.path}: ${error.message}`
        );
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }

    server.close();
  }

  console.log(
    "✨ Browser pre-rendering finished successfully."
  );
}

/* =========================================================
   Main Execution
========================================================= */

async function main() {
  const isVercel =
    Boolean(process.env.VERCEL);

  const isCI =
    Boolean(process.env.CI);

  const skipDownload =
    process.env.PUPPETEER_SKIP_DOWNLOAD ===
    "true";

  const explicitBrowser =
    process.argv.includes("--browser");

  /*
   * Vercel / CI always uses lightweight
   * static prerendering.
   */

  const shouldRunStatic =
    isVercel ||
    isCI ||
    skipDownload ||
    !explicitBrowser;

  if (shouldRunStatic) {
    if (
      isVercel ||
      isCI ||
      skipDownload
    ) {
      console.log(
        "⚡ Vercel/CI environment or PUPPETEER_SKIP_DOWNLOAD detected."
      );
    }

    console.log(
      "🚀 Using zero-dependency static HTML pre-renderer."
    );

    await prerenderStatic();

    return;
  }

  try {
    await prerenderWithBrowser();
  } catch (error) {
    console.warn(
      `⚠️ Browser snapshotting unavailable (${error.message}).`
    );

    console.log(
      "⚡ Gracefully falling back to static HTML pre-renderer..."
    );

    await prerenderStatic();
  }
}

/* =========================================================
   Safe Process Exit
========================================================= */

main()
  .then(() => {
    console.log(
      "✅ Prerender process completed successfully."
    );

    process.exit(0);
  })
  .catch((error) => {
    console.error(
      "❌ Unexpected error during prerendering:",
      error
    );

    /*
     * Keep production deployment resilient.
     * The Vite build and sitemap have already completed,
     * so prerendering must not block deployment.
     */

    process.exit(0);
  });