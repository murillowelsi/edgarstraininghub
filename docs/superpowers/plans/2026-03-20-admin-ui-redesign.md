# Admin UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Admin UI consistency across all pages and make the admin fully usable on mobile via a bottom navigation bar, reusable layout components, and responsive page migrations.

**Architecture:** Create 4 shared components in `src/components/admin/`, update `AdminLayout` to use them, then migrate all 11 admin pages to use the new components. No backend changes. Pages are verified by running `npm run build` (TypeScript compile check) after each task.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui (Radix UI), Lucide React, React Router DOM v6, Vite

---

## File Map

**New files:**
- `src/components/admin/BottomNav.tsx` — Mobile bottom navigation bar (5 tabs + unread badge)
- `src/components/admin/AdminPageHeader.tsx` — Consistent page header with title + optional action(s)
- `src/components/admin/ResponsiveTable.tsx` — Table on desktop, cards on mobile
- `src/components/admin/AdminEmptyState.tsx` — Standardized empty state

**Modified files:**
- `src/components/AdminLayout.tsx` — Remove Sheet/floating button, add BottomNav, add `pb-16 md:pb-0` to `<main>`
- `src/pages/admin/Posts.tsx` — Use AdminPageHeader, ResponsiveTable, AdminEmptyState
- `src/pages/admin/Users.tsx` — Use AdminPageHeader, ResponsiveTable, AdminEmptyState
- `src/pages/admin/Workouts.tsx` — Use AdminPageHeader, ResponsiveTable, AdminEmptyState
- `src/pages/admin/WorkoutEditor.tsx` — Responsive grid, sticky save bar on mobile
- `src/pages/admin/StrengthWorkoutEditor.tsx` — Responsive grid, sticky save bar on mobile
- `src/pages/admin/PostForm.tsx` — Responsive grid, sticky save bar on mobile
- `src/pages/admin/UserForm.tsx` — Responsive grid, sticky save bar on mobile
- `src/pages/admin/Calendar.tsx` — Mobile list view with inline add button
- `src/pages/admin/Chat.tsx` — Mobile two-state (list / conversation) view
- `src/pages/admin/Login.tsx` — Typography alignment only

---

## Task 1: Create `AdminEmptyState` component

**Files:**
- Create: `src/components/admin/AdminEmptyState.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/admin/AdminEmptyState.tsx
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface AdminEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function AdminEmptyState({ icon: Icon, title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors referencing this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminEmptyState.tsx
git commit -m "feat: add AdminEmptyState component"
```

---

## Task 2: Create `AdminPageHeader` component

**Files:**
- Create: `src/components/admin/AdminPageHeader.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/admin/AdminPageHeader.tsx
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  actions?: ReactNode;
}

export function AdminPageHeader({ title, description, action, actions }: AdminPageHeaderProps) {
  const ActionIcon = action?.icon;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action && (
        <Button onClick={action.onClick} className="w-full sm:w-auto">
          {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
          {action.label}
        </Button>
      )}
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminPageHeader.tsx
git commit -m "feat: add AdminPageHeader component"
```

---

## Task 3: Create `ResponsiveTable` component

