import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatDistance,
  formatHeartRate,
  formatPace,
  formatSpeed,
  formatTime,
  formatTimeShort,
  getActivityHeadline,
} from "./activityFormat";

// formatDecimal reads <html lang>; tests run in node, so stub just that.
const setLang = (lang: string) => vi.stubGlobal("document", { documentElement: { lang } });

beforeEach(() => setLang("en"));
afterEach(() => vi.unstubAllGlobals());

describe("formatTime / formatTimeShort", () => {
  it("shows a dash only for missing values, not for zero", () => {
    expect(formatTime(undefined)).toBe("—");
    expect(formatTime(null)).toBe("—");
    expect(formatTime(0)).toBe("0min 00s");
    expect(formatTimeShort(0)).toBe("0:00");
  });

  it("formats minutes and hours", () => {
    expect(formatTime(3120)).toBe("52min 00s");
    expect(formatTime(3725)).toBe("1h 2min");
    expect(formatTimeShort(3120)).toBe("52:00");
    expect(formatTimeShort(3725)).toBe("1:02:05");
  });
});

describe("formatDistance", () => {
  it("shows km with two decimals in the app language", () => {
    expect(formatDistance(10.2, "running")).toBe("10.20 km");
    setLang("pt");
    expect(formatDistance(10.2, "running")).toBe("10,20 km");
  });

  it("shows a dash when missing", () => {
    expect(formatDistance(undefined)).toBe("—");
    expect(formatDistance(null, "swimming")).toBe("—");
  });

  // KNOWN BUG (reported to EZ Lead): swimming distance is stored in metres
  // (ActivityData.distance: "m for swimming"; WorkoutView shows `${distance}m`
  // and derives pace as time / (distance / 100)), but formatDistance multiplies
  // by 1000, so ActivityDetail would show a 1500 m swim as "1500000 m".
  // `it.fails` keeps `npm test` green while the bug exists and turns red when
  // it is fixed — then change it to a plain `it`.
  it.fails("shows a swim stored in metres as metres", () => {
    expect(formatDistance(1500, "swimming")).toBe("1500 m");
  });
});

describe("formatPace / formatSpeed / formatHeartRate", () => {
  it("formats pace per km and per 100 m", () => {
    expect(formatPace(306, "running")).toBe("5:06 /km");
    expect(formatPace(95, "swimming")).toBe("1:35 /100m");
    expect(formatPace(0)).toBe("—");
  });

  it("formats speed and heart rate", () => {
    expect(formatSpeed(28.94)).toBe("28.9 km/h");
    expect(formatSpeed(undefined)).toBe("—");
    expect(formatHeartRate(151.6)).toBe("152 bpm");
    expect(formatHeartRate(0)).toBe("—");
  });
});

describe("getActivityHeadline", () => {
  it("running: distance, pace, time", () => {
    expect(getActivityHeadline("running", { distance: 10.2, avgPace: 306, elapsedTime: 3120 })).toEqual({
      primary: "10.20 km",
      secondary: "5:06 /km",
      tertiary: "52:00",
    });
  });

  it("cycling: distance, time, speed", () => {
    expect(getActivityHeadline("cycling", { distance: 38.5, elapsedTime: 4800, avgSpeed: 28.9 })).toEqual({
      primary: "38.50 km",
      secondary: "1:20:00",
      tertiary: "28.9 km/h",
    });
  });

  it("works without data", () => {
    expect(getActivityHeadline("running")).toEqual({ primary: "—", secondary: "—", tertiary: "—" });
  });
});
