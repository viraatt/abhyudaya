/**
 * Seed script: safely migrates existing static team data from src/data/club.js
 * into the Firestore `team` collection so that the Admin Panel has all existing
 * members and becomes the single source of truth.
 *
 * Idempotent: checks if a member already exists by name/role before inserting.
 *
 * Usage: node scripts/seed-team.js
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { team as staticTeam } from "../src/data/club.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

async function seedTeam() {
  console.log("🔍 Checking Firestore `team` collection...");

  const existingSnap = await db.collection("team").get();
  console.log(`Found ${existingSnap.size} existing documents in \`team\`.`);

  // Build the list of members to seed from staticTeam
  const membersToSeed = [
    // 1. Faculty
    ...(staticTeam.faculty || []).map((m, idx) => ({
      name: m.name,
      role: m.role || "Faculty Advisor",
      department: "Faculty Advisory",
      level: "faculty-advisor",
      category: "Faculty Co-ordinators",
      image: m.image || "",
      linkedin: m.linkedin || "",
      github: m.github || "",
      email: m.email || "",
      bio: m.bio || "",
      order: m.order || idx + 1,
      active: true,
    })),

    // 2. Leadership
    ...(staticTeam.leadership || []).map((m, idx) => ({
      name: m.name,
      role: m.role || "Leadership",
      department: "Leadership",
      level: "leadership",
      category: "Executive Board",
      image: m.image || "",
      linkedin: m.linkedin || "",
      github: m.github || "",
      email: m.email || "",
      bio: m.bio || "",
      order: m.order || idx + 1,
      active: true,
    })),

    // 3. Core Team
    ...(staticTeam.core || []).map((m, idx) => ({
      name: m.name,
      role: m.role || "Core Lead",
      department: m.department || "Operations",
      level: "core",
      category: "Core Team",
      image: m.image || "",
      linkedin: m.linkedin || "",
      github: m.github || "",
      email: m.email || "",
      bio: m.bio || "",
      order: m.order || idx + 1,
      active: true,
    })),

    // 4. Executives
    ...(staticTeam.executives || []).map((m, idx) => ({
      name: m.name,
      role: m.role || "Executive",
      department: m.department || "Operations",
      level: "executive",
      category: "Domain Leads",
      image: m.image || "",
      linkedin: m.linkedin || "",
      github: m.github || "",
      email: m.email || "",
      bio: m.bio || "",
      order: m.order || idx + 1,
      active: true,
    })),
  ];

  console.log(`Total members to seed: ${membersToSeed.length}`);

  let added = 0;
  let skipped = 0;

  for (const member of membersToSeed) {
    // Check if doc already exists with exact name and role
    const match = existingSnap.docs.find((d) => {
      const data = d.data();
      return (
        data.name?.toLowerCase().trim() === member.name?.toLowerCase().trim() &&
        data.role?.toLowerCase().trim() === member.role?.toLowerCase().trim()
      );
    });

    if (match) {
      console.log(`⏭️  Skipping existing: ${member.name} (${member.role})`);
      skipped++;
      continue;
    }

    const docRef = await db.collection("team").add({
      ...member,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ Added: ${member.name} — ${member.role} [${member.level}] (ID: ${docRef.id})`);
    added++;
  }

  console.log(`\n🎉 Seed Complete: ${added} added, ${skipped} skipped.`);
}

seedTeam().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
