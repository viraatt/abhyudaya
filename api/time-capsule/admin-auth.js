import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "./utils.js";

/**
 * Authenticates an incoming admin request via Firebase Auth ID Token (Bearer token),
 * looks up the user's role in Firestore `users/{uid}`, and authorizes against allowed roles.
 *
 * @param {object} req - Incoming HTTP request
 * @param {string[]} allowedRoles - List of permitted roles (e.g. ['super_admin', 'event_admin'])
 * @returns {Promise<{authorized: boolean, user?: object, error?: string, status?: number}>}
 */
export async function authenticateAdminRequest(
  req,
  allowedRoles = ["super_admin", "event_admin"]
) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return {
      authorized: false,
      error: "Unauthorized: Missing or invalid Authorization header. Bearer token required.",
      status: 401,
    };
  }

  const idToken = authHeader.substring(7).trim();
  if (!idToken) {
    return {
      authorized: false,
      error: "Unauthorized: Empty authentication token.",
      status: 401,
    };
  }

  const { admin, db } = getFirebaseAdmin();
  const auth = getAuth(admin);

  let decodedToken;
  try {
    decodedToken = await auth.verifyIdToken(idToken);
  } catch (err) {
    return {
      authorized: false,
      error: `Unauthorized: Token verification failed (${err.message || "invalid token"}).`,
      status: 401,
    };
  }

  // Look up user document in Firestore to verify active admin role
  // NEVER trust req.body.role or frontend assertions
  const userDoc = await db.collection("users").doc(decodedToken.uid).get();
  if (!userDoc.exists) {
    return {
      authorized: false,
      error: "Forbidden: No user profile found for this account.",
      status: 403,
    };
  }

  const userData = userDoc.data() || {};
  const userRole = userData.role;

  if (!userRole || !allowedRoles.includes(userRole)) {
    return {
      authorized: false,
      error: `Forbidden: User role '${userRole || "unknown"}' is not authorized for Time Capsule management.`,
      status: 403,
    };
  }

  return {
    authorized: true,
    user: {
      uid: decodedToken.uid,
      email: decodedToken.email || userData.email || "",
      name: userData.name || decodedToken.name || "Admin User",
      role: userRole,
    },
  };
}

/**
 * Records a lightweight audit log entry in Firestore collection `audit_logs`.
 *
 * @param {object} params
 * @param {object} params.adminUser - Authenticated admin user { uid, email, role }
 * @param {string} params.action - Action identifier (e.g. 'UPDATE_UNLOCK_DATE', 'MANUAL_UNLOCK', 'DELETE_CAPSULE')
 * @param {string} params.capsuleId - Firestore document ID
 * @param {string} [params.capsuleCode] - Reference code (e.g. 'CAP-2029-XXXX')
 * @param {object} [params.details] - Minimal audit details (no private passwords/tokens)
 */
export async function logAdminAction({
  adminUser,
  action,
  capsuleId,
  capsuleCode = null,
  details = {},
}) {
  try {
    const { db } = getFirebaseAdmin();
    await db.collection("audit_logs").add({
      adminUid: adminUser.uid,
      adminEmail: adminUser.email || null,
      adminRole: adminUser.role,
      action,
      capsuleId,
      capsuleCode,
      details,
      timestamp: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // Non-fatal: log error so main action is not blocked if audit collection has an issue
    console.error("[audit_logs] Failed to write audit log:", err);
  }
}
