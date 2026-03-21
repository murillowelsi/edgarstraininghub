# Admin UI Redesign — Design Spec

**Date:** 2026-03-20
**Status:** Approved
**Goal:** Improve Admin UI consistency across all pages and make the admin fully usable on mobile.

---

## Problem Statement

The admin panel has three main issues:

1. **Navigation on mobile** — The floating button (`fixed bottom-4 left-4`) opening a Sheet drawer is not intuitive. Users miss it or find it awkward.
2. **Table/form overflow on mobile** — Tables and side-by-side form fields overflow small screens.
3. **Inconsistency across pages** — Each page has its own patterns for headers, empty states, loading states, and table layouts. There is no shared visual language.

---

## Scope

Admin pages included in this migration:
- Posts, PostForm
- Users, UserForm
- Workouts, WorkoutEditor, StrengthWorkoutEditor
- Calendar
- Chat
- Login
- AdminLayout (shell)

**Explicitly out of scope:**
- `src/pages/admin/Subscriptions.tsx` — this page has been removed from the admin navigation and routes. It will not be migrated.
- Public-facing pages (Index, About, Blog, Contact)
- Athlete-facing pages
- Backend/Firebase changes
- New admin features

---

## Section 1: Shell & Navigation

### Desktop
- Keep the existing collapsible sidebar (left, fixed, 64px collapsed / 256px expanded).
- Minor visual polish: spacing, padding, and typographic hierarchy improvements.

### Mobile
- **Remove** the floating menu button (`fixed bottom-4 left-4`) and the Sheet drawer.
- **Add** a `BottomNav` component: a fixed bottom navigation bar with the 5 nav items.
  - Items: Posts, Users, Workouts, Calendar, Chat
  - Each item: icon + short label
  - Unread badge on Chat tab (same logic as current sidebar badge)
  - Active state: highlight with primary color (`text-primary`)
- The `<main>` element in `AdminLayout` receives `pb-16 md:pb-0` so page content is never hidden behind the bottom bar on mobile. Desktop does not need this padding.
- iOS safe area: the `BottomNav` container uses `padding-bottom: env(safe-area-inset-bottom)` via an inline style or a custom Tailwind utility so the bar sits above the home indicator on iPhones. Example: `style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}` on the `BottomNav` wrapper div.

### Component
- `src/components/admin/BottomNav.tsx` — new component, rendered inside `AdminLayout` on mobile only (`md:hidden`).
- `AdminLayout.tsx` — remove Sheet/floating button, import and render `BottomNav`. Apply `pb-16 md:pb-0` to the `<main>` element.

---

## Section 2: Reusable Admin Components

Three shared components will be created and used across all admin pages.

### `AdminPageHeader`
**File:** `src/components/admin/AdminPageHeader.tsx`

Props:
```ts
interface AdminPageHeaderProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  actions?: ReactNode; // for pages that need more than one action button
}
```

Behavior:
- Desktop: title (`text-2xl font-bold`) + description (muted) on the left, action(s) on the right.
- Mobile: title (`text-xl font-bold`) + action(s) in a row, description below if present.
- If `action` is provided, renders a single `<Button>` with optional icon.
- If `actions` is provided instead, renders the ReactNode as-is (allows multiple buttons, dropdowns, etc.).
- Only one of `action` or `actions` should be used per page.
- This component is used at the **page level**, not inside cards or dialogs. The Login page only applies matching typography classes (`text-xl font-bold`) to its card title — it does not render `AdminPageHeader`.

### `ResponsiveTable`
**File:** `src/components/admin/ResponsiveTable.tsx`

Props:
```ts
interface Column {
  key: string;
  label: string;
  className?: string;
}

interface ResponsiveTableProps {
  columns: Column[];
  rows: Record<string, ReactNode>[];
  actions?: (row: Record<string, ReactNode>) => ReactNode;
  emptyState?: ReactNode;
  loading?: boolean;
}
```

