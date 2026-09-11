/**
 * Serverless proxy for Firebase Storage and other remote asset fetches.
 *
 * PURPOSE:
 * The browser cannot directly fetch Firebase Storage objects cross-origin
 * unless the GCS bucket has explicit CORS configuration. This proxy fetches
 * the remote asset server-side (no browser CORS enforcement applies) and
 * streams the bytes back to the browser with appropriate headers.
 *
 * Usage: GET /api/admin/proxy-asset?url=<encoded-remote-url>
 *
 * Security: Only admin-authenticated requests are allowed.
 * Only Firebase Storage URLs (firebasestorage.googleapis.com or
 * storage.googleapis.com) are proxied to prevent open-proxy abuse.
 */

import { Buffer } from "node:buffer";
import { authenticateAdminRequest } from "../time-capsule/admin-auth.js";

const ALLOWED_ADMIN_ROLES = ["super_admin", "event_admin"];

// Allowlist of domains that this proxy will fetch from
const ALLOWED_ORIGINS = [
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
];

/**
 * Validates that the URL to proxy is from an allowed domain.
 * @param {string} url
 * @returns {boolean}
 */
function isAllowedUrl(url) {
  try {
    const parsed = new URL(url);
    return ALLOWED_ORIGINS.some((origin) => parsed.hostname === origin || parsed.hostname.endsWith(`.${origin}`));
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  // Only GET requests
  if (req.method !== "GET" && req.method !== "OPTIONS") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  // Preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    return res.status(200).end();
  }

  // Admin authentication
  const authResult = await authenticateAdminRequest(req, ALLOWED_ADMIN_ROLES);
  if (!authResult.authorized) {
    return res.status(authResult.status || 401).json({ error: authResult.error || "Unauthorized" });
  }

  const targetUrl = req.query?.url;
  if (!targetUrl) {
    return res.status(400).json({ error: "Missing ?url= parameter." });
  }

  // Validate allowed domain
  if (!isAllowedUrl(targetUrl)) {
    return res.status(403).json({
      error: "URL not allowed. Only Firebase Storage URLs can be proxied.",
    });
  }

  try {
    const upstream = await fetch(targetUrl);

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: `Upstream request failed: ${upstream.status} ${upstream.statusText}`,
      });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Content-Length", buffer.length);
    res.status(200).send(buffer);
  } catch (err) {
    console.error("[proxy-asset] Fetch error:", err.message);
    res.status(500).json({ error: `Proxy fetch failed: ${err.message}` });
  }
}
