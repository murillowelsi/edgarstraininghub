import { describe, expect, it } from "vitest";
import { computeAthleteStats, formatTotalTime, groupByMonth } from "./useAthleteStats";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";

// Thursday 12 Nov 2026; the week runs Mon 9 – Sun 15
const NOW = new Date(2026, 10, 12, 12);
const d = (month: number, day: number) => new Date(2026, month, day, 8);

const a = (
  id: string,
  scheduled: Date,
  opts: { done?: Date; pct?: number; secs?: number; type?: "running" | "strength" } = {}
) =>
  ({
    id,
    scheduledDate: scheduled,
    completedAt: opts.done ?? null,
    completionPercentage: opts.pct,
    totalTime: opts.secs,
    activityData: opts.type === "strength" ? undefined : { elapsedTime: opts.secs },
    workout: { type: opts.type ?? "running", name: id },
  }) as unknown as AssignmentWithWorkout;

describe("computeAthleteStats", () => {
  const list = [
    a("mon", d(10, 9), { done: d(10, 9), secs: 3600 }),
    a("wed", d(10, 11), { done: d(10, 11), pct: 60, secs: 1800, type: "strength" }),
    a("fri", d(10, 13)),
    a("sun", d(10, 15)),
    a("lastWeek", d(10, 4), { done: d(10, 4), secs: 2400 }),
    a("twoAgo", d(9, 28), { done: d(9, 28), secs: 1200 }),
    // gap in week of 19 Oct breaks the streak
    a("old", d(9, 14), { done: d(9, 14), secs: 600 }),
  ];
  const s = computeAthleteStats(list, NOW);

  it("counts this month's workouts and time", () => {
    expect(s.monthWorkouts).toBe(3);
    expect(s.monthSeconds).toBe(3600 + 1800 + 2400);
  });

  it("counts consecutive weeks with a workout", () => {
    expect(s.streakWeeks).toBe(3);
  });

  it("marks each day of the week", () => {
    expect(s.week).toEqual(["done", "empty", "partial", "empty", "empty", "empty", "empty"]);
    expect([s.weekDone, s.weekPlanned]).toEqual([2, 4]);
  });

  it("keeps the streak while this week has nothing yet", () => {
    const early = computeAthleteStats([a("lastWeek", d(10, 4), { done: d(10, 4) })], NOW);
    expect(early.streakWeeks).toBe(1);
  });
});

describe("groupByMonth", () => {
  it("groups newest first with totals", () => {
    const groups = groupByMonth([
      a("oct", d(9, 28), { done: d(9, 28), secs: 600 }),
      a("nov1", d(10, 9), { done: d(10, 9), secs: 3600 }),
      a("nov2", d(10, 4), { done: d(10, 4), secs: 600 }),
    ]);
    expect(groups.map((g) => [g.count, g.seconds, g.items.map((i) => i.id)])).toEqual([
      [2, 4200, ["nov1", "nov2"]],
      [1, 600, ["oct"]],
    ]);
  });
});

describe("formatTotalTime", () => {
  it("formats totals", () => {
    expect(formatTotalTime(13200)).toBe("3h 40");
    expect(formatTotalTime(3480)).toBe("58 min");
    expect(formatTotalTime(7200)).toBe("2h");
    expect(formatTotalTime(0)).toBe("0 min");
  });
});
