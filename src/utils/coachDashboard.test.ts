import { describe, expect, it } from "vitest";
import { groupByWorkout, reminderText, teamWeekStats, upcomingRaces } from "./coachDashboard";
import type { AssignmentWithDetails } from "@/types/workoutAssignment";

// Thursday 12 Nov 2026; week Mon 9 – Sun 15
const NOW = new Date(2026, 10, 12, 10);
const d = (day: number) => new Date(2026, 10, day, 8);
const a = (id: string, day: number, opts: { done?: boolean; extra?: boolean; workout?: string; athlete?: string } = {}) =>
  ({
    id,
    scheduledDate: d(day),
    completedAt: opts.done ? d(day) : null,
    selfLogged: opts.extra,
    workoutId: opts.workout ?? "w1",
    workout: { name: opts.workout ?? "w1", type: "running" },
    athlete: { displayName: opts.athlete ?? id },
  }) as unknown as AssignmentWithDetails;

describe("teamWeekStats", () => {
  it("counts the week's coach plan per day", () => {
    const s = teamWeekStats([a("1", 9, { done: true }), a("2", 11), a("3", 12, { done: true }), a("4", 15), a("x", 10, { done: true, extra: true }), a("old", 2, { done: true })], NOW);
    expect([s.done, s.planned, s.pct]).toEqual([2, 4, 50]);
    expect(s.days.map((x) => `${x.done}/${x.planned}`)).toEqual(["1/1", "0/0", "0/1", "1/1", "0/0", "0/0", "0/1"]);
    expect(s.days[3].isToday).toBe(true);
    expect(s.days[4].isFuture).toBe(true);
  });
});

describe("groupByWorkout", () => {
  it("groups today's workouts with who did and who is missing", () => {
    const g = groupByWorkout(
      [a("1", 12, { workout: "Natação", athlete: "Bruno", done: true }), a("2", 12, { workout: "Natação", athlete: "Ana" }), a("3", 12, { workout: "Força", athlete: "Carla" }), a("4", 13)],
      NOW
    );
    expect(g.map((x) => [x.name, x.done.map((y) => y.athlete.displayName), x.missing.map((y) => y.athlete.displayName)])).toEqual([
      ["Natação", ["Bruno"], ["Ana"]],
      ["Força", [], ["Carla"]],
    ]);
  });
});

describe("upcomingRaces", () => {
  it("keeps races in the next 14 days, soonest first", () => {
    const ev = (id: string, day: number) => ({ id, athleteId: "a", title: id, eventDate: new Date(2026, 10, day) });
    expect(upcomingRaces([ev("far", 30), ev("soon", 24), ev("past", 1), ev("today", 12)], NOW).map((r) => [r.title, r.days])).toEqual([
      ["today", 0],
      ["soon", 12],
    ]);
  });
});

it("fills the reminder text", () => {
  expect(reminderText("Oi, {{name}}! Hoje tem {{workout}}.", "Bruno", "Natação")).toBe("Oi, Bruno! Hoje tem Natação.");
});
