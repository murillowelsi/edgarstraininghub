import { addDays, endOfDay, endOfMonth, endOfWeek, isAfter, isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import type { SessionDraft } from "@/lib/sessionDraft";
import { actualDurationSec } from "@/utils/workoutDuration";

// ---------- Today card ----------

export type TodayState =
  | { kind: "inProgress"; assignment: AssignmentWithWorkout; done: number; total: number; minutes: number; moreToday: number }
  | { kind: "planned"; assignment: AssignmentWithWorkout; index: number; count: number; more: number }
  | { kind: "done"; assignment: AssignmentWithWorkout; next?: AssignmentWithWorkout }
  | { kind: "rest"; next?: AssignmentWithWorkout };

/**
 * Which state the Today card shows (docs/design/home-athlete §2.2):
 * a session in progress on this phone wins; then the first pending workout of
 * today ("1 of 2" with more); then today's last finished one; else a rest day.
 * `loadDraft` is injected so the rule is testable (same rule as WorkoutView).
 */
export function todayState(
  assignments: AssignmentWithWorkout[],
  loadDraft: (assignmentId: string) => SessionDraft | null,
  now: Date = new Date()
): TodayState {
  for (const a of assignments) {
    if (a.workout.type !== "strength") continue;
    const draft = loadDraft(a.id);
    if (!draft) continue;
    if (a.completedAt && draft.updatedAt <= a.completedAt.getTime()) continue;
    const sets = Object.values(draft.progress).flatMap((p) => p.sets);
    return {
      kind: "inProgress",
      assignment: a,
      done: sets.filter((s) => s.completed).length,
      total: sets.length,
      minutes: Math.max(1, Math.round((now.getTime() - draft.startedAt) / 60000)),
      // Other workouts still open today, so they don't vanish behind the session
      moreToday: assignments.filter((x) => x.id !== a.id && !x.completedAt && isSameDay(x.scheduledDate, now)).length,
    };
  }

  const next = assignments
    .filter((a) => !a.completedAt && isAfter(a.scheduledDate, endOfDay(now)))
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())[0];

  const today = assignments
    .filter((a) => isSameDay(a.scheduledDate, now))
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  const pending = today.filter((a) => !a.completedAt);
  if (pending.length > 0) {
    const assignment = pending[0];
    return { kind: "planned", assignment, index: today.indexOf(assignment) + 1, count: today.length, more: pending.length - 1 };
  }
  if (today.length > 0) {
    const last = [...today].sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())[0];
    return { kind: "done", assignment: last, next };
  }
  return { kind: "rest", next };
}

// ---------- Week strip ----------

export type WeekDayStatus = "done" | "partial" | "planned" | "missed" | "none";

export interface WeekDay {
  date: Date;
  status: WeekDayStatus;
  /** Workout type that decides the colour */
  type?: string;
  isToday: boolean;
}

export interface WeekSummary {
  days: WeekDay[];
  /** Coach-planned workouts this week (extras don't inflate it) */
  planned: number;
  done: number;
  missed: number;
  /** Time trained this week, extras included */
  seconds: number;
}

const isPartial = (a: AssignmentWithWorkout) => a.completionPercentage !== undefined && a.completionPercentage < 100;

/**
 * Mon–Sun with one status per day. A day with several workouts shows what still
 * matters most: missed > planned > partial > done.
 */
export function weekSummary(
  assignments: AssignmentWithWorkout[],
  now: Date = new Date(),
  /** Any day of the week to show (the calendar pages through weeks); defaults to this week */
  weekOf: Date = now
): WeekSummary {
  const start = startOfWeek(weekOf, { weekStartsOn: 1 });
  const todayStart = startOfDay(now);

  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const items = assignments.filter((a) => isSameDay(a.scheduledDate, date));
    const past = date < todayStart;
    const pick = (status: WeekDayStatus, a?: AssignmentWithWorkout): WeekDay => ({
      date,
      status,
      type: a?.workout.type,
      isToday: isSameDay(date, now),
    });
    const open = items.filter((a) => !a.completedAt);
    if (past && open.length) return pick("missed", open[0]);
    if (open.length) return pick("planned", open[0]);
    const partial = items.find(isPartial);
    if (partial) return pick("partial", partial);
    if (items.length) return pick("done", items[0]);
    return pick("none");
  });

  const end = addDays(start, 7);
  const week = assignments.filter((a) => a.scheduledDate >= start && a.scheduledDate < end);
  const coach = week.filter((a) => !a.selfLogged);
  return {
    days,
    planned: coach.length,
    done: coach.filter((a) => a.completedAt).length,
    missed: coach.filter((a) => !a.completedAt && a.scheduledDate < todayStart).length,
    seconds: week.filter((a) => a.completedAt).reduce((sum, a) => sum + actualDurationSec(a), 0),
  };
}

// ---------- Calendar ----------

export type AssignmentStatus = "done" | "partial" | "missed" | "planned" | "extra";

/**
 * One word per workout for the calendar (docs/design/athlete-calendar §2.1):
 * an extra the athlete logged; done / partial once finished; missed when the
 * day is over (or the coach marked it skipped); planned otherwise.
 */
export function assignmentStatus(a: AssignmentWithWorkout, now: Date = new Date()): AssignmentStatus {
  if (a.selfLogged) return "extra";
  if (a.completedAt) return isPartial(a) ? "partial" : "done";
  if (a.skipped || a.scheduledDate < startOfDay(now)) return "missed";
  return "planned";
}

export interface MonthDay {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  /** Up to 3, in day order */
  dots: { type: string; status: AssignmentStatus }[];
  more: number;
}

/** Mon–Sun grid covering the month, with the workout dots of each day */
export function monthGrid(assignments: AssignmentWithWorkout[], month: Date, now: Date = new Date()): MonthDay[] {
  const first = startOfMonth(month);
  const start = startOfWeek(first, { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days: MonthDay[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const items = assignments.filter((a) => isSameDay(a.scheduledDate, d));
    days.push({
      date: d,
      inMonth: isSameMonth(d, month),
      isToday: isSameDay(d, now),
      dots: items.slice(0, 3).map((a) => ({ type: a.workout.type, status: assignmentStatus(a, now) })),
      more: Math.max(0, items.length - 3),
    });
  }
  return days;
}

/** "9 of 14 done" for the month: coach-planned workouts only */
export function monthDone(assignments: AssignmentWithWorkout[], month: Date): { done: number; planned: number } {
  const coach = assignments.filter((a) => !a.selfLogged && isSameMonth(a.scheduledDate, month));
  return { done: coach.filter((a) => a.completedAt).length, planned: coach.length };
}
