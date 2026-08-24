import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getEventById } from "../Firebase/eventService";
import {
  createRegistration,
  countRegistrations,
  checkExistingRegistration,
} from "../Firebase/registrationService";
import "./Register.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s-]{7,15}$/;
const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getRegistrationStatus(event, currentCount) {
  const now = new Date();

  if (event.registrationDeadline) {
    const deadline = new Date(event.registrationDeadline);
    if (!isNaN(deadline) && deadline < now) {
      return { status: "CLOSED", label: "Registration Closed", color: "#ef4444" };
    }
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    if (!isNaN(deadline) && deadline.getTime() - now.getTime() < threeDays && deadline >= now) {
      return { status: "CLOSING_SOON", label: "Closing Soon", color: "#f59e0b" };
    }
  }

  if (event.maxRegistrations && currentCount >= Number(event.maxRegistrations)) {
    return { status: "FULL", label: "Fully Booked", color: "#ef4444" };
  }

  return { status: "OPEN", label: "Registration Open", color: "#22c55e" };
}

/**
 * Dynamically loads the Razorpay Checkout script once.
 * Resolves with the Razorpay constructor, rejects on load failure.
 */
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    if (document.getElementById("razorpay-checkout-script")) {
      // Script is loading; wait for it
      const check = setInterval(() => {
        if (window.Razorpay) {
          clearInterval(check);
          resolve(window.Razorpay);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        if (!window.Razorpay) reject(new Error("Razorpay script timed out."));
      }, 10000);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error("Razorpay script loaded but constructor missing."));
    };
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout script."));
    document.body.appendChild(script);
  });
}

