import { useState, useEffect, createContext, useContext } from "react";
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

  const addToast = (message, type = "info", duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = {
    success: (msg, dur) => addToast(msg, "success", dur),
    error: (msg, dur) => addToast(msg, "error", dur),
    warning: (msg, dur) => addToast(msg, "warning", dur),
    info: (msg, dur) => addToast(msg, "info", dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-card toast-${t.type}`}>
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
    // Fallback if not wrapped in provider
    return {
      success: (msg) => alert(`✅ ${msg}`),
      error: (msg) => alert(`❌ ${msg}`),
      warning: (msg) => alert(`⚠️ ${msg}`),
      info: (msg) => alert(`ℹ️ ${msg}`),
    };
  }
  return context;
}
