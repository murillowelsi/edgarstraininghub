# Testing

| Command | What it does | Needs |
|---|---|---|
| `npm test` | Unit tests (Vitest), `src/**/*.test.ts` | — |
| `npm run test:watch` | Same, in watch mode | — |
| `npm run test:rules` | Firestore rules tests in `tests/rules`, on a throwaway emulator (`firebase emulators:exec`) | Java; port 8081 free |
| `npm run test:rules:running` | Same tests against an emulator already started with `npm run emulators` (uses project `demo-ez-rules`, does not touch the seed data) | running emulator |
| `npm run typecheck` | `tsc -p tsconfig.app.json --noEmit` | — |

- Rules tests: the "security holes" group **fails on purpose** against today's `firestore.rules` (risks in the team plan, section 2). It turns green when the rules are fixed. The "keeps working" group must always pass.
- Unit tests pin `TZ=America/Sao_Paulo` (see `vitest.config.ts`) so date tests are the same everywhere.
- `it.fails` marks a known bug: the test passes while the bug exists and fails once it is fixed; then turn it into a normal `it`.
- Local emulator and test logins: [emulator.md](emulator.md). Manual checks before a merge: [smoke-checklist.md](smoke-checklist.md).
