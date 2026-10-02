/* global process */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sitemapPath = path.join(ROOT, "public/sitemap-images.xml");
const limit = Math.max(1, Number(process.env.IMAGE_URL_CHECK_LIMIT) || 25);
const timeoutMs = Math.max(1000, Number(process.env.IMAGE_URL_CHECK_TIMEOUT_MS) || 15000);

function safeLabel(url) {
  const parsed = new URL(url);
  return `${parsed.origin}${parsed.pathname}`;
}

async function checkImage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" }, redirect: "follow", signal: controller.signal });
    }
    const contentType = response.headers.get("content-type") || "";
    const valid = response.ok && contentType.toLowerCase().startsWith("image/");
    return { url, valid, status: response.status, contentType, finalUrl: response.url };
  } catch (error) {
    return { url, valid: false, error: error.name === "AbortError" ? `timed out after ${timeoutMs}ms` : error.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  if (!fs.existsSync(sitemapPath)) throw new Error("public/sitemap-images.xml does not exist. Run npm run build first.");
  const xml = fs.readFileSync(sitemapPath, "utf8");
  const urls = [...xml.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((match) => match[1]
    .replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"').replaceAll("&apos;", "'"));
  const selected = [...new Set(urls)].slice(0, limit);
  if (selected.length === 0) throw new Error("No image URLs found in the image sitemap.");

  let failures = 0;
  for (let index = 0; index < selected.length; index += 5) {
    const results = await Promise.all(selected.slice(index, index + 5).map(checkImage));
    for (const result of results) {
      if (result.valid) {
        console.log(`OK ${result.status} ${result.contentType} ${safeLabel(result.url)}`);
      } else {
        failures += 1;
        console.error(`FAIL ${result.status || "network"} ${result.contentType || result.error} ${safeLabel(result.url)}`);
      }
    }
  }
  console.log(`Checked ${selected.length} of ${new Set(urls).size} unique image URLs${urls.length > selected.length ? ` (set IMAGE_URL_CHECK_LIMIT=${new Set(urls).size} to check all)` : ""}; failures: ${failures}.`);
  if (failures) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Image URL verification failed:", error.message);
  process.exitCode = 1;
});
