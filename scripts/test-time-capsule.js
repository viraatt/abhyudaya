/* global process */
/**
 * Automated Test Suite for Abhyudaya Time Capsule (Part 1)
 *
 * Tests:
 * 1. Utility functions (date calculations, token generation, hashing, sanitization, rate limiting)
 * 2. Create API endpoint validation, rate limiting, and execution
 * 3. Duplicate submission enforcement
 * 4. Verify API endpoint token validation, locked state protection, and unlocked payload delivery
 * 5. Firestore security rules integrity check
 */

import assert from "assert";
import fs from "fs";
import path from "path";
import createHandler from "../api/time-capsule/create.js";
import verifyHandler from "../api/time-capsule/verify.js";
import {
  getDefaultUnlockDate,
  generateSecureToken,
  hashToken,
  generateCapsuleCode,
  sanitizeText,
  checkRateLimit,
  EMAIL_REGEX,
  INDIAN_PHONE_REGEX,
  getFirebaseAdmin,
} from "../api/time-capsule/utils.js";

// Mock helper to create HTTP req/res objects for serverless functions
function createMockReqRes({
  method = "POST",
  headers = { "content-type": "application/json" },
  body = {},
  query = {},
} = {}) {
  let statusCode = 200;
  let responseData = null;

  const req = {
    method,
    headers,
    body,
    query,
    socket: { remoteAddress: "127.0.0.1" },
  };

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData,
  };

  return { req, res };
}

