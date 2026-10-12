/**
 * ConstellationLoader.jsx
 *
 * Cinematic full-screen loading overlay for Abhyudaya Club.
 *
 * Animation stages:
 *   Stage 1 (0–400 ms)   — Starfield appears
 *   Stage 2 (400–1200 ms) — Constellation forms (SVG lines draw in)
 *   Stage 3 (1000–1700 ms) — Official logo fades in over constellation
 *   Stage 4 (1400–2000 ms) — Club identity text & loading bar appear
 *   Stage 5 (>2000 ms)    — Living constellation (gentle twinkle/pulse)
 *   Stage 6              — Smooth fade-out when app is ready
 *
 * Logo used: src/assets/logo-512.png (circular, 512x512)
 * Constellation nodes are derived from the logo's key visual landmarks:
 *   - Circular rim (12 perimeter points)
 *   - Sun/halo arc above the book (7 ray points)
 *   - Open book (4 corner points + spine)
 *   - Two hands (2 points each)
 *   - Text arc positions (CURIOSITY TO CREATION + Abhyudaya)
 *
 * Props:
 *   isReady     {boolean}  — When true, begins the exit animation and unmounts.
 *   error       {string|null} — Non-null string triggers the error state.
 *   onRetry     {function} — Called when the user clicks "Try Again".
 */

import { useEffect, useRef, useState, useCallback } from "react";
import logo from "../assets/logo-512.png";
import "./ConstellationLoader.css";

/* ===================================================================
   1. CONSTELLATION GEOMETRY
   All coordinates are in a 200×200 SVG viewBox.
   They are hand-tuned to the visual landmarks of the Abhyudaya logo:
     - The circular border ring
     - The golden sun arc & circuit-board rays
     - The open book
     - The two rising hands
     - The text arc ("CURIOSITY TO CREATION") and "Abhyudaya" script
   =================================================================== */

// Perimeter of the circular logo border (12 evenly-spaced points)
const perimeterPoints = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
  return {
    id: `rim-${i}`,
    x: 100 + 90 * Math.cos(angle),
    y: 100 + 90 * Math.sin(angle),
    r: 1.8,
    color: "#eeb84a",
    opacity: 0.55,
  };
});

// Sun / radiant halo arc points (above centre, fanning out)
const sunArcPoints = [
  { id: "sun-0", x: 100, y: 26,  r: 2.5, color: "#eeb84a", opacity: 0.9 },
  { id: "sun-1", x: 82,  y: 32,  r: 2.0, color: "#eeb84a", opacity: 0.8 },
  { id: "sun-2", x: 67,  y: 42,  r: 1.8, color: "#eeb84a", opacity: 0.7 },
  { id: "sun-3", x: 118, y: 32,  r: 2.0, color: "#eeb84a", opacity: 0.8 },
  { id: "sun-4", x: 133, y: 42,  r: 1.8, color: "#eeb84a", opacity: 0.7 },
  { id: "sun-5", x: 57,  y: 58,  r: 1.5, color: "#f7d189", opacity: 0.55 },
  { id: "sun-6", x: 143, y: 58,  r: 1.5, color: "#f7d189", opacity: 0.55 },
];

// Open book corners + spine
const bookPoints = [
  { id: "book-tl",     x: 56,  y: 100, r: 2.2, color: "#a5424a", opacity: 0.85 },
  { id: "book-tr",     x: 144, y: 100, r: 2.2, color: "#a5424a", opacity: 0.85 },
  { id: "book-bl",     x: 58,  y: 136, r: 2.2, color: "#a5424a", opacity: 0.85 },
  { id: "book-br",     x: 142, y: 136, r: 2.2, color: "#a5424a", opacity: 0.85 },
  { id: "book-spine",  x: 100, y: 136, r: 2.8, color: "#7a2128", opacity: 0.9 },
  { id: "book-top-l",  x: 76,  y: 96,  r: 1.6, color: "#a5424a", opacity: 0.7 },
  { id: "book-top-r",  x: 124, y: 96,  r: 1.6, color: "#a5424a", opacity: 0.7 },
];

// Rising hands — two arms reaching toward each other above the book
const handPoints = [
  { id: "hand-l-base",  x: 84,  y: 90,  r: 2.2, color: "#f7d189", opacity: 0.9 },
  { id: "hand-l-tip",   x: 92,  y: 70,  r: 2.0, color: "#eeb84a", opacity: 0.95 },
  { id: "hand-r-base",  x: 116, y: 90,  r: 2.2, color: "#f7d189", opacity: 0.9 },
  { id: "hand-r-tip",   x: 108, y: 70,  r: 2.0, color: "#eeb84a", opacity: 0.95 },
  { id: "hands-meet",   x: 100, y: 62,  r: 3.0, color: "#eeb84a", opacity: 1.0 },
];

