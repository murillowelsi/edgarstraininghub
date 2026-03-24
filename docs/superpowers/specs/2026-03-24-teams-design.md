# Teams Feature Design

**Date:** 2026-03-24
**Status:** Approved

## Problem

Admins managing a sports team (e.g., football) have to create athlete accounts one by one and assign workouts individually. This is slow and impractical for groups of 20–30 athletes.

## Goal

Allow an admin to create a team, share an invite link or QR code, let athletes self-register, and assign workouts to the entire team at once. The admin can then track which athletes completed each assigned workout.

## Terminology

The app uses `role: "admin"` for coaches. Throughout this spec, "admin" and "coach" are the same role. Teams are scoped to `role === "admin"` only — `editor` users cannot create or manage teams. All team management routes use `<ProtectedRoute requireAdmin>`.

## Out of Scope

- Subscription/payment system (removed from the app)
- Invite link expiration
- URL-based tab persistence
- Push notifications for team assignments (can be added later)
- Team access for `editor` role

---

## Dependencies

Add: `qrcode.react` v3+ (client-side QR code generation, ships its own TypeScript declarations — no `@types/` package needed)

```bash
npm install qrcode.react
```

Import syntax (v3 API): `import { QRCodeSVG } from 'qrcode.react'`

---

## Design

### 1. Data Model

New Firestore collection: `teams/{teamId}`

