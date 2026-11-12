import { defineConfig } from "vitest/config";

// Firestore security rules tests (`npm run test:rules`), run against the
// Firestore emulator started by `firebase emulators:exec`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/rules/**/*.test.ts"],
    // One emulator, one project: run files one after another.
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
