import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { AppStartupContext } from "../context/AppStartupContext";
import ConstellationLoader from "./ConstellationLoader";

const STARTUP_TIMEOUT_MS = 12000;

export default function AppLoader({ children }) {
  const { loading: authLoading } = useAuth();
  const [initialRouteReady, setInitialRouteReady] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  const appReady = !authLoading && initialRouteReady;
  const revealReady = appReady && animationComplete;
  const markInitialRouteReady = useCallback(() => {
    setInitialRouteReady(true);
  }, []);

  useEffect(() => {
    if (appReady) {
      clearTimeout(timeoutRef.current);
      setError(null);
      return undefined;
    }

    timeoutRef.current = setTimeout(() => {
      setError("Taking longer than expected. Please check your internet connection.");
    }, STARTUP_TIMEOUT_MS);

    return () => clearTimeout(timeoutRef.current);
  }, [appReady]);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  const handleAnimationComplete = useCallback(() => {
    setAnimationComplete(true);
  }, []);

  return (
    <AppStartupContext.Provider value={markInitialRouteReady}>
      <ConstellationLoader
        isReady={revealReady}
        error={error}
        onRetry={handleRetry}
        onAnimationComplete={handleAnimationComplete}
      />
      <div
        style={{
          visibility: revealReady ? "visible" : "hidden",
          opacity: revealReady ? 1 : 0,
          transition: "opacity 500ms ease",
          pointerEvents: revealReady ? "auto" : "none",
        }}
        aria-hidden={!revealReady}
      >
        {children}
      </div>
    </AppStartupContext.Provider>
  );
}
