import type { Workout } from "@/types/workout";

/** Strength workouts have their own editor; every place that edits a workout must use this. */
export const getWorkoutEditPath = (workout: Pick<Workout, "id" | "type">) =>
  workout.type === "strength" ? `/admin/workouts/strength/${workout.id}/edit` : `/admin/workouts/${workout.id}/edit`;
