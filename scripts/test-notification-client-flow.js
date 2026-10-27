import assert from "node:assert/strict";
import cp from "node:child_process";
import path from "node:path";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

const PORT = 8089;
const PROJECT_ID = "demo-abhyudaya-client-flow";

function tokenToDocId(token) {
  let hash = 5381;
  for (let i = 0; i < token.length; i++) {
    hash = ((hash << 5) + hash) ^ token.charCodeAt(i);
    hash = hash | 0;
  }
  return "sub_" + (hash >>> 0).toString(36);
}

async function runClientFlowTests() {
  console.log("Starting Firestore Emulator on port " + PORT + "...");
  const jarPath = path.join(
    process.env.USERPROFILE,
    ".cache/firebase/emulators/cloud-firestore-emulator-v1.19.7.jar"
  );

  const proc = cp.spawn(
    "java",
    ["-jar", jarPath, "--rules", "firestore.rules", "--host", "127.0.0.1", "--port", String(PORT)],
    { stdio: "pipe" }
  );

  let serverStarted = false;
  proc.stdout.on("data", (chunk) => {
    if (chunk.toString().includes("Dev App Server is now running")) {
      serverStarted = true;
    }
  });

  const start = Date.now();
  while (!serverStarted && Date.now() - start < 15000) {
    await new Promise((r) => setTimeout(r, 200));
  }

  if (!serverStarted) {
    proc.kill();
    throw new Error("Emulator failed to start");
  }

  console.log("Firestore emulator running with firestore.rules.");

  // Initialize client Firebase app exactly as in web app
  const clientApp = initializeApp({ apiKey: "test-key", projectId: PROJECT_ID }, "client-test-app");
  const db = getFirestore(clientApp);
  connectFirestoreEmulator(db, "127.0.0.1", PORT);

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`  ✓ PASS: ${name}`);
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(err);
    }
  }

  try {
    const rawFCMToken =
      "fcm_sample_token_abcdefghijklmnopqrstuvwxyz_1234567890_ABCDEF_GHIJKL_MNOPQR_STUVWXYZ_0123456789";
    const docId = tokenToDocId(rawFCMToken);
    const subscriptionRef = doc(db, "notification_subscriptions", docId);

    console.log("\n--- Testing Exact Client Flow (Anonymous Visitor) ---");

    // 1. Exact payload used in notificationService.js line 311
    await test("1. notificationService setDoc payload (anonymous) saves successfully", async () => {
      const payload = {
        token: rawFCMToken,
        userId: null,
        userEmail: null,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
        platform: "Win32",
        active: true,
        subscribedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      };

      await setDoc(subscriptionRef, payload, { merge: true });
    });

    // 2. Exact payload used in unsubscribeFromPushNotifications line 389
    await test("2. notificationService unsubscribe updateDoc sets active: false successfully", async () => {
      await updateDoc(subscriptionRef, {
        active: false,
        unsubscribedAt: serverTimestamp(),
      });
    });

    // 3. Re-subscribe flow (calling setDoc again on existing doc with merge: true)
    await test("3. notificationService re-subscribe sets active: true successfully", async () => {
      const payload = {
        token: rawFCMToken,
        userId: null,
        userEmail: null,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
        platform: "Win32",
        active: true,
        subscribedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      };

      await setDoc(subscriptionRef, payload, { merge: true });
    });

    // 4. Anonymous visitor attempting to read document directly should be denied
    await test("4. Direct read by anonymous visitor is denied (protecting token)", async () => {
      try {
        await getDoc(subscriptionRef);
        assert.fail("Read should have thrown permission-denied");
      } catch (err) {
        assert.equal(err.code, "permission-denied");
      }
    });

    // 5. Anonymous visitor attempting to delete document directly should be denied
    await test("5. Direct delete by anonymous visitor is denied (protecting against DoS)", async () => {
      try {
        await deleteDoc(subscriptionRef);
        assert.fail("Delete should have thrown permission-denied");
      } catch (err) {
        assert.equal(err.code, "permission-denied");
      }
    });

    // 6. Tampering test: client trying to write unauthorized extra fields
    await test("6. Client attempt to inject malicious/unexpected fields is rejected", async () => {
      const maliciousDocRef = doc(db, "notification_subscriptions", "sub_malicious");
      try {
        await setDoc(maliciousDocRef, {
          token: rawFCMToken,
          active: true,
          role: "super_admin", // injected field
        });
        assert.fail("Malicious write should have thrown permission-denied");
      } catch (err) {
        assert.equal(err.code, "permission-denied");
      }
    });

    // 7. Tampering test: client trying to supply invalid short token
    await test("7. Client attempt to submit token < 50 chars is rejected", async () => {
      const shortTokenRef = doc(db, "notification_subscriptions", "sub_short");
      try {
        await setDoc(shortTokenRef, {
          token: "short_fake_token",
          active: true,
          userId: null,
        });
        assert.fail("Short token write should have thrown permission-denied");
      } catch (err) {
        assert.equal(err.code, "permission-denied");
      }
    });

    console.log(`\n========================================`);
    console.log(`Client Flow Results: ${passed} / ${total} tests passed.`);
    console.log(`========================================\n`);

    if (passed !== total) {
      process.exit(1);
    }
  } finally {
    await deleteApp(clientApp);
    proc.kill();
  }
}

runClientFlowTests().catch((err) => {
  console.error("Client flow test error:", err);
  process.exit(1);
});
