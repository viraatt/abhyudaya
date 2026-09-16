/**
 * In-Memory Template Cache for Certificate Generator.
 *
 * Prevents redundant network downloads, repeated PDF rasterizations,
 * and duplicate canvas conversions.
 *
 * Keys can be:
 * - templateId (e.g. "tpl_123")
 * - storageUrl or downloadURL
 * - storagePath
 *
 * Each cached item contains:
 * {
 *   id: string,
 *   arrayBuffer: ArrayBuffer, // Reusable for pdf-lib embedding without network calls
 *   blob: Blob,               // In-memory binary blob
 *   previewUrl: string,       // Blob object URL or valid preview URL
 *   originalWidth: number,
 *   originalHeight: number,
 *   format: string,
 *   mimeType: string,
 *   isPdf: boolean,
 *   timestamp: number,
 * }
 */

const IS_DEV = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV;

const templateCache = new Map();

/**
 * Normalizes a key from a template object or string identifier.
 *
 * @param {string|object} keyOrTemplate
 * @returns {string} Normalized cache key
 */
export function getTemplateCacheKey(keyOrTemplate) {
  if (!keyOrTemplate) return "";
  if (typeof keyOrTemplate === "string") return keyOrTemplate.trim();
  if (typeof keyOrTemplate === "object") {
    return (
      keyOrTemplate.id ||
      keyOrTemplate.templateId ||
      keyOrTemplate.storageUrl ||
      keyOrTemplate.storagePath ||
      keyOrTemplate.previewUrl ||
      keyOrTemplate.name ||
      ""
    ).trim();
  }
  return String(keyOrTemplate);
}

/**
 * Retrieves a cached template record if available.
 *
 * @param {string|object} keyOrTemplate
 * @returns {object|null} Cached template data or null
 */
export function getCachedTemplate(keyOrTemplate) {
  const key = getTemplateCacheKey(keyOrTemplate);
  if (!key) return null;

  const cached = templateCache.get(key);
  if (cached) {
    if (IS_DEV) {
      console.log(`[CACHE HIT] Template cache hit for key: "${key}"`);
    }
    return cached;
  }
  return null;
}

/**
 * Stores a template representation in the memory cache.
 * Can be indexed by multiple aliases (e.g. template ID and storage URL) for fast lookup.
 *
 * @param {string|object} keyOrTemplate
 * @param {object} templateData
 * @param {Array<string>} [alternateKeys=[]]
 */
export function setCachedTemplate(keyOrTemplate, templateData, alternateKeys = []) {
  if (!templateData) return;
  const primaryKey = getTemplateCacheKey(keyOrTemplate);
  if (!primaryKey) return;

  const entry = {
    ...templateData,
    cachedAt: Date.now(),
  };

  templateCache.set(primaryKey, entry);

  // Also cache under alternate aliases if provided (e.g. id, storageUrl, storagePath)
  const allKeys = [
    ...alternateKeys,
    templateData.id,
    templateData.templateId,
    templateData.storageUrl,
    templateData.storagePath,
  ]
    .filter(Boolean)
    .map((k) => String(k).trim());

  for (const altKey of allKeys) {
    if (altKey && altKey !== primaryKey) {
      templateCache.set(altKey, entry);
    }
  }

  if (IS_DEV) {
    console.log(`[CACHE SET] Cached template under key: "${primaryKey}" (total cached: ${templateCache.size})`);
  }
}

/**
 * Checks if a template is present in cache.
 *
 * @param {string|object} keyOrTemplate
 * @returns {boolean}
 */
export function hasCachedTemplate(keyOrTemplate) {
  const key = getTemplateCacheKey(keyOrTemplate);
  return Boolean(key && templateCache.has(key));
}

/**
 * Clears the template cache and revokes created blob URLs to prevent memory leaks.
 */
export function clearTemplateCache() {
  for (const item of templateCache.values()) {
    if (item?.previewUrl && typeof item.previewUrl === "string" && item.previewUrl.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(item.previewUrl);
      } catch {}
    }
  }
  templateCache.clear();
  if (IS_DEV) {
    console.log("[CACHE CLEAR] Template cache cleared.");
  }
}
