import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./TimeCapsulePopup.css";

// ── localStorage key + expiry ────────────────────────────
const LS_KEY = "abhyudaya_time_capsule_popup_dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Routes where popup must NOT appear ───────────────────
const EXCLUDED_PREFIXES = ["/time-capsule", "/admin"];

function isExcludedRoute(pathname) {
  return EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function shouldShowPopup() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return true;
    const { ts, type } = JSON.parse(raw);
    // If dismissed permanently during CTA click — suppress for session only
    if (type === "cta") return false;
    // Timed dismissal — re-appear after 7 days
    if (type === "dismiss" && Date.now() - ts < DISMISS_DURATION_MS) return false;
    return true;
  } catch {
    return true;
  }
}

function markDismissed(type = "dismiss") {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ts: Date.now(), type }));
  } catch {
    // localStorage may be unavailable in private mode — fail silently
  }
}

// ── Component ─────────────────────────────────────────────

export default function TimeCapsulePopup() {
  const location = useLocation();
  const navigate = useNavigate();

  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const overlayRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Decide whether to show at all on this route + localStorage state
  const shouldMount =
    !isExcludedRoute(location.pathname) && shouldShowPopup();

  useEffect(() => {
    if (!shouldMount) return;

    // Delay so the page renders first
    const timer = setTimeout(() => {
      setVisible(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [shouldMount]);

  // Body scroll lock + focus trap
  useEffect(() => {
    if (!visible) return;

    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = "hidden";

    // Move focus to close button after paint
    const rafId = requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(rafId);
      document.body.style.overflow = "";
      previousFocusRef.current?.focus?.();
    };
  }, [visible]);

  const triggerClose = useCallback(
    (type = "dismiss") => {
      if (closing) return;
      markDismissed(type);
      setClosing(true);
      setTimeout(() => {
        setVisible(false);
        setClosing(false);
      }, 260); // matches CSS animation duration
    },
    [closing]
  );

  // Keyboard: Escape, and focus trap (Tab / Shift+Tab)
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        triggerClose("dismiss");
        return;
      }

      // Focus trap: keep Tab inside the modal
      if (e.key === "Tab" && overlayRef.current) {
        const focusable = Array.from(
          overlayRef.current.querySelectorAll(
            'button, [href], [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.disabled);

        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visible, triggerClose]);

  const handleCTA = useCallback(() => {
    triggerClose("cta");
    // Small timeout so the closing animation starts before navigation
    setTimeout(() => {
      navigate("/time-capsule");
    }, 120);
  }, [triggerClose, navigate]);

  const handleOverlayClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) {
        triggerClose("dismiss");
      }
    },
    [triggerClose]
  );

  if (!visible && !shouldMount) return null;
  if (!visible) return null;

  return (
    <div
      ref={overlayRef}
      className={`tc-popup-overlay${closing ? " tc-popup-closing" : ""}`}
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="tc-popup-title"
      aria-describedby="tc-popup-desc"
    >
      <div
        className="tc-popup"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background decorative glow */}
        <div className="tc-popup__stars" aria-hidden="true" />

        {/* Close button */}
        <button
          ref={closeButtonRef}
          className="tc-popup__close"
          onClick={() => triggerClose("dismiss")}
          aria-label="Close Time Capsule promotion"
          type="button"
        >
          ✕
        </button>

        <div className="tc-popup__body">
          {/* Floating capsule icon */}
          <span className="tc-popup__icon" aria-hidden="true">📦</span>

          {/* Eyebrow */}
          <span className="tc-popup__eyebrow">Abhyudaya Time Capsule</span>

          {/* Heading */}
          <h2 className="tc-popup__heading" id="tc-popup-title">
            A Message For Your Future Self
          </h2>

          {/* Body copy */}
          <p className="tc-popup__text" id="tc-popup-desc">
            What will you become 4 years from now?
          </p>

          <ul className="tc-popup__lines" aria-label="How it works">
            <li>Write something today.</li>
            <li>Seal it.</li>
            <li>Open it when your journey reaches the other side.</li>
          </ul>

          <div className="tc-popup__divider" aria-hidden="true" />

          {/* CTA */}
          <button
            className="tc-popup__cta"
            type="button"
            onClick={handleCTA}
            id="tc-popup-cta"
          >
            Create My Time Capsule →
          </button>

          {/* Dismiss */}
          <button
            className="tc-popup__dismiss"
            type="button"
            onClick={() => triggerClose("dismiss")}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
