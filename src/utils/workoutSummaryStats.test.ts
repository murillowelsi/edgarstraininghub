import { describe, expect, it } from "vitest";
import { summaryStats } from "./workoutSummaryStats";

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
