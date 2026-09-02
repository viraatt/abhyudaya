import { useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import PageHero from "../components/PageHero.jsx";
import { submitTimeCapsule } from "../Firebase/timeCapsuleService.js";
import "./TimeCapsule.css";

const SITE_URL = "https://www.abhyudayaclub.in";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR + i);

const YEAR_LABELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const QUESTIONS = [
  {
    key: "aspiredRole",
    num: "Q1",
    label: "What do you want to become?",
    placeholder:
      "Describe the professional or personal role you aspire to grow into...",
  },
  {
    key: "biggestDream",
    num: "Q2",
    label: "What is your biggest dream right now?",
    placeholder: "Share the dream that keeps you motivated today...",
  },
  {
    key: "fourYearVision",
    num: "Q3",
    label: "Where do you see yourself after 4 years?",
    placeholder: "Paint a picture of your life four years from now...",
  },
  {
    key: "graduationGoals",
    num: "Q4",
    label: "What do you want to achieve before graduation?",
    placeholder:
      "List the skills, projects, or experiences you want to collect...",
  },
  {
    key: "currentFear",
    num: "Q5",
    label: "What is your biggest fear right now?",
    placeholder:
      "Be honest — what worries or scares you most at this point in your life?",
  },
  {
    key: "inspirationSource",
    num: "Q6",
    label: "Who or what inspires you?",
    placeholder:
      "A person, a book, a moment — tell your future self what drives you today...",
  },
  {
    key: "personalPromise",
    num: "Q7",
    label: "What is one promise you are making to yourself?",
    placeholder: "Write a commitment to yourself that you intend to keep...",
  },
  {
    key: "memoryAnchor",
    num: "Q8",
    label: "What do you want your future self to remember about today?",
    placeholder:
      "What feeling, thought, or moment from right now do you want to preserve?",
  },
];

