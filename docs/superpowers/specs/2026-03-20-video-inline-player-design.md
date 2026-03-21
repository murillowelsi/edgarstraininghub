# Video Inline Player — Design Spec

**Date:** 2026-03-20
**Status:** Approved

## Summary

Replace the video/GIF modal with an inline player that renders directly inside each exercise card. Applies to both the workout detail screen and the workout execution screen.

## Problem

Currently, clicking a video thumbnail or GIF in an exercise card opens a full-screen modal (`ExerciseVideoDialog`). This interrupts the workout flow and requires an extra interaction to return to the exercise list.

## Solution

Embed the player directly in the card using a local toggle state. Clicking the thumbnail replaces it with the player; a close button restores the thumbnail.

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
3. Thumbnail is replaced by the inline player:
   - **YouTube video:** `<iframe>` with `src="https://www.youtube.com/embed/{videoId}?autoplay=1&rel=0&modestbranding=1"`, `aspect-video` ratio.
   - **GIF:** `<img>` rendered at full width, `aspect-video` ratio.
4. A `✕` close button is rendered in the top-right corner of the player area.
5. User clicks `✕` → `isPlaying = false` → thumbnail is restored.

### Card size
The card area occupied by the media does not change size — same aspect ratio in both thumbnail and player states. No layout shift.

### Multiple cards
Opening one card's player does not close others. Each card is independent.

## Removals

- `ExerciseVideoDialog` component in `WorkoutView.tsx` — no longer needed.
- `ExerciseVideoDialog` component in `StrengthWorkoutSession.tsx` — no longer needed.
- All state variables and handlers wired to those dialogs (`selectedExerciseData`, `isVideoDialogOpen`, `buildExerciseDialogData`, `onVideoClick` callbacks).

## Implementation Notes

- Reuse existing `getYouTubeVideoId` and `getYouTubeThumbnail` utilities from `src/types/exercise.ts`.
- The `✕` button should use `z-10` to stay above the iframe/img.
- No new dependencies required.
