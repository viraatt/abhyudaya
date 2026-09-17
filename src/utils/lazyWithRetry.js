import { lazy } from "react";

const RELOAD_KEY_PREFIX = "app_chunk_reload_";
const RELOAD_TIMEOUT_MS = 15000; // 15-second debounce window to prevent infinite reload loops

/**
 * Checks if an error is a dynamic import or stale chunk failure.
 *
 * @param {Error|any} error
 * @returns {boolean}
 */
export function isChunkLoadError(error) {
  if (!error) return false;
  const message = String(error?.message || error?.name || error || "");
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("ChunkLoadError") ||
    message.includes("Loading chunk") ||
    message.includes("Unable to preload CSS") ||
    message.includes("Failed to load module script")
  );
}

/**
 * Attempts a safe one-time page reload to recover from stale Vite/Rollup chunks after deployment.
 *
 * @param {string} [componentName]
 * @returns {boolean} Whether a reload was triggered
 */
export function triggerChunkReload(componentName = "route") {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return false;
  }

  const key = `${RELOAD_KEY_PREFIX}${componentName}`;
  const lastReload = sessionStorage.getItem(key);
  const now = Date.now();

  if (!lastReload || now - Number(lastReload) > RELOAD_TIMEOUT_MS) {
    sessionStorage.setItem(key, String(now));
    // Hard reload from server to fetch updated index.html and current chunk manifests
    window.location.reload();
    return true;
  }

  // Already attempted recently; clear key so future legitimate updates work, and return false to avoid infinite loops
  sessionStorage.removeItem(key);
  return false;
}

/**
 * Wraps React.lazy with automatic single-reload recovery when a dynamic import fails due to 404 / stale chunk.
 * Non-chunk errors (syntax, runtime, firebase, network) are re-thrown normally.
 *
 * @param {() => Promise<{ default: React.ComponentType<any> }>} importFn
 * @param {string} [name] - Component identifier for session tracking
 * @returns {React.LazyExoticComponent<React.ComponentType<any>>}
 */
export function lazyWithRetry(importFn, name = "module") {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      if (isChunkLoadError(error)) {
        console.warn(`[lazyWithRetry] Stale chunk detected for "${name}". Reloading page to fetch latest deployment...`, error);
        const reloaded = triggerChunkReload(name);
        if (reloaded) {
          // Return an unresolved promise to keep React Suspense active until the browser reloads
          return new Promise(() => {});
        }
      }
      // Re-throw non-chunk errors or repeated failures
      throw error;
    }
  });
}

export default lazyWithRetry;