const MAX_ANSWER = 1500;
const MIN_ANSWER = 3;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INDIAN_PHONE_REGEX = /^(?:\+91|0)?[6-9]\d{9}$/;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function charCountClass(len, max) {
  if (len >= max) return "tc-char-count tc-char-count--limit";
  if (len >= max * 0.85) return "tc-char-count tc-char-count--warn";
  return "tc-char-count";
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section className="tc-how">
      <div className="wrap">
        <div className="tc-how__inner">
          <div className="tc-how__text">
            <h2>What is the Abhyudaya Time Capsule?</h2>
            <p>
              Write a message to the person you will become. Answer 8 honest
              questions about your dreams, your fears, and your promises. Your
              capsule will stay sealed until your expected graduation day — then
              you open it and meet your past self.
            </p>
          </div>
          <div className="tc-how__steps">
            {[
              {
                n: "1",
                title: "Write",
                desc: "Fill in the form below. Answer honestly — no one else will see this.",
              },
              {
                n: "2",
                title: "Seal",
                desc: "Your capsule locks instantly. You receive a private link to save.",
              },
              {
                n: "3",
                title: "Wait",
                desc: "The capsule stays sealed until June 15 of your graduation year.",
              },
              {
                n: "4",
                title: "Open",
                desc: "Use your saved link to read what you wrote to your future self.",
              },
            ].map((step) => (
              <div key={step.n} className="tc-how__step">
                <div
                  className="tc-how__step-num"
                  aria-hidden="true"
                >
                  {step.n}
                </div>
                <div className="tc-how__step-body">
                  <strong>{step.title}</strong>
                  <span>{step.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  college: "",
  course: "",
  currentYear: "",
  graduationYear: "",
};

const INITIAL_ANSWERS = Object.fromEntries(QUESTIONS.map((q) => [q.key, ""]));

export default function TimeCapsule() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [answers, setAnswers] = useState(INITIAL_ANSWERS);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [phase, setPhase] = useState("form"); // "form" | "submitting" | "success"
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const formRef = useRef(null);
  const isSubmitting = phase === "submitting";

  // ── Field change handlers ────────────────────────────────

  const handleField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    setGlobalError("");
  };

  const handleAnswer = (key, val) => {
    if (val.length > MAX_ANSWER) return; // hard cap
    setAnswers((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    setGlobalError("");
  };

  // ── Validation ───────────────────────────────────────────

  const validate = () => {
    const errs = {};

    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = "Full name is required (min 2 characters).";

    if (!form.email.trim()) errs.email = "Email address is required.";
    else if (!EMAIL_REGEX.test(form.email.trim()))
      errs.email = "Please enter a valid email address.";

    if (!form.phone.trim()) errs.phone = "Mobile number is required.";
    else if (!INDIAN_PHONE_REGEX.test(form.phone.trim().replace(/\s/g, "")))
      errs.phone = "Please enter a valid Indian mobile number (10 digits).";

    if (!form.college.trim() || form.college.trim().length < 2)
      errs.college = "College / institution name is required.";

    if (!form.course.trim() || form.course.trim().length < 2)
      errs.course = "Course / branch is required.";

    if (!form.currentYear)
      errs.currentYear = "Please select your current year.";

    if (!form.graduationYear)
      errs.graduationYear = "Please select your expected graduation year.";

    QUESTIONS.forEach(({ key, label }) => {
      const val = answers[key].trim();
      if (!val || val.length < MIN_ANSWER)
        errs[key] = `Please write at least ${MIN_ANSWER} characters for "${label}".`;
    });

    return errs;
  };

  // ── Submit ───────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setGlobalError("");
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Scroll to first error field
      const firstErrKey = Object.keys(errs)[0];
      const el = formRef.current?.querySelector(`[data-field="${firstErrKey}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setPhase("submitting");

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        college: form.college.trim(),
        course: form.course.trim(),
        currentYear: form.currentYear,
        graduationYear: Number(form.graduationYear),
        answers: Object.fromEntries(
          QUESTIONS.map(({ key }) => [key, answers[key].trim()])
        ),
      };

      const data = await submitTimeCapsule(payload);
      setResult(data);
      setPhase("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setPhase("form");
      if (err.message?.includes("409") || err.message?.toLowerCase().includes("duplicate")) {
        setGlobalError(
          "A Time Capsule already exists for this email address. Each student can only create one capsule."
        );
      } else {
        setGlobalError(
          err.message ||
            "Something went wrong. Please check your connection and try again."
        );
      }
    }
  };

  // ── Copy Link ────────────────────────────────────────────

  const openLink = result?.rawToken
    ? `${SITE_URL}/time-capsule/open/${result.rawToken}`
    : "";

  const handleCopyLink = () => {
    if (!openLink) return;
    navigator.clipboard.writeText(openLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  // ── Display ─────────────────────────────────────────────

  const displayLink = openLink
    ? openLink.replace(result.rawToken, "••••••••••••••••••••••")
    : "";

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  return (
    <>
      <Helmet>
        <title>Abhyudaya Time Capsule | Write to Your Future Self</title>
        <meta
          name="description"
          content="Write a message to the person you are going to become. The Abhyudaya Time Capsule seals your thoughts today and unlocks them on your graduation day."
        />
        <link rel="canonical" href={`${SITE_URL}/time-capsule`} />
        <meta name="robots" content="index,follow" />
        <meta property="og:title" content="Abhyudaya Time Capsule | Write to Your Future Self" />
        <meta
          property="og:description"
          content="Write something for the person you are going to become. Sealed today. Opened on graduation day."
        />
        <meta property="og:url" content={`${SITE_URL}/time-capsule`} />
      </Helmet>

      <main className="tc-page">
        <PageHero
          eyebrow="Abhyudaya Time Capsule"
          title="Write Something for the Person You Are Going to Become."
          lede="Your words will be sealed today and locked until your graduation day. When the time comes, you will open them and meet who you used to be."
        />

        <HowItWorks />

        {phase === "success" && result ? (
          <SuccessScreen
            result={result}
            displayLink={displayLink}
            copied={copied}
            onCopy={handleCopyLink}
          />
        ) : (
          <section className="tc-form-area">
            <div className="wrap">
              <div className="tc-card">
                <form
                  ref={formRef}
                  onSubmit={handleSubmit}
                  noValidate
                  aria-label="Time Capsule submission form"
                >
                  {/* ── Section 1: About You ── */}
                  <div className="tc-section-header">
                    <div className="tc-section-num" aria-hidden="true">1</div>
                    <h2>About You</h2>
                  </div>
                  <div className="tc-section-divider" />

                  <div className="tc-fields">
                    {/* Name */}
                    <div
                      className="tc-field"
                      data-field="name"
                    >
                      <label className="tc-label" htmlFor="tc-name">
                        Full Name <span className="tc-label__req" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="tc-name"
                        type="text"
                        className="tc-input"
                        value={form.name}
                        onChange={(e) => handleField("name", e.target.value)}
                        placeholder="Your full name"
                        maxLength={100}
                        disabled={isSubmitting}
                        aria-required="true"
                        aria-invalid={errors.name ? "true" : undefined}
                        autoComplete="name"
                      />
                      {errors.name && (
                        <span className="tc-error" role="alert">{errors.name}</span>
                      )}
                    </div>

                    {/* Email */}
                    <div className="tc-field" data-field="email">
                      <label className="tc-label" htmlFor="tc-email">
                        Email Address <span className="tc-label__req" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="tc-email"
                        type="email"
                        className="tc-input"
                        value={form.email}
                        onChange={(e) => handleField("email", e.target.value)}
                        placeholder="your.email@example.com"
                        maxLength={200}
                        disabled={isSubmitting}
                        aria-required="true"
                        aria-invalid={errors.email ? "true" : undefined}
                        autoComplete="email"
                      />
                      {errors.email && (
                        <span className="tc-error" role="alert">{errors.email}</span>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="tc-field" data-field="phone">
                      <label className="tc-label" htmlFor="tc-phone">
                        Mobile Number <span className="tc-label__req" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="tc-phone"
                        type="tel"
                        className="tc-input"
                        value={form.phone}
                        onChange={(e) => handleField("phone", e.target.value)}
                        placeholder="e.g. 9876543210 or +91 98765 43210"
                        maxLength={15}
                        disabled={isSubmitting}
                        aria-required="true"
                        aria-invalid={errors.phone ? "true" : undefined}
                        autoComplete="tel"
                      />
                      {errors.phone && (
                        <span className="tc-error" role="alert">{errors.phone}</span>
                      )}
                    </div>

                    {/* College */}
                    <div className="tc-field" data-field="college">
                      <label className="tc-label" htmlFor="tc-college">
                        College / Institution <span className="tc-label__req" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="tc-college"
                        type="text"
                        className="tc-input"
                        value={form.college}
                        onChange={(e) => handleField("college", e.target.value)}
                        placeholder="e.g. Maharana Pratap Engineering College"
                        maxLength={120}
                        disabled={isSubmitting}
                        aria-required="true"
                        aria-invalid={errors.college ? "true" : undefined}
                      />
                      {errors.college && (
                        <span className="tc-error" role="alert">{errors.college}</span>
                      )}
                    </div>

                    {/* Course */}
                    <div className="tc-field" data-field="course">
                      <label className="tc-label" htmlFor="tc-course">
                        Course / Branch <span className="tc-label__req" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="tc-course"
                        type="text"
                        className="tc-input"
                        value={form.course}
                        onChange={(e) => handleField("course", e.target.value)}
                        placeholder="e.g. Computer Science & Engineering"
                        maxLength={120}
                        disabled={isSubmitting}
                        aria-required="true"
                        aria-invalid={errors.course ? "true" : undefined}
                      />
                      {errors.course && (
                        <span className="tc-error" role="alert">{errors.course}</span>
                      )}
                    </div>

                    {/* Current Year + Graduation Year */}
                    <div className="tc-row">
                      <div className="tc-field" data-field="currentYear">
                        <label className="tc-label" htmlFor="tc-current-year">
                          Current Year <span className="tc-label__req" aria-hidden="true">*</span>
                        </label>
                        <select
                          id="tc-current-year"
                          className="tc-select"
                          value={form.currentYear}
                          onChange={(e) => handleField("currentYear", e.target.value)}
                          disabled={isSubmitting}
                          aria-required="true"
                          aria-invalid={errors.currentYear ? "true" : undefined}
                        >
                          <option value="">Select year</option>
                          {YEAR_LABELS.map((label) => (
                            <option key={label} value={label}>{label}</option>
                          ))}
                        </select>
                        {errors.currentYear && (
                          <span className="tc-error" role="alert">{errors.currentYear}</span>
                        )}
                      </div>

                      <div className="tc-field" data-field="graduationYear">
                        <label className="tc-label" htmlFor="tc-grad-year">
                          Expected Graduation <span className="tc-label__req" aria-hidden="true">*</span>
                        </label>
                        <select
                          id="tc-grad-year"
                          className="tc-select"
                          value={form.graduationYear}
                          onChange={(e) => handleField("graduationYear", e.target.value)}
                          disabled={isSubmitting}
                          aria-required="true"
                          aria-invalid={errors.graduationYear ? "true" : undefined}
                        >
                          <option value="">Select year</option>
                          {YEAR_OPTIONS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                        {errors.graduationYear && (
                          <span className="tc-error" role="alert">{errors.graduationYear}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Visual gap between sections ── */}
                  <div className="tc-card-gap" />

                  {/* ── Section 2: Questionnaire ── */}
                  <div className="tc-section-header">
                    <div className="tc-section-num" aria-hidden="true">2</div>
                    <h2>Your Time Capsule</h2>
                  </div>
                  <div className="tc-section-divider" />

                  <div className="tc-fields--questionnaire">
                    {QUESTIONS.map(({ key, num, label, placeholder }) => {
                      const len = answers[key].length;
                      return (
                        <div
                          key={key}
                          className="tc-field"
                          data-field={key}
                        >
                          <label
                            className="tc-label"
                            htmlFor={`tc-q-${key}`}
                          >
                            <span>
                              <span className="tc-q-num">{num}</span>
                              <span className="tc-q-label">{label}</span>
                            </span>
                            <span className="tc-label__req" aria-hidden="true">*</span>
                          </label>
                          <textarea
                            id={`tc-q-${key}`}
                            className="tc-textarea"
                            value={answers[key]}
                            onChange={(e) => handleAnswer(key, e.target.value)}
                            placeholder={placeholder}
                            maxLength={MAX_ANSWER}
                            disabled={isSubmitting}
                            rows={4}
                            aria-required="true"
                            aria-invalid={errors[key] ? "true" : undefined}
                          />
                          <div className="tc-field__footer">
                            {errors[key] ? (
                              <span className="tc-error" role="alert">{errors[key]}</span>
                            ) : (
                              <span />
                            )}
                            <span className={charCountClass(len, MAX_ANSWER)}>
                              {len} / {MAX_ANSWER}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── Global Error ── */}
                  {globalError && (
                    <div className="tc-global-error" role="alert">
                      <span aria-hidden="true">⚠</span>
                      <span>{globalError}</span>
                    </div>
                  )}

                  {/* ── Submit ── */}
                  <div className="tc-submit-row">
                    <button
                      type="submit"
                      className="tc-submit-btn"
                      disabled={isSubmitting}
                      aria-busy={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="tc-submit-spinner" aria-hidden="true" />
                          Sealing your capsule…
                        </>
                      ) : (
                        "Seal My Time Capsule 📦"
                      )}
                    </button>
                    <p className="tc-submit-note">
                      Once sealed, your capsule cannot be edited. It will unlock on
                      June 15 of your expected graduation year.
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Success Screen
// ─────────────────────────────────────────────────────────────

function SuccessScreen({ result, displayLink, copied, onCopy }) {
  const writtenDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const unlockDate = result?.unlockDate
    ? new Date(result.unlockDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <section className="tc-form-area">
      <div className="wrap">
        <div className="tc-success" role="region" aria-label="Capsule sealed confirmation">
          <span className="tc-success__seal" aria-hidden="true">📦</span>
          <h2>Your Time Capsule has been sealed.</h2>
          <p className="tc-success__subtitle">
            It will stay locked until your graduation day arrives. Save the link
            below — it is the only way to open your capsule.
          </p>

          {/* Meta details */}
          <div className="tc-success__meta">
            <div className="tc-success__meta-row">
              <span className="tc-success__meta-label">Capsule Code</span>
              <span className="tc-success__meta-value tc-success__code">
                {result.capsuleCode}
              </span>
            </div>
            <div className="tc-success__meta-row">
              <span className="tc-success__meta-label">Written on</span>
              <span className="tc-success__meta-value">{writtenDate}</span>
            </div>
            {unlockDate && (
              <div className="tc-success__meta-row">
                <span className="tc-success__meta-label">Unlocks on</span>
                <span className="tc-success__meta-value">{unlockDate}</span>
              </div>
            )}
          </div>

          {/* Private link */}
          <div className="tc-success__link-section">
            <span className="tc-success__link-label">Your Private Opening Link</span>
            <p className="tc-success__link-desc">
              Copy and save this link in your notes, email, or cloud storage.
              You will need it to open your capsule on graduation day.
            </p>
            <div className="tc-success__link-copy">
              <div
                className="tc-success__link-display"
                aria-label="Private capsule link (masked for security)"
                title="Link is masked. Use the Copy button to copy the full link."
              >
                {displayLink}
              </div>
              <button
                type="button"
                className={`tc-success__copy-btn${copied ? " tc-success__copy-btn--copied" : ""}`}
                onClick={onCopy}
                aria-label={copied ? "Link copied to clipboard" : "Copy your private capsule link"}
              >
                {copied ? "✓ Copied!" : "Copy Link"}
              </button>
            </div>
          </div>

          {/* Warning */}
          <div className="tc-success__warning" role="note">
            ⚠ <strong>Important:</strong> This link contains your private token.
            Do not share it with anyone. Once you navigate away, you will not be
            able to retrieve the link from this page — copy it now.
          </div>
        </div>
      </div>
    </section>
  );
}
