# Video Inline Player — Design Spec

**Date:** 2026-03-20
**Status:** Approved

## Summary

Replace the video/GIF modal with an inline player that renders directly inside each exercise card. Exercise instructions (previously shown only in the modal) are moved into the card body. Applies to both the workout detail screen and the workout execution screen.

## Problem

Currently, clicking a video thumbnail or GIF in an exercise card opens a full-screen modal (`ExerciseVideoDialog`). This interrupts the workout flow and requires an extra interaction to return to the exercise list.

## Solution

Embed the player directly in the card using a local toggle state. Clicking the thumbnail replaces it with the player; a close button restores the thumbnail. Instructions are rendered persistently in the card body so no content is lost when the modal is removed.

## Scope

- `src/pages/athlete/WorkoutView.tsx` — `ExerciseItem` component
- `src/pages/athlete/StrengthWorkoutSession.tsx` — `ExerciseSessionCard` component

**Out of scope:** `MyLibraryBrowser.tsx`, routing, Firestore, types/utilities.

## Behavior

### State
Each card manages its own `isPlaying: boolean` state (default `false`), independent of other cards.

### Interaction
1. User sees thumbnail with play icon overlay (current behavior).
2. User clicks thumbnail → `isPlaying = true`.
3. Thumbnail is replaced by the inline player (conditionally rendered — not CSS-hidden):
   - **YouTube video:** `<iframe>` with `aspect-video` ratio, `autoplay=1`, `rel=0`, `modestbranding=1`, full `allow` attribute (`accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen`) and `allowFullScreen`.
   - **GIF:** `<img>` rendered at full width, `aspect-square max-w-xs mx-auto` (preserving existing GIF aspect ratio — ExerciseDB GIFs are square).
4. A `✕` close button is rendered in the top-right corner of the player area (`relative` parent, `absolute top-2 right-2 z-10`).
5. User clicks `✕` → `isPlaying = false` → thumbnail is restored; iframe is unmounted, stopping YouTube playback.

### Instructions placement
Instructions (`exerciseInstructions`) are currently only shown inside the modal. After the modal is removed, they must be added to the card body:
- **WorkoutView.tsx / `ExerciseItem`:** Render instructions below the muscle group badges in the collapsible content, using the same `bg-muted/50 p-3 rounded-lg` style as the Notes section.
- **StrengthWorkoutSession.tsx / `ExerciseSessionCard`:** Render instructions below the media player area, using the same dark-bg style (`bg-muted/50 p-3 rounded-lg`, or a style consistent with the card's existing design).

### "Watch Video" fallback button (WorkoutView.tsx only)
The existing fallback `<Button>` ("Watch Video" / "View Animation") at lines 539–552 is shown when media metadata exists but no previewable URL is available. This button currently calls `onVideoClick()`. After the change, it should toggle `isPlaying = true` directly within `ExerciseItem`.

### No media (StrengthWorkoutSession.tsx)
The existing no-media placeholder (dumbbell icon, `aspect-[3/1]`) is always shown unconditionally when `!hasMedia` and is never a click target. No change needed — leave as-is.

### No media (WorkoutView.tsx)
When `mediaUrl` is falsy in `ExerciseItem`, the thumbnail area is not rendered. No change needed.

### Card size
The card area occupied by the media does not change size between thumbnail and player states — same aspect ratio. No layout shift.

### Multiple cards
Opening one card's player does not close others. Each card is independent.

## Removals

### `WorkoutView.tsx`
- `ExerciseVideoDialog` component
- `ExerciseDialogData` interface
- `selectedExerciseData` state variable (used as the open/close signal: `open={!!selectedExerciseData}`)
- `buildExerciseDialogData` helper function
- `onVideoClick` prop on `ExerciseItem` and all parent wiring
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` imports from `@/components/ui/dialog`

### `StrengthWorkoutSession.tsx`
- `ExerciseVideoDialog` component
- `ExerciseDialogData` interface
- `selectedExerciseData` state variable
- `buildExerciseDialogData` helper function
- `onWatchVideo` prop on `ExerciseSessionCard` and all parent wiring
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` imports from `@/components/ui/dialog`

## Implementation Notes

- Reuse existing `getYouTubeVideoId` and `getYouTubeThumbnail` utilities from `src/types/exercise.ts`.
- The close `✕` button requires `position: relative` on the player container; use `absolute top-2 right-2 z-10`.
- **`X` icon import:** Already present in `StrengthWorkoutSession.tsx` (reuse). Must be added to `WorkoutView.tsx` from `lucide-react`.
- **iframe `allow` attribute change in `WorkoutView.tsx`:** The existing modal iframe had no query params or `fullscreen` in `allow`. The inline iframe adds `?autoplay=1&rel=0&modestbranding=1` and the full `allow` string — this is an intentional behavior upgrade, not just a structural move.
- No new npm dependencies required.
