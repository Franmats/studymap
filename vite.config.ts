import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor":    ["react", "react-dom"],
          "supabase-vendor": ["@supabase/supabase-js"],
          "zustand-vendor":  ["zustand", "immer"],
          "pdf-vendor":      ["jspdf"],
        },
      },
    },
    minify: "esbuild",
    target: "es2020",
    chunkSizeWarningLimit: 500,
  },
});