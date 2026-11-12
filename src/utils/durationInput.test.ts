import { describe, expect, it } from "vitest";
import { formatDuration, nextDurationInput, normalizeDurationInput, parseDuration, sanitizeDurationInput } from "./durationInput";

describe("parseDuration", () => {
  it("accepts h:mm:ss with or without the leading zero", () => {
    expect(parseDuration("1:00:00")).toBe(3600);
    expect(parseDuration("01:00:00")).toBe(3600);
    expect(parseDuration("1:02:05")).toBe(3725);
    expect(parseDuration("10:00:00")).toBe(36000);
  });

  it("accepts m:ss and mm:ss", () => {
    expect(parseDuration("45:30")).toBe(2730);
    expect(parseDuration("5:07")).toBe(307);
    expect(parseDuration("05:07")).toBe(307);
    expect(parseDuration("90:00")).toBe(5400);
    expect(parseDuration(" 23:45 ")).toBe(1425);
  });

  it("rejects ambiguous or impossible values", () => {
    expect(parseDuration("")).toBeUndefined();
    expect(parseDuration("45")).toBeUndefined(); // minutes or seconds?
    expect(parseDuration("1:60:00")).toBeUndefined();
    expect(parseDuration("10:00:0x")).toBeUndefined();
    expect(parseDuration("1:5:300")).toBeUndefined();
    expect(parseDuration("1::00")).toBeUndefined();
    expect(parseDuration("1:00:00:00")).toBeUndefined();
    expect(parseDuration("0:00")).toBeUndefined();
  });

  it("the QA case: typing 1:00:00 is one hour, not ten", () => {
    const typed = sanitizeDurationInput("1:00:00");
    expect(typed).toBe("1:00:00");
    expect(parseDuration(typed)).toBe(3600);
  });
});

describe("formatting helpers", () => {
  it("formats seconds", () => {
    expect(formatDuration(3725)).toBe("1:02:05");
    expect(formatDuration(330)).toBe("5:30");
    expect(formatDuration(0)).toBe("0:00");
  });

  it("keeps only digits and up to two separators while typing", () => {
    expect(sanitizeDurationInput("1h:00m:00s")).toBe("1:00:00");
    expect(sanitizeDurationInput("1.30")).toBe("1:30");
    expect(sanitizeDurationInput("1:2:3:4")).toBe("1:2:34");
  });

  it("normalizes valid values on blur and leaves invalid ones", () => {
    expect(normalizeDurationInput("01:00:00")).toBe("1:00:00");
    expect(normalizeDurationInput("5:7")).toBe("5:07");
    expect(normalizeDurationInput("1:75")).toBe("1:75");
  });
});

describe("nextDurationInput", () => {
  const type = (keys: string) => {
    let state: { value: string; mode: "auto" | "manual" } = { value: "", mode: "auto" };
    for (const k of keys) state = nextDurationInput(state.value, state.value + k, state.mode);
    return state;
  };

  it("numeric keypad (no ':'): digits fill from the right", () => {
    expect(type("10000").value).toBe("1:00:00");
    expect(type("4530").value).toBe("45:30");
    expect(type("507").value).toBe("5:07");
    expect(parseDuration(type("10000").value)).toBe(3600);
  });

  it("typing the ':' keeps what the person wrote", () => {
    expect(type("1:00:00")).toEqual({ value: "1:00:00", mode: "manual" });
    expect(type("1:5:07").value).toBe("1:5:07");
    expect(normalizeDurationInput(type("1:5:07").value)).toBe("1:05:07");
    expect(type("01:00:00").value).toBe("01:00:00");
  });

  it("deleting in auto mode regroups, clearing resets to auto", () => {
    expect(nextDurationInput("1:00:00", "1:00:0", "auto").value).toBe("10:00");
    expect(nextDurationInput("1:5", "", "manual")).toEqual({ value: "", mode: "auto" });
  });
});