```
{
  name: string,
  coachId: string,       // UID of the admin who created the team
  inviteToken: string,   // UUID v4, permanent, generated once at team creation
  memberIds: string[],   // UIDs of athlete members
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

- `inviteToken` is a `crypto.randomUUID()` value. Collision probability is negligible. It is used as the public lookup key in `/join/:inviteToken`.
- The `teamsService.getTeamByInviteToken(token)` function uses a Firestore `where("inviteToken", "==", token)` query. A single-field index on `teams.inviteToken` will be auto-created by Firestore on first use (or can be added manually in the Firebase console).
- `memberIds` is an array on the team document. Teams are capped at **30 members** (enforced atomically by `teamsService.addMemberToTeam` via `runTransaction` — see Section 3). This is within Firestore's `in` operator limit of 30 items (SDK v9+).
- No changes to the `users` collection schema.

**TypeScript types** (`src/types/team.ts`):

```ts
export interface Team {
  id: string;
  name: string;
  coachId: string;
  inviteToken: string;
  memberIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamDocument {
  name: string;
  coachId: string;
  inviteToken: string;
  memberIds: string[];
  createdAt: import("firebase/firestore").Timestamp;
  updatedAt: import("firebase/firestore").Timestamp;
}
```

---

### 2. Invite & Self-Registration Flow

**Public route:** `/join/:inviteToken` — accessible without authentication.

This route must be registered as a bare `<Route>` in `App.tsx` in the public block (alongside `/about`, `/blog`, etc.), **not** inside any `<ProtectedRoute>`.

The page fetches the team by `inviteToken` and displays the team name. If the token is invalid or the team does not exist, show an error message ("Invite link is invalid or the team no longer exists").

**Guards for already-authenticated users:**
- If the current user is signed in as `admin` or `editor`: show "This invite is for athletes only." Do not present either form.
- If the current user is signed in as `athlete` and their UID is already in `team.memberIds`: show "You are already a member of this team." Do not present either form.

**New athlete (registration form):**
- Form: Name + Email + Password
- On submit:
  1. `createUserWithEmailAndPassword(auth, email, password)` — uses the **primary `auth` instance** (not `secondaryAuth`). The resulting auto-sign-in is intentional and desired.
  2. Create Firestore user document with: `{ displayName, email, role: "athlete", subscriptionStatus: "inactive", subscriptionPlan: "none", createdAt, updatedAt }` — matches the pattern in `usersService.createUser`.
  3. Call `teamsService.addMemberToTeam(teamId, uid)` — see Section 3 for cap enforcement.
  4. Redirect to `/athlete`

**Existing athlete:**
- "Already have an account" toggle → Email + Password login form
- On login: `signInWithEmailAndPassword(auth, email, password)` → call `teamsService.addMemberToTeam(teamId, uid)` (idempotent — no duplicate if already a member) → redirect to `/athlete`

---

### 3. Team Management (Admin)

**New page:** `/admin/teams`
- Lists all teams where `coachId === currentUser.uid`
- "New Team" button — modal with just a name field — generates `inviteToken` via `crypto.randomUUID()` on creation
- Each team card links to `/admin/teams/:teamId`

**Team detail page:** `/admin/teams/:teamId`
- Team name (editable inline)
- Member list: avatar + name + email, with a "Remove" action per member
  - Removing a member only removes their UID from `team.memberIds` via `arrayRemove`. Existing `workoutAssignments` for that athlete are **not** deleted and remain on their account.
- Invite section: full invite URL displayed + copy button + QR code (generated client-side via `QRCodeSVG` from `qrcode.react` v3)
- Delete team button (with confirmation)
  - Deleting a team deletes only the `teams/{teamId}` document. Member `users` documents and all `workoutAssignments` are **not** affected.

**`teamsService.getTeamsByCoach(coachId: string): Promise<Team[]>`:**
- Firestore: `query(collection(db, "teams"), where("coachId", "==", coachId))`
- No composite index needed (single equality filter).

**`teamsService.addMemberToTeam(teamId: string, uid: string): Promise<void>`:**
- Uses `runTransaction` to atomically read the team document, check the cap, and write:
  ```
  runTransaction:
    read team document
    if memberIds.length >= 30 → throw Error("This team is full (max 30 members)")
    if uid already in memberIds → return (no-op)
    update memberIds: arrayUnion(uid), updatedAt: serverTimestamp()
  ```
- The transaction prevents race conditions when two athletes join simultaneously.

**Navigation:** Add "Teams" item to the admin sidebar/nav.

---

### 4. Team Workout Assignment

The existing assign-workout modal (triggered from `/admin/workouts`) gains a **"Team" tab** alongside the existing individual athlete picker.

- Tab "Athletes": current behaviour (multi-select individual athletes + date picker)
- Tab "Team":
  - Dropdown to select one of the admin's teams (shows team name + member count)
  - Date picker for `scheduledDate` (same as the Athletes tab — required by `createAssignments`)
  - On confirm: calls existing `createAssignments({ workoutId, athleteIds: team.memberIds, scheduledDate }, currentUser.uid)` — `currentUser.uid` is `useAuth().user.uid` (Firebase Auth user object), consistent with how the existing Athletes tab passes `user.uid`.

`createAssignments` returns only the IDs of created assignments (silently skips athletes who already have an assignment for the same workout + date). The caller computes the skip count as: `skipped = team.memberIds.length - assignedIds.length`. After the operation, the UI shows a toast: **"X assigned, Y already scheduled"**.

---

### 5. Team Completion Stats

**New page:** `/admin/teams/:teamId/stats`

**Workout selector:** The admin selects a workout from a dropdown. The dropdown is populated by fetching all `workoutAssignments` where `athleteId in memberIds` (Firestore `in` query — safe because teams are capped at 30 members), then grouping by `workoutId`. Workout names are resolved via `Promise.all(uniqueWorkoutIds.map(getWorkoutById))` to avoid sequential fetching.

For the selected workout, a table with one row per team member:

| Athlete | Status | Detail |
|---------|--------|--------|
| John Doe | ✅ Completed | 14/03/2026 |
| Jane Doe | ❌ Not completed | — |

- **Cardio workouts** (running, cycling, swimming): show completed date (`completedAt` formatted as `dd/mm/yyyy`) or "Not completed"
- **Strength workouts**: show completion percentage + total time formatted as `mm:ss` + completed date, or "Not completed"

Members with no assignment for the selected workout (e.g., they joined the team after the workout was assigned) are shown as "Not completed".

---

## File Map

| Action | File |
|--------|------|
| Create | `src/types/team.ts` |
| Create | `src/services/teamsService.ts` |
| Create | `src/pages/admin/Teams.tsx` |
| Create | `src/pages/admin/TeamDetail.tsx` |
| Create | `src/pages/admin/TeamStats.tsx` |
| Create | `src/pages/JoinTeam.tsx` (public route) |
| Modify | `src/App.tsx` (add routes) |
| Modify | Admin nav component (add Teams nav item) |
| Modify | Assign workout modal (add Team tab) |

---

## Firestore Security Rules

The `teams` collection requires these rules (add to existing `firestore.rules`):

```
match /teams/{teamId} {
  // Public read: allows unauthenticated lookup by inviteToken on the join page
  allow read: if true;

  // Only the team's coach can create, update admin fields, or delete
  allow create: if request.auth != null
    && request.resource.data.coachId == request.auth.uid;

  allow delete: if request.auth != null
    && resource.data.coachId == request.auth.uid;

  // Coach can update anything; an authenticated user can append only their own UID to memberIds
  allow update: if request.auth != null && (
    resource.data.coachId == request.auth.uid
    || (
      request.resource.data.diff(resource.data).affectedKeys().hasOnly(["memberIds", "updatedAt"])
      // Prevent removal: new memberIds must be a superset of existing memberIds
      && request.resource.data.memberIds.hasAll(resource.data.memberIds)
      // Only the caller's own UID may be added
      && request.resource.data.memberIds.removeAll(resource.data.memberIds).hasOnly([request.auth.uid])
    )
  );
}
```

> **Note:** The `allow read: if true` is intentionally broad to support the unauthenticated join page. Team documents contain only: team name, coach UID, invite token, and member UIDs — no sensitive personal data.

---

## New Routes

| Route | Access | Guard |
|-------|--------|-------|
| `/join/:inviteToken` | Public | None — bare `<Route>` |
| `/admin/teams` | Admin only | `<ProtectedRoute requireAdmin>` |
| `/admin/teams/:teamId` | Admin only | `<ProtectedRoute requireAdmin>` |
| `/admin/teams/:teamId/stats` | Admin only | `<ProtectedRoute requireAdmin>` |
