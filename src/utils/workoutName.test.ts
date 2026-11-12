import { describe, expect, it } from "vitest";
import { normalizeWorkoutName } from "./workoutName";

describe("normalizeWorkoutName", () => {
  it("removes spaces just inside brackets and extra spaces", () => {
    expect(normalizeWorkoutName("Running Workout ( 6km Zone 1/2 )")).toBe("Running Workout (6 km Zone 1/2)");
    expect(normalizeWorkoutName("  Treino   leve  ")).toBe("Treino leve");
  });

  it("adds a space before an opening bracket", () => {
    expect(normalizeWorkoutName("Rodagem(Z2)")).toBe("Rodagem (Z2)");
  });

  it("spaces kilometres and capitalises the first letter", () => {
    expect(normalizeWorkoutName("longão 21,1km")).toBe("Longão 21,1 km");
  });

  it("keeps the rest of the wording as typed", () => {
    expect(normalizeWorkoutName("5 x (6' + 1')")).toBe("5 x (6' + 1')");
    expect(normalizeWorkoutName("Força A: membros inferiores")).toBe("Força A: membros inferiores");
    expect(normalizeWorkoutName("")).toBe("");
  });
});
