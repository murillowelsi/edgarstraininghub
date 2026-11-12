# EZ Training Hub

Training hub for a coach: public website, coach portal and athlete PWA.

## Stack

- React 18, Vite, TypeScript
- shadcn/ui (Radix) and Tailwind CSS
- Firebase: Auth, Firestore (`firestore.rules`) and Cloud Messaging
- Vercel: hosting and serverless functions in `api/`

## Getting started

Requirements: Node.js and npm.

```sh
npm install
npm run dev
```

The app reads its Firebase and Cloudinary settings from `VITE_*` environment variables in a local `.env` file (not committed).

## Local Firebase emulator

Run the app against the Firebase emulator with fictional data, without touching production. See [docs/testing/emulator.md](docs/testing/emulator.md).

```sh
npm run emulators   # start Auth, Firestore and Storage emulators
npm run seed        # load fictional data
npm run dev:emu     # app on http://localhost:8090
```

## Checks

```sh
npm run lint
npm run typecheck
npm test            # unit and API tests
npm run test:rules  # Firestore rules tests (starts a throwaway emulator)
npm run build
```

## Deploy

- Website and functions: every push to `main` deploys to production on Vercel.
- Firestore rules: `npx firebase-tools deploy --only firestore:rules -P ez-prod`.

Deploy the rules before pushing front-end changes that depend on them.
