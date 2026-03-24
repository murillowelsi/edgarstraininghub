# Teams Feature Design

**Date:** 2026-03-24
**Status:** Approved

## Problem

Coaches managing a sports team (e.g., football) have to create athlete accounts one by one and assign workouts individually. This is slow and impractical for groups of 20–30 athletes.

## Goal

Allow a coach to create a team, share an invite link or QR code, let athletes self-register, and assign workouts to the entire team at once. The coach can then track which athletes completed each assigned workout.

## Out of Scope

- Subscription/payment system (removed from the app)
- Invite link expiration
- URL-based tab persistence
- Push notifications for team assignments (can be added later)

---

## Design

### 1. Data Model

New Firestore collection: `teams/{teamId}`

```
{
  name: string,
  coachId: string,       // UID of the admin/coach who created the team
  inviteToken: string,   // UUID v4, permanent, generated once at team creation
  memberIds: string[],   // UIDs of athlete members
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

- `inviteToken` is unique across all teams. Used to identify the team in the public invite URL.
- `memberIds` is an array on the team document (football teams are small, < 50 members — no Firestore size concern).
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

The page fetches the team by `inviteToken`, displays the team name and coach name, and presents two options:

**New athlete:**
- Form: Name + Email + Password
- On submit: creates Firebase Auth account + Firestore user document (`role: "athlete"`) → UID appended to `team.memberIds` → redirected to `/athlete`

**Existing athlete:**
- "Already have an account" toggle → Email + Password login form
- On login: UID appended to `team.memberIds` (idempotent — no duplicate if already a member) → redirected to `/athlete`

If the invite token is invalid or the team does not exist, show an error message.

---

### 3. Team Management (Coach)

**New page:** `/admin/teams`
- Lists all teams where `coachId === currentUser.uid`
- "New Team" button — modal with just a name field — generates `inviteToken` (UUID v4) on creation
- Each team card links to `/admin/teams/:teamId`

**Team detail page:** `/admin/teams/:teamId`
- Team name (editable inline)
- Member list: avatar + name + email, with a "Remove" action per member
- Invite section: full invite URL displayed + copy button + QR code (generated client-side via `qrcode.react`)
- Delete team button (with confirmation)

**Navigation:** Add "Teams" item to the admin sidebar/nav.

---

### 4. Team Workout Assignment

The existing assign-workout modal (triggered from `/admin/workouts`) gains a **"Team" tab** alongside the existing individual athlete picker.

- Tab "Athletes": current behaviour (multi-select individual athletes)
- Tab "Team": dropdown to select one of the coach's teams → shows member count → on confirm, calls existing `createAssignments` with all `memberIds` as `athleteIds`

No new service function needed — `createAssignments` already handles bulk athlete arrays and deduplicates.

---

### 5. Team Completion Stats

**New page:** `/admin/teams/:teamId/stats`

- Workout selector: dropdown of workouts assigned to any member of this team (filtered from `workoutAssignments` collection)
- For the selected workout, a table with one row per team member:

| Athlete | Status | Detail |
|---------|--------|--------|
| John Doe | ✅ Completed | 14/03/2026 |
| Jane Doe | ❌ Not completed | — |

- **Cardio workouts** (running, cycling, swimming): show completed date or "Not completed"
- **Strength workouts**: show completion percentage + total time + completed date, or "Not completed"

Stats are computed by querying `workoutAssignments` where `workoutId == selectedWorkout` and `athleteId in memberIds`.

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
| Modify | `src/components/admin/AdminNav.tsx` or equivalent (add Teams nav item) |
| Modify | Assign workout modal (add Team tab) |

---

## New Routes

| Route | Access | Component |
|-------|--------|-----------|
| `/join/:inviteToken` | Public | `JoinTeam` |
| `/admin/teams` | Admin | `Teams` |
| `/admin/teams/:teamId` | Admin | `TeamDetail` |
| `/admin/teams/:teamId/stats` | Admin | `TeamStats` |
