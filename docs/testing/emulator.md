# Firebase emulator with fictional data

Run the whole app locally against the Firebase emulator (Auth, Firestore, Storage). The project is `demo-ez`: a `demo-*` project never reaches a real Firebase project, so nothing here touches production.

## Requirements

- Node 20+ and Java 11+ (the Firestore emulator runs on Java).
- `firebase-tools` is **not** a dependency: the script runs it with `npx` (first run downloads it and the emulator jars into `~/.cache/firebase`).

## Run

Three terminals, from the repo root:

```sh
npm run emulators   # 1. Auth :9099, Firestore :8081, Storage :9199, UI http://127.0.0.1:4000
npm run seed        # 2. fictional data (run again any time; it overwrites the same docs)
npm run dev:emu     # 3. app at http://localhost:8090 connected to the emulator
```

- The emulator keeps data in memory: after restarting it, run `npm run seed` again.
- `seed` is idempotent: fixed ids, and dates are recomputed relative to today.
- Inspect or edit data in the Emulator UI: http://127.0.0.1:4000.

## Test logins (emulator only)

Password for every account: `ez-demo-123`

| Account | Role | What it covers |
|---|---|---|
| `coach@ez.test` | admin (coach) | Coach portal: dashboard, athletes, workouts, team, chat, feed, blog, testimonials |
| `ana@ez.test` | athlete | Team member; unread chat; pending testimonial; race in 45 days; skipped workout |
| `bruno@ez.test` | athlete | Team member; partial session (60%); 10 km race in 12 days |
| `carla@ez.test` | athlete | Team member; trial plan; self-logged run; past test event |
| `diego@ez.test` | athlete | Not in the team; expired subscription; only old history |

Log in at `/login`. Team invite link: `/join/demo-invite-token`.

## What the seed creates

- 5 users, 6 custom exercises, 5 workouts (2 strength, run intervals, bike Z2, swim technique).
- 28 workout assignments: past ones completed with sets, loads, RPE and notes; today's and the next week's still open; one skipped, one partial, one self-logged.
- Team "Equipe Tri Demo" (3 athletes) with team-level assignments and a group chat.
- 1:1 chats coach ↔ each team athlete, with messages and unread counts.
- 3 timeline posts (strength and run summaries, coach announcement) with likes, comments and notifications.
- 3 athlete events, subscription history, 3 testimonials (2 approved), 3 blog posts (1 draft).

All names, e-mails and numbers are invented. Never add real athlete data to `scripts/emulator/seed.mjs`.

## How the app switches to the emulator

`npm run dev:emu` runs `vite --mode emulator`, which loads `.env.emulator` (demo values, no secrets, committed). It sets `VITE_USE_EMULATOR=true`, and `src/lib/firebase.ts` then connects Auth, Firestore and Storage to the emulator. Without the flag nothing changes.

Safety:
- `src/lib/firebase.ts` throws if the flag is on and the project id is not `demo-*`.
- The seed script refuses to run for a non-`demo-*` project and ignores `GOOGLE_APPLICATION_CREDENTIALS`.
- In emulator mode, Analytics and push (FCM) are off and the Cloudinary variables are empty, so photo uploads in posts do not work there.

## Not covered locally

- Push notifications and `/api/*` (Vercel functions): `vite` does not serve them. Sending a chat message works; the push call fails silently.
- Image uploads to Cloudinary (see above).
- Phone on the same Wi-Fi: the emulator only listens on `127.0.0.1`. To test on a phone, change the emulator hosts in `firebase.json` to `0.0.0.0` and set `VITE_EMULATOR_HOST` in `.env.emulator.local` to the computer's LAN IP. Do not commit that change.
