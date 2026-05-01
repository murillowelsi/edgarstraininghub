import type { WorkoutType } from "@/types/workout";

export const modalityColors: Record<WorkoutType, string> = {
  running: "#3b82f6",  // blue
  cycling: "#22c55e",  // green
  swimming: "#06b6d4", // cyan
  strength: "#f97316", // orange
};

export const modalityAccent = (type: WorkoutType): string => modalityColors[type];