export default function Register() {
  const { eventId } = useParams();
  const formRef = useRef(null);

  const [event, setEvent] = useState(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState(false);

  const [regCount, setRegCount] = useState(0);
  const [regCountLoading, setRegCountLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    branch: "",
    semester: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState(null);

  const [copied, setCopied] = useState(false);
  const [alreadyChecked, setAlreadyChecked] = useState(null);

  // ── Phase 4B: Payment flow state ────────────────────────────
  const [paymentState, setPaymentState] = useState("idle"); // idle | creating | preparing | opening | verifying | failed | cancelled
  const [paymentError, setPaymentError] = useState("");
  const [pendingReg, setPendingReg] = useState(null); // { registrationId, orderId, amount, currency, publicKey }

  const loadEvent = useCallback(async () => {
    setEventLoading(true);
    setEventError(false);
    try {
      const data = await getEventById(eventId);
      if (!data) {
        setEventError(true);
        return;
      }
      setEvent(data);
    } catch (err) {
      console.error("Failed to load event:", err);
      setEventError(true);
    } finally {
      setEventLoading(false);
    }
  }, [eventId]);

  const loadRegCount = useCallback(async () => {
    setRegCountLoading(true);
    try {
      const count = await countRegistrations(eventId);
      setRegCount(count);
    } catch (err) {
      console.error("Failed to count registrations:", err);
    } finally {
      setRegCountLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId) {
      loadEvent();
      loadRegCount();
    }
  }, [eventId, loadEvent, loadRegCount]);

  const regStatus = useMemo(
    () => (event ? getRegistrationStatus(event, regCount) : null),
    [event, regCount]
  );

  const canRegister = regStatus?.status === "OPEN" || regStatus?.status === "CLOSING_SOON";

  const isPaidEvent = Boolean(event?.isPaid);
  const isFreeEvent = !isPaidEvent;
  const canSubmitFree = isFreeEvent && canRegister;
  const canSubmitPaid = isPaidEvent && canRegister;

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required.";
    if (!form.email.trim()) errs.email = "Email is required.";
    else if (!EMAIL_REGEX.test(form.email.trim())) errs.email = "Invalid email format.";
    if (!form.phone.trim()) errs.phone = "Phone number is required.";
    else if (!PHONE_REGEX.test(form.phone.trim())) errs.phone = "Invalid phone number.";
    if (!form.branch.trim()) errs.branch = "Branch is required.";
    if (!form.semester.trim()) errs.semester = "Semester is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setSubmitError("");
    setPaymentError("");
  };

  /* ── FREE EVENT SUBMIT (unchanged) ────────────────────────── */
  const handleFreeSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await createRegistration({
        eventId: event.id,
        eventTitle: event.title,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        branch: form.branch.trim(),
        semester: form.semester.trim(),
        isPaid: false,
        amount: 0,
        paymentStatus: "free",
      });

      setResult({
        registrationId: res.registrationId,
        name: form.name.trim(),
        eventTitle: event.title,
        eventDate: event.eventStartDate || "",
        venue: event.venue || "",
        isPaid: false,
        amount: 0,
        paymentStatus: "free",
      });
      setRegCount((prev) => prev + 1);
    } catch (err) {
      if (err.message === "ALREADY_REGISTERED") {
        setSubmitError(
          "You are already registered for this event. Please check your email for the registration confirmation."
        );
      } else {
        setSubmitError(err.message || "Registration failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── PAID EVENT: create pending registration ──────────────── */
  const createPendingRegistration = async () => {
    const res = await createRegistration({
      eventId: event.id,
      eventTitle: event.title,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      branch: form.branch.trim(),
      semester: form.semester.trim(),
      isPaid: true,
      amount: Number(event.feeAmount) || 0,
      paymentStatus: "pending",
    });
    return res.registrationId;
  };

  /* ── PAID EVENT: create Razorpay order ────────────────────── */
  const createOrder = async (registrationId) => {
    const res = await fetch("/api/razorpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event.id, registrationId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to create payment order.");
    }
    return data; // { orderId, amount, currency, publicKey }
  };

  /* ── PAID EVENT: verify payment ───────────────────────────── */
  const verifyPayment = async (payload) => {
    const res = await fetch("/api/razorpay/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Payment verification failed.");
    }
    return data;
  };

  /* ── PAID EVENT: open Razorpay checkout ───────────────────── */
  const openRazorpay = async (orderData, registrationId) => {
    setPaymentState("opening");
    const Razorpay = await loadRazorpayScript();

    const options = {
      key: orderData.publicKey,
      amount: Math.round(Number(orderData.amount) * 100), // paise
      currency: orderData.currency || "INR",
      name: "Abhyudaya Club",
      description: event.title,
      order_id: orderData.orderId,
      prefill: {
        name: form.name.trim(),
        email: form.email.trim(),
        contact: form.phone.trim(),
      },
      notes: {
        eventId: event.id,
        registrationId,
      },
      handler: async (response) => {
        // Payment reported success — verify server-side before confirming
        setPaymentState("verifying");
        try {
          const verifyRes = await verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            registrationId,
          });

          if (verifyRes.alreadyPaid) {
            // Already confirmed — show confirmation
            setResult({
              registrationId,
              name: form.name.trim(),
              eventTitle: event.title,
              eventDate: event.eventStartDate || "",
              venue: event.venue || "",
              isPaid: true,
              amount: Number(orderData.amount) || 0,
              paymentStatus: "paid",
            });
            setPaymentState("idle");
            return;
          }

          setResult({
            registrationId,
            name: form.name.trim(),
            eventTitle: event.title,
            eventDate: event.eventStartDate || "",
            venue: event.venue || "",
            isPaid: true,
            amount: Number(orderData.amount) || 0,
            paymentStatus: "paid",
          });
          setPaymentState("idle");
        } catch (err) {
          console.error("verify-payment error:", err);
          setPaymentError("Payment verification failed. Your registration is still pending.");
          setPaymentState("failed");
        }
      },
      modal: {
        ondismiss: () => {
          // User closed Razorpay without paying
          setPaymentState("cancelled");
          setPaymentError("Payment cancelled. Registration is still pending.");
        },
      },
    };

    const rzp = new Razorpay(options);
    rzp.on("payment.failed", (response) => {
      console.error("Razorpay payment failed:", response);
      setPaymentState("failed");
      setPaymentError("Payment failed. Your registration has not been confirmed.");
    });
    rzp.open();
  };

  /* ── PAID EVENT: full submit flow ─────────────────────────── */
  const handlePaidSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    setPaymentError("");
    setPaymentState("creating");
    try {
      // 1. Create pending registration
      const registrationId = await createPendingRegistration();
      setPaymentState("preparing");

      // 2. Create Razorpay order (server determines amount)
      const orderData = await createOrder(registrationId);
      setPendingReg({
        registrationId,
        orderId: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        publicKey: orderData.publicKey,
      });

      // 3. Open Razorpay checkout
      await openRazorpay(orderData, registrationId);
    } catch (err) {
      console.error("Paid registration error:", err);
      if (err.message === "ALREADY_REGISTERED") {
        setSubmitError(
          "You are already registered for this event. Please check your email for the registration confirmation."
        );
      } else {
        setPaymentError(err.message || "Failed to start payment. Please try again.");
        setPaymentState("failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Retry payment (reuse existing pending registration) ──── */
  const handleRetryPayment = async () => {
    setPaymentError("");
    setPaymentState("preparing");
    try {
      let registrationId = pendingReg?.registrationId;
      if (!registrationId) {
        // No pending registration — create one
        setPaymentState("creating");
        registrationId = await createPendingRegistration();
      }

      const orderData = await createOrder(registrationId);
      setPendingReg({
        registrationId,
        orderId: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        publicKey: orderData.publicKey,
      });

      await openRazorpay(orderData, registrationId);
    } catch (err) {
      console.error("Retry payment error:", err);
      setPaymentError(err.message || "Failed to retry payment. Please try again.");
      setPaymentState("failed");
    }
  };

  /* ── Main submit handler ──────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!canRegister) return;

    if (isFreeEvent) {
      await handleFreeSubmit();
    } else {
      await handlePaidSubmit();
    }
  };

  const handleCopyId = () => {
    if (!result?.registrationId) return;
    navigator.clipboard.writeText(result.registrationId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleCopyLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleShare = async () => {
    const link = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Register for ${event?.title}`,
          text: `Register for ${event?.title} at Abhyudaya Club!`,
          url: link,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsApp = () => {
    const text = `Register for ${event?.title} at Abhyudaya Club!\n\n${window.location.href}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleEmailBlur = async () => {
    const email = form.email.trim().toLowerCase();
    if (!email || !EMAIL_REGEX.test(email)) return;
    try {
      const existing = await checkExistingRegistration(eventId, email);
      setAlreadyChecked(existing);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setAlreadyChecked(null);
  }, [form.email]);

  if (eventLoading) {
    return (
      <main className="register-page">
        <div className="wrap">
          <div className="register-loading">Loading event details...</div>
        </div>
      </main>
    );
  }

  if (eventError || !event) {
    return (
      <main className="register-page">
        <div className="wrap">
          <div className="register-error-card">
            <h2>Event Not Found</h2>
            <p>The event you're looking for doesn't exist or has been removed.</p>
            <Link to="/events" className="register-btn">← Back to Events</Link>
          </div>
        </div>
      </main>
    );
  }

  const isPaymentBusy =
    paymentState === "creating" ||
    paymentState === "preparing" ||
    paymentState === "opening" ||
    paymentState === "verifying";

  const paymentLoadingLabel =
    paymentState === "creating"
      ? "Creating registration..."
      : paymentState === "preparing"
      ? "Preparing payment..."
      : paymentState === "opening"
      ? "Opening payment..."
      : paymentState === "verifying"
      ? "Verifying payment..."
      : "";

  return (
    <>
      <Helmet>
        <title>Register for {event.title} | Abhyudaya Club</title>
        <meta name="description" content={`Register for ${event.title} at Abhyudaya Club, MPEC Kanpur.`} />
        <meta name="robots" content="index,follow" />
      </Helmet>

      <main className="register-page">
        <div className="wrap">
          {!result ? (
            <div className="register-layout">
              <div className="register-event-section">
                <div className="register-event-header">
                  {event.icon && <span className="register-event-icon">{event.icon}</span>}
                  <h1 className="register-event-title">{event.title}</h1>
                </div>

                {regStatus && (
                  <div
                    className="register-status-badge"
                    style={{
                      background: `${regStatus.color}18`,
                      color: regStatus.color,
                      border: `1px solid ${regStatus.color}38`,
                    }}
                  >
                    {regStatus.label}
                  </div>
                )}

                {event.tagline && <p className="register-event-tagline">{event.tagline}</p>}
                {event.description && <p className="register-event-desc">{event.description}</p>}

                <div className="register-event-meta">
                  {event.venue && (
                    <div className="register-meta-item">
                      <span className="register-meta-icon">📍</span>
                      <span>{event.venue}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="register-meta-item">
                      <span className="register-meta-icon">🏛️</span>
                      <span>{event.location}</span>
                    </div>
                  )}
                  {event.eventStartDate && (
                    <div className="register-meta-item">
                      <span className="register-meta-icon">📅</span>
                      <span>{formatDate(event.eventStartDate)}</span>
                    </div>
                  )}
                  {event.registrationDeadline && (
                    <div className="register-meta-item">
                      <span className="register-meta-icon">⏰</span>
                      <span>Deadline: {formatDate(event.registrationDeadline)}</span>
                    </div>
                  )}
                </div>

                {/* Paid event fee display */}
                {isPaidEvent && (
                  <div className="register-fee-box">
                    <span className="register-fee-label">Registration Fee</span>
                    <span className="register-fee-amount">
                      ₹{Number(event.feeAmount).toLocaleString("en-IN")} / Person
                    </span>
                  </div>
                )}

                <div className="register-capacity">
                  <div className="register-capacity-header">
                    <span>
                      <strong>{regCountLoading ? "..." : regCount}</strong>
                      {event.maxRegistrations ? ` / ${event.maxRegistrations}` : ""} registered
                    </span>
                    {event.maxRegistrations && (
                      <span>
                        {event.maxRegistrations - regCount > 0
                          ? `${event.maxRegistrations - regCount} spots left`
                          : "Fully booked"}
                      </span>
                    )}
                  </div>
                  {event.maxRegistrations && (
                    <div className="register-progress-bar">
                      <div
                        className="register-progress-fill"
                        style={{
                          width: `${Math.min((regCount / Number(event.maxRegistrations)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="register-form-section">
                <h2 className="register-form-title">Register for this Event</h2>

                <form onSubmit={handleSubmit} className="register-form" ref={formRef} noValidate>
                  <div className="register-field">
                    <label className="register-label" htmlFor="reg-name">
                      Full Name <span className="register-required">*</span>
                    </label>
                    <input
                      id="reg-name"
                      type="text"
                      className="register-input"
                      value={form.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="Your full name"
                      disabled={!canRegister || isPaymentBusy}
                    />
                    {errors.name && <span className="register-error">{errors.name}</span>}
                  </div>

                  <div className="register-field">
                    <label className="register-label" htmlFor="reg-email">
                      Email <span className="register-required">*</span>
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      className="register-input"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      onBlur={handleEmailBlur}
                      placeholder="your.email@example.com"
                      disabled={!canRegister || isPaymentBusy}
                    />
                    {errors.email && <span className="register-error">{errors.email}</span>}
                    {alreadyChecked?.registered && (
                      <span className="register-error">
                        You are already registered for this event (ID: {alreadyChecked.registrationId}).
                      </span>
                    )}
                  </div>

                  <div className="register-field">
                    <label className="register-label" htmlFor="reg-phone">
                      Phone Number
                    </label>
                    <input
                      id="reg-phone"
                      type="tel"
                      className="register-input"
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      disabled={!canRegister || isPaymentBusy}
                    />
                    {errors.phone && <span className="register-error">{errors.phone}</span>}
                  </div>

                  <div className="register-field-row">
                    <div className="register-field">
                      <label className="register-label" htmlFor="reg-branch">
                        Branch
                      </label>
                      <input
                        id="reg-branch"
                        type="text"
                        className="register-input"
                        value={form.branch}
                        onChange={(e) => handleChange("branch", e.target.value)}
                        placeholder="e.g. CSE"
                        disabled={!canRegister || isPaymentBusy}
                      />
                    </div>

                    <div className="register-field">
                      <label className="register-label" htmlFor="reg-semester">
                        Semester
                      </label>
                      <input
                        id="reg-semester"
                        type="text"
                        className="register-input"
                        value={form.semester}
                        onChange={(e) => handleChange("semester", e.target.value)}
                        placeholder="e.g. 4"
                        disabled={!canRegister || isPaymentBusy}
                      />
                    </div>
                  </div>

                  {submitError && <div className="register-submit-error">{submitError}</div>}

                  {/* Payment loading state */}
                  {isPaymentBusy && (
                    <div className="register-payment-loading">
                      <span className="register-payment-spinner" aria-hidden="true" />
                      {paymentLoadingLabel}
                    </div>
                  )}

                  {/* Payment error / cancelled state */}
                  {paymentError && (
                    <div className="register-payment-error">
                      <p>{paymentError}</p>
                      {(paymentState === "failed" || paymentState === "cancelled") && (
                        <button
                          type="button"
                          className="register-btn register-retry-btn"
                          onClick={handleRetryPayment}
                          disabled={isPaymentBusy}
                        >
                          Retry Payment
                        </button>
                      )}
                    </div>
                  )}

                  {!canRegister ? (
                    <div className="register-closed-msg">
                      {regStatus?.status === "FULL"
                        ? "This event has reached its maximum capacity."
                        : regStatus?.status === "CLOSED"
                        ? "Registration for this event has closed."
                        : "Registration is currently unavailable."}
                    </div>
                  ) : (
                    <button
                      type="submit"
                      className="register-btn register-submit-btn"
                      disabled={submitting || isPaymentBusy}
                    >
                      {submitting
                        ? "Processing..."
                        : isPaidEvent
                        ? `Pay ₹${Number(event.feeAmount).toLocaleString("en-IN")} & Register`
                        : "Register Now"}
                    </button>
                  )}

                  <div className="register-share-links">
                    <button type="button" className="register-share-btn" onClick={handleShare}>
                      📤 Share
                    </button>
                    <button type="button" className="register-share-btn" onClick={handleWhatsApp}>
                      💬 Share on WhatsApp
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="register-success">
              <div className="register-success-icon">🎉</div>
              <h2>REGISTRATION CONFIRMED</h2>

              <div className="register-success-details">
                <div className="register-success-row">
                  <span className="register-success-label">Event</span>
                  <strong>{result.eventTitle}</strong>
                </div>
                <div className="register-success-row">
                  <span className="register-success-label">Name</span>
                  <strong>{result.name}</strong>
                </div>
                <div className="register-success-row">
                  <span className="register-success-label">Registration ID</span>
                  <strong className="register-success-id">{result.registrationId}</strong>
                </div>
                {result.eventDate && (
                  <div className="register-success-row">
                    <span className="register-success-label">Date</span>
                    <strong>{formatDate(result.eventDate)}</strong>
                  </div>
                )}
                {result.venue && (
                  <div className="register-success-row">
                    <span className="register-success-label">Venue</span>
                    <strong>{result.venue}</strong>
                  </div>
                )}
                {result.isPaid ? (
                  <>
                    <div className="register-success-row">
                      <span className="register-success-label">Amount Paid</span>
                      <strong>₹{Number(result.amount).toLocaleString("en-IN")}</strong>
                    </div>
                    <div className="register-success-row">
                      <span className="register-success-label">Payment Status</span>
                      <strong className="register-success-payment">PAID</strong>
                    </div>
                  </>
                ) : (
                  <div className="register-success-row">
                    <span className="register-success-label">Payment</span>
                    <strong className="register-success-payment">FREE</strong>
                  </div>
                )}
              </div>

              <div className="register-success-actions">
                <button type="button" className="register-btn" onClick={handleCopyId}>
                  {copied ? "✅ Copied!" : "📋 Copy Registration ID"}
                </button>
                <Link to="/events" className="register-btn">
                  ← Back to Events
                </Link>
              </div>

              <p className="register-success-note">
                A confirmation has been recorded. Please save your Registration ID for future reference.
              </p>

              {copied && <div className="register-copied-toast">Copied to clipboard!</div>}
            </div>
          )}
        </div>
      </main>
    </>
  );
}