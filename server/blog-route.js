import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { injectBlogSeo, isValidPublishedBlog, normalizeBlogSlug, renderBlogArticle, resolveBlogAuthor } from "../scripts/blog-prerender-utils.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let cachedDb;

function getDb() {
  if (cachedDb) return cachedDb;
  if (!getApps().length) {
    const credentials = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const account = credentials
      ? JSON.parse(credentials)
      : fs.existsSync(path.join(ROOT, "firebase-service-account.json"))
        ? JSON.parse(fs.readFileSync(path.join(ROOT, "firebase-service-account.json"), "utf8"))
        : null;
    if (!account) throw new Error("Firebase Admin credentials are not configured.");
    initializeApp({ credential: cert(account) });
  }
  cachedDb = getFirestore();
  return cachedDb;
}

function send(res, statusCode, html) {
  if (typeof res.setHeader === "function") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  }
  if (typeof res.status === "function") {
    const response = res.status(statusCode);
    if (typeof response.send === "function") return response.send(html);
    if (typeof response.end === "function") return response.end(html);
  }
  res.statusCode = statusCode;
  return res.end(html);
}

function notFoundPage() {
  return "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"robots\" content=\"noindex,follow\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Article not found | Abhyudaya Club</title></head><body><main><h1>Article not found</h1><p>This article may have been removed or is not published.</p><a href=\"/blog\">Browse the Abhyudaya Club blog</a></main></body></html>";
}

export async function handleBlogRoute(req, res, rawSlug) {
  if (!rawSlug || !["GET", "HEAD"].includes(String(req.method || "GET").toUpperCase())) {
    return send(res, rawSlug ? 405 : 404, notFoundPage());
  }

  let decodedSlug = String(rawSlug);
  try { decodedSlug = decodeURIComponent(decodedSlug); } catch { /* Invalid escapes cannot match a canonical stored slug. */ }
  const slug = normalizeBlogSlug(decodedSlug);
  if (!slug) return send(res, 404, notFoundPage());

  try {
    const db = getDb();
    const snapshot = await db
      .collection("blogs")
      .where("status", "==", "Published")
      .where("slug", "==", slug)
      .limit(1)
      .get();

    const doc = snapshot.docs[0];
    const blog = doc ? { id: doc.id, ...doc.data() } : null;
    if (!isValidPublishedBlog(blog)) return send(res, 404, notFoundPage());

    if (decodedSlug !== blog.slug) {
      if (typeof res.redirect === "function") return res.redirect(308, `/blog/${encodeURIComponent(blog.slug)}`);
      res.statusCode = 308;
      res.setHeader("Location", `/blog/${encodeURIComponent(blog.slug)}`);
      return res.end();
    }

    const templatePath = path.join(ROOT, "dist", "index.html");
    if (!fs.existsSync(templatePath)) throw new Error("Built site template is unavailable.");
    const template = fs.readFileSync(templatePath, "utf8");
    const resolvedBlog = await resolveBlogAuthor(db, blog);
    const seo = await renderBlogArticle(resolvedBlog);
    const html = injectBlogSeo(template, seo);
    return send(res, 200, String(req.method).toUpperCase() === "HEAD" ? "" : html);
  } catch (error) {
    console.error("Unable to resolve blog route:", error.message);
    if (typeof res.setHeader === "function") res.setHeader("Retry-After", "60");
    return send(res, 503, "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"robots\" content=\"noindex\"><title>Blog temporarily unavailable | Abhyudaya Club</title></head><body><h1>Blog temporarily unavailable</h1><p>Please try again shortly.</p></body></html>");
  }
}
