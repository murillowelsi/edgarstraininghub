import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      includeAssets: ["favicon.png", "favicon.ico", "favicon.svg", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "EZ",
        short_name: "EZ",
        description: "Fitness training platform by Edgar Zanin - workouts, scheduling, and coaching.",
        theme_color: "#161718",
        background_color: "#161718",
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
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
        // Never precache service worker files themselves
        globIgnores: ["**/images/**", "**/sw.js", "**/firebase-messaging-sw.js"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      // Second HTML entry: the Raise Your Hands landing with its own title, favicon and
      // OG tags for link previews (crawlers don't run JS). Same app bundle.
      input: {
        main: path.resolve(__dirname, "index.html"),
        raiseYourHands: path.resolve(__dirname, "raise-your-hands.html"),
        raiseYourHandsDiary: path.resolve(__dirname, "raise-your-hands-diario.html"),
        raiseYourHandsAccounts: path.resolve(__dirname, "raise-your-hands-contas.html"),
        raiseYourHandsShop: path.resolve(__dirname, "raise-your-hands-loja.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
