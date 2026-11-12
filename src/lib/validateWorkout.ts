import type { WorkoutStage } from "@/types/workout";
import { paceSeconds } from "@/utils/stageInput";

export type IssueCode =
  | "noName"
  | "emptyRepeat"
  | "minAboveMax"
  | "noStages"
  | "noExercises"
  | "noTarget"
  | "noDuration";

export interface WorkoutIssue {
  code: IssueCode;
  /** Error blocks saving; warning only informs */
  level: "error" | "warning";
  /** Stage (or exercise) the issue is about, to open it */
  stageId?: string;
}

const EASY = new Set(["warmup", "cooldown", "recovery", "rest"]);
const isPace = (type: string) => type === "pace" || type === "targetPace" || type === "cssBasedPace";

const stageIssues = (s: WorkoutStage): WorkoutIssue[] => {
  if (s.type === "repeat") {
    if (!s.stages?.length) return [{ code: "emptyRepeat", level: "error", stageId: s.id }];
    return s.stages.flatMap(stageIssues);
  }
  const out: WorkoutIssue[] = [];
  const { min, max, type } = s.intensity ?? { type: "none" };
  if (min !== undefined && max !== undefined) {
    // Pace "m.ss": compare as seconds; a faster pace is the smaller number
    const lo = isPace(type) ? paceSeconds(min) : min;
    const hi = isPace(type) ? paceSeconds(max) : max;
    if (lo > hi) out.push({ code: "minAboveMax", level: "error", stageId: s.id });
  }
  if (s.duration.type !== "lapButton" && !(typeof s.duration.value === "number" && s.duration.value > 0)) {
    out.push({ code: "noDuration", level: "warning", stageId: s.id });
  }
  if ((!s.intensity || s.intensity.type === "none") && !EASY.has(s.type)) {
    out.push({ code: "noTarget", level: "warning", stageId: s.id });
  }
  return out;
};

/**
 * Shared check for both editors (WE-4): errors block saving (no name, empty block,
 * min above max); warnings only show what's missing.
 */
export function validateWorkout(form: {
  name: string;
  type: string;
  stages?: WorkoutStage[];
  exercises?: unknown[];
}): WorkoutIssue[] {
  const issues: WorkoutIssue[] = [];
  if (!form.name.trim()) issues.push({ code: "noName", level: "error" });
  if (form.type === "strength") {
    if (!form.exercises?.length) issues.push({ code: "noExercises", level: "warning" });
    return issues;
  }
  if (!form.stages?.length) issues.push({ code: "noStages", level: "warning" });
  issues.push(...(form.stages ?? []).flatMap(stageIssues));
  return issues;
}

export const hasBlockingIssue = (issues: WorkoutIssue[]) => issues.some((i) => i.level === "error");
