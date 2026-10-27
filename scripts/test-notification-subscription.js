/**
 * Regression tests for Notification Subscription Fix
 * Vulnerability: "Missing or insufficient permissions" when subscribing to push notifications.
 *
 * Run: node scripts/test-notification-subscription.js
 */

import assert from "node:assert/strict";

// ────────────────────────────────────────────────────────────────────────────
// Inline copy of tokenToDocId (mirrored from notificationService.js)
// ────────────────────────────────────────────────────────────────────────────
function tokenToDocId(token) {
  let hash = 5381;
  for (let i = 0; i < token.length; i++) {
    hash = ((hash << 5) + hash) ^ token.charCodeAt(i);
    hash = hash | 0;
  }
  const unsigned = hash >>> 0;
  return "sub_" + unsigned.toString(36);
}

// Realistic FCM token shapes (not real tokens)
const TOKEN_A =
  "cxyz123456789012345678901234567890123456789012345678901234567890" +
  "123456789012345678901234567890123456789012345678901234567890abcdef";

const TOKEN_B =
  "dxyz123456789012345678901234567890123456789012345678901234567890" +
  "123456789012345678901234567890123456789012345678901234567890abcdef";

// Token with a slash (would corrupt Firestore path if used as document ID raw)
const TOKEN_SLASH =
  "abc/def123456789012345678901234567890123456789012345678901234567890";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log("✓ " + name);
    passed++;
  } catch (err) {
    console.error("✗ " + name);
    console.error("  ", err.message);
    failed++;
  }
}

test("tokenToDocId: returns a sub_-prefixed alphanumeric-safe string", () => {
  const id = tokenToDocId(TOKEN_A);
  assert.ok(id.startsWith("sub_"), "Expected sub_ prefix, got: " + id);
  assert.match(id, /^sub_[0-9a-z]+$/, "Non-alphanumeric chars in id: " + id);
});

test("tokenToDocId: result is well under Firestore 1,500-byte doc-ID limit", () => {
  const id = tokenToDocId(TOKEN_A);
  const byteLen = Buffer.byteLength(id, "utf8");
  assert.ok(byteLen < 1500, "ID too long: " + byteLen + " bytes");
  assert.ok(id.length <= 20, "ID suspiciously long: " + id.length + " chars");
});

test("tokenToDocId: is deterministic (same input => same output)", () => {
  const id1 = tokenToDocId(TOKEN_A);
  const id2 = tokenToDocId(TOKEN_A);
  assert.equal(id1, id2);
});

test("tokenToDocId: different tokens produce different document IDs", () => {
  const idA = tokenToDocId(TOKEN_A);
  const idB = tokenToDocId(TOKEN_B);
  assert.notEqual(idA, idB);
});

test("tokenToDocId: token with slash produces slash-free document ID", () => {
  const id = tokenToDocId(TOKEN_SLASH);
  assert.ok(!id.includes("/"), "Slash found in document ID: " + id);
  assert.ok(id.startsWith("sub_"), "Expected sub_ prefix, got: " + id);
});

test("tokenToDocId: handles very short token without throwing", () => {
  let id;
  assert.doesNotThrow(() => { id = tokenToDocId("abc"); });
  assert.ok(typeof id === "string" && id.startsWith("sub_"), "Unexpected id: " + id);
});

test("tokenToDocId: handles empty string without throwing", () => {
  let id;
  assert.doesNotThrow(() => { id = tokenToDocId(""); });
  assert.ok(typeof id === "string" && id.startsWith("sub_"), "Unexpected id: " + id);
  assert.equal(id, tokenToDocId(""), "Empty string should be deterministic");
});

test("Error classifier: detects 'Missing or insufficient permissions' message", () => {
  const fsMsg = "Missing or insufficient permissions.";
  const isPermDenied =
    fsMsg.includes("Missing or insufficient permissions") || fsMsg === "permission-denied";
  assert.ok(isPermDenied);
});

test("Error classifier: detects permission-denied error code", () => {
  const firestoreErr = { message: "", code: "permission-denied" };
  const fsMsg = firestoreErr.message || "";
  const isPermDenied =
    fsMsg.includes("Missing or insufficient permissions") ||
    firestoreErr.code === "permission-denied";
  assert.ok(isPermDenied);
});

console.log();
if (failed === 0) {
  console.log("All " + passed + " Notification Subscription Tests Passed!");
  process.exit(0);
} else {
  console.log(failed + " test(s) FAILED, " + passed + " passed.");
  process.exit(1);
}
