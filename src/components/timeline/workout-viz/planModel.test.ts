import { describe, expect, it } from "vitest";
import { planTotals, vizModelFromWorkout } from "./planModel";
import type { Workout } from "@/types/workout";

const step = (type: string, duration: object, intensity: object = { type: "none" }) => ({ id: type, type, duration, intensity });

const intervals = {
  type: "running",
  stages: [
    step("warmup", { type: "time", value: 15, unit: "min" }, { type: "heartRateZone", value: 2 }),
    {
      id: "r",
      type: "repeat",
      repeatCount: 3,
      duration: { type: "lapButton" },
      intensity: { type: "none" },
      stages: [
        step("interval", { type: "time", value: 3, unit: "min" }, { type: "heartRateZone", value: 4 }),
        step("recovery", { type: "time", value: 90, unit: "sec" }, { type: "heartRateZone", value: 1 }),
      ],
    },
    step("cooldown", { type: "time", value: 10, unit: "min" }, { type: "heartRateZone", value: 1 }),
  ],
} as unknown as Workout;

describe("vizModelFromWorkout", () => {
  it("expands repeats: width from time, height from zone, easy steps marked", () => {
    const bars = vizModelFromWorkout(intervals)!;
    expect(bars).toHaveLength(8);
    expect(bars[0]).toMatchObject({ weight: 900, easy: true });
    expect(bars[1]).toMatchObject({ weight: 180, level: 1, easy: false });
    expect(bars[2]).toMatchObject({ weight: 90, level: 0.3, easy: true });
  });

  it("is null for strength or a single step", () => {
    expect(vizModelFromWorkout({ type: "strength" } as Workout)).toBeNull();
    expect(vizModelFromWorkout({ type: "running", stages: [step("run", { type: "time", value: 30, unit: "min" })] } as unknown as Workout)).toBeNull();
  });
});

describe("planTotals", () => {
  it("sums time and zones when every step is timed", () => {
    expect(planTotals(intervals)).toEqual({ seconds: 900 + 3 * 270 + 600, zones: [1, 4] });
  });

  it("drops the time when a step is by distance, keeps the distance", () => {
    const swim = {
      type: "swimming",
      stages: [step("swim", { type: "distance", value: 400, unit: "m" }), step("rest", { type: "time", value: 30, unit: "sec" })],
    } as unknown as Workout;
    expect(planTotals(swim)).toEqual({ km: 0.4 });
  });
});

describe("vizModelFromWorkout with mixed targets", () => {
  it("uses easy vs work heights when zones and paces are mixed", () => {
    const w = {
      type: "running",
      stages: [
        step("warmup", { type: "time", value: 15, unit: "min" }, { type: "heartRateZone", value: 2 }),
        step("interval", { type: "distance", value: 800, unit: "m" }, { type: "pace", min: 4.3 }),
        step("recovery", { type: "time", value: 90, unit: "sec" }),
      ],
    } as unknown as Workout;
    expect(vizModelFromWorkout(w)!.map((b) => b.level)).toEqual([0.45, 1, 0.45]);
  });
});
