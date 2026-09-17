import React, { Component } from "react";
import { FaExclamationTriangle, FaRedo, FaSync } from "react-icons/fa";
import { isChunkLoadError, triggerChunkReload } from "../../utils/lazyWithRetry";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    if (isChunkLoadError(error)) {
      triggerChunkReload("error_boundary");
    }
  }

  handleReset = () => {
    if (isChunkLoadError(this.state.error)) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunk = isChunkLoadError(this.state.error);

      return (
        <div
          role="alert"
          style={{
            padding: "24px",
            background: isChunk ? "#eff6ff" : "#fef2f2",
            border: isChunk ? "1px solid #bfdbfe" : "1px solid #fecaca",
            borderRadius: "16px",
            color: isChunk ? "#1e40af" : "#991b1b",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "12px",
            margin: "20px 0",
          }}
        >
          {isChunk ? (
            <FaSync style={{ fontSize: "32px", color: "#3b82f6" }} />
          ) : (
            <FaExclamationTriangle style={{ fontSize: "32px", color: "#dc2626" }} />
          )}
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>
            {isChunk ? "Application Update Available" : "Something went wrong in this component"}
          </h3>
          <p style={{ margin: 0, fontSize: "14px", color: isChunk ? "#1d4ed8" : "#b91c1c" }}>
            {isChunk
              ? "A new version of the website has been deployed. Please reload the page to load the latest components."
              : this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              background: isChunk ? "#2563eb" : "#dc2626",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {isChunk ? <><FaSync /> Reload Page</> : <><FaRedo /> Try Again</>}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
