import createDOMPurify from "dompurify";

/**
 * Permitted HTML elements for rich-text articles and blogs.
 * Preserves paragraphs, headings, blockquotes, code, lists, tables,
 * media (images, figures), links, and standard inline typographic formatting.
 */
export const SANITIZE_ALLOWED_TAGS = [
  "p", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "strong", "b", "em", "i", "u", "s", "del", "sub", "sup",
  "a", "img", "figure", "figcaption",
  "div", "span",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
];

/**
 * Permitted attributes on allowed elements.
 * All event handlers (e.g. `onload`, `onerror`, `onclick`) are strictly forbidden.
 */
export const SANITIZE_ALLOWED_ATTR = [
  "href", "src", "alt", "title", "target", "rel",
  "class", "className", "id", "width", "height", "style", "loading",
];

let cachedPurify = null;

/**
 * Lazily initializes and caches the DOMPurify instance with security hooks.
 * Uses `window` in browser environments, or falls back to `globalThis.window`
 * in Node.js / JSDOM test environments.
 *
 * @param {object} [customWindow] - Optional window object (e.g. from JSDOM in tests)
 * @returns {object} Configured DOMPurify instance
 */
export function getDOMPurify(customWindow = null) {
  const win = customWindow || (typeof window !== "undefined" ? window : globalThis.window);
  if (!win) {
    throw new Error(
      "[sanitizeHtml] A valid DOM Window is required. In browser environments, window is automatic. In Node.js/tests, provide a JSDOM window."
    );
  }

  if (cachedPurify && !customWindow) {
    return cachedPurify;
  }

  const purify = createDOMPurify(win);

  // Security hook: sanitize links and ensure safe target/rel attributes
  purify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      const href = node.getAttribute("href") || "";
      // Neutralize dangerous URL schemes (javascript:, vbscript:, data:)
      if (/^(javascript|vbscript|data):/i.test(href.trim())) {
        node.removeAttribute("href");
      } else if (/^https?:\/\//i.test(href)) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    }
  });

  if (!customWindow) {
    cachedPurify = purify;
  }

  return purify;
}

/**
 * Sanitizes untrusted HTML using DOMPurify before DOM injection.
 * Strips script execution, inline event handlers, iframe/object tags, and dangerous URL schemes.
 *
 * @param {string} dirty - Raw HTML string to sanitize
 * @param {object} [options] - Optional custom options or customWindow
 * @returns {string} Sanitized, safe HTML string
 */
export function sanitizeArticleHtml(dirty, options = {}) {
  if (!dirty || typeof dirty !== "string") {
    return "";
  }

  const purify = getDOMPurify(options.customWindow);

  return purify.sanitize(dirty, {
    ALLOWED_TAGS: options.allowedTags || SANITIZE_ALLOWED_TAGS,
    ALLOWED_ATTR: options.allowedAttr || SANITIZE_ALLOWED_ATTR,
    FORBID_TAGS: [
      "script", "style", "iframe", "object", "embed",
      "base", "form", "input", "textarea", "button",
      "svg", "math", "applet",
    ],
    FORBID_ATTR: [
      "onerror", "onload", "onclick", "onmouseover",
      "onfocus", "onblur", "onchange", "onsubmit",
      "onkeydown", "onkeypress", "onkeyup",
    ],
    ALLOW_DATA_ATTR: false,
    ...options.purifyConfig,
  });
}
