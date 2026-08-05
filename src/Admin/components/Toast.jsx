import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaInfoCircle,
  FaTimes,
} from "react-icons/fa";
import "./Toast.css";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  // Clean up all active timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timerId) => clearTimeout(timerId));
      timersRef.current.clear();
    };
  }, []);

  const removeToast = useCallback((id) => {
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message, type = "info", duration = 3500) => {
      const id = Date.now() + Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);

      if (duration > 0) {
        const timerId = setTimeout(() => {
          removeToast(id);
        }, duration);
        timersRef.current.set(id, timerId);
      }
    },
    [removeToast]
  );

  const toast = useRef({
    success: (msg, dur) => addToast(msg, "success", dur),
    error: (msg, dur) => addToast(msg, "error", dur),
    warning: (msg, dur) => addToast(msg, "warning", dur),
    info: (msg, dur) => addToast(msg, "info", dur),
  }).current;

  // Keep references synced
  toast.success = (msg, dur) => addToast(msg, "success", dur);
  toast.error = (msg, dur) => addToast(msg, "error", dur);
  toast.warning = (msg, dur) => addToast(msg, "warning", dur);
  toast.info = (msg, dur) => addToast(msg, "info", dur);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="toast-container"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-card toast-${t.type}`}
            role="alert"
            aria-live={t.type === "error" ? "assertive" : "polite"}
          >
            <div className="toast-icon">
              {t.type === "success" && <FaCheckCircle />}
              {t.type === "error" && <FaTimesCircle />}
              {t.type === "warning" && <FaExclamationTriangle />}
              {t.type === "info" && <FaInfoCircle />}
            </div>
            <div className="toast-message">{t.message}</div>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => removeToast(t.id)}
              aria-label="Close notification"
            >
              <FaTimes />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      success: (msg) => alert(`✅ ${msg}`),
      error: (msg) => alert(`❌ ${msg}`),
      warning: (msg) => alert(`⚠️ ${msg}`),
      info: (msg) => alert(`ℹ️ ${msg}`),
    };
  }
  return context;
}
