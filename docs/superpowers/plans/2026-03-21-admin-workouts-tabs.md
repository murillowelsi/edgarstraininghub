# Admin Workouts — Tab Filtering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tab-based filtering (All / Running / Cycling / Swimming / Strength) to `/admin/workouts` so the admin can browse workouts by type.

**Architecture:** Single-file change to `src/pages/admin/Workouts.tsx`. Add `activeTab` state, derive `filteredWorkouts` via `useMemo`, and render the existing shadcn/ui `Tabs` component above the `ResponsiveTable`. All filtering happens in memory on the already-loaded array.

**Tech Stack:** React, TypeScript, shadcn/ui (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` — already in `src/components/ui/tabs.tsx`)

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/pages/admin/Workouts.tsx` |

No files created. No other files modified.

---

### Task 1: Add `useMemo` to React import and `activeTab` state

**Files:**
- Modify: `src/pages/admin/Workouts.tsx`

> **Note:** This project has no test setup. Skip TDD steps — implement directly and verify in browser.

- [ ] **Step 1: Update the React import to include `useMemo`**

Find this line (line 23):
```tsx
import { useEffect, useState } from "react";
```
Replace with:
```tsx
import { useEffect, useMemo, useState } from "react";
```

- [ ] **Step 2: Add `activeTab` state after the existing `useState` declarations**

After `const [newWorkoutDrawerOpen, setNewWorkoutDrawerOpen] = useState(false);` (line 53), add:
```tsx
const [activeTab, setActiveTab] = useState<"all" | "running" | "cycling" | "swimming" | "strength">("all");
```

- [ ] **Step 3: Add `filteredWorkouts` and tab counts via `useMemo`**

After the `activeTab` state line just added, add:
```tsx
const filteredWorkouts = useMemo(
  () => (activeTab === "all" ? workouts : workouts.filter((w) => w.type === activeTab)),
  [workouts, activeTab]
);

const tabCounts = useMemo(
  () => ({
    all: workouts.length,
    running: workouts.filter((w) => w.type === "running").length,
    cycling: workouts.filter((w) => w.type === "cycling").length,
    swimming: workouts.filter((w) => w.type === "swimming").length,
    strength: workouts.filter((w) => w.type === "strength").length,
  }),
  [workouts]
);
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/Workouts.tsx
git commit -m "feat: add activeTab state and filteredWorkouts memo to admin workouts"
```

---

### Task 2: Add Tabs import and render tabs above the table

**Files:**
- Modify: `src/pages/admin/Workouts.tsx`

- [ ] **Step 1: Add Tabs imports at the top of the file**

After the last existing import (line 30, `import { useLanguage } from "../../contexts/LanguageContext";`), add:
```tsx
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
```

- [ ] **Step 2: Wrap the `ResponsiveTable` with `Tabs` and insert `TabsList` above it**

Find this block (starting line 159):
```tsx
        <ResponsiveTable
```

Replace the entire `<ResponsiveTable ... />` block with:
```tsx
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mt-4">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="all">All ({tabCounts.all})</TabsTrigger>
            <TabsTrigger value="running">Running ({tabCounts.running})</TabsTrigger>
            <TabsTrigger value="cycling">Cycling ({tabCounts.cycling})</TabsTrigger>
            <TabsTrigger value="swimming">Swimming ({tabCounts.swimming})</TabsTrigger>
            <TabsTrigger value="strength">Strength ({tabCounts.strength})</TabsTrigger>
          </TabsList>

          <ResponsiveTable
            loading={loading}
            rowKey="_id"
            columns={[
              { key: "name", label: t.common.name },
              { key: "type", label: t.common.type },
              { key: "stages", label: "Stages" },
              { key: "created", label: t.common.created },
            ]}
            rows={filteredWorkouts.map((workout) => ({
              _id: workout.id,
              name: <span className="font-medium">{workout.name}</span>,
              type: (
                <Badge className={`${workoutTypeBadgeColors[workout.type]} flex items-center gap-1.5 w-fit`}>
                  {workout.type === "cycling" && <GrBike className="h-3 w-3" />}
                  {workout.type === "running" && <GrRun className="h-3 w-3" />}
                  {workout.type === "swimming" && <GrSwim className="h-3 w-3" />}
                  {workout.type === "strength" && <Dumbbell className="h-3 w-3" />}
                  {workoutTypeLabels[workout.type]}
                </Badge>
              ),
              stages:
                workout.type === "strength"
                  ? `${workout.exercises?.length || 0} exercises`
                  : `${workout.stages.length} stages`,
              created: format(workout.createdAt, "MMM d, yyyy"),
              _workout: workout,
            }))}
            actions={(row) => {
              const workout = row._workout as Workout;
              return (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAssignClick(workout)}
                    title="Assign to athletes"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigate(
                        workout.type === "strength"
                          ? `/admin/workouts/strength/${workout.id}/edit`
                          : `/admin/workouts/${workout.id}/edit`
                      )
                    }
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirmWorkout(workout)}
                  >
                    {deleting === workout.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </>
              );
            }}
            emptyState={
              <AdminEmptyState
                icon={Dumbbell}
                title={t.admin.workouts.empty.title}
                description={t.admin.workouts.empty.description}
                action={{ label: t.admin.workouts.newWorkout, onClick: () => navigate("/admin/workouts/new") }}
              />
            }
          />
        </Tabs>
```

> **Key change:** `rows={workouts.map(...)}` → `rows={filteredWorkouts.map(...)}`. Everything else inside the table is identical to before.

- [ ] **Step 3: Build to verify no TypeScript errors**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/Workouts.tsx
git commit -m "feat: add type tabs to admin workouts page"
```

---

## Verification Checklist

After implementation, manually verify in the browser at `/admin/workouts`:

- [ ] 5 tabs render: All, Running, Cycling, Swimming, Strength
- [ ] Each tab shows the correct count in parentheses
- [ ] Clicking a tab filters the table to only that type
- [ ] "All" tab shows every workout
- [ ] Adding a new workout and returning to the page shows updated counts
- [ ] Deleting a workout updates the count on the active tab
- [ ] Table is empty state shown correctly when a tab has zero workouts
