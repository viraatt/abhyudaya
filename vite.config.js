import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  // ── Local development proxy ────────────────────────────────────
  // In production, Vercel routes /api/* to serverless functions automatically.
  // Locally, we proxy /api requests to server.local.js (port 3001) so that
  // the frontend can reach the same handler code without modification.
  server: {
    fs: {
      deny: [
        "**/firebase-service-account.json",
        "**/.env*",
        "**/*.pem",
        "**/*.key",
      ],
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    // Target modern browsers — removes unnecessary polyfill bloat
    target: ["es2020", "edge88", "firefox78", "chrome87", "safari14"],
    cssCodeSplit: true,
    // Enable minification of CSS
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React runtime
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router-dom/")) {
            return "vendor-react";
          }
          // Firebase — split per service so unused ones are treeshaken
          if (id.includes("node_modules/firebase/")) {
            return "vendor-firebase";
          }
          // Rich text editor (heavy — only loaded in admin)
          if (id.includes("node_modules/@tiptap/")) {
            return "vendor-tiptap";
          }
          // Animations — large, loaded lazily with pages that use it
          if (id.includes("node_modules/framer-motion/")) {
            return "vendor-motion";
          }
          // Icons
          if (id.includes("node_modules/react-icons/")) {
            return "vendor-icons";
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});