/* global Buffer */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIR = path.join(ROOT, "dist");

export async function parseStaticGallery(manifest) {
  const sourcePath = path.join(ROOT, "src", "data", "staticGalleryAlbums.js");
  let source = fs.readFileSync(sourcePath, "utf8");
  const imports = [
    ...source.matchAll(
      /^import\s+(\w+)\s+from\s+["'](\.\.\/assets\/[^"']+)["'];?\s*$/gm
    ),
  ];

  for (const [, binding, assetPath] of imports) {
    const assetName = path.basename(assetPath);
    const key = `src/assets/${assetName}`;
    const entry =
      manifest[key] ||
      Object.entries(manifest).find(([name]) => name.endsWith(`/assets/${assetName}`))?.[1];

    if (!entry?.file) {
      throw new Error(`Vite manifest is missing the gallery image ${assetPath}`);
    }

    source = source.replace(
      new RegExp(
        `^import\\s+${binding}\\s+from\\s+["'][^"']+["'];?\\s*$`,
        "m"
      ),
      `const ${binding} = ${JSON.stringify(`/${entry.file.replace(/^\//, "")}`)};`
    );
  }

  const isolated = source
    .replace(/export\s+const\s+STATIC_ALBUMS\s*=/, "const STATIC_ALBUMS =")
    .concat("\nexport { STATIC_ALBUMS };");
  const encoded = Buffer.from(isolated).toString("base64");
  const module = await import(`data:text/javascript;base64,${encoded}`);

  return module.STATIC_ALBUMS.map((album) => ({
    ...album,
    coverImage: resolveBuiltImage(album.coverImage, manifest),
    photos: (Array.isArray(album.photos) ? album.photos : []).map((photo) => ({
      ...photo,
      src: resolveBuiltImage(photo.src, manifest),
      thumbnailSrc: resolveBuiltImage(photo.thumbnailSrc, manifest),
      rawSrc: resolveBuiltImage(photo.rawSrc, manifest),
    })),
  }));
}

function resolveBuiltImage(value, manifest) {
  if (typeof value !== "string" || !value.trim()) return value;
  if (/^https:\/\//i.test(value)) return value;

  const clean = value.trim().replace(/^\.\//, "").replace(/^\//, "");
  if (!clean.startsWith("assets/")) return value;

  const key = `src/${clean}`;
  const entry =
    manifest[key] ||
    Object.entries(manifest).find(([name]) => name.endsWith(`/${clean}`))?.[1];
  return entry?.file ? `/${entry.file.replace(/^\//, "")}` : value;
}

export function readBuildManifest() {
  const manifestPath = path.join(DIST_DIR, ".vite", "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error("Vite build manifest is missing. Run vite build before prerendering.");
  }
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}
