# Migrations

## `backfill-public-data.mjs`: team invites + public profiles

Fills the collections added by the data-model change "team invites + public profiles" (rules in `firestore.rules`, `match /teamInvites` and `match /publicProfiles`):

| Step | What it writes | Source |
|---|---|---|
| `--profiles` | `publicProfiles/{uid}`: `displayName`, `photoURL`, `role` | `users/{uid}` |
| `--invites` | `teamInvites/{inviteToken}`: `teamId`, `teamName`, `teamPhotoURL`, `coachId` | `teams/{id}` |
| `--blog-authors` (optional, separate) | `posts/{id}.authorName` = the author's public name, only for posts whose `authorName` contains `@` | `publicProfiles/{authorId}`, else `users/{authorId}` |

Without step flags it runs `--profiles --invites`.

- **Dry run by default**: it only reads and prints what it would change. It writes only with `--apply`.
- **Idempotent**: documents already in the desired state are skipped, so running it twice is safe. A second dry run after `--apply` should report 0 to create or update.
- **No personal data in the output**: counts and document ids only. Invite tokens and e-mails are never printed. The blog step prints `posts/<id>: e-mail → <public name of the author>`.
- It never deletes anything. Profiles without a `users` doc and invite-token conflicts are reported and left as is; the exit code is 1 when something needs attention.

### Order in production

1. Deploy the app + rules with double write (`backend/invites-public-profiles`).
2. Run this backfill (dry run first, then `--apply`).
3. Deploy `backend/close-reads` (locks `users` and `teams` reads).

### Credentials

Against a real project it uses **Application Default Credentials** (ADC) with an identity that can read and write Firestore in that project: a user account logged in with the Google Cloud CLI for ADC, or a **service account** with a Firestore role. The script never reads, prints or stores credentials; it only calls `applicationDefault()` from `firebase-admin`.

With `FIRESTORE_EMULATOR_HOST` set it talks to the emulator and needs no credentials.

### Commands

From the repo root. `<projectId>` is the Firebase project id.

```sh
# Dry run (default): profiles + invites
node scripts/migrations/backfill-public-data.mjs --project <projectId>

# Write
node scripts/migrations/backfill-public-data.mjs --project <projectId> --apply

# Optional: blog posts with an e-mail as author name (dry run, then write)
node scripts/migrations/backfill-public-data.mjs --project <projectId> --blog-authors
node scripts/migrations/backfill-public-data.mjs --project <projectId> --blog-authors --apply
```

Emulator (seed in the pre-backfill state first):

```sh
SEED_LEGACY=1 npm run seed
FIRESTORE_EMULATOR_HOST=127.0.0.1:8081 node scripts/migrations/backfill-public-data.mjs --project demo-ez --profiles --invites --blog-authors
FIRESTORE_EMULATOR_HOST=127.0.0.1:8081 node scripts/migrations/backfill-public-data.mjs --project demo-ez --profiles --invites --blog-authors --apply
```
