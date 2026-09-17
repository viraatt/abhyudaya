import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import ReactGA from "react-ga4";

import App from "./App.jsx";

import "./styles/tokens.css";
import "./styles/shared.css";

import { AuthProvider } from "./context/AuthContext";

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

if (GA_MEASUREMENT_ID) {
  ReactGA.initialize(GA_MEASUREMENT_ID);
}

// Global Vite chunk preload error recovery
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    const key = "app_vite_preload_reload";
    const lastReload = sessionStorage.getItem(key);
    const now = Date.now();
    if (!lastReload || now - Number(lastReload) > 15000) {
      sessionStorage.setItem(key, String(now));
      console.warn("[Vite] Preload error detected. Reloading page to fetch latest deployment...", event);
      window.location.reload();
    } else {
      console.error("[Vite] Preload error persisted after reload:", event);
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);