import type { WorkoutSummary } from "@/types/timeline";

export type VizModel =
  | { kind: "reps"; values: number[]; best: number }
  | { kind: "stages"; segments: { label: string; seconds: number }[] }
  | { kind: "lanes"; blocks: ("light" | "drill" | "main")[] }
  | { kind: "sets"; done: number; total: number };

const DRILL = /educativ|drill|técnica|technique|kick|pernada/i;

/**
 * Which mini chart a workout gets, from data the summary already stores
 * (stageTimes, sets). null = no chart (older posts end at the numbers).
 */
export const vizModel = (summary: WorkoutSummary): VizModel | null => {
  if (summary.workoutType === "strength") {
    const total = summary.totalSets ?? 0;
    if (total <= 0 || summary.workingSets === undefined) return null;
    return { kind: "sets", done: Math.min(summary.workingSets, total), total: Math.min(total, 40) };
  }

  const stages = summary.stageTimes ?? [];
  if (!stages.length) return null;

  // The "work" part of each repetition is its first timed step
  const reps = stages
    .filter((s) => s.type === "repeat")
    .flatMap((s) => (s.reps ?? []).map((r) => r.times?.[0]))
    .filter((t): t is number => typeof t === "number" && t > 0);

  if (summary.workoutType === "swimming") {
    const blocks: ("light" | "drill" | "main")[] = [];
    stages.forEach((s) => {
      if (s.type === "repeat") (s.reps ?? []).forEach(() => blocks.push(DRILL.test(s.nestedLabels?.[0] ?? "") ? "drill" : "main"));
      else if (s.time) blocks.push(DRILL.test(s.label) ? "drill" : "light");
    });
    return blocks.length >= 2 ? { kind: "lanes", blocks: blocks.slice(0, 20) } : null;
  }

  if (reps.length >= 2) return { kind: "reps", values: reps.slice(0, 16), best: Math.min(...reps) };

  const segments = stages
    .filter((s) => s.type === "regular" && typeof s.time === "number" && s.time > 0)
    .map((s) => ({ label: s.label, seconds: s.time as number }));
  return segments.length >= 2 ? { kind: "stages", segments } : null;
};
