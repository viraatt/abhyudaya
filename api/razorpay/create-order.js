/**
 * Serverless function: POST /api/razorpay/create-order
 *
 * Securely creates a Razorpay order for a paid event registration.
 *
 * The Razorpay KEY SECRET is read from server-side environment variables
 * and is NEVER exposed to the browser. The frontend only receives the
 * public key, order ID, amount, and currency.
 *
 * The server determines the actual amount from Firestore — it does NOT
 * trust the amount sent by the frontend.
 */
import Razorpay from "razorpay";
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

// ── Razorpay client (server-side only) ───────────────────────
function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured on the server.");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed." });
  }

  try {
    const { eventId, registrationId } = req.body || {};

    if (!eventId || !registrationId) {
      return res.status(400).json({ success: false, error: "eventId and registrationId are required." });
    }

    // ── 1. Load the event from Firestore ─────────────────────
    const eventSnap = await db.collection("events").doc(eventId).get();
    if (!eventSnap.exists) {
      return res.status(404).json({ success: false, error: "Event not found." });
    }
    const event = eventSnap.data();

    // ── 2. Verify the event is paid ──────────────────────────
    if (!event.isPaid) {
      return res.status(400).json({ success: false, error: "This event is free and does not require payment." });
    }

    // ── 3. Verify feeAmount > 0 ──────────────────────────────
    const feeAmount = Number(event.feeAmount);
    if (!Number.isFinite(feeAmount) || feeAmount <= 0) {
      return res.status(400).json({ success: false, error: "Event has no valid registration fee." });
    }

    // ── 4. Load the registration ─────────────────────────────
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

    // ── 5. Verify the registration belongs to the event ──────
    if (reg.eventId !== eventId) {
      return res.status(400).json({ success: false, error: "Registration does not belong to this event." });
    }

    // ── 6. Verify the registration is not already paid ───────
    if (reg.paymentStatus === "paid") {
      return res.status(400).json({ success: false, error: "This registration is already paid." });
    }

    // ── 7. Create the Razorpay order with server-side amount ─
    // Amount is in paise (Razorpay expects smallest currency unit).
    const amountPaise = Math.round(feeAmount * 100);
    const currency = event.currency || "INR";

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency,
      receipt: registrationId,
      notes: {
        eventId,
        registrationId,
      },
    });

    // ── 8. Return only what the frontend needs ───────────────
    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: feeAmount,
      currency,
      publicKey: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("create-order error:", err);
    return res.status(500).json({ success: false, error: "Failed to create payment order." });
  }
}