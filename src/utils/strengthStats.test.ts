import { describe, expect, it } from "vitest";
import type { SetProgressData } from "@/types/workoutAssignment";
import {
  buildBestByExercise,
  computeStrengthVolume,
  formatWeight,
  isPersonalRecord,
  isWorkingSet,
  parseNum,
} from "./strengthStats";

const set = (reps: string, weight: string, extra: Partial<SetProgressData> = {}): SetProgressData => ({
  setNumber: 1,
  reps,
  weight,
  completed: true,
  ...extra,
});

describe("parseNum", () => {
  it("parses dot and comma decimals", () => {
    expect(parseNum("42.5")).toBe(42.5);
    expect(parseNum("42,5")).toBe(42.5);
    expect(parseNum(" 10 ")).toBe(10);
  });

  it("returns 0 for empty or non-numeric input", () => {
    expect(parseNum(undefined)).toBe(0);
    expect(parseNum("")).toBe(0);
    expect(parseNum("bodyweight")).toBe(0);
  });
});

describe("formatWeight", () => {
  it("keeps the separator the user typed", () => {
    expect(formatWeight(42.5, "40,0")).toBe("42,5");
    expect(formatWeight(42.5, "40.0")).toBe("42.5");
    expect(formatWeight(42.5)).toBe("42.5");
  });

  it("rounds to two decimals", () => {
    expect(formatWeight(10.126)).toBe("10.13");
    expect(formatWeight(60)).toBe("60");
  });
});

describe("isWorkingSet", () => {
  it("counts only completed, non-warm-up sets", () => {
    expect(isWorkingSet(set("8", "60"))).toBe(true);
    expect(isWorkingSet(set("8", "60", { completed: false }))).toBe(false);
    expect(isWorkingSet(set("10", "30", { warmup: true }))).toBe(false);
  });
});

describe("computeStrengthVolume", () => {
  it("is zero without data", () => {
    expect(computeStrengthVolume(undefined)).toEqual({ sets: 0, volume: 0 });
    expect(computeStrengthVolume([])).toEqual({ sets: 0, volume: 0 });
  });

  it("sums reps × weight over working sets only", () => {
    const result = computeStrengthVolume([
      {
        exerciseId: "squat",
        sets: [set("10", "30", { warmup: true }), set("8", "60"), set("8", "60"), set("6", "60", { completed: false })],
      },
      { exerciseId: "rdl", sets: [set("10", "42,5")] },
    ]);
    expect(result).toEqual({ sets: 3, volume: 8 * 60 * 2 + 10 * 42.5 });
  });

  it("counts timed holds as sets with no volume", () => {
    expect(computeStrengthVolume([{ exerciseId: "plank", sets: [set("45s", "")] }])).toEqual({ sets: 1, volume: 0 });
  });
});

describe("buildBestByExercise and isPersonalRecord", () => {
  const sessions = [
    { progressData: [{ exerciseId: "squat", sets: [set("8", "60"), set("10", "60"), set("12", "40")] }] },
    { progressData: [{ exerciseId: "squat", sets: [set("5", "70", { warmup: true })] }] },
    { progressData: [{ exerciseId: "bench", sets: [set("8", "45"), set("8", "45", { completed: false })] }] },
    {},
  ];

  it("keeps the heaviest working set per exercise, ties broken by reps", () => {
    const best = buildBestByExercise(sessions);
    expect(best.get("squat")).toEqual({ weight: 60, reps: 10 });
    expect(best.get("bench")).toEqual({ weight: 45, reps: 8 });
    expect(best.has("deadlift")).toBe(false);
  });

  it("flags a PR for more weight, or the same weight for more reps", () => {
    const best = buildBestByExercise(sessions).get("squat");
    expect(isPersonalRecord(set("1", "62,5"), best)).toBe(true);
    expect(isPersonalRecord(set("11", "60"), best)).toBe(true);
    expect(isPersonalRecord(set("10", "60"), best)).toBe(false);
    expect(isPersonalRecord(set("20", "55"), best)).toBe(false);
  });

  it("never flags warm-ups, bodyweight sets or a first-ever set", () => {
    const best = { weight: 60, reps: 10 };
    expect(isPersonalRecord(set("5", "100", { warmup: true }), best)).toBe(false);
    expect(isPersonalRecord(set("20", ""), best)).toBe(false);
    expect(isPersonalRecord(set("8", "100"), undefined)).toBe(false);
  });
});
