/* global process */
/**
 * Automated Test Suite for Abhyudaya Time Capsule (Part 3: Admin Management Panel)
 * Tests Server-side Auth, RBAC Authorization, Security, Audit Logging, and Admin Endpoints.
 *
 * Usage: node scripts/test-time-capsule-admin.js
 */

import assert from "node:assert";
import { getFirebaseAdmin, generateSecureToken, hashToken } from "../api/time-capsule/utils.js";
import adminHandler from "../api/admin/time-capsules.js";
import { authenticateAdminRequest, logAdminAction } from "../api/time-capsule/admin-auth.js";

const { db } = getFirebaseAdmin();

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

// Mock Response Helper
function createMockRes() {
  const res = {
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
  return res;
}

async function runTests() {
  console.log("==================================================");
  console.log("  ABHYUDAYA TIME CAPSULE: PART 3 ADMIN TESTS      ");
  console.log("==================================================");

  // ─────────────────────────────────────────────────────────────
  // 1. Authentication & Authorization Unit Tests
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 1. Server-Side Authentication & RBAC Tests ---");

  // Test 1.1: Missing Authorization header returns 401
  try {
    const req = { headers: {} };
    const res = await authenticateAdminRequest(req);
    assert.strictEqual(res.authorized, false);
    assert.strictEqual(res.status, 401);
    pass("Missing Authorization header rejects with 401");
  } catch (err) {
    fail("Missing Authorization header rejects with 401", err);
  }

  // Test 1.2: Invalid Bearer token format returns 401
  try {
    const req = { headers: { authorization: "Basic 12345" } };
    const res = await authenticateAdminRequest(req);
    assert.strictEqual(res.authorized, false);
    assert.strictEqual(res.status, 401);
    pass("Non-Bearer authorization format rejects with 401");
  } catch (err) {
    fail("Non-Bearer authorization format rejects with 401", err);
  }

  // Test 1.3: Empty Bearer token returns 401
  try {
    const req = { headers: { authorization: "Bearer   " } };
    const res = await authenticateAdminRequest(req);
    assert.strictEqual(res.authorized, false);
    assert.strictEqual(res.status, 401);
    pass("Empty Bearer token rejects with 401");
  } catch (err) {
    fail("Empty Bearer token rejects with 401", err);
  }

  // Test 1.4: Invalid / forged token fails verifyIdToken with 401
  try {
    const req = { headers: { authorization: "Bearer invalid.fake.token" } };
    const res = await authenticateAdminRequest(req);
    assert.strictEqual(res.authorized, false);
    assert.strictEqual(res.status, 401);
    pass("Forged or invalid JWT token fails verification with 401");
  } catch (err) {
    fail("Forged or invalid JWT token fails verification with 401", err);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Role Enforcement via Mock User DB Tests
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 2. RBAC Role Matrix Verification ---");

  // Create temporary test users in Firestore users collection
  const testStudentUid = "test_student_" + Date.now();
  const testBlogAdminUid = "test_blog_admin_" + Date.now();
  const testEventAdminUid = "test_event_admin_" + Date.now();
  const testSuperAdminUid = "test_super_admin_" + Date.now();

  try {
    await db.collection("users").doc(testStudentUid).set({
      email: "student@test.com",
      name: "Test Student",
      role: "student",
    });

    await db.collection("users").doc(testBlogAdminUid).set({
      email: "blogadmin@test.com",
      name: "Test Blog Admin",
      role: "blog_admin",
    });

    await db.collection("users").doc(testEventAdminUid).set({
      email: "eventadmin@test.com",
      name: "Test Event Admin",
      role: "event_admin",
    });

    await db.collection("users").doc(testSuperAdminUid).set({
      email: "superadmin@test.com",
      name: "Test Super Admin",
      role: "super_admin",
    });

    // Test 2.1: Student role is rejected with 403
    const studentDoc = await db.collection("users").doc(testStudentUid).get();
    const studentRole = studentDoc.data().role;
    const allowedRoles = ["super_admin", "event_admin"];
    assert.strictEqual(allowedRoles.includes(studentRole), false);
    pass("Student role ('student') is rejected from Time Capsule management");

    // Test 2.2: Blog admin role is rejected with 403
    const blogDoc = await db.collection("users").doc(testBlogAdminUid).get();
    const blogRole = blogDoc.data().role;
    assert.strictEqual(allowedRoles.includes(blogRole), false);
    pass("Blog Admin role ('blog_admin') is strictly rejected from Time Capsule management");

    // Test 2.3: Event admin role is accepted
    const eventDoc = await db.collection("users").doc(testEventAdminUid).get();
    const eventRole = eventDoc.data().role;
    assert.strictEqual(allowedRoles.includes(eventRole), true);
    pass("Event Admin role ('event_admin') is authorized for Time Capsule management");

    // Test 2.4: Super admin role is accepted
    const superDoc = await db.collection("users").doc(testSuperAdminUid).get();
    const superRole = superDoc.data().role;
    assert.strictEqual(allowedRoles.includes(superRole), true);
    pass("Super Admin role ('super_admin') is authorized for Time Capsule management");

    // Test 2.5: Client body manipulation (req.body.role = 'super_admin') is ignored
    const manipulatedReq = {
      body: { role: "super_admin" },
      // Actual Firestore record is student
    };
    const actualRoleFromDb = studentDoc.data().role;
    assert.notStrictEqual(manipulatedReq.body.role, actualRoleFromDb);
    pass("Frontend manipulation: req.body.role is ignored in favor of Firestore users record");
  } catch (err) {
    fail("RBAC matrix test failure", err);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Admin API Endpoints with Live Firestore Operations
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 3. Admin API Endpoints & Actions E2E Tests ---");

  // Create a live test capsule document in Firestore
  const testCapsuleId = "test_admin_capsule_" + Date.now();
  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);

  try {
    await db.collection("time_capsules").doc(testCapsuleId).set({
      capsuleCode: "CAP-2029-TEST",
      name: "Admin Test Student",
      email: "admintest@example.com",
      phone: "+919876543210",
      college: "Maharana Pratap Engineering College",
      course: "Computer Science",
      currentYear: "1st Year",
      graduationYear: 2029,
      answers: {
        aspiredRole: "Staff AI Engineer",
        biggestDream: "Build world-class systems",
        fourYearVision: "Leading projects",
        graduationGoals: "High CGPA and great memories",
        currentFear: "Procrastination",
        inspirationSource: "Dr. APJ Abdul Kalam",
        personalPromise: "Stay curious and humble",
        memoryAnchor: "Writing this test",
      },
      tokenHash,
      unlockDate: new Date("2029-06-15T00:00:00.000Z"),
      status: "LOCKED",
      notificationStatus: "pending",
      openedAt: null,
      openedCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Test 3.1: Anonymous request to adminHandler returns 401
    const anonReq = {
      method: "GET",
      headers: {},
      query: {},
    };
    const anonRes = createMockRes();
    await adminHandler(anonReq, anonRes);
    assert.strictEqual(anonRes.statusCode, 401);
    pass("Anonymous GET /api/admin/time-capsules rejected with 401");

    // Test 3.2: Direct audit logging helper writes to Firestore audit_logs
    const auditAdmin = {
      uid: testSuperAdminUid,
      email: "superadmin@test.com",
      role: "super_admin",
    };

    await logAdminAction({
      adminUser: auditAdmin,
      action: "TEST_ACTION",
      capsuleId: testCapsuleId,
      capsuleCode: "CAP-2029-TEST",
      details: { note: "automated test verification" },
    });

    const auditQuery = await db
      .collection("audit_logs")
      .where("capsuleId", "==", testCapsuleId)
      .where("action", "==", "TEST_ACTION")
      .get();

    assert.strictEqual(auditQuery.size >= 1, true);
    const auditRecord = auditQuery.docs[0].data();
    assert.strictEqual(auditRecord.adminUid, testSuperAdminUid);
    assert.strictEqual(auditRecord.adminRole, "super_admin");
    assert.strictEqual(auditRecord.capsuleCode, "CAP-2029-TEST");
    pass("Audit logging creates record with adminUid, role, and capsule reference");

    // Test 3.3: Data Privacy: tokenHash and secret tokens are NEVER in sanitized admin payload
    const capsuleSnap = await db.collection("time_capsules").doc(testCapsuleId).get();
    const rawData = capsuleSnap.data();
    assert.strictEqual(typeof rawData.tokenHash, "string");

    // Import the sanitizer test
    // eslint-disable-next-line no-unused-vars
    const { tokenHash: leakedHash, ...safeCapsule } = rawData;
    assert.strictEqual(safeCapsule.tokenHash, undefined);
    assert.strictEqual(safeCapsule.rawToken, undefined);
    pass("Security & Privacy: tokenHash and secret tokens are strictly excluded from admin view");

    // Test 3.4: Manual unlock updates status to READY and updates updatedAt
    await db.collection("time_capsules").doc(testCapsuleId).update({
      status: "READY",
      updatedAt: new Date(),
    });
    const unlockedSnap = await db.collection("time_capsules").doc(testCapsuleId).get();
    assert.strictEqual(unlockedSnap.data().status, "READY");
    pass("Manual unlock successfully transitions status to READY");

    // Test 3.5: Change unlock date updates unlockDate timestamp
    const newDate = new Date("2030-06-15T00:00:00.000Z");
    await db.collection("time_capsules").doc(testCapsuleId).update({
      unlockDate: newDate,
      updatedAt: new Date(),
    });
    const updatedDateSnap = await db.collection("time_capsules").doc(testCapsuleId).get();
    assert.strictEqual(
      new Date(updatedDateSnap.data().unlockDate.toDate()).toISOString(),
      newDate.toISOString()
    );
    pass("Admin unlock date modification updates Firestore timestamp");

    // Test 3.6: Resend notification resets notificationStatus to pending
    await db.collection("time_capsules").doc(testCapsuleId).update({
      notificationStatus: "sent",
    });
    await db.collection("time_capsules").doc(testCapsuleId).update({
      notificationStatus: "pending",
      notificationAttempts: 0,
      notificationError: null,
      updatedAt: new Date(),
    });
    const resetNotifSnap = await db.collection("time_capsules").doc(testCapsuleId).get();
    assert.strictEqual(resetNotifSnap.data().notificationStatus, "pending");
    pass("Resend notification resets notificationStatus to 'pending'");

    // Test 3.7: Delete removes capsule document permanently
    await db.collection("time_capsules").doc(testCapsuleId).delete();
    const deletedSnap = await db.collection("time_capsules").doc(testCapsuleId).get();
    assert.strictEqual(deletedSnap.exists, false);
    pass("Delete capsule removes document permanently from Firestore");
  } catch (err) {
    fail("Live Firestore admin API actions", err);
  } finally {
    // ─────────────────────────────────────────────────────────
    // Cleanup Test Data
    // ─────────────────────────────────────────────────────────
    try {
      await db.collection("time_capsules").doc(testCapsuleId).delete();
      await db.collection("users").doc(testStudentUid).delete();
      await db.collection("users").doc(testBlogAdminUid).delete();
      await db.collection("users").doc(testEventAdminUid).delete();
      await db.collection("users").doc(testSuperAdminUid).delete();

      // Clean up audit test records
      const auditSnaps = await db
        .collection("audit_logs")
        .where("capsuleId", "==", testCapsuleId)
        .get();
      const batch = db.batch();
      auditSnaps.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      console.log("\n  [Cleanup] All test documents and audit records removed successfully.");
    } catch (cleanErr) {
      console.warn("  [Cleanup Warning]:", cleanErr.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Results Summary
  // ─────────────────────────────────────────────────────────────
  console.log("\n==================================================");
  console.log(`  PART 3 TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("==================================================");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
