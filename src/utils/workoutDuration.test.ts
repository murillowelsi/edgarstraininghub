import { describe, expect, it } from "vitest";
import type { Workout, WorkoutStage } from "@/types/workout";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import {
  actualDurationSec,
  estimateWorkoutDistanceKm,
  estimateWorkoutDurationSec,
  formatHours,
} from "./workoutDuration";

const stage = (type: WorkoutStage["type"], duration: WorkoutStage["duration"], extra: Partial<WorkoutStage> = {}): WorkoutStage => ({
  id: Math.random().toString(36),
  type,
  duration,
  intensity: { type: "none" },
  ...extra,
});

const workout = (type: Workout["type"], extra: Partial<Workout> = {}): Workout => ({
  id: "w",
  name: "w",
  type,
  stages: [],
  authorId: "coach",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...extra,
});

describe("estimateWorkoutDurationSec", () => {
  it("adds time stages in min and sec", () => {
    const w = workout("running", {
      stages: [
        stage("warmup", { type: "time", value: 15, unit: "min" }),
        stage("run", { type: "time", value: 90, unit: "sec" }),
      ],
    });
    expect(estimateWorkoutDurationSec(w)).toBe(15 * 60 + 90);
  });

  it("treats a time stage without unit as minutes", () => {
    expect(estimateWorkoutDurationSec(workout("cycling", { stages: [stage("bike", { type: "time", value: 10 })] }))).toBe(600);
  });

  it("multiplies repeat blocks and ignores distance and lap stages", () => {
    const w = workout("running", {
      stages: [
        stage("repeat", { type: "lapButton" }, {
          repeatCount: 5,
          stages: [
            stage("interval", { type: "distance", value: 800, unit: "m" }),
            stage("recovery", { type: "time", value: 90, unit: "sec" }),
          ],
        }),
        stage("cooldown", { type: "lapButton" }),
      ],
    });
    expect(estimateWorkoutDurationSec(w)).toBe(5 * 90);
  });

  it("estimates strength as 8 min per exercise, 45 min when empty", () => {
    const ex = (i: number) => ({ id: `e${i}`, exerciseId: `x${i}`, sets: 3, restSeconds: 60, order: i });
    expect(estimateWorkoutDurationSec(workout("strength", { exercises: [ex(0), ex(1), ex(2)] }))).toBe(3 * 8 * 60);
    expect(estimateWorkoutDurationSec(workout("strength"))).toBe(45 * 60);
  });
});

describe("estimateWorkoutDistanceKm", () => {
  it("converts m, km and mi and multiplies repeats", () => {
    const w = workout("running", {
      stages: [
        stage("warmup", { type: "distance", value: 2, unit: "km" }),
        stage("repeat", { type: "lapButton" }, {
          repeatCount: 5,
          stages: [stage("interval", { type: "distance", value: 800, unit: "m" })],
        }),
        stage("cooldown", { type: "distance", value: 1, unit: "mi" }),
      ],
    });
    expect(estimateWorkoutDistanceKm(w)).toBeCloseTo(2 + 4 + 1.60934, 5);
  });

  it("is zero for strength", () => {
    expect(estimateWorkoutDistanceKm(workout("strength"))).toBe(0);
  });
});

describe("actualDurationSec", () => {
  const a = (type: Workout["type"], extra: Partial<AssignmentWithWorkout>) =>
    ({ workout: workout(type), ...extra }) as AssignmentWithWorkout;

  it("uses totalTime for strength", () => {
    expect(actualDurationSec(a("strength", { totalTime: 3000, activityData: { elapsedTime: 10 } }))).toBe(3000);
  });

  it("prefers activity elapsedTime for endurance, then totalTime, then 0", () => {
    expect(actualDurationSec(a("running", { totalTime: 100, activityData: { elapsedTime: 3120 } }))).toBe(3120);
    expect(actualDurationSec(a("running", { totalTime: 100 }))).toBe(100);
    expect(actualDurationSec(a("running", {}))).toBe(0);
  });
});

describe("formatHours", () => {
  it.each([
    [0, "0min"],
    [-5, "0min"],
    [59 * 60, "59min"],
    [3600, "1h"],
    [3600 + 25 * 60, "1h 25min"],
  ])("%i s → %s", (sec, expected) => {
    expect(formatHours(sec)).toBe(expected);
  });
});
