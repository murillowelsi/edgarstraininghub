import type { ExerciseProgressData, SetProgressData } from "@/types/workoutAssignment";

/** Parses user-typed numbers, accepting a decimal comma ("42,5"). */
export const parseNum = (value?: string): number => {
  if (!value) return 0;
  const n = parseFloat(value.trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Formats a weight back the way it's typed in pt-BR/en ("42,5" vs "42.5") — keeps the user's separator. */
export const formatWeight = (value: number, like?: string): string => {
  const rounded = Math.round(value * 100) / 100;
  const text = String(rounded);
  return like?.includes(",") ? text.replace(".", ",") : text;
};

/** Working sets only: completed and not marked as warm-up. */
export const isWorkingSet = (set: SetProgressData) => set.completed && !set.warmup;

export const computeStrengthVolume = (progressData?: ExerciseProgressData[]) => {
  if (!progressData) return { sets: 0, volume: 0 };
  let sets = 0;
  let volume = 0;
  for (const ex of progressData) {
    for (const set of ex.sets) {
      if (!isWorkingSet(set)) continue;
      sets += 1;
      volume += parseNum(set.reps) * parseNum(set.weight);
    }
  }
  return { sets, volume };
};

export interface ExerciseBest {
  weight: number;
  reps: number;
}

/** Heaviest working set per exerciseId (ties broken by reps) across the given sessions. */
export const buildBestByExercise = (sessions: { progressData?: ExerciseProgressData[] }[]) => {
  const best = new Map<string, ExerciseBest>();
  for (const session of sessions) {
    for (const ex of session.progressData ?? []) {
      for (const set of ex.sets) {
        if (!isWorkingSet(set)) continue;
        const weight = parseNum(set.weight);
        const reps = parseNum(set.reps);
        if (weight <= 0 && reps <= 0) continue;
        const current = best.get(ex.exerciseId);
        if (!current || weight > current.weight || (weight === current.weight && reps > current.reps)) {
          best.set(ex.exerciseId, { weight, reps });
        }
      }
    }
  }
  return best;
};

/** A working set beats the previous best: more weight, or same weight for more reps. */
export const isPersonalRecord = (set: SetProgressData, best?: ExerciseBest) => {
  if (!isWorkingSet(set) || !best) return false;
  const weight = parseNum(set.weight);
  const reps = parseNum(set.reps);
  if (weight <= 0) return false;
  return weight > best.weight || (weight === best.weight && reps > best.reps);
};
