import React, { Component } from "react";
import { FaExclamationTriangle, FaRedo } from "react-icons/fa";

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
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          style={{
            padding: "24px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "16px",
            color: "#991b1b",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "12px",
            margin: "20px 0",
          }}
        >
          <FaExclamationTriangle style={{ fontSize: "32px", color: "#dc2626" }} />
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>
            Something went wrong in this component
          </h3>
          <p style={{ margin: 0, fontSize: "14px", color: "#b91c1c" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              background: "#dc2626",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            <FaRedo /> Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
