import assert from "node:assert/strict";
import cp from "node:child_process";
import http from "node:http";
import path from "node:path";

const PORT = 8089;
const PROJECT_ID = "demo-abhyudaya-rules-test";
const BASE_PATH = `/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function makeJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const claims = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${claims}.`;
}

function request({ method, docPath, body, auth = null }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : "";
    const headers = {};

    if (body) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(payload);
    }

    if (auth === "owner") {
      headers["Authorization"] = "Bearer owner";
    } else if (auth && typeof auth === "object") {
      headers["Authorization"] = `Bearer ${makeJwt(auth)}`;
    }

    const req = http.request(
      {
        host: "127.0.0.1",
        port: PORT,
        path: `${BASE_PATH}${docPath}`,
        method,
        headers,
      },
      (res) => {
        let responseData = "";
        res.on("data", (chunk) => (responseData += chunk));
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = responseData ? JSON.parse(responseData) : null;
          } catch {
            parsed = responseData;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function validFCMToken(prefix = "fcm_token_") {
  return (
    prefix +
    "valid_test_token_string_which_exceeds_fifty_characters_in_length_1234567890_abcdefghijklmnopqrstuvwxyz"
  );
}

async function runTests() {
  console.log("Starting Cloud Firestore Emulator on port " + PORT + "...");
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

  const maxWait = 15000;
  const start = Date.now();
  while (!serverStarted && Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, 200));
  }

  if (!serverStarted) {
    proc.kill();
    throw new Error("Firestore emulator failed to start within 15 seconds.");
  }
  console.log("Firestore emulator running with firestore.rules.");

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
    // 0. Seed admin user in Firestore using "owner" auth bypass
    const adminUid = "admin_super_123";
    await request({
      method: "PATCH",
      docPath: `/users/${adminUid}`,
      body: {
        fields: {
          role: { stringValue: "super_admin" },
          email: { stringValue: "admin@abhyudaya.org" },
        },
      },
      auth: "owner",
    });

    const aliceAuth = { sub: "alice_uid", user_id: "alice_uid", email: "alice@test.com" };
    const bobAuth = { sub: "bob_uid", user_id: "bob_uid", email: "bob@test.com" };
    const adminAuth = { sub: adminUid, user_id: adminUid, email: "admin@abhyudaya.org" };

    console.log("\n--- Suite 1: Anonymous / Public Visitor Subscriptions ---");

    await test("1. Anonymous visitor can create valid subscription with userId: null", async () => {
      const res = await request({
        method: "PATCH",
        docPath: "/notification_subscriptions/sub_anon_1",
        body: {
          fields: {
            token: { stringValue: validFCMToken() },
            active: { booleanValue: true },
            userId: { nullValue: null },
            userAgent: { stringValue: "Mozilla/5.0" },
            platform: { stringValue: "Win32" },
          },
        },
        auth: null,
      });
      assert.equal(res.status, 200, JSON.stringify(res.body));
    });

    await test("2. Anonymous visitor create fails if token is shorter than 50 chars", async () => {
      const res = await request({
        method: "PATCH",
        docPath: "/notification_subscriptions/sub_short_token",
        body: {
          fields: {
            token: { stringValue: "short_token_123" },
            active: { booleanValue: true },
            userId: { nullValue: null },
          },
        },
        auth: null,
      });
      assert.equal(res.status, 403);
    });

    await test("3. Anonymous visitor create fails if missing token field", async () => {
      const res = await request({
        method: "PATCH",
        docPath: "/notification_subscriptions/sub_missing_token",
        body: {
          fields: {
            active: { booleanValue: true },
            userId: { nullValue: null },
          },
        },
        auth: null,
      });
      assert.equal(res.status, 403);
    });

    await test("4. Anonymous visitor create fails if active is not a boolean", async () => {
      const res = await request({
        method: "PATCH",
        docPath: "/notification_subscriptions/sub_invalid_active",
        body: {
          fields: {
            token: { stringValue: validFCMToken() },
            active: { stringValue: "true" },
            userId: { nullValue: null },
          },
        },
        auth: null,
      });
      assert.equal(res.status, 403);
    });

    await test("5. Anonymous visitor create fails if forbidden extra field is provided", async () => {
      const res = await request({
        method: "PATCH",
        docPath: "/notification_subscriptions/sub_forbidden_field",
        body: {
          fields: {
            token: { stringValue: validFCMToken() },
            active: { booleanValue: true },
            userId: { nullValue: null },
            adminOverride: { booleanValue: true }, // Not in allowlist
          },
        },
        auth: null,
      });
      assert.equal(res.status, 403);
    });

    await test("6. Anonymous visitor create fails if trying to claim an authenticated userId", async () => {
      const res = await request({
        method: "PATCH",
        docPath: "/notification_subscriptions/sub_spoof_anon",
        body: {
          fields: {
            token: { stringValue: validFCMToken() },
            active: { booleanValue: true },
            userId: { stringValue: "victim_user_uid" },
          },
        },
        auth: null,
      });
      assert.equal(res.status, 403);
    });

    console.log("\n--- Suite 2: Authenticated User Subscriptions ---");

    await test("7. Authenticated user (Alice) can create subscription with her own UID", async () => {
      const res = await request({
        method: "PATCH",
        docPath: "/notification_subscriptions/sub_alice",
        body: {
          fields: {
            token: { stringValue: validFCMToken("alice_") },
            active: { booleanValue: true },
            userId: { stringValue: aliceAuth.sub },
            userEmail: { stringValue: aliceAuth.email },
          },
        },
        auth: aliceAuth,
      });
      assert.equal(res.status, 200, JSON.stringify(res.body));
    });

    await test("8. Authenticated user (Alice) fails to create subscription spoofing Bob's UID", async () => {
      const res = await request({
        method: "PATCH",
        docPath: "/notification_subscriptions/sub_alice_spoof",
        body: {
          fields: {
            token: { stringValue: validFCMToken("spoof_") },
            active: { booleanValue: true },
            userId: { stringValue: bobAuth.sub }, // Alice tries to set Bob's UID
          },
        },
        auth: aliceAuth,
      });
      assert.equal(res.status, 403);
    });

    console.log("\n--- Suite 3: Updates and Unsubscriptions ---");

    await test("9. Anonymous visitor can unsubscribe (active: false) on anonymous subscription", async () => {
      // In Firestore REST, updateMask updates specific fields while keeping existing token
      const res = await request({
        method: "PATCH",
        docPath: "/notification_subscriptions/sub_anon_1?updateMask.fieldPaths=active",
        body: {
          fields: {
            active: { booleanValue: false },
          },
        },
        auth: null,
      });
      assert.equal(res.status, 200, JSON.stringify(res.body));
    });

    await test("10. Anonymous visitor fails to alter token on existing subscription", async () => {
      const res = await request({
        method: "PATCH",
        docPath: "/notification_subscriptions/sub_anon_1?updateMask.fieldPaths=token",
        body: {
          fields: {
            token: { stringValue: validFCMToken("altered_") },
          },
        },
        auth: null,
      });
      assert.equal(res.status, 403);
    });

    await test("11. Anonymous visitor fails to update Alice's subscription", async () => {
      const res = await request({
        method: "PATCH",
        docPath: "/notification_subscriptions/sub_alice?updateMask.fieldPaths=active",
        body: {
          fields: {
            active: { booleanValue: false },
          },
        },
        auth: null,
      });
      assert.equal(res.status, 403);
    });

    await test("12. Another authenticated user (Bob) fails to update Alice's subscription", async () => {
      const res = await request({
        method: "PATCH",
        docPath: "/notification_subscriptions/sub_alice?updateMask.fieldPaths=active",
        body: {
          fields: {
            active: { booleanValue: false },
          },
        },
        auth: bobAuth,
      });
      assert.equal(res.status, 403);
    });

    await test("13. Owner (Alice) can update her own subscription (active: false)", async () => {
      const res = await request({
        method: "PATCH",
        docPath: "/notification_subscriptions/sub_alice?updateMask.fieldPaths=active",
        body: {
          fields: {
            active: { booleanValue: false },
          },
        },
        auth: aliceAuth,
      });
      assert.equal(res.status, 200, JSON.stringify(res.body));
    });

    console.log("\n--- Suite 4: Read Restrictions ---");

    await test("14. Anonymous visitor cannot read any subscription document", async () => {
      const res = await request({
        method: "GET",
        docPath: "/notification_subscriptions/sub_anon_1",
        auth: null,
      });
      assert.equal(res.status, 403);
    });

    await test("15. Anonymous visitor cannot list notification subscriptions", async () => {
      const res = await request({
        method: "GET",
        docPath: "/notification_subscriptions",
        auth: null,
      });
      assert.equal(res.status, 403);
    });

    await test("16. Non-owner (Bob) cannot read Alice's subscription", async () => {
      const res = await request({
        method: "GET",
        docPath: "/notification_subscriptions/sub_alice",
        auth: bobAuth,
      });
      assert.equal(res.status, 403);
    });

    await test("17. Owner (Alice) can read her own subscription", async () => {
      const res = await request({
        method: "GET",
        docPath: "/notification_subscriptions/sub_alice",
        auth: aliceAuth,
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.fields.userId.stringValue, aliceAuth.sub);
    });

    await test("18. Admin (super_admin) can read subscription document", async () => {
      const res = await request({
        method: "GET",
        docPath: "/notification_subscriptions/sub_alice",
        auth: adminAuth,
      });
      assert.equal(res.status, 200);
    });

    console.log("\n--- Suite 5: Delete Restrictions ---");

    await test("19. Anonymous visitor cannot delete anonymous subscription", async () => {
      const res = await request({
        method: "DELETE",
        docPath: "/notification_subscriptions/sub_anon_1",
        auth: null,
      });
      assert.equal(res.status, 403);
    });

    await test("20. Non-owner (Bob) cannot delete Alice's subscription", async () => {
      const res = await request({
        method: "DELETE",
        docPath: "/notification_subscriptions/sub_alice",
        auth: bobAuth,
      });
      assert.equal(res.status, 403);
    });

    await test("21. Owner (Alice) can delete her own subscription", async () => {
      const res = await request({
        method: "DELETE",
        docPath: "/notification_subscriptions/sub_alice",
        auth: aliceAuth,
      });
      assert.equal(res.status, 200);
    });

    await test("22. Admin can delete anonymous subscription", async () => {
      const res = await request({
        method: "DELETE",
        docPath: "/notification_subscriptions/sub_anon_1",
        auth: adminAuth,
      });
      assert.equal(res.status, 200);
    });
  } finally {
    proc.kill();
  }

  console.log(`\n========================================`);
  console.log(`Results: ${passed} / ${total} tests passed.`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner encountered error:", err);
  process.exit(1);
});