**Files:**
- Create: `src/components/admin/ResponsiveTable.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/admin/ResponsiveTable.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { ReactNode } from "react";

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

export function ResponsiveTable({ columns, rows, actions, emptyState, loading }: ResponsiveTableProps) {
  if (loading) {
    return (
      <>
        {/* Desktop skeleton */}
        <div className="hidden md:block rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((col) => (
                  <th key={col.key} className="h-12 px-4 text-left font-medium text-muted-foreground">
                    {col.label}
                  </th>
                ))}
                {actions && <th className="h-12 px-4 text-right font-medium text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {[...Array(3)].map((_, i) => (
                <tr key={i} className="border-b">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                  {actions && <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile skeleton */}
        <div className="md:hidden space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
              {columns.map((col) => (
                <Skeleton key={col.key} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </>
    );
  }

  if (!rows.length && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th key={col.key} className={`h-12 px-4 text-left font-medium text-muted-foreground ${col.className ?? ""}`}>
                  {col.label}
                </th>
              ))}
              {actions && <th className="h-12 px-4 text-right font-medium text-muted-foreground">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.className ?? ""}`}>
                    {row[col.key]}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-right">{actions(row)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="space-y-2">
              {columns.map((col) => (
                <div key={col.key}>
                  <p className="text-xs text-muted-foreground">{col.label}</p>
                  <div className="text-sm">{row[col.key]}</div>
                </div>
              ))}
            </div>
            {actions && (
              <div className="mt-3 pt-3 border-t flex gap-2">
                {actions(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ResponsiveTable.tsx
git commit -m "feat: add ResponsiveTable component"
```

---

## Task 4: Create `BottomNav` component

**Files:**
- Create: `src/components/admin/BottomNav.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/admin/BottomNav.tsx
import { cn } from "@/lib/utils";
import { CalendarDays, Dumbbell, FileText, MessageSquare, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface BottomNavProps {
  chatUnreadCount: number;
}

const navItems = [
  { href: "/admin/posts", label: "Posts", icon: FileText },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/chat", label: "Chat", icon: MessageSquare },
];

export function BottomNav({ chatUnreadCount }: BottomNavProps) {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card border-t"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          const showBadge = item.href === "/admin/chat" && chatUnreadCount > 0;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/BottomNav.tsx
git commit -m "feat: add BottomNav component for mobile admin navigation"
```

---

## Task 5: Update `AdminLayout`

**Files:**
- Modify: `src/components/AdminLayout.tsx`

Changes:
1. Remove `Sheet`, `SheetContent`, `SheetTrigger` imports and usage
2. Remove `Menu` import (only used in Sheet trigger — still used in collapsed sidebar, keep if used there)
3. Import and render `BottomNav`
4. Add `pb-16 md:pb-0` to `<main>` element
5. Remove `sidebarOpen` state (no longer needed)

- [ ] **Step 1: Read the current file to understand exact structure**

Read `src/components/AdminLayout.tsx` in full before editing.

- [ ] **Step 2: Remove Sheet-related imports**

Remove from the import line:
```
Sheet, SheetContent, SheetTrigger
```
(Keep `Menu` — it's used in the collapsed sidebar icon.)

- [ ] **Step 3: Remove `sidebarOpen` state and related JSX**

Remove:
```tsx
const [sidebarOpen, setSidebarOpen] = useState(false);
```

Remove the entire `<Sheet>` block (the "Mobile Sidebar Trigger" section).

Remove all `onClick={() => setSidebarOpen(false)}` from nav link `<Link>` elements.

- [ ] **Step 4: Import and render BottomNav**

Add import:
```tsx
import { BottomNav } from "./admin/BottomNav";
```

In the JSX return, add `<BottomNav chatUnreadCount={chatUnreadCount} />` just before the closing `</div>` of the outer wrapper (after `</main>`):

```tsx
        {/* Main content */}
        <main className={cn(
          "flex-1 overflow-auto transition-all duration-300 pb-16 md:pb-0",
          sidebarCollapsed ? "md:ml-20" : "md:ml-64"
        )}>
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav chatUnreadCount={chatUnreadCount} />
    </div>
  );
```

- [ ] **Step 5: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 6: Commit**

```bash
git add src/components/AdminLayout.tsx
git commit -m "feat: replace mobile sheet drawer with BottomNav in AdminLayout"
```

---

## Task 6: Migrate `Posts` page

**Files:**
- Modify: `src/pages/admin/Posts.tsx`

- [ ] **Step 1: Add imports**

Add at the top:
```tsx
import { AdminEmptyState } from "../../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../../components/admin/AdminPageHeader";
import { ResponsiveTable } from "../../components/admin/ResponsiveTable";
```

- [ ] **Step 2: Replace page header JSX**

Remove:
```tsx
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
  <h1 className="text-xl md:text-2xl font-bold">Posts</h1>
  <Link to="/admin/posts/new">
    <Button className="w-full sm:w-auto">
      <Plus className="h-4 w-4 mr-2" />
      New Post
    </Button>
  </Link>
</div>
```

Replace with:
```tsx
<AdminPageHeader
  title="Posts"
  action={{ label: "New Post", icon: Plus, onClick: () => navigate("/admin/posts/new") }}
/>
```

Add `useNavigate` to the imports from `react-router-dom` and `const navigate = useNavigate();` to the component body. Remove unused `Link` if it's only used for the header button (check if it's used elsewhere in the file for edit links — keep it if so).

- [ ] **Step 3: Replace loading + table + empty state JSX**

Remove the entire block from `{loading ? (` to the closing `)}` and replace with:

```tsx
<ResponsiveTable
  loading={loading}
  columns={[
    { key: "title", label: "Title" },
    { key: "status", label: "Status" },
    { key: "created", label: "Created" },
  ]}
  rows={posts.map((post) => ({
    title: (
      <div>
        <p className="font-medium">{post.title}</p>
        <p className="text-sm text-muted-foreground break-all">/blog/{post.slug}</p>
      </div>
    ),
    status: post.published ? (
      <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Published</Badge>
    ) : (
      <Badge variant="secondary">Draft</Badge>
    ),
    created: format(post.createdAt, "MMM d, yyyy"),
    _post: post,
  }))}
  actions={(row) => {
    const post = row._post as Post;
    return (
      <>
        <Link to={`/admin/posts/${post.id}/edit`}>
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
        </Link>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              {deleting === post.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Post</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{post.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(post.id)}
                className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }}
  emptyState={
    <AdminEmptyState
      icon={FileText}
      title="No posts yet"
      description="Create your first blog post to get started."
      action={{ label: "New Post", onClick: () => navigate("/admin/posts/new") }}
    />
  }
/>
```

Note: passing `_post: post` as a hidden data field on the row so the `actions` callback can access the full post object. The `_post` column is not in `columns` so it won't render as a visible column.

- [ ] **Step 4: Remove now-unused imports**

Remove from imports: `Table, TableBody, TableCell, TableHead, TableHeader, TableRow` (from `@/components/ui/table`) if no longer used. Keep: `Badge`, `Button`, `AlertDialog*`, `Link`, `Edit`, `Loader2`, `Plus`, `Trash2`, `FileText`, `format`, `useNavigate`.

- [ ] **Step 5: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/Posts.tsx
git commit -m "feat: migrate Posts admin page to shared components"
```

---

## Task 7: Migrate `Users` page

**Files:**
- Modify: `src/pages/admin/Users.tsx`

- [ ] **Step 1: Read the current file**

Read `src/pages/admin/Users.tsx` in full before editing.

- [ ] **Step 2: Add imports**

```tsx
import { AdminEmptyState } from "../../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../../components/admin/AdminPageHeader";
import { ResponsiveTable } from "../../components/admin/ResponsiveTable";
```

- [ ] **Step 3: Replace header with `AdminPageHeader`**

Replace the existing title+button header block with:
```tsx
<AdminPageHeader
  title="Users"
  action={{ label: "New User", icon: Plus, onClick: () => navigate("/admin/users/new") }}
/>
```

Add `useNavigate` if not already imported.

- [ ] **Step 4: Replace loading/table/empty state with `ResponsiveTable`**

Map user fields into `columns` and `rows`. Include role badges, created date. Pass the full `user` object as `_user` hidden field for the `actions` callback (same pattern as Posts).

Actions per row: Edit button (link to `/admin/users/{id}/edit`) + Delete AlertDialog.

EmptyState: Users icon, "No users yet", "Add your first user to get started."

- [ ] **Step 5: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/Users.tsx
git commit -m "feat: migrate Users admin page to shared components"
```

---

## Task 8: Migrate `Workouts` page

**Files:**
- Modify: `src/pages/admin/Workouts.tsx`

- [ ] **Step 1: Read the current file**

Read `src/pages/admin/Workouts.tsx` in full before editing.

- [ ] **Step 2: Add imports and apply same pattern as Posts/Users**

```tsx
import { AdminEmptyState } from "../../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../../components/admin/AdminPageHeader";
import { ResponsiveTable } from "../../components/admin/ResponsiveTable";
```

- [ ] **Step 3: Replace header**

```tsx
<AdminPageHeader
  title="Workouts"
  actions={
    <>
      <Button onClick={() => navigate("/admin/workouts/strength/new")} variant="outline">
        <Plus className="h-4 w-4 mr-2" />
        Strength
      </Button>
      <Button onClick={() => navigate("/admin/workouts/new")}>
        <Plus className="h-4 w-4 mr-2" />
        New Workout
      </Button>
    </>
  }
/>
```

Note: Workouts has two create buttons (regular + strength). Use the `actions` prop (ReactNode) instead of `action`.

- [ ] **Step 4: Replace table with `ResponsiveTable`**

Map workout fields: name, type (badge), assigned users count, created date. Pass full workout as `_workout`. Actions: Edit + Delete.

EmptyState: Dumbbell icon, "No workouts yet."

- [ ] **Step 5: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/Workouts.tsx
git commit -m "feat: migrate Workouts admin page to shared components"
```

---

## Task 9: Make `PostForm` and `UserForm` responsive

**Files:**
- Modify: `src/pages/admin/PostForm.tsx`
- Modify: `src/pages/admin/UserForm.tsx`

- [ ] **Step 1: Read PostForm.tsx in full**

- [ ] **Step 2: Fix grid columns in PostForm**

Find all `grid-cols-2` instances and change to `grid-cols-1 md:grid-cols-2`.

- [ ] **Step 3: Add sticky save bar on mobile in PostForm**

Find the form's submit/cancel button container. Wrap it with:
```tsx
<div className="sticky bottom-0 bg-background border-t p-4 -mx-4 md:static md:border-0 md:p-0 md:mx-0 flex gap-2 justify-end mt-6">
  {/* existing buttons */}
</div>
```

- [ ] **Step 4: Read UserForm.tsx in full**

- [ ] **Step 5: Apply same grid and sticky bar fixes to UserForm**

- [ ] **Step 6: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/PostForm.tsx src/pages/admin/UserForm.tsx
git commit -m "feat: make PostForm and UserForm responsive on mobile"
```

---

## Task 10: Make `WorkoutEditor` and `StrengthWorkoutEditor` responsive

**Files:**
- Modify: `src/pages/admin/WorkoutEditor.tsx`
- Modify: `src/pages/admin/StrengthWorkoutEditor.tsx`

- [ ] **Step 1: Read WorkoutEditor.tsx (first 200 lines)**

- [ ] **Step 2: Fix all `grid-cols-2` → `grid-cols-1 md:grid-cols-2` in WorkoutEditor**

- [ ] **Step 3: Add sticky save bar to WorkoutEditor**

Find the Save/Cancel button container and wrap with the sticky div pattern from Task 9.

- [ ] **Step 4: Read StrengthWorkoutEditor.tsx**

- [ ] **Step 5: Apply same fixes to StrengthWorkoutEditor**

- [ ] **Step 6: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/WorkoutEditor.tsx src/pages/admin/StrengthWorkoutEditor.tsx
git commit -m "feat: make WorkoutEditor and StrengthWorkoutEditor responsive on mobile"
```

---

## Task 11: Make `Calendar` responsive (mobile list view)

**Files:**
- Modify: `src/pages/admin/Calendar.tsx`

- [ ] **Step 1: Read Calendar.tsx in full**

- [ ] **Step 2: Add mobile list view**

The existing calendar grid stays as-is on desktop (`hidden md:block` on the grid wrapper).

Add a mobile view (`md:hidden`) that:
1. Gets the unique days in the current week/view that have assignments.
2. Renders each day as a section:

```tsx
<div className="md:hidden space-y-4">
  {daysWithWorkouts.map((day) => (
    <div key={day.toISOString()}>
      <div className="flex items-center justify-between py-2 border-b mb-2">
        <h3 className="font-semibold text-sm">{format(day, "EEEE, MMM d")}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openAddDialog(day)}
          className="text-xs h-7 px-2"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
      <div className="space-y-2">
        {getWorkoutsForDay(day).map((assignment) => (
          <div key={assignment.id} className="rounded-lg border bg-card p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{assignment.workoutName}</p>
              <p className="text-xs text-muted-foreground">{assignment.athleteName}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => openEditDialog(assignment)}>
                <Edit className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(assignment.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        {getWorkoutsForDay(day).length === 0 && (
          <p className="text-xs text-muted-foreground py-1">No workouts</p>
        )}
      </div>
    </div>
  ))}
</div>
```

Adapt variable names (`openAddDialog`, `getWorkoutsForDay`, etc.) to match what already exists in the file — read it carefully first.

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/Calendar.tsx
git commit -m "feat: add mobile list view to Calendar admin page"
```

---

## Task 12: Make `Chat` responsive (mobile two-state view)

**Files:**
- Modify: `src/pages/admin/Chat.tsx`

- [ ] **Step 1: Read Chat.tsx in full**

- [ ] **Step 2: Add `selectedChatMobile` state**

In the component, add:
```tsx
const [selectedChatMobile, setSelectedChatMobile] = useState<Chat | null>(null);
```

This is separate from any existing desktop selection state.

- [ ] **Step 3: Wrap existing layout with desktop-only class**

The existing split-panel layout (ChatList + ChatWindow side-by-side) gets wrapped with `hidden md:flex` so it only shows on desktop.

- [ ] **Step 4: Add mobile view**

```tsx
{/* Mobile view */}
<div className="md:hidden flex flex-col h-full">
  {selectedChatMobile === null ? (
    // Full-screen conversation list
    <div className="flex-1 overflow-y-auto">
      <ChatList
        chats={chats}
        onSelectChat={(chat) => setSelectedChatMobile(chat)}
        selectedChatId={null}
      />
    </div>
  ) : (
    // Full-screen conversation
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b bg-card">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedChatMobile(null)}
          className="h-8 px-2"
        >
          ← Back
        </Button>
        <span className="font-medium text-sm truncate">
          {selectedChatMobile.athleteName ?? selectedChatMobile.id}
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatWindow chat={selectedChatMobile} currentUser={user} />
      </div>
    </div>
  )}
</div>
```

Adapt prop names (`chats`, `onSelectChat`, `selectedChatId`, `athleteName`, `currentUser`) to match what `ChatList` and `ChatWindow` actually accept — read the component files in `src/components/chat/` first.

- [ ] **Step 5: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/Chat.tsx
git commit -m "feat: add mobile two-state view to Chat admin page"
```

---

## Task 13: Update `Login` typography

**Files:**
- Modify: `src/pages/admin/Login.tsx`

- [ ] **Step 1: Read Login.tsx**

- [ ] **Step 2: Find the card title element and update to `text-xl font-bold`**

This is a visual-only change to align with admin heading style.

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/Login.tsx
git commit -m "feat: align Login page title typography with admin style"
```

---

## Task 14: Final build verification

- [ ] **Step 1: Run full build**

```bash
npm run build 2>&1
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint 2>&1 | tail -30
```

Expected: No new lint errors introduced by this work.

- [ ] **Step 3: Final commit if any lint fixes were needed**

```bash
git add -p
git commit -m "fix: address lint warnings from admin UI redesign"
```