// Text arc — "CURIOSITY TO CREATION" arc (upper portion)
const textArcPoints = [
  { id: "txt-0", x: 46,  y: 72,  r: 1.5, color: "#fbf4e8", opacity: 0.45 },
  { id: "txt-1", x: 38,  y: 100, r: 1.5, color: "#fbf4e8", opacity: 0.45 },
  { id: "txt-2", x: 46,  y: 128, r: 1.5, color: "#fbf4e8", opacity: 0.45 },
  { id: "txt-3", x: 154, y: 72,  r: 1.5, color: "#fbf4e8", opacity: 0.45 },
  { id: "txt-4", x: 162, y: 100, r: 1.5, color: "#fbf4e8", opacity: 0.45 },
  { id: "txt-5", x: 154, y: 128, r: 1.5, color: "#fbf4e8", opacity: 0.45 },
  // Abhyudaya text baseline
  { id: "txt-6", x: 70,  y: 158, r: 1.5, color: "#fbf4e8", opacity: 0.45 },
  { id: "txt-7", x: 100, y: 162, r: 1.8, color: "#fbf4e8", opacity: 0.5  },
  { id: "txt-8", x: 130, y: 158, r: 1.5, color: "#fbf4e8", opacity: 0.45 },
];

// All dots merged, preserving draw order (perimeter -> sun -> book -> hands -> text)
const ALL_DOTS = [
  ...perimeterPoints,
  ...sunArcPoints,
  ...bookPoints,
  ...handPoints,
  ...textArcPoints,
];

/* ===================================================================
   2. CONSTELLATION EDGES
   Each edge connects two dot IDs with a golden or maroon line.
   Grouped in draw-order batches for the progressive reveal.
   =================================================================== */

// Helper: look up a dot's coordinates by ID
function dotCoords(id) {
  return ALL_DOTS.find((d) => d.id === id);
}

