/* global process, Buffer */
/**
 * Local Development API Server for Abhyudaya Club
 * ─────────────────────────────────────────────────────────────────
 * Purpose: Runs the existing Vercel serverless handlers locally so that
 *          `npm run dev` can serve both the Vite frontend and the /api/ routes.
 *
 * In production: Vercel routes /api/* automatically — this file is NOT deployed.
 * Locally:       Vite proxy (see vite.config.js) forwards /api/* to this server.
 *
 * Usage:
 *   Terminal 1: node server.local.js
 *   Terminal 2: npm run dev
 *   Or:         npm run dev:full
 */

import "dotenv/config";
import http from "http";
import { URL, pathToFileURL } from "url";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.LOCAL_API_PORT || 3001;

// ── Route table: maps URL path patterns to handler modules ────────
// Add new routes here as new serverless functions are created.
const ROUTES = [
  { pattern: /^\/api\/time-capsule\/notify-cron$/,   module: "./api/time-capsule/notify-cron.js" },
  { pattern: /^\/api\/time-capsule\/create$/,         module: "./api/time-capsule/create.js" },
  { pattern: /^\/api\/time-capsule\/verify$/,         module: "./api/time-capsule/verify.js" },
  { pattern: /^\/api\/admin\/time-capsules$/,         module: "./api/admin/time-capsules.js" },
  { pattern: /^\/api\/gallery$/,                      module: "./api/gallery.js" },
];

/**
 * Converts a Node IncomingMessage into the minimal req object
 * that the Vercel handler signature expects.
 */
function parseRequest(req, rawBody) {
  const base = `http://localhost:${PORT}`;
  const parsed = new URL(req.url, base);

  const query = {};
  for (const [k, v] of parsed.searchParams.entries()) {
    query[k] = v;
  }

  let body = {};
  if (rawBody && rawBody.length > 0) {
    const ct = req.headers["content-type"] || "";
    if (ct.includes("application/json")) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = {};
      }
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      for (const [k, v] of new URLSearchParams(rawBody).entries()) {
        body[k] = v;
      }
    }
  }

  return {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query,
    body,
  };
}

/**
 * Wraps a raw Node ServerResponse into the Vercel res interface.
 */
function buildResponse(raw) {
  let headersSent = false;
  const resObj = {
    _statusCode: 200,
    _headers: { "access-control-allow-origin": "*" },

    status(code) {
      this._statusCode = code;
      return this;
    },

    setHeader(key, value) {
      this._headers[key.toLowerCase()] = value;
      return this;
    },

    json(payload) {
      const body = JSON.stringify(payload);
      if (!headersSent) {
        headersSent = true;
        this._headers["content-type"] = "application/json";
        this._headers["content-length"] = Buffer.byteLength(body);
        raw.writeHead(this._statusCode, this._headers);
      }
      raw.end(body);
    },

    send(payload) {
      const body =
        typeof payload === "string" ? payload : JSON.stringify(payload);
      if (!headersSent) {
        headersSent = true;
        raw.writeHead(this._statusCode, this._headers);
      }
      raw.end(body);
    },

    end(payload = "") {
      if (!headersSent) {
        headersSent = true;
        raw.writeHead(this._statusCode, this._headers);
      }
      raw.end(payload);
    },
  };
  return resObj;
}

// ── HTTP server ───────────────────────────────────────────────────
const server = http.createServer(async (req, rawRes) => {
  const parsed = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsed.pathname;

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    rawRes.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
    });
    rawRes.end();
    return;
  }

  // Match route
  const route = ROUTES.find((r) => r.pattern.test(pathname));

  if (!route) {
    rawRes.writeHead(404, { "content-type": "application/json" });
    rawRes.end(
      JSON.stringify({ error: `No local API handler for ${pathname}` })
    );
    return;
  }

  // Collect request body
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", async () => {
    const rawBody = Buffer.concat(chunks).toString("utf8");
    const reqObj = parseRequest(req, rawBody);
    const resObj = buildResponse(rawRes);

    try {
      const handlerModule = await import(
        pathToFileURL(path.resolve(__dirname, route.module)).href
      );
      const handler =
        handlerModule.default || handlerModule.handler || Object.values(handlerModule)[0];

      if (typeof handler !== "function") {
        throw new Error(`No default export found in ${route.module}`);
      }

      console.log(`[local-api] ${req.method} ${pathname}`);
      await handler(reqObj, resObj);
    } catch (err) {
      console.error(`[local-api] Error in ${pathname}:`, err.message);
      if (!rawRes.headersSent) {
        rawRes.writeHead(500, { "content-type": "application/json" });
        rawRes.end(
          JSON.stringify({
            success: false,
            error: "Local API handler threw an error.",
            details: err.message,
          })
        );
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n[local-api] Abhyudaya local API server running on http://localhost:${PORT}`);
  console.log("[local-api] Routes served:");
  ROUTES.forEach((r) => console.log(`  ${r.pattern.source}  →  ${r.module}`));
  console.log("\n[local-api] Make sure Vite proxy is enabled in vite.config.js");
  console.log("[local-api] Waiting for requests...\n");
});
