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

  // Phase 3: Free events register directly. Paid events show a "coming soon" state.
  const isPaidEvent = Boolean(event?.isPaid);
  const isFreeEvent = !isPaidEvent;
  const canSubmitFree = isFreeEvent && canRegister;
  const showPaidComingSoon = isPaidEvent && canRegister;

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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!canRegister) return;

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
        // Free event payment metadata
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
                      disabled={!canRegister}
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
                      disabled={!canRegister}
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
                      disabled={!canRegister}
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
                        disabled={!canRegister}
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
                        disabled={!canRegister}
                      />
                    </div>
                  </div>

                  {submitError && <div className="register-submit-error">{submitError}</div>}

                  {!canRegister ? (
                    <div className="register-closed-msg">
                      {regStatus?.status === "FULL"
                        ? "This event has reached its maximum capacity."
                        : regStatus?.status === "CLOSED"
                        ? "Registration for this event has closed."
                        : "Registration is currently unavailable."}
                    </div>
                  ) : showPaidComingSoon ? (
                    <div className="register-closed-msg">
                      💳 Payment integration for this paid event is coming in the next phase. Please check back soon.
                    </div>
                  ) : (
                    <button
                      type="submit"
                      className="register-btn register-submit-btn"
                      disabled={submitting}
                    >
                      {submitting ? "Registering..." : "Register Now"}
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
                <div className="register-success-row">
                  <span className="register-success-label">Payment</span>
                  <strong className="register-success-payment">FREE</strong>
                </div>
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