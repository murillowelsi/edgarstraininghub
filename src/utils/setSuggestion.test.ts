import { describe, expect, it } from "vitest";
import { expectsLoad, suggestSet } from "./setSuggestion";

describe("suggestSet", () => {
  it("uses the coach target when there is no history (never '0')", () => {
    expect(suggestSet({ targetReps: "8", targetWeight: "45" })).toEqual({ reps: "8", weight: "45", fromHistory: false });
  });

  it("prefers the athlete's last session over the coach target", () => {
    expect(suggestSet({ history: { reps: "8", weight: "47,5" }, targetReps: "8", targetWeight: "45" })).toEqual({
      reps: "8",
      weight: "47,5",
      fromHistory: true,
    });
  });

  it("carries a load used earlier today over last session's", () => {
    expect(suggestSet({ earlier: { reps: "8", weight: "50" }, history: { reps: "6", weight: "47,5" }, targetReps: "8" })).toMatchObject({
      reps: "6",
      weight: "50",
      fromHistory: false,
    });
  });

  it("treats '0', empty and free text as no load", () => {
    expect(suggestSet({ history: { reps: "10", weight: "0" }, targetReps: "10", targetWeight: "peso corporal" })?.weight).toBe("");
    expect(suggestSet({ earlier: { reps: "8", weight: "" }, targetReps: "8", targetWeight: "45" })?.weight).toBe("45");
  });

  it("returns null when there is nothing to suggest", () => {
    expect(suggestSet({ targetReps: "" })).toBeNull();
  });
});

describe("expectsLoad", () => {
  it("is true when the coach or the history has a real load", () => {
    expect(expectsLoad({ targetWeight: "45" })).toBe(true);
    expect(expectsLoad({ history: { reps: "10", weight: "0" }, targetWeight: "peso corporal" })).toBe(false);
  });
});
