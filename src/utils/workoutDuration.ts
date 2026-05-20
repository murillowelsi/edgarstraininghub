import type { Workout, WorkoutStage } from "@/types/workout";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";

const stageTimeSec = (s: WorkoutStage): number => {
  if (s.duration?.type === "time" && typeof s.duration.value === "number") {
    const unit = s.duration.unit;
    if (unit === "sec") return s.duration.value;
    if (unit === "min") return s.duration.value * 60;
    return s.duration.value * 60;
  }
  return 0;
};

const stageDurationSec = (s: WorkoutStage): number => {
  if (s.type === "repeat" && s.stages) {
    const inner = s.stages.reduce((acc, x) => acc + stageDurationSec(x), 0);
    return inner * (s.repeatCount ?? 1);
  }
  return stageTimeSec(s);
};

const STRENGTH_DEFAULT_PER_EXERCISE_SEC = 8 * 60;
const STRENGTH_FALLBACK_SEC = 45 * 60;

export const estimateWorkoutDurationSec = (workout: Workout): number => {
  if (workout.type === "strength") {
    const count = workout.exercises?.length ?? 0;
    if (count === 0) return STRENGTH_FALLBACK_SEC;
    return count * STRENGTH_DEFAULT_PER_EXERCISE_SEC;
  }
  return (workout.stages ?? []).reduce((acc, s) => acc + stageDurationSec(s), 0);
};

const stageDistanceKm = (s: WorkoutStage): number => {
  if (s.type === "repeat" && s.stages) {
    const inner = s.stages.reduce((acc, x) => acc + stageDistanceKm(x), 0);
    return inner * (s.repeatCount ?? 1);
  }
  if (s.duration?.type === "distance" && typeof s.duration.value === "number") {
    const v = s.duration.value;
    if (s.duration.unit === "km") return v;
    if (s.duration.unit === "m") return v / 1000;
    if (s.duration.unit === "mi") return v * 1.60934;
    return v;
  }
  return 0;
};

export const estimateWorkoutDistanceKm = (workout: Workout): number => {
  if (workout.type === "strength") return 0;
  return (workout.stages ?? []).reduce((acc, s) => acc + stageDistanceKm(s), 0);
};

export const actualDurationSec = (a: AssignmentWithWorkout): number => {
  if (a.workout.type === "strength") return a.totalTime ?? 0;
  return a.activityData?.elapsedTime ?? a.totalTime ?? 0;
};

export const formatHours = (sec: number): string => {
  if (sec <= 0) return "0min";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
};
