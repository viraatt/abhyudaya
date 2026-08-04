import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Firebase client
          "vendor-firebase": ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/storage"],
          // Rich text editor (heavy)
          "vendor-tiptap": ["@tiptap/react", "@tiptap/starter-kit", "@tiptap/extension-image"],
          // Animations
          "vendor-motion": ["framer-motion"],
          // Icons
          "vendor-icons": ["react-icons"],
        },
      },
    },
    // Raise warning limit slightly; lazy loading will bring actual chunks well below
    chunkSizeWarningLimit: 600,
  },
});