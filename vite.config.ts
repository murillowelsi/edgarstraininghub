import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    VitePWA({
      registerType: "prompt",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      includeAssets: ["favicon.png", "favicon.ico", "favicon.svg", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "Edgar Zanin | Fitness Trainer & Triathlete",
        short_name: "Edgar Zanin",
        description: "Fitness training platform by Edgar Zanin - workouts, scheduling, and coaching.",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/",
        start_url: "/app",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      injectManifestOptions: {
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
        // Never precache service worker files themselves
        globIgnores: ["**/lovable-uploads/**", "**/sw.js", "**/firebase-messaging-sw.js"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
