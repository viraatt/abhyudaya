/**
 * One-time migration script: converts OLD single-photo gallery documents
 * into the new ALBUM schema.
 *
 * OLD schema: { title, category, imageUrl, date, description, createdAt }
 * NEW schema: { slug, title, subtitle, category, date, year, description,
 *               coverImage, featured, status, photos[], createdAt, updatedAt }
 *
 * Idempotent: documents that already have `photos` array are skipped.
 *
 * Usage: node scripts/migrate-gallery.js
 *
 * Requires firebase-admin with a service account.
 * The service account file is read from FIREBASE_SERVICE_ACCOUNT env var
 * or defaults to ./firebase-service-account.json (gitignored).
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Load service account (NEVER print contents) ──────────────────────────
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT ||
  path.join(__dirname, "..", "firebase-service-account.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error(
    "❌ Service account file not found. Set FIREBASE_SERVICE_ACCOUNT or place firebase-service-account.json in project root."
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// ── Helpers ──────────────────────────────────────────────────────────────
function slugify(title) {
  if (!title) return "";
  return String(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCategory(category) {
  const map = {
    techbloom: "Festivals",
    "antariksh spardha": "Festivals",
    communicraft: "Competitions",
    workshops: "Workshops",
    competitions: "Competitions",
    cultural: "Activities",
    "campus life": "Activities",
    events: "Activities",
    "flagship fest": "Festivals",
    astronomy: "Talks",
    robotics: "Workshops",
    quiz: "Competitions",
    design: "Competitions",
    entrepreneurship: "Talks",
  };
  if (!category) return "Activities";
  const key = String(category).toLowerCase().trim();
  if (map[key]) return map[key];
  const canonical = ["Festivals", "Workshops", "Competitions", "Talks", "Activities"];
  const match = canonical.find(
    (c) => c.toLowerCase() === key || c.toLowerCase().includes(key) || key.includes(c.toLowerCase())
  );
  return match || "Activities";
}

function yearFromDate(dateStr) {
  const match = String(dateStr || "").match(/^(\d{4})/);
  if (!match) return new Date().getFullYear();
  return parseInt(match[1], 10);
}

// ── Main migration ───────────────────────────────────────────────────────
async function migrate() {
  console.log("🔍 Scanning gallery collection...");

  const snapshot = await db.collection("gallery").get();
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Skip documents that are already in album format
    if (Array.isArray(data.photos) && data.photos.length > 0) {
      skipped++;
      continue;
    }

    // Skip documents that have no imageUrl (not old-format)
    if (!data.imageUrl) {
      skipped++;
      continue;
    }

    try {
      const title = data.title || "Untitled Album";
      const slug = data.slug || slugify(title);
      const imageUrl = data.imageUrl;
      const date = data.date || new Date().toISOString().split("T")[0];
      const year = data.year || yearFromDate(date);

      const albumData = {
        slug,
        title,
        subtitle: data.subtitle || "",
        category: normalizeCategory(data.category),
        date,
        year,
        description: data.description || "",
        coverImage: imageUrl,
        featured: Boolean(data.featured),
        status: "Published",
        photos: [
          {
            id: doc.id,
            title: title,
            description: data.description || "",
            src: imageUrl,
            rawSrc: imageUrl,
            thumbnailSrc: imageUrl,
            fullSrc: imageUrl,
            width: 1200,
            height: 800,
            aspectRatio: "3/2",
            isVideo: false,
          },
        ],
        updatedAt: new Date(),
      };

      // Preserve original createdAt if present
      if (data.createdAt) {
        albumData.createdAt = data.createdAt;
      } else {
        albumData.createdAt = new Date();
      }

      await doc.ref.update(albumData);
      migrated++;
      console.log(`✅ Migrated: ${title} (${doc.id})`);
    } catch (err) {
      failed++;
      console.error(`❌ Failed: ${doc.id}`, err.message);
    }
  }

  console.log("\n── Migration Summary ──");
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped (already album or no imageUrl): ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log("Done.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});