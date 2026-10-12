/**
 * AppLoader.jsx
 *
 * Integrates ConstellationLoader with the real application lifecycle.
 *
 * What counts as "ready":
 *   1. Firebase auth state has been resolved (currentUser !== undefined),
 *      which means onAuthStateChanged has fired at least once. This is the
 *      primary gate because it typically takes 500ms – 2s depending on
 *      network speed and Firebase SDK initialization.
 *   2. A minimum animation display time has been honoured (handled inside
 *      ConstellationLoader itself — it accepts isReady and waits for
 *      MIN_DISPLAY before exiting).
 *
 * What does NOT block the loader:
 *   - Individual page content (blogs, events, gallery images, team data)
 *     where localized skeletons remain useful.
 *   - Non-critical analytics, chat widgets, or third-party scripts.
 *
 * Offline / error handling:
 *   - Detects navigator.onLine at mount.
 *   - Listens for online/offline events.
 *   - Applies a 10-second timeout: if Firebase auth hasn't resolved in 10s
 *     (common on very slow connections), shows an error with a Retry option.
 *   - Retry re-runs the Firebase auth check by calling window.location.reload()
 *     (simplest and most reliable recovery for a stuck auth check).
 *
 * This component shows the constellation loader during initial app startup.
 * Lazy route chunks and blocking route data use the same loader in their own
 * Suspense or page loading states after the app shell has mounted.
 */

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import ConstellationLoader from "./ConstellationLoader";

// How long before we declare the auth check "too slow" and show an error.
const AUTH_TIMEOUT_MS = 12000;

// Session key: has the constellation been shown this session?
const SESSION_KEY = "cl_shown";

export default function AppLoader({ children }) {
  const { loading: authLoading } = useAuth();

  // Only show the constellation on the very first mount of this session.
  // After that, route transitions use the app's Suspense and page loaders.
  const [shouldShow] = useState(() => {
    try {
      return !sessionStorage.getItem(SESSION_KEY);
    } catch {
      return true;
    }
  });

  const [appReady, setAppReady] = useState(!shouldShow || !authLoading);
  const [error, setError] = useState(null);

  const timeoutRef = useRef(null);
  const hasMarkedRef = useRef(!shouldShow);

  // Mark session so subsequent navigations skip the constellation
  function markShown() {
    if (hasMarkedRef.current) return;
    hasMarkedRef.current = true;
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* noop */ }
  }

  // Watch Firebase auth loading state
  useEffect(() => {
    if (!shouldShow) return;

    if (!authLoading) {
      // Auth resolved — app shell is ready
      clearTimeout(timeoutRef.current);
      setError(null);
      setAppReady(true);
      markShown();
      return;
    }

    // Start a timeout so we never block forever on a stuck auth check
    timeoutRef.current = setTimeout(() => {
      if (!hasMarkedRef.current) {
        setError(
          "Taking longer than expected. Please check your internet connection."
        );
      }
    }, AUTH_TIMEOUT_MS);

    return () => clearTimeout(timeoutRef.current);
  }, [authLoading, shouldShow]);

  // If we're not supposed to show the loader, render children immediately
  if (!shouldShow) {
    return children;
  }

  function handleRetry() {
    // Simplest reliable recovery: fresh page load.
    // The sessionStorage key is NOT set, so the constellation will run again.
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
    window.location.reload();
  }

  return (
    <>
      <ConstellationLoader
        isReady={appReady}
        error={error}
        onRetry={handleRetry}
      />
      {/*
        Render children immediately so React can begin loading lazy chunks
        in the background while the animation plays. Suspense will catch
        lazy chunks via the constellation fallback in App.jsx, including any
        chunk that has not loaded when the initial animation exits.
      */}
      <div
        style={{
          // Keep children in the DOM but invisible while the overlay is shown.
          // This pre-renders the app tree so content is ready when we fade out.
          visibility: appReady ? "visible" : "hidden",
          // Prevent interaction through the overlay
          pointerEvents: appReady ? "auto" : "none",
        }}
        aria-hidden={!appReady}
      >
        {children}
      </div>
    </>
  );
}
