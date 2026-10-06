/* global process, Buffer */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { initializeApp, cert, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URL = "https://www.abhyudayaclub.in";
const DIST_DIR = path.join(ROOT, "dist");

function initializeFirebase() {
  if (getApps().length) return getFirestore();
  const credentialJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(ROOT, "firebase-service-account.json");
  try {
    if (credentialJson) {
      initializeApp({ credential: cert(JSON.parse(credentialJson)) });
<<<<<<< HEAD
      return getFirestore();
    } else if (fs.existsSync(credentialPath)) {
      initializeApp({ credential: cert(JSON.parse(fs.readFileSync(credentialPath, "utf8"))) });
      return getFirestore();
    } else if (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT) {
      initializeApp({ credential: applicationDefault() });
      return getFirestore();
    }
  } catch (err) {
    console.warn("[sitemap] Warning: Could not initialize Firebase Admin credentials:", err.message);
  }
  return null;
=======
    } else if (fs.existsSync(credentialPath)) {
      initializeApp({ credential: cert(JSON.parse(fs.readFileSync(credentialPath, "utf8"))) });
    } else if (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT) {
      initializeApp({ credential: applicationDefault() });
    } else {
      console.warn("⚠️ Firebase build credentials not found. Dynamic Firestore collections will be skipped during sitemap generation.");
      return null;
    }
    return getFirestore();
  } catch (error) {
    console.warn("⚠️ Failed to initialize Firebase Admin:", error.message);
    return null;
  }
>>>>>>> origin/main
}

function escapeXml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[char]);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function blogContentImages(content, result = []) {
  if (!content) return result;
  if (Array.isArray(content)) {
    content.forEach((item) => blogContentImages(item, result));
  } else if (typeof content === "object") {
    const src = content.attrs?.src || content.src;
    if (typeof src === "string") result.push(src);
    if (content.content) blogContentImages(content.content, result);
  } else if (typeof content === "string") {
    for (const match of content.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) result.push(match[1]);
    if (content.trim().startsWith("{")) {
      try { blogContentImages(JSON.parse(content), result); } catch { /* legacy HTML is still handled above */ }
    }
  }
  return result;
}

