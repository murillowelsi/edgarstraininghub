import path from "path";
import { defineConfig } from "vitest/config";

// Unit tests (`npm test`). Kept apart from vite.config.ts so the PWA plugin
// doesn't load in tests. Firestore rules tests live in
// tests/rules and run with `npm run test:rules` (they need the emulator).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/api/**/*.test.ts"],
    // Fixed timezone so date tests behave the same on every machine and in CI.
    env: { TZ: "America/Sao_Paulo" },
  },
});
