import { useState, useEffect } from "react";
import {
  FaCheckCircle,
  FaCloudUploadAlt,
  FaExclamationTriangle,
  FaWifi,
  FaRedo,
  FaClock,
} from "react-icons/fa";
import "./AutosaveIndicator.css";

export default function AutosaveIndicator({
  status = "idle",
  lastSavedTime = null,
  errorMessage = null,
  hasUnsavedChanges = false,
  onRetry,
}) {
  const [formattedTime, setFormattedTime] = useState("");

  useEffect(() => {
    if (!lastSavedTime) {
      setFormattedTime("");
      return;
    }

    const format = () => {
      const date = new Date(lastSavedTime);
      setFormattedTime(
        date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };

    format();
  }, [lastSavedTime]);

  return (
    <div className={`autosave-indicator-chip status-${status}`}>
      {/* 1. Saving State */}
      {status === "saving" && (
        <>
          <FaCloudUploadAlt className="icon-saving-pulse" />
          <span className="label font-weight-600">Saving...</span>
        </>
      )}

      {/* 2. Saved State */}
      {status === "saved" && (
        <>
          <FaCheckCircle className="icon-success" />
          <div className="saved-text-group">
            <span className="label font-weight-600">Saved</span>
            {formattedTime && (
              <span className="time-subtext">
                <FaClock className="subicon" /> {formattedTime}
              </span>
            )}
          </div>
        </>
      )}

      {/* 3. Offline State */}
      {status === "offline" && (
        <>
          <FaWifi className="icon-offline" />
          <div className="saved-text-group">
            <span className="label font-weight-600">Offline - Paused</span>
            <span className="time-subtext">Will auto-sync when reconnected</span>
          </div>
        </>
      )}

      {/* 4. Error State */}
      {status === "error" && (
        <>
          <FaExclamationTriangle className="icon-error" />
          <div className="saved-text-group">
            <span className="label font-weight-600">Save Failed</span>
            {errorMessage && (
              <span className="time-subtext error-text">{errorMessage}</span>
            )}
          </div>
          {onRetry && (
            <button
              type="button"
              className="autosave-retry-btn"
              onClick={onRetry}
              title="Click to retry saving now"
            >
              <FaRedo />
              <span>Retry</span>
            </button>
          )}
        </>
      )}

      {/* 5. Idle / Unsaved Changes State */}
      {status === "idle" && (
        <>
          {hasUnsavedChanges ? (
            <>
              <span className="unsaved-dot" />
              <span className="label unsaved">Unsaved changes</span>
            </>
          ) : (
            formattedTime && (
              <>
                <FaCheckCircle className="icon-success" />
                <span className="time-subtext">Saved at {formattedTime}</span>
              </>
            )
          )}
        </>
      )}
    </div>
  );
}
