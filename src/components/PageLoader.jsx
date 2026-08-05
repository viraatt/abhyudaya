import React from "react";

export default function PageLoader() {
  return (
    <div
      role="status"
      aria-label="Loading page..."
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: "16px",
        color: "#64748b",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          border: "3px solid #e2e8f0",
          borderTopColor: "#2563eb",
          borderRadius: "50%",
          animation: "pageLoaderSpin 0.7s linear infinite",
        }}
      />
      <style>{`
        @keyframes pageLoaderSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <span style={{ fontSize: "14px", fontWeight: "600" }}>Loading...</span>
    </div>
  );
}
