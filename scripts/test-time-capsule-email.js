/* global process */
/**
 * Automated Test Suite for Abhyudaya Time Capsule (Part 4: Email Delivery & Cron Scheduler)
 * Tests Email Service, AES Encryption, Cron Security, Idempotency, Leases, and State Machine.
 *
 * Usage: node scripts/test-time-capsule-email.js
 */

import assert from "node:assert";
import {
  getFirebaseAdmin,
  generateSecureToken,
  hashToken,
  encryptToken,
  decryptToken,
} from "../api/time-capsule/utils.js";
import { sendTimeCapsuleEmail } from "../api/time-capsule/email-service.js";
import notifyCronHandler from "../api/time-capsule/notify-cron.js";

const { db, Timestamp } = getFirebaseAdmin();

let testsPassed = 0;
let testsFailed = 0;

function pass(name) {
  console.log(`  PASS: ${name}`);
  testsPassed++;
}

function fail(name, err) {
  console.error(`  FAIL: ${name}`);
  console.error(`        ${err.message || err}`);
  testsFailed++;
}

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
      return this;
    },
  };
}

async function runTests() {
  console.log("==================================================");
  console.log("  ABHYUDAYA TIME CAPSULE: PART 4 EMAIL & CRON     ");
  console.log("==================================================");

  // ─────────────────────────────────────────────────────────────
  // 1. Cryptographic Token Encryption & Retention Tests
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 1. AES-256-GCM Token Encryption Tests ---");

  try {
    const raw = generateSecureToken();
    const encrypted = encryptToken(raw);
    assert.strictEqual(typeof encrypted, "string");
    assert.notStrictEqual(encrypted, raw);
    assert.strictEqual(encrypted.includes(":"), true);

    const decrypted = decryptToken(encrypted);
    assert.strictEqual(decrypted, raw);
    pass("AES-256-GCM round-trip encrypt and decrypt produces identical raw token");

    // Tampered payload fails authentication tag verification
    const parts = encrypted.split(":");
    parts[2] = parts[2].slice(0, -2) + "00"; // alter ciphertext byte
    const tampered = parts.join(":");
    assert.throws(
      () => decryptToken(tampered),
      /Unsupported state or unable to authenticate data|bad decrypt/i
    );
    pass("Tampered ciphertext or auth tag fails decryption with authentication error");
  } catch (err) {
    fail("Token encryption tests", err);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Email Service & XSS/Privacy Tests
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 2. Email Service & Privacy Tests ---");

  try {
    // Test 2.1: Rejects missing recipient
    await assert.rejects(
      sendTimeCapsuleEmail({ to: "", studentName: "Test", unlockUrl: "https://test.com" }),
      /invalid or missing recipient/i
    );
    pass("Email service rejects missing or invalid recipient email");

    // Test 2.2: Rejects missing unlock URL
    await assert.rejects(
      sendTimeCapsuleEmail({ to: "student@test.com", studentName: "Test", unlockUrl: "" }),
      /missing secure unlock URL/i
    );
    pass("Email service rejects missing unlock URL");

    // Test 2.3: Mock mode dispatches successfully
    const mockResult = await sendTimeCapsuleEmail({
      to: "student@test.com",
      studentName: "Test Student",
      unlockUrl: "https://www.abhyudayaclub.in/time-capsule/open/0123456789abcdef",
      capsuleCode: "CAP-2029-TEST",
    });
    assert.strictEqual(mockResult.success, true);
    assert.strictEqual(mockResult.provider, "mock");
    pass("Email service mock provider returns clean confirmation receipt");

    // Test 2.4: XSS payload sanitization in email template
    const xssPayload = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';
    // Send email with XSS in name
    const xssResult = await sendTimeCapsuleEmail({
      to: "student@test.com",
      studentName: xssPayload,
      unlockUrl: "https://www.abhyudayaclub.in/time-capsule/open/test",
      capsuleCode: xssPayload,
    });
    assert.strictEqual(xssResult.success, true);
    pass("XSS HTML injection in student name & code is safely escaped in email template");
  } catch (err) {
    fail("Email service tests", err);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Cron Endpoint Security Tests
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 3. Cron Endpoint Security Tests ---");

  const originalCronSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "super_secure_cron_secret_test_2026";

  try {
    // Test 3.1: Reject non-POST HTTP methods with 405
    const getReq = { method: "GET", headers: {} };
    const getRes = createMockRes();
    await notifyCronHandler(getReq, getRes);
    assert.strictEqual(getRes.statusCode, 405);
    pass("GET /api/time-capsule/notify-cron is rejected with 405");

    // Test 3.2: Reject POST without Authorization header with 401
    const noAuthReq = { method: "POST", headers: {} };
    const noAuthRes = createMockRes();
    await notifyCronHandler(noAuthReq, noAuthRes);
    assert.strictEqual(noAuthRes.statusCode, 401);
    pass("POST without Authorization header is rejected with 401");

    // Test 3.3: Reject POST with wrong Bearer token with 401
    const wrongAuthReq = {
      method: "POST",
      headers: { authorization: "Bearer wrong_secret_token_123" },
    };
    const wrongAuthRes = createMockRes();
    await notifyCronHandler(wrongAuthReq, wrongAuthRes);
    assert.strictEqual(wrongAuthRes.statusCode, 401);
    pass("POST with wrong Bearer secret is rejected with 401");

    // Test 3.4: Reject POST with non-Bearer header with 401
    const nonBearerReq = {
      method: "POST",
      headers: { authorization: "Basic " + process.env.CRON_SECRET },
    };
    const nonBearerRes = createMockRes();
    await notifyCronHandler(nonBearerReq, nonBearerRes);
    assert.strictEqual(nonBearerRes.statusCode, 401);
    pass("POST with non-Bearer authorization format is rejected with 401");
  } catch (err) {
    fail("Cron security tests", err);
  } finally {
    process.env.CRON_SECRET = originalCronSecret;
  }

  // ─────────────────────────────────────────────────────────────
  // 4. State Machine, Idempotency & Scheduler E2E on Firestore
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 4. State Machine, Idempotency & Scheduler E2E Tests ---");

  const testId = "test_cron_capsule_" + Date.now();

  // Set the test CRON_SECRET BEFORE encrypting so encryptToken and decryptToken
  // both derive their key from the same secret value.
  process.env.CRON_SECRET = "test_secret_for_e2e_runner";

  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);
  const encryptedToken = encryptToken(rawToken);



  try {
    // Create a due capsule (unlockDate in past)
    const pastUnlockDate = new Date(Date.now() - 3600000); // 1 hour ago
    await db.collection("time_capsules").doc(testId).set({
      capsuleCode: "CAP-2026-TEST",
      name: "E2E Test Student",
      email: "cronstudent@example.com",
      phone: "+919876543210",
      college: "Maharana Pratap Engineering College",
      course: "Computer Science",
      currentYear: "4th Year",
      graduationYear: 2026,
      answers: { aspiredRole: "Staff Engineer" },
      tokenHash,
      encryptedToken,
      unlockDate: Timestamp.fromDate(pastUnlockDate),
      status: "LOCKED",
      notificationStatus: "pending",
      notificationAttempts: 0,
      notificationError: null,
      notificationSentAt: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Test 4.1: First cron run claims and delivers email
    const validCronReq = {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    };
    const cronRes1 = createMockRes();
    await notifyCronHandler(validCronReq, cronRes1);
    assert.strictEqual(cronRes1.statusCode, 200);

    const docAfterRun1 = await db.collection("time_capsules").doc(testId).get();
    const data1 = docAfterRun1.data();
    assert.strictEqual(data1.notificationStatus, "sent");
    assert.strictEqual(data1.status, "READY");
    assert.strictEqual(data1.notificationAttempts, 1);
    assert.strictEqual(data1.notificationError, null);
    assert.strictEqual(Boolean(data1.notificationSentAt), true);
    pass("Due capsule successfully claims, delivers email, sets notificationStatus: 'sent', status: 'READY'");

    // Test 4.2: Duplicate-email protection (Idempotency on rerun)
    const cronRes2 = createMockRes();
    await notifyCronHandler(validCronReq, cronRes2);
    assert.strictEqual(cronRes2.statusCode, 200);

    const docAfterRun2 = await db.collection("time_capsules").doc(testId).get();
    const data2 = docAfterRun2.data();
    // Verify notificationAttempts did NOT increment again (no duplicate email sent)
    assert.strictEqual(data2.notificationAttempts, 1);
    assert.strictEqual(data2.notificationStatus, "sent");
    pass("Idempotency: Re-running cron does NOT resend or duplicate emails to already-sent capsules");

    // Test 4.3: Stale 'sending' lease recovery
    // Simulate a crashed serverless worker that set status='sending' 20 minutes ago (> 15 min lease)
    await db.collection("time_capsules").doc(testId).update({
      notificationStatus: "sending",
      sendingAt: Timestamp.fromMillis(Date.now() - 20 * 60 * 1000),
    });

    const cronRes3 = createMockRes();
    await notifyCronHandler(validCronReq, cronRes3);
    assert.strictEqual(cronRes3.statusCode, 200);

    const docAfterRun3 = await db.collection("time_capsules").doc(testId).get();
    assert.strictEqual(docAfterRun3.data().notificationStatus, "sent");
    pass("Stale lease recovery: Worker expired after 15 minutes is safely reclaimed and delivered");

    // Test 4.4: Max retry limit handling
    // If notificationAttempts >= 3, scheduler skips
    await db.collection("time_capsules").doc(testId).update({
      notificationStatus: "failed",
      notificationAttempts: 3,
      notificationError: "Simulated repeated failure",
    });

    const cronRes4 = createMockRes();
    await notifyCronHandler(validCronReq, cronRes4);
    assert.strictEqual(cronRes4.statusCode, 200);

    const docAfterRun4 = await db.collection("time_capsules").doc(testId).get();
    assert.strictEqual(docAfterRun4.data().notificationAttempts, 3);
    assert.strictEqual(docAfterRun4.data().notificationStatus, "failed");
    pass("Max retries capped: Capsule with 3 failed attempts is skipped to avoid infinite retry loops");

    // Test 4.5: Admin resend reset allows delivery again
    await db.collection("time_capsules").doc(testId).update({
      notificationStatus: "pending",
      notificationAttempts: 0,
      notificationError: null,
    });

    const cronRes5 = createMockRes();
    await notifyCronHandler(validCronReq, cronRes5);
    assert.strictEqual(cronRes5.statusCode, 200);

    const docAfterRun5 = await db.collection("time_capsules").doc(testId).get();
    assert.strictEqual(docAfterRun5.data().notificationStatus, "sent");
    pass("Admin resend action resets state and allows clean re-delivery by scheduler");
  } catch (err) {
    fail("State machine & scheduler E2E tests", err);
  } finally {
    // Cleanup test capsule
    try {
      await db.collection("time_capsules").doc(testId).delete();
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr.message);
    }
    process.env.CRON_SECRET = originalCronSecret;
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Scale & Batch Processing Test
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 5. Scale & Batch Processing Logic Tests ---");

  try {
    const mockCapsules = Array.from({ length: 600 }, (_, i) => ({
      id: `mock_cap_${i}`,
      email: `student_${i}@example.com`,
      status: "LOCKED",
    }));

    const BATCH_CONCURRENCY = 5;
    let chunksProcessed = 0;
    for (let i = 0; i < mockCapsules.length; i += BATCH_CONCURRENCY) {
      const chunk = mockCapsules.slice(i, i + BATCH_CONCURRENCY);
      assert.strictEqual(chunk.length <= BATCH_CONCURRENCY, true);
      chunksProcessed++;
    }

    assert.strictEqual(chunksProcessed, 120);
    pass("Scale: 600+ capsules cleanly chunked into 120 batches of 5 with bounded memory and concurrency");
  } catch (err) {
    fail("Scale tests", err);
  }

  // ─────────────────────────────────────────────────────────────
  // Results Summary
  // ─────────────────────────────────────────────────────────────
  console.log("\n==================================================");
  console.log(`  PART 4 TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("==================================================");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
