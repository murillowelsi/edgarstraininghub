import type { WorkoutType } from "@/types/workout";

/**
 * Sport colours as design tokens (--sport-*), never fixed hex, so a palette
 * change (e.g. the neutral dark theme) needs no feed changes.
 */
export type SportKey = "run" | "bike" | "swim" | "strength" | "other";

export const sportKey = (type?: string): SportKey =>
  type === "running" ? "run" : type === "cycling" ? "bike" : type === "swimming" ? "swim" : type === "strength" ? "strength" : "other";

/** Tailwind classes per sport (listed in full so Tailwind keeps them). */
export const SPORT_BG: Record<SportKey, string> = {
  run: "bg-sport-run",
  bike: "bg-sport-bike",
  swim: "bg-sport-swim",
  strength: "bg-sport-strength",
  other: "bg-sport-other",
};

export const SPORT_TEXT: Record<SportKey, string> = {
  run: "text-sport-run",
  bike: "text-sport-bike",
  swim: "text-sport-swim",
  strength: "text-sport-strength",
  other: "text-sport-other",
};

/** CSS colour for inline gradients/SVG: hsl(var(--sport-x) / alpha) */
export const sportColor = (key: SportKey, alpha = 1) => `hsl(var(--sport-${key}) / ${alpha})`;

export const isWorkoutType = (t: string): t is WorkoutType =>
  t === "running" || t === "cycling" || t === "swimming" || t === "strength";
