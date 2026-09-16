/* global process, Buffer */
/**
 * Local Development API Server for Abhyudaya Club
 * ─────────────────────────────────────────────────────────────────
 * Purpose: Runs the SAME routing as production (server/router.js) locally
 *          so that `npm run dev` can serve both the Vite frontend and /api/.
 *
 * In production: api/index.js is the single Vercel Serverless Function and
 *                uses the same shared router — local behaviour == prod.
 * Locally:       Vite proxy (see vite.config.js) forwards /api/* to this server.
 *
 * Usage:
 *   Terminal 1: node server.local.js
 *   Terminal 2: npm run dev
 *   Or:         npm run dev:full
 */

import "dotenv/config";
import http from "http";
import { URL } from "url";
import { dispatch, getRouteTable } from "./server/router.js";

const PORT = process.env.LOCAL_API_PORT || 3001;

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
    socket: { remoteAddress: req.socket?.remoteAddress || "127.0.0.1" },
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

    get headersSent() {
      return headersSent;
    },

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
// All routing logic lives in server/router.js (identical to Vercel).
const server = http.createServer((req, rawRes) => {
  const parsed = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsed.pathname;

  // Collect request body
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", async () => {
    const rawBody = Buffer.concat(chunks).toString("utf8");
    const reqObj = parseRequest(req, rawBody);
    const resObj = buildResponse(rawRes);

    try {
      console.log(`[local-api] ${req.method} ${pathname}`);
      await dispatch(reqObj, resObj, pathname);
    } catch (err) {
      console.error(`[local-api] Unhandled error in ${pathname}:`, err);
      if (!resObj.headersSent) {
        resObj.status(500).json({
          success: false,
          error: "Local API handler threw an error.",
          details: err.message,
        });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n[local-api] Abhyudaya local API server running on http://localhost:${PORT}`);
  console.log("[local-api] Routes served (shared router — same as Vercel):");
  getRouteTable().forEach((r) => console.log(`  ${r.path}`));
  console.log("\n[local-api] Make sure Vite proxy is enabled in vite.config.js");
  console.log("[local-api] Waiting for requests...\n");
});