const EDGES_RAW = [
  // --- Perimeter ring segments (drawn first — establishes the circular form) ---
  { a: "rim-0",  b: "rim-1",  color: "#eeb84a", width: 0.7, batch: 0 },
  { a: "rim-1",  b: "rim-2",  color: "#eeb84a", width: 0.7, batch: 0 },
  { a: "rim-2",  b: "rim-3",  color: "#eeb84a", width: 0.7, batch: 0 },
  { a: "rim-3",  b: "rim-4",  color: "#eeb84a", width: 0.7, batch: 0 },
  { a: "rim-4",  b: "rim-5",  color: "#eeb84a", width: 0.7, batch: 0 },
  { a: "rim-5",  b: "rim-6",  color: "#eeb84a", width: 0.7, batch: 0 },
  { a: "rim-6",  b: "rim-7",  color: "#eeb84a", width: 0.7, batch: 0 },
  { a: "rim-7",  b: "rim-8",  color: "#eeb84a", width: 0.7, batch: 0 },
  { a: "rim-8",  b: "rim-9",  color: "#eeb84a", width: 0.7, batch: 0 },
  { a: "rim-9",  b: "rim-10", color: "#eeb84a", width: 0.7, batch: 0 },
  { a: "rim-10", b: "rim-11", color: "#eeb84a", width: 0.7, batch: 0 },
  { a: "rim-11", b: "rim-0",  color: "#eeb84a", width: 0.7, batch: 0 },

  // --- Rim to sun rays (batch 1) ---
  { a: "rim-0",  b: "sun-0",  color: "#eeb84a", width: 0.6, batch: 1 },
  { a: "sun-0",  b: "sun-1",  color: "#eeb84a", width: 0.6, batch: 1 },
  { a: "sun-0",  b: "sun-3",  color: "#eeb84a", width: 0.6, batch: 1 },
  { a: "sun-1",  b: "sun-2",  color: "#eeb84a", width: 0.5, batch: 1 },
  { a: "sun-3",  b: "sun-4",  color: "#eeb84a", width: 0.5, batch: 1 },
  { a: "sun-2",  b: "sun-5",  color: "#f7d189", width: 0.5, batch: 1 },
  { a: "sun-4",  b: "sun-6",  color: "#f7d189", width: 0.5, batch: 1 },

  // --- Sun apex to hands-meet (batch 2) ---
  { a: "sun-0",      b: "hands-meet",  color: "#eeb84a", width: 0.7, batch: 2 },
  { a: "hands-meet", b: "hand-l-tip",  color: "#eeb84a", width: 0.7, batch: 2 },
  { a: "hands-meet", b: "hand-r-tip",  color: "#eeb84a", width: 0.7, batch: 2 },
  { a: "hand-l-tip", b: "hand-l-base", color: "#f7d189", width: 0.6, batch: 2 },
  { a: "hand-r-tip", b: "hand-r-base", color: "#f7d189", width: 0.6, batch: 2 },

  // --- Book outline (batch 3) ---
  { a: "book-top-l", b: "book-tl",    color: "#a5424a", width: 0.8, batch: 3 },
  { a: "book-tl",    b: "book-bl",    color: "#7a2128", width: 0.8, batch: 3 },
  { a: "book-bl",    b: "book-spine", color: "#7a2128", width: 0.8, batch: 3 },
  { a: "book-spine", b: "book-br",    color: "#7a2128", width: 0.8, batch: 3 },
  { a: "book-br",    b: "book-tr",    color: "#7a2128", width: 0.8, batch: 3 },
  { a: "book-tr",    b: "book-top-r", color: "#a5424a", width: 0.8, batch: 3 },
  { a: "book-top-l", b: "book-spine", color: "#a5424a", width: 0.5, batch: 3 },
  { a: "book-top-r", b: "book-spine", color: "#a5424a", width: 0.5, batch: 3 },

  // --- Hands connecting to book top (batch 3) ---
  { a: "hand-l-base", b: "book-top-l", color: "#f7d189", width: 0.6, batch: 3 },
  { a: "hand-r-base", b: "book-top-r", color: "#f7d189", width: 0.6, batch: 3 },

  // --- Text arc connections (batch 4 — last) ---
  { a: "txt-0", b: "txt-1",  color: "#fbf4e8", width: 0.4, batch: 4 },
  { a: "txt-1", b: "txt-2",  color: "#fbf4e8", width: 0.4, batch: 4 },
  { a: "txt-3", b: "txt-4",  color: "#fbf4e8", width: 0.4, batch: 4 },
  { a: "txt-4", b: "txt-5",  color: "#fbf4e8", width: 0.4, batch: 4 },
  { a: "txt-6", b: "txt-7",  color: "#fbf4e8", width: 0.4, batch: 4 },
  { a: "txt-7", b: "txt-8",  color: "#fbf4e8", width: 0.4, batch: 4 },
  // Connect text nodes to nearest rim/book points
  { a: "rim-2",  b: "txt-0",  color: "#fbf4e8", width: 0.3, batch: 4 },
  { a: "rim-4",  b: "txt-1",  color: "#fbf4e8", width: 0.3, batch: 4 },
  { a: "rim-9",  b: "txt-3",  color: "#fbf4e8", width: 0.3, batch: 4 },
  { a: "rim-7",  b: "txt-4",  color: "#fbf4e8", width: 0.3, batch: 4 },
  { a: "book-bl", b: "txt-6", color: "#fbf4e8", width: 0.3, batch: 4 },
  { a: "book-br", b: "txt-8", color: "#fbf4e8", width: 0.3, batch: 4 },
];

// Pre-compute edge lengths for stroke-dasharray
function edgeDist(a, b) {
  const da = dotCoords(a);
  const db = dotCoords(b);
  if (!da || !db) return 60;
  return Math.hypot(db.x - da.x, db.y - da.y);
}

const EDGES = EDGES_RAW.map((e, idx) => ({
  ...e,
  id: `edge-${idx}`,
  len: edgeDist(e.a, e.b),
  x1: dotCoords(e.a)?.x ?? 0,
  y1: dotCoords(e.a)?.y ?? 0,
  x2: dotCoords(e.b)?.x ?? 0,
  y2: dotCoords(e.b)?.y ?? 0,
}));

/* ===================================================================
   3. BACKGROUND STAR-FIELD DATA (static for SSR safety)
   =================================================================== */

const BG_STARS = Array.from({ length: 55 }, (_, i) => {
  // Deterministic pseudo-random using simple integer arithmetic on index
  const lx   = (((i * 137) % 97) + 1.5);
  const ly   = (((i * 211) % 97) + 1.5);
  const size = ((i * 31 + 7) % 3) * 0.6 + 0.6;
  const dur  = 2.2 + ((i * 17) % 30) * 0.1;
  const del  = ((i * 13) % 40) * 0.1;
  const dim  = 0.08 + ((i * 7) % 20) * 0.01;
  const brt  = 0.35 + ((i * 11) % 40) * 0.01;
  // Pale blue or gold tint for variety
  const hue  = i % 4 === 0 ? "#f7d189" : i % 7 === 0 ? "#bfdbfe" : "#ffffff";
  return { lx, ly, size, dur, del, dim, brt, hue };
});

