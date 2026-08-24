/**
 * Serverless function: POST /api/razorpay/verify-payment
 *
 * Verifies a Razorpay payment signature server-side using the
 * Razorpay KEY SECRET. Only after successful signature verification
 * is the registration marked as paid/confirmed.
 *
 * The frontend success callback is NOT trusted — the signature is
 * verified here using the secret key.
 */
import crypto from "crypto";
import admin from "firebase-admin";

// ── Firebase Admin (server-side) ─────────────────────────────
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}")
    ),
  });
}
const db = admin.firestore();

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed." });
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      registrationId,
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !registrationId) {
      return res.status(400).json({
        success: false,
        error: "razorpay_order_id, razorpay_payment_id, razorpay_signature, and registrationId are required.",
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error("Razorpay key secret is not configured on the server.");
    }

    // ── 1. Verify the Razorpay signature ─────────────────────
    // Expected signature = HMAC-SHA256(order_id + "|" + payment_id, key_secret)
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      // ── Mark registration as failed ────────────────────────
      await markRegistrationFailed(registrationId, razorpay_order_id, razorpay_payment_id);
      return res.status(400).json({ success: false, error: "Payment signature verification failed." });
    }

    // ── 2. Load the registration ─────────────────────────────
    const regQuery = await db
      .collection("registrations")
      .where("registrationId", "==", registrationId)
      .limit(1)
      .get();

    if (regQuery.empty) {
      return res.status(404).json({ success: false, error: "Registration not found." });
    }
    const regDoc = regQuery.docs[0];
    const reg = regDoc.data();

    // ── 3. Idempotency: already paid → do not process again ──
    if (reg.paymentStatus === "paid") {
      return res.status(200).json({
        success: true,
        alreadyPaid: true,
        message: "Registration is already confirmed.",
      });
    }

    // ── 4. Mark registration as paid/confirmed ───────────────
    await regDoc.ref.update({
      paymentStatus: "paid",
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: Number(reg.amount) || 0,
      registrationStatus: "confirmed",
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      alreadyPaid: false,
      message: "Payment verified and registration confirmed.",
    });
  } catch (err) {
    console.error("verify-payment error:", err);
    return res.status(500).json({ success: false, error: "Payment verification failed." });
  }
}

/**
 * Marks a registration as failed when signature verification fails.
 * Does NOT confirm the registration.
 */
async function markRegistrationFailed(registrationId, orderId, paymentId) {
  try {
    const regQuery = await db
      .collection("registrations")
      .where("registrationId", "==", registrationId)
      .limit(1)
      .get();

    if (regQuery.empty) return;

    await regQuery.docs[0].ref.update({
      paymentStatus: "failed",
      paymentId: paymentId || "",
      orderId: orderId || "",
      registrationStatus: "payment_failed",
    });
  } catch (err) {
    console.error("markRegistrationFailed error:", err);
  }
}