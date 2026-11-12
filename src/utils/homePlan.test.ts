import { describe, expect, it } from "vitest";
import { assignmentStatus, monthDone, monthGrid, todayState, weekSummary } from "./homePlan";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import type { SessionDraft } from "@/lib/sessionDraft";
import type { Workout } from "@/types/workout";
import { hasFullTimeEstimate } from "@/utils/workoutDuration";

// Thursday 12 Nov 2026, 10:00; week Mon 9 – Sun 15
const NOW = new Date(2026, 10, 12, 10);
const at = (day: number, h = 8) => new Date(2026, 10, day, h);

const a = (
  id: string,
  day: number,
  opts: { type?: string; done?: Date; pct?: number; extra?: boolean; secs?: number } = {}
) =>
  ({
    id,
    scheduledDate: at(day),
    completedAt: opts.done ?? null,
    completionPercentage: opts.pct,
    selfLogged: opts.extra,
    totalTime: opts.secs,
    workout: { type: opts.type ?? "strength", name: id },
  }) as unknown as AssignmentWithWorkout;

const noDraft = () => null;

describe("todayState", () => {
  it("prefers a session in progress on this phone", () => {
    const draft: SessionDraft = {
      startedAt: NOW.getTime() - 22 * 60000,
      updatedAt: NOW.getTime() - 60000,
      rest: null,
      progress: { e1: { exerciseId: "x", sets: [{ completed: true }, { completed: false }] as never } },
    };
    const s = todayState([a("today", 12), a("tue", 10)], (id) => (id === "tue" ? draft : null), NOW);
    expect(s).toMatchObject({ kind: "inProgress", done: 1, total: 2, minutes: 22, moreToday: 1 });
    expect(s.kind === "inProgress" && s.assignment.id).toBe("tue");
  });

  it("ignores a draft older than the completion", () => {
    const draft = { startedAt: 1, updatedAt: at(10, 7).getTime(), rest: null, progress: {} } as SessionDraft;
    const s = todayState([a("tue", 10, { done: at(10, 9) })], () => draft, NOW);
    expect(s.kind).toBe("rest");
  });

  it("shows the first pending of several as 'x of n'", () => {
    const s = todayState([a("swim", 12, { type: "swimming", done: at(12, 7) }), a("str", 12)], noDraft, NOW);
    expect(s).toMatchObject({ kind: "planned", index: 2, count: 2, more: 0 });
  });

  it("is done when everything today is finished, and rest otherwise with the next workout", () => {
    expect(todayState([a("str", 12, { done: at(12, 7) })], noDraft, NOW).kind).toBe("done");
    const rest = todayState([a("fri", 13), a("sun", 15)], noDraft, NOW);
    expect(rest.kind === "rest" && rest.next?.id).toBe("fri");
  });
});

describe("weekSummary", () => {
  const s = weekSummary(
    [
      a("tue", 10, { done: at(10, 9), secs: 3480 }),
      a("wed", 11, { type: "running" }),
      a("thu", 12, { type: "swimming" }),
      a("fri", 13, { done: at(13), pct: 60 }),
      a("extra", 9, { done: at(9), extra: true, secs: 600 }),
    ],
    NOW
  );

  it("gives each day a status and colour", () => {
    expect(s.days.map((d) => d.status)).toEqual(["done", "done", "missed", "planned", "partial", "none", "none"]);
    expect(s.days[2].type).toBe("running");
    expect(s.days[3].isToday).toBe(true);
  });

  it("counts coach-planned workouts and time trained", () => {
    expect([s.done, s.planned, s.missed, s.seconds]).toEqual([2, 4, 1, 4080]);
  });
});

describe("hasFullTimeEstimate", () => {
  const stage = (type: string) => ({ duration: { type, value: 1, unit: type === "time" ? "min" : "m" } });
  it("is true only when every stage (inside repeats too) is by time", () => {
    expect(hasFullTimeEstimate({ type: "running", stages: [stage("time"), { type: "repeat", repeatCount: 3, stages: [stage("time")] }] } as unknown as Workout)).toBe(true);
    expect(hasFullTimeEstimate({ type: "swimming", stages: [stage("time"), { type: "repeat", stages: [stage("distance"), stage("time")] }] } as unknown as Workout)).toBe(false);
  });
});

describe("assignmentStatus", () => {
  it("names each state", () => {
    expect(assignmentStatus(a("x", 10, { done: at(10) }), NOW)).toBe("done");
    expect(assignmentStatus(a("x", 10, { done: at(10), pct: 60 }), NOW)).toBe("partial");
    expect(assignmentStatus(a("x", 11), NOW)).toBe("missed");
    expect(assignmentStatus(a("x", 12), NOW)).toBe("planned");
    expect(assignmentStatus(a("x", 9, { done: at(9), extra: true }), NOW)).toBe("extra");
  });
});

describe("monthGrid / monthDone", () => {
  const list = [a("a", 10, { done: at(10) }), a("b", 11), a("c", 12), a("d", 12), a("e", 12), a("f", 12)];
  it("covers whole weeks with up to 3 dots per day", () => {
    const days = monthGrid(list, NOW, NOW);
    expect(days.length % 7).toBe(0);
    expect(days[0].date.getDay()).toBe(1);
    const thu = days.find((d) => d.isToday)!;
    expect([thu.dots.length, thu.more]).toEqual([3, 1]);
  });
  it("counts the month's coach-planned workouts", () => {
    expect(monthDone(list, NOW)).toEqual({ done: 1, planned: 6 });
  });
});

describe("weekSummary for another week", () => {
  it("pages to the week of the given day", () => {
    const s = weekSummary([a("next", 17)], NOW, at(18));
    expect(s.days[0].date.getDate()).toBe(16);
    expect(s.planned).toBe(1);
  });
});
