import { useMemo } from "react";
import { addDays, isSameDay, isSameMonth, startOfMonth, startOfWeek, subWeeks } from "date-fns";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import { actualDurationSec } from "@/utils/workoutDuration";

export type DayStatus = "done" | "partial" | "empty";

export interface AthleteStats {
  /** Workouts completed this calendar month */
  monthWorkouts: number;
  /** Time trained this month, in seconds */
  monthSeconds: number;
  /** Consecutive weeks (Mon–Sun) with at least one completed workout, up to this week */
  streakWeeks: number;
  /** Mon..Sun of this week */
  week: DayStatus[];
  weekDone: number;
  weekPlanned: number;
}

export interface MonthGroup {
  key: string;
  /** Any date inside the month (for labels) */
  month: Date;
  count: number;
  seconds: number;
  items: AssignmentWithWorkout[];
}

const WEEK = { weekStartsOn: 1 as const };
const isPartial = (a: AssignmentWithWorkout) => a.completionPercentage !== undefined && a.completionPercentage < 100;

/**
 * Numbers for the athlete card (docs/design/profile §2.1), only from assignments
 * the screen already loads. `now` is injectable for tests.
 */
export function computeAthleteStats(assignments: AssignmentWithWorkout[], now: Date = new Date()): AthleteStats {
  const completed = assignments.filter((a): a is AssignmentWithWorkout & { completedAt: Date } => !!a.completedAt);

  const month = completed.filter((a) => isSameMonth(a.completedAt, now));
  const monthSeconds = month.reduce((sum, a) => sum + actualDurationSec(a), 0);

  // Streak: a week still in progress without a workout doesn't break it yet
  const weekStart = startOfWeek(now, WEEK);
  const weeksWithWork = new Set(completed.map((a) => startOfWeek(a.completedAt, WEEK).getTime()));
  let streakWeeks = 0;
  let cursor = weeksWithWork.has(weekStart.getTime()) ? weekStart : subWeeks(weekStart, 1);
  while (weeksWithWork.has(cursor.getTime())) {
    streakWeeks += 1;
    cursor = subWeeks(cursor, 1);
  }

  const week: DayStatus[] = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const doneThatDay = completed.filter((a) => isSameDay(a.completedAt, day));
    if (doneThatDay.length === 0) return "empty";
    return doneThatDay.some((a) => !isPartial(a)) ? "done" : "partial";
  });

  const weekEnd = addDays(weekStart, 7);
  const thisWeek = assignments.filter((a) => a.scheduledDate >= weekStart && a.scheduledDate < weekEnd);

  return {
    monthWorkouts: month.length,
    monthSeconds,
    streakWeeks,
    week,
    weekDone: thisWeek.filter((a) => a.completedAt).length,
    weekPlanned: thisWeek.length,
  };
}

/** Completed workouts grouped by month, newest first, with count and total time */
export function groupByMonth(completed: AssignmentWithWorkout[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  const sorted = [...completed]
    .filter((a) => a.completedAt)
    .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime());
  for (const a of sorted) {
    const month = startOfMonth(a.completedAt!);
    const key = `${month.getFullYear()}-${month.getMonth()}`;
    const g = groups.get(key) ?? { key, month, count: 0, seconds: 0, items: [] };
    g.count += 1;
    g.seconds += actualDurationSec(a);
    g.items.push(a);
    groups.set(key, g);
  }
  return [...groups.values()];
}

/** "3h 40" / "58 min" / "0 min" for totals */
export function formatTotalTime(seconds: number): string {
  const totalMin = Math.round(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, "0")}`;
}

export function useAthleteStats(assignments: AssignmentWithWorkout[]): AthleteStats {
  return useMemo(() => computeAthleteStats(assignments), [assignments]);
}
