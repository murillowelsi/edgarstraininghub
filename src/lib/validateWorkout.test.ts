import { describe, expect, it } from "vitest";
import { hasBlockingIssue, validateWorkout } from "./validateWorkout";
import { durationSeconds, formatClock, paceToText, parseClock, secondsToDuration, textToPace } from "@/utils/stageInput";
import type { WorkoutStage } from "@/types/workout";

const stage = (over: Partial<WorkoutStage>): WorkoutStage =>
  ({ id: "s", type: "interval", duration: { type: "time", value: 3, unit: "min" }, intensity: { type: "heartRateZone", value: 4 }, ...over }) as WorkoutStage;

describe("validateWorkout", () => {
  it("blocks on no name, empty block and min above max", () => {
    const issues = validateWorkout({
      name: " ",
      type: "running",
      stages: [
        { ...stage({ id: "r", type: "repeat" }), stages: [] },
        stage({ id: "p", intensity: { type: "pace", min: 5.3, max: 4.45, unit: "min/km" } }),
      ],
    });
    expect(issues.filter((i) => i.level === "error").map((i) => i.code)).toEqual(["noName", "emptyRepeat", "minAboveMax"]);
    expect(hasBlockingIssue(issues)).toBe(true);
  });

  it("only warns about a missing target or duration; easy steps need no target", () => {
    const issues = validateWorkout({
      name: "Tiros",
      type: "running",
      stages: [stage({ id: "w", type: "warmup", intensity: { type: "none" } }), stage({ id: "i", intensity: { type: "none" }, duration: { type: "time" } })],
    });
    expect(issues).toEqual([
      { code: "noDuration", level: "warning", stageId: "i" },
      { code: "noTarget", level: "warning", stageId: "i" },
    ]);
    expect(hasBlockingIssue(issues)).toBe(false);
  });

  it("accepts a pace range written fast→slow", () => {
    expect(validateWorkout({ name: "x", type: "running", stages: [stage({ intensity: { type: "pace", min: 4.3, max: 4.45 } })] })).toEqual([]);
  });
});

describe("stage input (mm:ss on screen, same stored format)", () => {
  it("reads and writes clocks", () => {
    expect(parseClock("15")).toBe(900);
    expect(parseClock("1:30")).toBe(90);
    expect(parseClock("1:02:05")).toBe(3725);
    expect(parseClock("1:75")).toBeUndefined();
    expect(formatClock(90)).toBe("1:30");
  });

  it("keeps the stage's time unit", () => {
    expect(secondsToDuration(90, "min")).toEqual({ value: 1.5, unit: "min" });
    expect(secondsToDuration(90, "sec")).toEqual({ value: 90, unit: "sec" });
    expect(durationSeconds({ type: "time", value: 1.5, unit: "min" })).toBe(90);
  });

  it("keeps pace as the m.ss decimal", () => {
    expect(textToPace("4:30")).toBe(4.3);
    expect(textToPace("4:05")).toBe(4.05);
    expect(paceToText(4.45)).toBe("4:45");
    expect(textToPace("4:75")).toBeUndefined();
  });
});
