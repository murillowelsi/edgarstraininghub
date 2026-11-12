import { addDays, differenceInCalendarDays, isSameDay, startOfDay, startOfWeek } from "date-fns";
import type { AssignmentWithDetails } from "@/types/workoutAssignment";

export interface WeekDayCount {
  date: Date;
  planned: number;
  done: number;
  isToday: boolean;
  isFuture: boolean;
}

export interface TeamWeek {
  days: WeekDayCount[];
  planned: number;
  done: number;
  /** 0–100, of the whole week's plan */
  pct: number;
}

/** "8 of 14 · 57%" for this week (Mon–Sun), coach-planned only, with the count per day (CD-2) */
export function teamWeekStats(assignments: AssignmentWithDetails[], now: Date = new Date()): TeamWeek {
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const today = startOfDay(now);
  const planned = assignments.filter((a) => !a.selfLogged);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const items = planned.filter((a) => isSameDay(a.scheduledDate, date));
    return {
      date,
      planned: items.length,
      done: items.filter((a) => a.completedAt).length,
      isToday: isSameDay(date, now),
      isFuture: date > today,
    };
  });
  const total = days.reduce((s, d) => s + d.planned, 0);
  const done = days.reduce((s, d) => s + d.done, 0);
  return { days, planned: total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

export interface WorkoutGroup {
  workoutId: string;
  name: string;
  type: string;
  done: AssignmentWithDetails[];
  missing: AssignmentWithDetails[];
}

/** One row per workout of the day, with who did it and who hasn't yet (CD-5/6) */
export function groupByWorkout(assignments: AssignmentWithDetails[], day: Date): WorkoutGroup[] {
  const groups = new Map<string, WorkoutGroup>();
  for (const a of assignments) {
    if (!isSameDay(a.scheduledDate, day)) continue;
    const g = groups.get(a.workoutId) ?? { workoutId: a.workoutId, name: a.workout.name, type: a.workout.type, done: [], missing: [] };
    (a.completedAt ? g.done : g.missing).push(a);
    groups.set(a.workoutId, g);
  }
  const byName = (x: AssignmentWithDetails, y: AssignmentWithDetails) => x.athlete.displayName.localeCompare(y.athlete.displayName);
  return [...groups.values()]
    .map((g) => ({ ...g, done: g.done.sort(byName), missing: g.missing.sort(byName) }))
    .sort((a, b) => b.done.length + b.missing.length - (a.done.length + a.missing.length) || a.name.localeCompare(b.name));
}

export interface RaceNotice {
  eventId: string;
  athleteId: string;
  title: string;
  days: number;
}

/** Races in the next 14 days, soonest first (CD-6) */
export function upcomingRaces(
  events: { id: string; athleteId: string; title: string; eventDate: Date }[],
  now: Date = new Date(),
  withinDays = 14
): RaceNotice[] {
  return events
    .map((e) => ({ eventId: e.id, athleteId: e.athleteId, title: e.title, days: differenceInCalendarDays(e.eventDate, now) }))
    .filter((e) => e.days >= 0 && e.days < withinDays)
    .sort((a, b) => a.days - b.days);
}

/** Reminder text the coach reviews in the chat before sending (never sent automatically) */
export const reminderText = (template: string, firstName: string, workout: string) =>
  template.replace("{{name}}", firstName).replace("{{workout}}", workout);
