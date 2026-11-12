import { parseNum } from "@/utils/strengthStats";

export interface SuggestedSet {
  reps: string;
  weight: string;
  /** Values come from the athlete's last session (vs. this session / the coach target) */
  fromHistory: boolean;
}

interface Logged {
  reps: string;
  weight: string;
}

/** A load worth suggesting: a positive number. "", "0" and free text are no load. */
const realWeight = (w: string | undefined): string => {
  const v = (w ?? "").trim();
  return /^\d+([.,]\d+)?$/.test(v) && parseNum(v) > 0 ? v : "";
};

/**
 * What to prefill for a set (and save on a one-tap ✓). Load: the athlete's last
 * value for this exercise (an earlier set of this session, else the same set of
 * the last session) → the coach's target → empty. Never "0".
 * Reps: last session → earlier set → the coach's target reps.
 */
export function suggestSet(input: {
  /** Last non-warm-up set already filled in this session */
  earlier?: Logged;
  /** Same set (or the last one) from the athlete's previous session */
  history?: Logged;
  /** Coach target reps as a count ("12"), or "" */
  targetReps: string;
  /** Coach target load as written ("45", "peso corporal", "") */
  targetWeight?: string;
}): SuggestedSet | null {
  const { earlier, history, targetReps, targetWeight } = input;
  const weight = realWeight(earlier?.weight) || realWeight(history?.weight) || realWeight(targetWeight);
  const reps = (history?.reps || earlier?.reps || targetReps || "").trim();
  if (!reps && !weight) return null;
  const fromHistory = !!history && !realWeight(earlier?.weight) && (!!history.reps || !!realWeight(history.weight));
  return { reps, weight, fromHistory };
}

/** Whether the exercise is done with a load (so a set without one isn't complete) */
export const expectsLoad = (input: { history?: Logged; targetWeight?: string }) =>
  !!realWeight(input.history?.weight) || !!realWeight(input.targetWeight);
