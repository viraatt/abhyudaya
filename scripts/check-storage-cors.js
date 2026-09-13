import { initializeApp, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const saPath = path.join(__dirname, "..", "firebase-service-account.json");
const sa = JSON.parse(fs.readFileSync(saPath, "utf8"));

const app = initializeApp({
  credential: cert(sa),
  storageBucket: "abhyudayaclub.firebasestorage.app",
});

import { getFirestore } from "firebase-admin/firestore";

async function run() {
  const db = getFirestore(app);
  try {
    const snap = await db.collection("certificates").limit(5).get();
    console.log(`Found ${snap.size} sample certificates in Firestore.`);
    snap.forEach((doc) => {
      const d = doc.data();
      console.log("Certificate:", doc.id, {
        name: d.name,
        certificateUrl: d.certificateUrl?.substring(0, 80),
      });
    });
  } catch (err) {
    console.error("Firestore error:", err.message);
  }
}

run();