function imageUrl(value, manifest) {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  if (/^https:\/\//i.test(raw)) return raw;
  if (/^(?:data:|blob:|javascript:|http:\/\/|\/\/)/i.test(raw)) return null;
  const deployedPath = raw.replace(/^\//, "");
  if (fs.existsSync(path.join(DIST_DIR, deployedPath)) && !deployedPath.startsWith("..")) {
    return `${BASE_URL}/${deployedPath}`;
  }
  const clean = raw.replace(/^\.\//, "").replace(/^\//, "");
  if (clean.startsWith("assets/")) {
    const assetPath = `src/${clean}`;
    const entry = manifest[assetPath] || Object.entries(manifest).find(([key]) => key.endsWith(`/${clean}`))?.[1];
    return entry?.file ? `${BASE_URL}/${entry.file.replace(/^\//, "")}` : null;
  }
  return null;
}

function parseStaticGallery(manifest) {
  const sourcePath = path.join(ROOT, "src/data/staticGalleryAlbums.js");
  let source = fs.readFileSync(sourcePath, "utf8");
  const imports = [...source.matchAll(/^import\s+(\w+)\s+from\s+["'](\.\.\/assets\/[^"']+)["'];?\s*$/gm)];
  for (const [, binding, assetPath] of imports) {
    const key = `src/assets/${path.basename(assetPath)}`;
    const entry = manifest[key] || Object.entries(manifest).find(([name]) => name.endsWith(`/assets/${path.basename(assetPath)}`))?.[1];
    if (!entry?.file) throw new Error(`Vite manifest is missing the gallery image ${assetPath}`);
    source = source.replace(new RegExp(`^import\\s+${binding}\\s+from\\s+["'][^"']+["'];?\\s*$`, "m"), `const ${binding} = ${JSON.stringify(`/${entry.file.replace(/^\//, "")}`)};`);
  }
  const isolated = source.replace(/export\s+const\s+STATIC_ALBUMS\s*=/, "const STATIC_ALBUMS =").concat("\nexport { STATIC_ALBUMS };");
  const encoded = Buffer.from(isolated).toString("base64");
  return import(`data:text/javascript;base64,${encoded}`).then((module) => module.STATIC_ALBUMS);
}

async function generate() {
  if (!fs.existsSync(path.join(DIST_DIR, ".vite/manifest.json"))) {
    throw new Error("Vite build manifest is missing. Run vite build before sitemap generation.");
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(DIST_DIR, ".vite/manifest.json"), "utf8"));
  const db = initializeFirebase();
<<<<<<< HEAD
=======
  const [blogSnapshot, eventSnapshot, gallerySnapshot, teamSnapshot, galleryMeta, announcementSnapshot] = db
    ? await Promise.all([
        db.collection("blogs").where("status", "==", "Published").get(),
        db.collection("events").where("status", "==", "Published").get(),
        db.collection("gallery").where("status", "==", "Published").get(),
        db.collection("team").get(),
        db.doc("gallery_meta/deleted_static_albums").get(),
        db.collection("announcements").get(),
      ])
    : [{ docs: [] }, { docs: [] }, { docs: [] }, { docs: [], empty: true }, { exists: false }, { docs: [] }];
>>>>>>> origin/main

  let blogs = [];
  let events = [];
  let announcements = [];
  let albums = [];
  let team = [];

  if (db) {
    try {
      const [blogSnapshot, eventSnapshot, gallerySnapshot, teamSnapshot, galleryMeta, announcementSnapshot] = await Promise.all([
        db.collection("blogs").where("status", "==", "Published").get(),
        db.collection("events").where("status", "==", "Published").get(),
        db.collection("gallery").where("status", "==", "Published").get(),
        db.collection("team").get(),
        db.doc("gallery_meta/deleted_static_albums").get(),
        db.collection("announcements").get(),
      ]);

      const byCreatedDate = (a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
      blogs = blogSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((item) => item.slug).sort(byCreatedDate);
      events = eventSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((item) => item.slug).sort(byCreatedDate);
      announcements = announcementSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((item) => item.status === "published")
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      albums = gallerySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((item) => item.slug);
      const deletedIds = galleryMeta.exists && Array.isArray(galleryMeta.data().ids) ? galleryMeta.data().ids : [];
      if (albums.length === 0) {
        albums = (await parseStaticGallery(manifest)).filter((album) => !deletedIds.includes(album.id) && !deletedIds.includes(album.slug));
      }
      const { team: staticTeam } = await import(pathToFileURL(path.join(ROOT, "src/data/club.js")));
      team = teamSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((member) => member.active !== false);
      if (teamSnapshot.empty) {
        team = Object.values(staticTeam).flat().filter((member) => member && typeof member === "object");
      } else {
        const hasWebDevelopmentMembers = team.some((member) => member.level === "web-dev" || member.department === "Web Development" || /web\s?dev|web development/i.test(member.category || ""));
        if (!hasWebDevelopmentMembers) team.push(...(staticTeam.webDev || []));
        if (team.length === 0) team = staticTeam.webDev || [];
      }
    } catch (fbErr) {
      console.warn("[sitemap] Warning: Could not query Firestore for dynamic sitemap data:", fbErr.message);
    }
  } else {
    console.warn("[sitemap] Warning: Firebase build credentials are not available. Falling back to static/public routes and bundled data.");
  }

  // Safe fallbacks when Firestore is unavailable or collections are empty
  if (albums.length === 0) {
    try {
      albums = await parseStaticGallery(manifest);
    } catch (e) {
      console.warn("[sitemap] Could not parse static gallery:", e.message);
      albums = [];
    }
  }
  if (team.length === 0) {
    try {
      const { team: staticTeam } = await import(pathToFileURL(path.join(ROOT, "src/data/club.js")));
      team = Object.values(staticTeam).flat().filter((member) => member && typeof member === "object");
    } catch (e) {
      console.warn("[sitemap] Could not load static team:", e.message);
      team = [];
    }
  }
  if (blogs.length === 0) {
    try {
      const { blogs: staticBlogs } = await import(pathToFileURL(path.join(ROOT, "src/data/blogs.js")));
      blogs = Array.isArray(staticBlogs) ? staticBlogs : [];
    } catch {
      blogs = [];
    }
  }


  const pages = new Map();
  const addPage = (url, imageValues = []) => {
    const normalized = url.endsWith("/") && url !== BASE_URL + "/" ? url.slice(0, -1) : url;
    if (!normalized.startsWith(`${BASE_URL}/`) && normalized !== BASE_URL) return;
    const images = unique(imageValues.map((value) => imageUrl(value, manifest)).filter(Boolean));
    pages.set(normalized, unique([...(pages.get(normalized) || []), ...images]));
  };
  const staticPaths = ["/", "/about", "/events", "/announcements", "/blog", "/team", "/gallery", "/contact", "/join"];
  staticPaths.forEach((route) => addPage(`${BASE_URL}${route}`));
  blogs.slice(0, 9).forEach((blog) => addPage(`${BASE_URL}/blog`, [blog.featuredImage]));
  events.slice(0, 6).forEach((event) => addPage(`${BASE_URL}/events`, [event.banner, event.image]));
  blogs.forEach((blog) => addPage(`${BASE_URL}/blog/${encodeURIComponent(blog.slug)}`, [blog.featuredImage, ...blogContentImages(blog.content)]));
  events.forEach((event) => addPage(`${BASE_URL}/events/${encodeURIComponent(event.slug === "antariksh-spradha" ? "antariksh-spardha" : event.slug)}`, [event.banner, event.image, ...(Array.isArray(event.gallery) ? event.gallery : [])]));
  announcements.forEach((announcement) => addPage(`${BASE_URL}/announcements`, [announcement.imageUrl]));
  announcements.slice(0, 3).forEach((announcement) => addPage(`${BASE_URL}/`, [announcement.imageUrl]));
  team.forEach((member) => addPage(`${BASE_URL}/team`, [member.image]));
  albums.forEach((album) => {
    const albumUrl = `${BASE_URL}/gallery/${encodeURIComponent(album.slug)}`;
    const photos = Array.isArray(album.photos) ? album.photos.filter((photo) => !photo.isVideo) : [];
    addPage(albumUrl, [album.coverImage, ...photos.map((photo) => photo.src || photo.thumbnailSrc || photo.rawSrc)]);
    addPage(`${BASE_URL}/gallery`, [album.coverImage]);
  });
  // These bundled images are the meaningful, visible editorial collage on /gallery.
  for (const asset of ["9ae3f21a-b6bf-4115-8c6b-a44b01f95bf9.jpg", "AM3COVER.jpg", "cover2.jpg", "WD4COVER.jpg"]) {
    addPage(`${BASE_URL}/gallery`, [`assets/${asset}`]);
  }

  const now = new Date().toISOString();
  const sitemapBody = [...pages].map(([url]) => `  <url><loc>${escapeXml(url)}</loc><lastmod>${now}</lastmod></url>`).join("\n");
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapBody}\n</urlset>`;
  const imageBody = [...pages].filter(([, images]) => images.length).map(([url, images]) => `  <url><loc>${escapeXml(url)}</loc>${images.map((image) => `<image:image><image:loc>${escapeXml(image)}</image:loc></image:image>`).join("")}</url>`).join("\n");
  const imageSitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${imageBody}\n</urlset>`;

  const newsItems = blogs.filter((blog) => {
    const date = blog.createdAt?.toDate ? blog.createdAt.toDate() : null;
    return date && date >= new Date(Date.now() - 48 * 60 * 60 * 1000);
  }).map((blog) => {
    const date = blog.createdAt.toDate().toISOString();
    const slug = encodeURIComponent(blog.slug);
    return `<url><loc>${escapeXml(`${BASE_URL}/blog/${slug}`)}</loc><news:news><news:publication><news:name>Abhyudaya Club Blog</news:name><news:language>en</news:language></news:publication><news:publication_date>${date}</news:publication_date><news:title>${escapeXml(blog.title || blog.slug)}</news:title></news:news></url>`;
  }).join("\n");
  const newsSitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${newsItems}</urlset>`;
  const rssItems = blogs.map((blog) => {
    const url = `${BASE_URL}/blog/${encodeURIComponent(blog.slug)}`;
    const date = blog.createdAt?.toDate ? blog.createdAt.toDate().toUTCString() : new Date().toUTCString();
    const cover = imageUrl(blog.featuredImage, manifest);
    return `<item><title>${escapeXml(blog.title)}</title><link>${escapeXml(url)}</link><guid isPermaLink="true">${escapeXml(url)}</guid><pubDate>${date}</pubDate><description>${escapeXml(blog.excerpt || blog.seo || blog.title)}</description><category>${escapeXml(blog.category || "Blog")}</category>${cover ? `<media:content url="${escapeXml(cover)}" medium="image" />` : ""}</item>`;
  }).join("\n");
  const feed = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>Abhyudaya Club Blog</title><link>${BASE_URL}/blog</link><description>Official Blog of Abhyudaya Club — Science &amp; Literary Club of MPEC Kanpur</description><language>en-in</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${rssItems}</channel></rss>`;

  const writeBoth = (name, content) => {
    fs.writeFileSync(path.join(ROOT, "public", name), content, "utf8");
    fs.writeFileSync(path.join(DIST_DIR, name), content, "utf8");
  };
  writeBoth("sitemap.xml", sitemap);
  writeBoth("sitemap-images.xml", imageSitemap);
  writeBoth("sitemap-news.xml", newsSitemap);
  writeBoth("feed.xml", feed);

  const blogImages = unique(blogs.flatMap((blog) => [blog.featuredImage, ...blogContentImages(blog.content)]).map((value) => imageUrl(value, manifest)).filter(Boolean));
  const eventImages = unique(events.flatMap((event) => [event.banner, event.image, ...(Array.isArray(event.gallery) ? event.gallery : [])]).map((value) => imageUrl(value, manifest)).filter(Boolean));
  const teamImages = unique(team.map((member) => imageUrl(member.image, manifest)).filter(Boolean));
  const galleryImages = unique([...albums.flatMap((album) => [album.coverImage, ...(album.photos || []).filter((photo) => !photo.isVideo).map((photo) => photo.src || photo.thumbnailSrc || photo.rawSrc)]), "assets/9ae3f21a-b6bf-4115-8c6b-a44b01f95bf9.jpg", "assets/AM3COVER.jpg", "assets/cover2.jpg", "assets/WD4COVER.jpg"].map((value) => imageUrl(value, manifest)).filter(Boolean));
  const announcementImages = unique(announcements.map((announcement) => imageUrl(announcement.imageUrl, manifest)).filter(Boolean));
  const allImageReferences = [...pages.values()].flat();
  console.log(`Sitemaps generated: ${pages.size} page URLs, ${allImageReferences.length} image references, ${unique(allImageReferences).length} unique image URLs.`);
  console.log(`Unique content image URLs: team ${teamImages.length}, gallery ${galleryImages.length}, events ${eventImages.length}, blogs ${blogImages.length}, announcements ${announcementImages.length}.`);
}

generate().catch((error) => {
  console.error("Sitemap generation failed:", error);
  process.exitCode = 1;
});