Behavior:
- **Desktop:** standard `<table>` with header row and data rows.
- **Mobile:** each row becomes a vertical card. Column labels appear as small muted text (`text-xs text-muted-foreground`) above each value. Actions appear as buttons at the bottom of each card.
- Loading state: skeleton rows (desktop) / skeleton cards (mobile) — use shadcn `Skeleton` component.

### `AdminEmptyState`
**File:** `src/components/admin/AdminEmptyState.tsx`

Props:
```ts
interface AdminEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}
```

Behavior:
- Centered layout with icon, title, optional description, optional CTA button.
- Consistent visual style across all pages.

---

## Section 3: Page Migrations

### Posts, Users, Workouts
- Replace ad-hoc page headers with `AdminPageHeader`.
- Replace manual table markup with `ResponsiveTable`.
- Add `AdminEmptyState` where missing.
- Ensure delete confirmation dialogs are accessible on mobile (full-width buttons inside the dialog footer).

### WorkoutEditor & StrengthWorkoutEditor
- Form fields that are currently side-by-side (`grid-cols-2`) switch to single column on mobile: `grid-cols-1 md:grid-cols-2`.
- Action buttons (Save, Cancel) are sticky at the bottom on mobile: `sticky bottom-0 bg-background border-t p-4 md:static md:border-0 md:p-0`, so users don't need to scroll to submit.

### Calendar
- **Desktop:** keep existing calendar grid view unchanged.
- **Mobile:** switch to a day-by-day list view (vertical scroll). Each day is a section header with its assigned workouts listed as cards below. Tap a workout card to edit/delete.
- **"Add workout" on mobile:** each day section has an inline `+ Add` button (small, ghost variant) next to the day header. No floating action button — inline keeps context clear (user sees which day they're adding to).

### Chat
- **Desktop:** keep existing split-panel layout (list on left, conversation on right).
- **Mobile:** two-state view controlled by `selectedChat: Chat | null` in local component state.
  - `selectedChat === null`: renders full-screen conversation list (`ChatList`).
  - `selectedChat !== null`: renders full-screen conversation view (`ChatWindow`) with a back button (`<Button variant="ghost">← Back</Button>`) at the top that sets `selectedChat` to `null`.
  - Pass the full `Chat` object (not just the ID) to `ChatWindow` so it has all necessary data for rendering and calling `ChatService.markAsRead`.

### Login
- Already responsive. No structural changes.
- Apply matching typography: card title uses `text-xl font-bold` to match admin page title style.
- Do **not** render `AdminPageHeader` inside the login card.

---

## Design Tokens & Consistency Rules

All admin pages follow these rules:

| Element | Rule |
|---|---|
| Page padding | `p-4 md:p-8` |
| Page title | `text-2xl font-bold` (desktop via `AdminPageHeader`), `text-xl font-bold` (mobile) |
| Card spacing | `space-y-4 md:space-y-6` |
| Action buttons | Right-aligned on desktop, full-width on mobile where appropriate |
| Destructive actions | Always behind a confirmation dialog |
| Loading states | Skeleton or `Loader2` spinner, never blank |
| Empty states | Always use `AdminEmptyState` |

---

## File Structure

New files to create:
```
src/components/admin/
  BottomNav.tsx
  AdminPageHeader.tsx
  ResponsiveTable.tsx
  AdminEmptyState.tsx
```

Files to modify:
```
src/components/AdminLayout.tsx
src/pages/admin/Posts.tsx
src/pages/admin/PostForm.tsx
src/pages/admin/Users.tsx
src/pages/admin/UserForm.tsx
src/pages/admin/Workouts.tsx
src/pages/admin/WorkoutEditor.tsx
src/pages/admin/StrengthWorkoutEditor.tsx
src/pages/admin/Calendar.tsx
src/pages/admin/Chat.tsx
src/pages/admin/Login.tsx
```
