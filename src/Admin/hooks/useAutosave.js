import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Reusable Autosave Hook for Blogger-like CMS.
 *
 * @param {Object} options
 * @param {any} options.data - Data object to monitor for changes.
 * @param {Function} options.onSave - Async callback (data) => Promise<void>
 * @param {number} [options.interval=20000] - Interval in milliseconds (default 20s).
 * @param {boolean} [options.enabled=true] - Whether autosave is active.
 * @returns {{
 *   status: 'idle' | 'saving' | 'saved' | 'error' | 'offline',
 *   lastSavedTime: Date | null,
 *   errorMessage: string | null,
 *   isOnline: boolean,
 *   hasUnsavedChanges: boolean,
 *   retrySave: () => void,
 *   setLastSavedData: (data: any) => void
 * }}
 */
export function useAutosave({
  data,
  onSave,
  interval = 20000,
  enabled = true,
}) {
  const [status, setStatus] = useState("idle"); // 'idle' | 'saving' | 'saved' | 'error' | 'offline'
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const lastSavedDataRef = useRef(null);
  const isSavingRef = useRef(false);
  const dataRef = useRef(data);
  const onSaveRef = useRef(onSave);

  // Keep refs up-to-date
  dataRef.current = data;
  onSaveRef.current = onSave;

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Helper to initialize or update last saved data benchmark
  const setLastSavedData = useCallback((initialData) => {
    try {
      lastSavedDataRef.current = JSON.stringify(initialData);
    } catch {
      lastSavedDataRef.current = null;
    }
  }, []);

  // Check if current data differs from last saved data
  const checkIfChanged = useCallback(() => {
    if (!dataRef.current) return false;
    try {
      const currentString = JSON.stringify(dataRef.current);
      return currentString !== lastSavedDataRef.current;
    } catch {
      return false;
    }
  }, []);

  // Execute Save Operation
  const performSave = useCallback(async () => {
    if (!enabled) return;

    // Check internet connectivity
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
      setStatus("offline");
      return;
    }

    // Prevent duplicate/overlapping requests
    if (isSavingRef.current) {
      return;
    }

    // Check if data actually changed
    if (!checkIfChanged()) {
      return;
    }

    const currentData = dataRef.current;
    const currentDataString = JSON.stringify(currentData);

    try {
      isSavingRef.current = true;
      setStatus("saving");
      setErrorMessage(null);

      // Call saving callback
      if (onSaveRef.current) {
        await onSaveRef.current(currentData);
      }

      // Update benchmark and timestamp
      lastSavedDataRef.current = currentDataString;
      setLastSavedTime(new Date());
      setStatus("saved");
    } catch (err) {
      console.error("Autosave Error:", err);
      setStatus("error");
      setErrorMessage(err.message || "Failed to autosave changes.");
    } finally {
      isSavingRef.current = false;
    }
  }, [enabled, checkIfChanged]);

  // Handle reconnect trigger
  useEffect(() => {
    if (isOnline && status === "offline") {
      if (checkIfChanged()) {
        performSave();
      } else {
        setStatus("idle");
      }
    }
  }, [isOnline, status, checkIfChanged, performSave]);

  // Periodic Timer disabled for Spark plan write minimization
  useEffect(() => {
    // Background interval auto-saving disabled to preserve Firebase Spark write quota
    return () => {};
  }, []);

  const hasUnsavedChanges = checkIfChanged();

  return {
    status,
    lastSavedTime,
    errorMessage,
    isOnline,
    hasUnsavedChanges,
    retrySave: performSave,
    setLastSavedData,
  };
}
