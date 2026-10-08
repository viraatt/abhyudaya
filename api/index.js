/**
 * Vercel catch-all Serverless Function.
 * ─────────────────────────────────────────────────────────────
 * This is the ONLY file under /api/, so the deployment ships exactly
 * ONE Vercel Serverless Function (Hobby plan limit = 12).
 *
 * vercel.json rewrites every  /api/*  request to this function,
 * which then dispatches to the shared router in server/router.js.
 */
import { dispatch } from "../server/router.js";
import { handleBlogRoute } from "../server/blog-route.js";

export default async function handler(req, res) {
  let pathname = "/";
  try {
    pathname = new URL(req.url || "/", "http://localhost").pathname;
  } catch {
    // Very defensive: Vercel always sends a well-formed URL, but never crash.
    pathname = String(req.url || "/").split("?")[0];
  }
  const querySlug = req.query?.blogSlug;
  const blogSlug = typeof querySlug === "string"
    ? querySlug
    : new URL(req.url || "/", "http://localhost").searchParams.get("blogSlug");
  if (blogSlug !== null && blogSlug !== undefined) {
    return handleBlogRoute(req, res, blogSlug);
  }
  await dispatch(req, res, pathname);
}