async function runTests() {
  console.log("\n==================================================");
  console.log("  ABHYUDAYA TIME CAPSULE: PART 1 AUTOMATED TESTS  ");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  FAIL: ${name}`);
      console.error(`        Error: ${err.message}`);
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  FAIL: ${name}`);
      console.error(`        Error: ${err.message}`);
    }
  }

  // ── 1. Unit Tests: Utilities ─────────────────────────────────
  console.log("--- 1. Utility & Helper Unit Tests ---");

  test("getDefaultUnlockDate returns June 15 UTC of graduation year", () => {
    const d2028 = getDefaultUnlockDate(2028);
    assert.strictEqual(d2028.getUTCFullYear(), 2028);
    assert.strictEqual(d2028.getUTCMonth(), 5); // June is month index 5
    assert.strictEqual(d2028.getUTCDate(), 15);
    assert.strictEqual(d2028.getUTCHours(), 0);
  });

  test("getDefaultUnlockDate throws on invalid year", () => {
    assert.throws(() => getDefaultUnlockDate("invalid"), /Invalid graduation year/);
    assert.throws(() => getDefaultUnlockDate(1990), /Invalid graduation year/);
  });

  test("generateSecureToken returns 64-char hex string with high entropy", () => {
    const t1 = generateSecureToken();
    const t2 = generateSecureToken();
    assert.strictEqual(t1.length, 64);
    assert.strictEqual(t2.length, 64);
    assert.notStrictEqual(t1, t2);
    assert.ok(/^[a-f0-9]{64}$/.test(t1));
  });

  test("hashToken computes valid deterministic SHA-256 hex digest", () => {
    const raw = "test-secret-token-123";
    const h1 = hashToken(raw);
    const h2 = hashToken(raw);
    assert.strictEqual(h1, h2);
    assert.strictEqual(h1.length, 64);
    assert.throws(() => hashToken(""), /Cannot hash an invalid/);
  });

  test("generateCapsuleCode generates formatted reference code", () => {
    const code = generateCapsuleCode(2029);
    assert.ok(code.startsWith("CAP-2029-"));
  });

  test("sanitizeText strips malicious HTML and scripts (XSS Prevention)", () => {
    const dirty = '<script>alert("hack")</script>Hello <b>World</b><iframe src="evil.com"></iframe>';
    const clean = sanitizeText(dirty);
    assert.strictEqual(clean, 'alert("hack")Hello World');
    assert.ok(!clean.includes("<"));
    assert.ok(!clean.includes(">"));
  });

  test("Regex validation for email and Indian phone numbers", () => {
    assert.ok(EMAIL_REGEX.test("student@mpec.ac.in"));
    assert.ok(!EMAIL_REGEX.test("notanemail"));
    assert.ok(INDIAN_PHONE_REGEX.test("9876543210"));
    assert.ok(INDIAN_PHONE_REGEX.test("+919876543210"));
    assert.ok(INDIAN_PHONE_REGEX.test("09876543210"));
    assert.ok(!INDIAN_PHONE_REGEX.test("12345"));
  });

  test("checkRateLimit allows within limit and restricts when exceeded", () => {
    const testIp = `test_ip_${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      const res = checkRateLimit(testIp, 5, 10000);
      assert.strictEqual(res.allowed, true);
    }
    const exceeded = checkRateLimit(testIp, 5, 10000);
    assert.strictEqual(exceeded.allowed, false);
  });

  // ── 2. Handler Tests: Create API ─────────────────────────────
  console.log("\n--- 2. Create API Endpoint Tests ---");

  await asyncTest("Create API rejects non-POST HTTP methods with 405", async () => {
    const { req, res } = createMockReqRes({ method: "GET" });
    await createHandler(req, res);
    assert.strictEqual(res.getStatusCode(), 405);
    assert.strictEqual(res.getData().success, false);
  });

  await asyncTest("Create API rejects invalid Content-Type with 400", async () => {
    const { req, res } = createMockReqRes({
      headers: { "content-type": "text/plain" },
    });
    await createHandler(req, res);
    assert.strictEqual(res.getStatusCode(), 400);
  });

  await asyncTest("Create API rejects missing and invalid student fields with 400", async () => {
    const { req, res } = createMockReqRes({
      body: {
        name: "A", // too short
        email: "invalid-email",
        phone: "123", // invalid phone
        college: "",
        course: "",
        currentYear: "5th Year", // invalid year
        graduationYear: 2010, // past year
        answers: {}, // missing answers
      },
    });
    await createHandler(req, res);
    assert.strictEqual(res.getStatusCode(), 400);
    const data = res.getData();
    assert.strictEqual(data.success, false);
    assert.ok(data.details.name);
    assert.ok(data.details.email);
    assert.ok(data.details.phone);
    assert.ok(data.details.college);
    assert.ok(data.details.course);
    assert.ok(data.details.currentYear);
    assert.ok(data.details.graduationYear);
    assert.ok(data.details["answers.aspiredRole"]);
  });

  // ── 3. Live Firestore End-to-End Tests ────────────────────────
  console.log("\n--- 3. Firestore End-to-End API Flow Tests ---");

  const testEmail = `capsule_test_${Date.now()}@example.com`;
  let createdRawToken = null;
  let createdCapsuleCode = null;

  const validPayload = {
    name: "Arjun Sharma",
    email: testEmail,
    phone: "9876543210",
    college: "Maharana Pratap Engineering College",
    course: "Computer Science & Engineering",
    currentYear: "1st Year",
    graduationYear: 2029,
    answers: {
      aspiredRole: "Lead AI Systems Architect",
      biggestDream: "Build groundbreaking software and launch an innovative startup.",
      fourYearVision: "Standing on the graduation stage with top skills, strong projects, and lifelong friends.",
      graduationGoals: "Publish 2 technical papers, win hackathons, and secure a stellar placement.",
      currentFear: "Failing to live up to my own high expectations.",
      inspirationSource: "Dr. APJ Abdul Kalam for his vision, humility, and dedication.",
      personalPromise: "I will never stop learning, remain resilient, and always help my peers.",
      memoryAnchor: "The nervous excitement of my first week at college in the computer lab.",
    },
  };

  await asyncTest("Create API successfully creates locked capsule in Firestore", async () => {
    const { req, res } = createMockReqRes({ body: validPayload });
    await createHandler(req, res);

    assert.strictEqual(res.getStatusCode(), 201);
    const data = res.getData();
    assert.strictEqual(data.success, true);
    assert.ok(data.capsuleCode);
    assert.ok(data.unlockDate);
    assert.ok(data.rawToken);
    assert.strictEqual(data.rawToken.length, 64);

    createdRawToken = data.rawToken;
    createdCapsuleCode = data.capsuleCode;
  });

  await asyncTest("Create API rejects duplicate active submission for same email with 409", async () => {
    const { req, res } = createMockReqRes({ body: validPayload });
    await createHandler(req, res);

    assert.strictEqual(res.getStatusCode(), 409);
    assert.strictEqual(res.getData().success, false);
    assert.ok(res.getData().error.includes("already locked"));
  });

  // ── 4. Verify API Endpoint Tests ─────────────────────────────
  console.log("\n--- 4. Verify API Endpoint Tests ---");

  await asyncTest("Verify API rejects missing token with 400", async () => {
    const { req, res } = createMockReqRes({ body: {} });
    await verifyHandler(req, res);
    assert.strictEqual(res.getStatusCode(), 400);
  });

  await asyncTest("Verify API rejects non-hex / malformed token with 400", async () => {
    const { req, res } = createMockReqRes({ body: { token: "invalid-short-token" } });
    await verifyHandler(req, res);
    assert.strictEqual(res.getStatusCode(), 400);
    assert.ok(res.getData().error.includes("64-character hexadecimal"));
  });

  await asyncTest("Verify API returns 404 for unknown random 64-char hex token", async () => {
    const randomToken = generateSecureToken();
    const { req, res } = createMockReqRes({ body: { token: randomToken } });
    await verifyHandler(req, res);
    assert.strictEqual(res.getStatusCode(), 404);
  });

  await asyncTest("Verify API returns 403 locked (NO answers disclosed) when unlockDate is in future", async () => {
    assert.ok(createdRawToken, "A valid raw token must exist from the create test");
    const { req, res } = createMockReqRes({ body: { token: createdRawToken } });
    await verifyHandler(req, res);

    assert.strictEqual(res.getStatusCode(), 403);
    const data = res.getData();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.locked, true);
    assert.strictEqual(data.capsuleCode, createdCapsuleCode);
    assert.ok(data.unlockDate);
    // Security check: Answers, phone, email must NEVER be returned!
    assert.strictEqual(data.answers, undefined);
    assert.strictEqual(data.phone, undefined);
    assert.strictEqual(data.email, undefined);
  });

  await asyncTest("Verify API successfully unlocks and returns answers when unlockDate has arrived", async () => {
    // Simulate unlock date arrival by updating the test document's unlockDate to yesterday
    const { db, Timestamp } = getFirebaseAdmin();
    const tokenH = hashToken(createdRawToken);

    const snap = await db
      .collection("time_capsules")
      .where("tokenHash", "==", tokenH)
      .limit(1)
      .get();

    assert.ok(!snap.empty, "Test capsule document must exist in Firestore");
    const docRef = snap.docs[0].ref;

    // Set unlockDate to yesterday
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await docRef.update({
      unlockDate: Timestamp.fromDate(yesterday),
    });

    const { req, res } = createMockReqRes({ body: { token: createdRawToken } });
    await verifyHandler(req, res);

    assert.strictEqual(res.getStatusCode(), 200);
    const data = res.getData();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.locked, false);
    assert.strictEqual(data.capsuleCode, createdCapsuleCode);
    assert.strictEqual(data.name, "Arjun Sharma");
    assert.strictEqual(data.college, "Maharana Pratap Engineering College");
    assert.ok(data.answers);
    assert.strictEqual(data.answers.aspiredRole, "Lead AI Systems Architect");
    assert.strictEqual(data.answers.biggestDream, validPayload.answers.biggestDream);

    // Verify status was updated to OPENED in Firestore
    const updatedSnap = await docRef.get();
    assert.strictEqual(updatedSnap.data().status, "OPENED");
    assert.ok(updatedSnap.data().openedAt);
    assert.strictEqual(updatedSnap.data().openedCount, 1);
  });

  await asyncTest("Verify API repeated opening is idempotent and increments openedCount", async () => {
    const { req, res } = createMockReqRes({ body: { token: createdRawToken } });
    await verifyHandler(req, res);

    assert.strictEqual(res.getStatusCode(), 200);
    const data = res.getData();
    assert.strictEqual(data.success, true);

    const { db } = getFirebaseAdmin();
    const snap = await db
      .collection("time_capsules")
      .where("tokenHash", "==", hashToken(createdRawToken))
      .limit(1)
      .get();

    assert.strictEqual(snap.docs[0].data().openedCount, 2);
  });

  // ── 5. Firestore Rules & Index Verification ───────────────────
  console.log("\n--- 5. Firestore Security Rules & Indexes Check ---");

  test("firestore.rules contains time_capsules rule denying public creates and allowing admins", () => {
    const rulesPath = path.resolve(process.cwd(), "firestore.rules");
    const rulesContent = fs.readFileSync(rulesPath, "utf8");
    assert.ok(rulesContent.includes("match /time_capsules/{capsuleId}"));
    assert.ok(rulesContent.includes("allow create: if false;"));
    assert.ok(rulesContent.includes("allow read, update, delete: if isAdmin(['super_admin', 'event_admin']);"));
  });

  test("firestore.indexes.json contains composite indexes for time_capsules", () => {
    const indexesPath = path.resolve(process.cwd(), "firestore.indexes.json");
    const indexesContent = fs.readFileSync(indexesPath, "utf8");
    const parsed = JSON.parse(indexesContent);
    const capsuleIndexes = parsed.indexes.filter(
      (idx) => idx.collectionGroup === "time_capsules"
    );
    // 4 indexes: (email+createdAt), (status+unlockDate), (graduationYear+createdAt), (notificationStatus+unlockDate)
    assert.strictEqual(capsuleIndexes.length, 4);
  });


  // Clean up test document from Firestore
  try {
    const { db } = getFirebaseAdmin();
    const snap = await db
      .collection("time_capsules")
      .where("email", "==", testEmail)
      .get();
    for (const doc of snap.docs) {
      await doc.ref.delete();
    }
    console.log("\n  [Cleanup] Test document successfully cleaned up from Firestore.");
  } catch (err) {
    console.warn("  [Cleanup] Warning: Failed to clean up test document:", err.message);
  }

  console.log("\n==================================================");
  console.log(`  TEST RESULTS: ${passed}/${total} PASSED (${passed === total ? "ALL TESTS PASSED!" : "SOME TESTS FAILED"})`);
  console.log("==================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed with fatal error:", err);
  process.exit(1);
});
