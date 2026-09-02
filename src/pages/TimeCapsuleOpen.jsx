import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { verifyTimeCapsuleToken } from "../Firebase/timeCapsuleService.js";
import "./TimeCapsuleOpen.css";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const QUESTIONS = [
  { key: "aspiredRole",      num: "Q1", label: "What do you want to become?" },
  { key: "biggestDream",     num: "Q2", label: "What is your biggest dream right now?" },
  { key: "fourYearVision",   num: "Q3", label: "Where do you see yourself after 4 years?" },
  { key: "graduationGoals",  num: "Q4", label: "What do you want to achieve before graduation?" },
  { key: "currentFear",      num: "Q5", label: "What is your biggest fear right now?" },
  { key: "inspirationSource",num: "Q6", label: "Who or what inspires you?" },
  { key: "personalPromise",  num: "Q7", label: "What is one promise you are making to yourself?" },
  { key: "memoryAnchor",     num: "Q8", label: "What do you want your future self to remember about today?" },
];

const TOKEN_REGEX = /^[0-9a-f]{64}$/i;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const unlock = new Date(dateStr);
  if (isNaN(unlock)) return null;
  const now = new Date();
  const diff = unlock.getTime() - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

export default function TimeCapsuleOpen() {
  const { token } = useParams();

  // phase: "verifying" | "locked" | "opened" | "error"
  const [phase, setPhase] = useState("verifying");
  const [capsule, setCapsule] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Prevent double-fetch in StrictMode
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function verify() {
      // ── Client-side token format check ──
      if (!token || !TOKEN_REGEX.test(token)) {
        setPhase("error");
        setErrorMsg(
          "This link does not look right. The token is missing or malformed. Please check your link and try again."
        );
        return;
      }

      try {
        const data = await verifyTimeCapsuleToken(token);

        if (data.locked) {
          // Capsule is still sealed
          setCapsule(data);
          setPhase("locked");
          // Clean the token from the URL — it stays in the locked state
          // so no reason to expose it permanently in the address bar
          window.history.replaceState(null, "", "/time-capsule/open");
          return;
        }

        // Capsule opened — store the data and clean URL
        setCapsule(data);
        setPhase("opened");
        // Remove the secret token from the URL after successful opening
        window.history.replaceState(null, "", "/time-capsule/opened");
      } catch (err) {
        setPhase("error");
        const msg = err?.message || "";
        if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
          setErrorMsg(
            "No capsule was found for this link. The token may be incorrect or the capsule may have been removed."
          );
        } else if (msg.includes("429") || msg.toLowerCase().includes("rate")) {
          setErrorMsg(
            "Too many requests. Please wait a moment and try again."
          );
        } else {
          setErrorMsg(
            msg || "Something went wrong while opening your capsule. Please check your connection and try again."
          );
        }
      }
    }

    verify();
  }, [token]);

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  return (
    <>
      {/* This route must never be indexed by search engines */}
      <Helmet>
        <title>Open Your Time Capsule | Abhyudaya</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Open your Abhyudaya Time Capsule." />
      </Helmet>

      <main className="tco-page">
        <div className="wrap">
          <div className="tco-card">
            {phase === "verifying" && <VerifyingState />}
            {phase === "error"     && <ErrorState message={errorMsg} />}
            {phase === "locked"    && capsule && <LockedState capsule={capsule} />}
            {phase === "opened"    && capsule && <OpenedState capsule={capsule} />}
          </div>
        </div>
      </main>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Verifying State
// ─────────────────────────────────────────────────────────────

function VerifyingState() {
  return (
    <div className="tco-verifying" role="status" aria-live="polite">
      <div className="tco-verifying__spinner" aria-hidden="true" />
      <p className="tco-verifying__text">Verifying your capsule…</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Error State
// ─────────────────────────────────────────────────────────────

function ErrorState({ message }) {
  return (
    <div className="tco-error" role="alert">
      <span className="tco-error__icon" aria-hidden="true">🔗</span>
      <h2>Cannot Open This Capsule</h2>
      <p className="tco-error__desc">{message}</p>
      <Link to="/time-capsule" className="btn btn--solid">
        Create a New Capsule
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Locked State
// ─────────────────────────────────────────────────────────────

function LockedState({ capsule }) {
  const days = daysUntil(capsule.unlockDate);
  const unlockFormatted = formatDate(capsule.unlockDate);

  return (
    <div className="tco-locked" role="main">
      <span className="tco-locked__icon" aria-hidden="true">🔒</span>
      <h2>Your Capsule is Still Sealed</h2>
      <p className="tco-locked__tagline">
        This capsule holds a message from your past self. It cannot be opened
        yet — your graduation day has not arrived.
      </p>

      <div className="tco-locked__meta">
        {capsule.capsuleCode && (
          <div className="tco-locked__meta-row">
            <span className="tco-locked__meta-label">Capsule</span>
            <span className="tco-locked__meta-value">{capsule.capsuleCode}</span>
          </div>
        )}
        {capsule.unlockDate && (
          <div className="tco-locked__meta-row">
            <span className="tco-locked__meta-label">Unlocks on</span>
            <span className="tco-locked__meta-value">{unlockFormatted}</span>
          </div>
        )}
      </div>

      {days !== null && days > 0 && (
        <div
          className="tco-locked__countdown"
          aria-label={`${days} days remaining until the capsule unlocks`}
        >
          <span aria-hidden="true">⏳</span>
          {days.toLocaleString("en-IN")} day{days !== 1 ? "s" : ""} to go
        </div>
      )}

      {unlockFormatted && (
        <p className="tco-locked__message">
          Come back on {unlockFormatted} — your past self will be waiting.
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Opened State
// ─────────────────────────────────────────────────────────────

function OpenedState({ capsule }) {
  const writtenDate  = formatDate(capsule.createdAt);
  const openedDate   = formatDate(capsule.openedAt);

  // answers may come from capsule.answers object
  const answers = capsule.answers || {};

  return (
    <div className="tco-opened" role="main" aria-label="Time Capsule opened">
      {/* ── Header ── */}
      <div className="tco-opened__header">
        <span className="tco-opened__badge">Abhyudaya Time Capsule</span>
        <span className="tco-opened__header-icon" aria-hidden="true">💌</span>
        <h1 className="tco-opened__heading">
          A message from your past self.
        </h1>
        {capsule.name && (
          <p className="tco-opened__subheading">
            Written by {capsule.name} — to the person they were going to become.
          </p>
        )}
      </div>

      {/* ── Meta strip ── */}
      <div className="tco-opened__meta" aria-label="Capsule details">
        {capsule.capsuleCode && (
          <div className="tco-opened__meta-item">
            <span className="tco-opened__meta-key">Capsule</span>
            <span className="tco-opened__meta-val tco-opened__meta-val--code">
              {capsule.capsuleCode}
            </span>
          </div>
        )}
        {capsule.name && (
          <div className="tco-opened__meta-item">
            <span className="tco-opened__meta-key">Written by</span>
            <span className="tco-opened__meta-val">{capsule.name}</span>
          </div>
        )}
        {capsule.course && (
          <div className="tco-opened__meta-item">
            <span className="tco-opened__meta-key">Course</span>
            <span className="tco-opened__meta-val">{capsule.course}</span>
          </div>
        )}
        {capsule.currentYear && (
          <div className="tco-opened__meta-item">
            <span className="tco-opened__meta-key">Year (when written)</span>
            <span className="tco-opened__meta-val">{capsule.currentYear}</span>
          </div>
        )}
        {writtenDate && (
          <div className="tco-opened__meta-item">
            <span className="tco-opened__meta-key">Written on</span>
            <span className="tco-opened__meta-val">{writtenDate}</span>
          </div>
        )}
        {openedDate && (
          <div className="tco-opened__meta-item">
            <span className="tco-opened__meta-key">Opened on</span>
            <span className="tco-opened__meta-val">{openedDate}</span>
          </div>
        )}
      </div>

      {/* ── Answers ── */}
      <div className="tco-opened__answers">
        {QUESTIONS.map(({ key, num, label }, idx) => {
          const text = answers[key];
          if (!text) return null;
          return (
            <article
              key={key}
              className="tco-answer"
              style={{ animationDelay: `${idx * 0.07}s` }}
            >
              <p className="tco-answer__q-num" aria-hidden="true">{num}</p>
              <p className="tco-answer__question">{label}</p>
              {/*
                Answers are rendered as plain text via React's default JSX
                escaping. We intentionally do NOT use dangerouslySetInnerHTML.
                white-space: pre-wrap in CSS preserves newlines safely.
              */}
              <p className="tco-answer__text">{text}</p>
            </article>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div className="tco-opened__footer">
        <p className="tco-opened__footer-text">You made it. 🎓</p>
        <p className="tco-opened__footer-sub">
          From Abhyudaya Club, MPEC Kanpur — we are proud of who you became.
        </p>
      </div>
    </div>
  );
}