const PARTICLES = Array.from({ length: 6 }, (_, i) => ({
  lx: 10 + ((i * 43) % 80),
  ly: 10 + ((i * 67) % 80),
  size: 2 + (i % 3),
  dur: 16 + (i * 5),
  del: i * 2.5,
  dx: -20 + ((i * 31) % 40),
  dy: -50 + ((i * 19) % 30) * -1,
  color: i % 2 === 0 ? "rgba(238,184,74,0.25)" : "rgba(122,33,40,0.2)",
}));

/* ===================================================================
   4. ANIMATION TIMING (ms)
   =================================================================== */
const T = {
  STAGE1_START:    0,
  STAGE2_START:  380,   // Constellation begins forming
  STAGE3_START:  980,   // Logo reveal begins
  STAGE4_START: 1380,   // Identity text & bar appear
  STAGE5_START: 1900,   // Living constellation (if still loading)
  MIN_DISPLAY:  1600,   // Minimum time the loader stays visible
  EXIT_DURATION: 550,   // CSS fade-out duration
};

// Batch stagger within constellation formation
const BATCH_OFFSETS = [0, 140, 280, 420, 560]; // ms offset per batch
const EDGE_DUR_MS   = 380; // single edge draw duration

/* ===================================================================
   5. MAIN COMPONENT
   =================================================================== */

