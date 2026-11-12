import { describe, expect, it } from "vitest";
import { summaryStats, workoutCardModel } from "./workoutSummaryStats";

const labels = {
  time: "Time",
  distance: "Distance",
  avgHeartRate: "HR",
  avgPace: "Pace",
  avgSpeed: "Speed",
  completed: "Completed",
  volume: "Volume",
  sets: "Sets",
  records: "Records",
};

const distanceOf = (distance: number, workoutType: string) =>
  summaryStats({ workoutName: "W", workoutType, distance }, labels, "en").find((s) => s.key === "distance")?.value;

describe("summaryStats distance", () => {
  it("shows swims in metres, also for posts saved with km", () => {
    expect(distanceOf(1500, "swimming")).toBe("1500 m");
    expect(distanceOf(1.5, "swimming")).toBe("1500 m");
  });

  it("shows runs in km with two decimals", () => {
    expect(distanceOf(10.2, "running")).toBe("10.20 km");
  });
});

describe("workoutCardModel", () => {
  const base = { workoutName: "W" };
  it("running: distance is the hero, time/pace/HR follow", () => {
    const m = workoutCardModel({ ...base, workoutType: "running", distance: 10.2, elapsedTime: 3120, avgPace: 306, avgHeartRate: 152 }, labels, "pt-BR");
    expect(m.hero).toMatchObject({ value: "10,20", unit: "km" });
    expect(m.secondary.map((s) => s.key)).toEqual(["time", "pace", "hr"]);
    expect(m.secondary[1]).toMatchObject({ value: "5:06", unit: "/km" });
  });

  it("swimming in metres (also legacy km) with pace per 100 m", () => {
    const m = workoutCardModel({ ...base, workoutType: "swimming", distance: 1.5, elapsedTime: 1425, avgPace: 95 }, labels, "en");
    expect(m.hero).toMatchObject({ value: "1,500", unit: "m" });
    expect(m.secondary[1]).toMatchObject({ value: "1:35", unit: "/100m" });
  });

  it("strength: time hero, sets and total load as secondaries", () => {
    const m = workoutCardModel({ ...base, workoutType: "strength", elapsedTime: 1569, volumeKg: 504, workingSets: 12, totalSets: 15 }, labels, "pt-BR");
    expect(m.hero).toMatchObject({ key: "time", value: "26:09" });
    expect(m.secondary.map((s) => s.key)).toEqual(["sets", "volume"]);
    expect(m.secondary[1]).toMatchObject({ value: "504", unit: "kg" });
  });

  it("strength without time: sets become the hero, missing blocks disappear", () => {
    const m = workoutCardModel({ ...base, workoutType: "strength", volumeKg: 4310.4, workingSets: 13, totalSets: 14 }, labels, "pt-BR");
    expect(m.hero).toMatchObject({ key: "sets", value: "13/14" });
    expect(m.secondary).toEqual([{ key: "volume", label: "Volume", value: "4.310", unit: "kg" }]);
  });

  it("falls back to time as the hero when there is no distance", () => {
    const m = workoutCardModel({ ...base, workoutType: "cycling", elapsedTime: 4800 }, labels, "en");
    expect(m.hero).toMatchObject({ key: "time", value: "1:20:00" });
    expect(m.secondary).toEqual([]);
  });
});
