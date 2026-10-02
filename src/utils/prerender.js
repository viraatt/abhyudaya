/** Mark a page as ready for the production HTML snapshot. */
export function markPrerenderReady() {
  if (typeof window !== "undefined" && window.__PRERENDER__) {
    window.__PRERENDER_READY__ = true;
  }
}