export default function ConstellationLoader({ isReady, error, onRetry }) {
  // Animation stage booleans
  const [stage, setStage] = useState(1);
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [glowVisible, setGlowVisible] = useState(false);
  const [glowPulse, setGlowPulse] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [identityVisible, setIdentityVisible] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const [edgeClasses, setEdgeClasses] = useState({}); // edge-id -> class string
  const [statusMsg, setStatusMsg] = useState("");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const timerRefs = useRef([]);
  const readyRef   = useRef(isReady);
  const startTime  = useRef(Date.now());

  const addTimer = useCallback((fn, delay) => {
    const id = setTimeout(fn, delay);
    timerRefs.current.push(id);
    return id;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => timerRefs.current.forEach(clearTimeout);
  }, []);

  // Connectivity detection
  useEffect(() => {
    const onOnline  = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Keep readyRef in sync for use inside timers
  useEffect(() => {
    readyRef.current = isReady;
  }, [isReady]);

  // ── Stage sequencer ────────────────────────────────────────────────
  useEffect(() => {
    // Stage 1 → glow start
    addTimer(() => setGlowVisible(true), T.STAGE1_START + 200);

    // Stage 2 → constellation formation
    addTimer(() => {
      setStage(2);
      // Stagger edge drawing by batch
      EDGES.forEach((edge) => {
        const batchDelay = BATCH_OFFSETS[edge.batch] ?? 0;
        // Queue per-edge class addition
        addTimer(() => {
          setEdgeClasses((prev) => ({
            ...prev,
            [edge.id]: "cl-edge cl-edge--animate",
          }));
        }, batchDelay);
      });
    }, T.STAGE2_START);

    // Stage 3 → logo reveal
    addTimer(() => {
      setStage(3);
      setLogoVisible(true);
      // Fade edges after logo reveals
      addTimer(() => {
        setEdgeClasses((prev) => {
          const next = { ...prev };
          EDGES.forEach((e) => {
            next[e.id] = "cl-edge cl-edge--fade";
          });
          return next;
        });
      }, 600);
    }, T.STAGE3_START);

    // Stage 4 → identity text & bar
    addTimer(() => {
      setStage(4);
      setIdentityVisible(true);
      setBarVisible(true);
    }, T.STAGE4_START);

    // Stage 5 → living constellation
    addTimer(() => {
      setStage(5);
      setGlowPulse(true);
      setStatusMsg("Loading your experience\u2026");
      // Switch edges to living mode
      setEdgeClasses((prev) => {
        const next = { ...prev };
        EDGES.forEach((e) => {
          // Only illuminate select edges for subtlety
          if (e.batch === 0 || e.batch === 1) {
            next[e.id] = "cl-edge cl-edge--living";
          } else {
            next[e.id] = "cl-edge";
          }
        });
        return next;
      });
    }, T.STAGE5_START);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Exit when app is ready ─────────────────────────────────────────
  useEffect(() => {
    if (!isReady && !error) return;
    if (exiting || !mounted) return;

    const elapsed = Date.now() - startTime.current;
    const remaining = Math.max(0, T.MIN_DISPLAY - elapsed);

    addTimer(() => {
      setExiting(true);
      // Unmount after CSS fade-out completes
      addTimer(() => setMounted(false), T.EXIT_DURATION + 50);
    }, remaining);
  }, [isReady, error, exiting, mounted, addTimer]);

  if (!mounted) return null;

  const showError = !!error || (isOffline && stage >= 4);

  return (
    <div
      className={`cl-overlay${exiting ? " cl-overlay--exiting" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={showError ? "Loading error" : "Loading Abhyudaya Club website\u2026"}
    >
      {/* ── Background star-field ──────────────────────────────────── */}
      <div className="cl-starfield" aria-hidden="true">
        {BG_STARS.map((s, i) => (
          <div
            key={i}
            className="cl-star"
            style={{
              left: `${s.lx}%`,
              top:  `${s.ly}%`,
              width:  `${s.size}px`,
              height: `${s.size}px`,
              "--dur":    `${s.dur}s`,
              "--delay":  `${s.del}s`,
              "--dim":    s.dim,
              "--bright": s.brt,
              background: s.hue,
            }}
          />
        ))}
        {PARTICLES.map((p, i) => (
          <div
            key={`particle-${i}`}
            className="cl-particle"
            style={{
              left:   `${p.lx}%`,
              top:    `${p.ly}%`,
              width:  `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              "--dur":   `${p.dur}s`,
              "--delay": `${p.del}s`,
              "--dx":    `${p.dx}px`,
              "--dy":    `${p.dy}px`,
            }}
          />
        ))}
      </div>

      {/* ── Ambient glow ──────────────────────────────────────────── */}
      <div
        className={`cl-glow${glowVisible ? " cl-glow--visible" : ""}${glowPulse ? " cl-glow--pulse" : ""}`}
        aria-hidden="true"
      />

      {/* ── Constellation SVG + Logo ───────────────────────────────── */}
      <div className="cl-svg-wrap">
        <svg
          className="cl-constellation"
          viewBox="0 0 200 200"
          aria-hidden="true"
          focusable="false"
        >
          {/* Edges */}
          {EDGES.map((edge) => (
            <line
              key={edge.id}
              className={edgeClasses[edge.id] || "cl-edge"}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              stroke={edge.color}
              strokeWidth={edge.width}
              style={{
                "--len":       edge.len,
                "--draw-dur":  `${EDGE_DUR_MS}ms`,
                "--draw-delay": `0ms`,
              }}
            />
          ))}

          {/* Dots */}
          {ALL_DOTS.map((dot) => (
            <circle
              key={dot.id}
              className="cl-dot"
              cx={dot.x}
              cy={dot.y}
              r={dot.r}
              fill={dot.color}
              opacity={dot.opacity}
            />
          ))}
        </svg>

        {/* Official logo overlay */}
        <div className="cl-logo-wrap" aria-hidden="true">
          <img
            src={logo}
            alt=""
            className={`cl-logo${logoVisible ? " cl-logo--visible" : ""}`}
            width="512"
            height="512"
            draggable={false}
          />
        </div>
      </div>

      {/* ── Identity text ──────────────────────────────────────────── */}
      <div
        className={`cl-identity${identityVisible ? " cl-identity--visible" : ""}`}
        aria-hidden={!identityVisible}
      >
        <span className="cl-identity__title">Abhyudaya</span>
        <span className="cl-identity__sub">Science &amp; Literary Club &middot; MPEC Kanpur</span>
      </div>

      {/* ── Loading bar (shown while loading, hidden in error state) ── */}
      {!showError && (
        <>
          <div
            className={`cl-bar-wrap${barVisible ? " cl-bar-wrap--visible" : ""}`}
            aria-hidden="true"
          >
            <div className="cl-bar" />
          </div>

          <p
            className={`cl-status${stage >= 5 ? " cl-status--visible" : ""}`}
            aria-live="polite"
          >
            {statusMsg}
          </p>
        </>
      )}

      {/* ── Error / Offline state ───────────────────────────────────── */}
      {showError && (
        <div
          className={`cl-error${showError ? " cl-error--visible" : ""}`}
          role="alert"
        >
          <p className="cl-error__msg">
            {isOffline
              ? "No connection detected. Please check your internet and try again."
              : error || "Unable to load this page. Please check your connection."}
          </p>
          {onRetry && (
            <button
              type="button"
              className="cl-error__retry"
              onClick={onRetry}
              aria-label="Retry loading the page"
            >
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
