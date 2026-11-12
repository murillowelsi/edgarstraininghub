import { describe, expect, it } from "vitest";
import { vizModel } from "./vizModel";

const base = { workoutName: "W" };
const intervals = [
  { label: "Aquecimento", type: "regular" as const, time: 900 },
  { label: "Repetir 5×", type: "repeat" as const, nestedLabels: ["Tiro", "Recuperação"], reps: [200, 202, 198, 206, 209].map((t) => ({ times: [t, 90] })) },
  { label: "Desaquecimento", type: "regular" as const, time: 600 },
];

describe("vizModel", () => {
  it("running intervals: one bar per rep and the best time", () => {
    expect(vizModel({ ...base, workoutType: "running", stageTimes: intervals })).toEqual({
      kind: "reps",
      values: [200, 202, 198, 206, 209],
      best: 198,
    });
  });

  it("cycling without reps: proportional stages", () => {
    const m = vizModel({ ...base, workoutType: "cycling", stageTimes: [intervals[0], intervals[2]] });
    expect(m).toEqual({ kind: "stages", segments: [{ label: "Aquecimento", seconds: 900 }, { label: "Desaquecimento", seconds: 600 }] });
  });

  it("swimming: light, main and drill lanes", () => {
    const m = vizModel({
      ...base,
      workoutType: "swimming",
      stageTimes: [
        { label: "Aquecimento", type: "regular", time: 330 },
        { label: "Educativo", type: "regular", time: 200 },
        { label: "Repetir 3×", type: "repeat", nestedLabels: ["Natação"], reps: [{ times: [96] }, { times: [95] }, { times: [94] }] },
      ],
    });
    expect(m).toEqual({ kind: "lanes", blocks: ["light", "drill", "main", "main", "main"] });
  });

  it("strength: done vs planned sets", () => {
    expect(vizModel({ ...base, workoutType: "strength", workingSets: 6, totalSets: 10 })).toEqual({ kind: "sets", done: 6, total: 10 });
  });

  it("no data, no chart", () => {
    expect(vizModel({ ...base, workoutType: "running" })).toBeNull();
    expect(vizModel({ ...base, workoutType: "strength" })).toBeNull();
    expect(vizModel({ ...base, workoutType: "cycling", stageTimes: [intervals[0]] })).toBeNull();
  });
});
