# Admin Workouts Page — Organization Design

**Date:** 2026-03-21
**Status:** Approved

## Problem

The `/admin/workouts` page displays all workouts of all types in a single flat list. As the workout library grows, this becomes hard to navigate.

## Goal

Organize the workouts list by type using tabs, making it easy to browse and manage a large workout library.

## Design

### Tabs

Add 5 tabs below the `AdminPageHeader`, above the workouts table:

- **All** — shows every workout regardless of type
- **Running**
- **Cycling**
- **Swimming**
- **Strength**

Each tab displays a count badge showing how many workouts exist for that type, e.g. `Running (12)`. Counts are calculated from the full unfiltered array.

Default active tab: `All`.

### Filtering

Filtering happens entirely in memory — no new Firestore queries.

- Active tab stored in `useState<WorkoutType | "all">` (default: `"all"`)
- `filteredWorkouts` derived via `useMemo`: filters the `workouts` array by active tab type (or returns all if `"all"`)
- `ResponsiveTable` receives `filteredWorkouts` instead of `workouts`
- Sort order unchanged: `createdAt` descending (most recent first)

### Changes

Only one file is modified:

- **`src/pages/admin/Workouts.tsx`**
  1. Add `activeTab` state: `useState<WorkoutType | "all">("all")`
  2. Add `filteredWorkouts` memo: filters `workouts` by `activeTab`
  3. Add tab counts: computed from full `workouts` array per type
  4. Render shadcn/ui `Tabs` component with 5 tabs between the header and the table
  5. Pass `filteredWorkouts` to `ResponsiveTable`

No new files. No service changes. No routing changes. No type changes.

## Out of Scope

- URL-based tab persistence (query params)
- Server-side filtering (Firestore queries per type)
- Search by name
- Custom sort order controls
