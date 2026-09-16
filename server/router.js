/* global process */
/**
 * Abhyudaya Club — Shared API Router
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for /api/* routing. Handlers follow the
 * classic Vercel signature (req, res) and the SAME router is used
 * in both environments:
 *
 *   - Vercel (production):  api/index.js          → dispatch(req, res, pathname)
 *   - Local dev (Node HTTP): server.local.js       → dispatch(req, res, pathname)
 *
 * The router is deliberately dependency-free — no Express/Hono required.
 * Every route below dispatches to its own handler module.
 */

import * as gallery from "./gallery.js";
import * as adminTimeCapsules from "./admin/time-capsules.js";
import * as adminGenerateCertificates from "./admin/generate-certificates.js";
import * as adminProxyAsset from "./admin/proxy-asset.js";
import * as createOrder from "./razorpay/create-order.js";
import * as verifyPayment from "./razorpay/verify-payment.js";
import * as createRegistration from "./registrations/create.js";
import * as timeCapsuleCreate from "./time-capsule/create.js";
import * as timeCapsuleVerify from "./time-capsule/verify.js";
import * as notifyCron from "./time-capsule/notify-cron.js";

/**
 * Route table — register every new endpoint here (single place).
 */
const ROUTES = [
  { path: "/api/gallery", handler: gallery.default },
  { path: "/api/admin/time-capsules", handler: adminTimeCapsules.default },
  { path: "/api/admin/generate-certificates", handler: adminGenerateCertificates.default },
  { path: "/api/admin/proxy-asset", handler: adminProxyAsset.default },
  { path: "/api/razorpay/create-order", handler: createOrder.default },
  { path: "/api/razorpay/verify-payment", handler: verifyPayment.default },
  { path: "/api/registrations/create", handler: createRegistration.default },
  { path: "/api/time-capsule/create", handler: timeCapsuleCreate.default },
  { path: "/api/time-capsule/verify", handler: timeCapsuleVerify.default },
  { path: "/api/time-capsule/notify-cron", handler: notifyCron.default },
];

/**
 * Returns route metadata (for route listing / startup logs).
 * @returns {{path: string}[]}
 */
export function getRouteTable() {
  return ROUTES.map((r) => ({ path: r.path }));
}

/**
 * Finds the handler registered for `pathname`.
 * @param {string} pathname
 * @returns {Function|null}
 */
export function findHandler(pathname) {
  return ROUTES.find((r) => r.path === pathname)?.handler || null;
}

/**
 * Dispatches an incoming request to the matching handler.
 * Always terminates the response (handler JSON, OPTIONS 204, 404/500 fallback)
 * so the adapter never hangs waiting for a response.
 *
 * @param {object} req  Vercel-style request  (method, url, headers, query, body, socket?)
 * @param {object} res  Vercel-style response (status, setHeader, json, send, end, headersSent?)
 * @param {string} pathname URL pathname, e.g. "/api/gallery"
 */
export async function dispatch(req, res, pathname) {
  const method = (req.method || "GET").toUpperCase();

  // ── Global CORS preflight (parity with the local dev server) ──
  if (method === "OPTIONS") {
    try {
      if (typeof res.setHeader === "function") {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "content-type,authorization");
      }
      if (typeof res.status === "function") res.status(204);
      if (typeof res.end === "function") res.end();
      else if (typeof res.send === "function") res.send("");
    } catch (err) {
      console.error(`[router] OPTIONS preflight failed for ${pathname}:`, err);
    }
    return;
  }

  const handler = findHandler(pathname);
  if (!handler || typeof handler !== "function") {
    if (typeof res.status === "function" && typeof res.json === "function") {
      return res.status(404).json({
        success: false,
        error: `No API route matches ${pathname}.`,
      });
    }
    res.statusCode = 404;
    return res.end(
      JSON.stringify({ success: false, error: `No API route matches ${pathname}.` })
    );
  }

  try {
    await handler(req, res);
  } catch (err) {
    console.error(`[router] Error handling ${method} ${pathname}:`, err);
    const headersAlreadySent =
      typeof res.headersSent !== "undefined" ? res.headersSent : false;

    if (!headersAlreadySent) {
      try {
        if (typeof res.status === "function" && typeof res.json === "function") {
          return res.status(500).json({
            success: false,
            error: "Internal server error handling API request.",
            details: process.env.NODE_ENV === "development" ? err.message : undefined,
          });
        }
        res.statusCode = 500;
        return res.end(
          JSON.stringify({
            success: false,
            error: "Internal server error handling API request.",
          })
        );
      } catch (innerErr) {
        console.error(`[router] Failed to write 500 response for ${pathname}:`, innerErr);
      }
    }
  }
}
