import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  distanceInKm,
  formatDistance,
  pacePer100m,
  pacePerKm,
  swimDistanceMeters,
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

  // Swimming distance is stored in metres (ActivityData.distance)
  it("shows a swim stored in metres as metres", () => {
    expect(formatDistance(1500, "swimming")).toBe("1500 m");
    expect(formatDistance(25, "swimming")).toBe("25 m");
  });

  it("reads old swims saved in km (under 25) as km", () => {
    expect(formatDistance(1.5, "swimming")).toBe("1500 m");
    expect(formatDistance(3.8, "swimming")).toBe("3800 m");
  });
});

describe("swimDistanceMeters / distanceInKm", () => {
  it("keeps metres and converts legacy km", () => {
    expect(swimDistanceMeters(1500)).toBe(1500);
    expect(swimDistanceMeters(25)).toBe(25);
    expect(swimDistanceMeters(1.5)).toBe(1500);
    expect(swimDistanceMeters(0.75)).toBe(750);
    expect(swimDistanceMeters(undefined)).toBeUndefined();
    expect(swimDistanceMeters(null)).toBeUndefined();
  });

  it("gives km for any sport", () => {
    expect(distanceInKm(1500, "swimming")).toBe(1.5);
    expect(distanceInKm(1.5, "swimming")).toBe(1.5);
    expect(distanceInKm(10.2, "running")).toBe(10.2);
    expect(distanceInKm(38.5, "cycling")).toBe(38.5);
    expect(distanceInKm(undefined, "running")).toBe(0);
  });
});

describe("pacePer100m / pacePerKm", () => {
  it("swim pace per 100 m from metres", () => {
    expect(pacePer100m(1425, 1500)).toBe(95); // 23:45 for 1500 m = 1:35 /100m
    expect(pacePer100m(120, 100)).toBe(120);
    expect(formatPace(pacePer100m(1425, 1500), "swimming")).toBe("1:35 /100m");
  });

  it("run pace per km from km", () => {
    expect(pacePerKm(3120, 10.2)).toBeCloseTo(305.88, 2);
    expect(formatPace(pacePerKm(3060, 10), "running")).toBe("5:06 /km");
  });

  it("is undefined without time or distance", () => {
    expect(pacePer100m(0, 1500)).toBeUndefined();
    expect(pacePer100m(1425, 0)).toBeUndefined();
    expect(pacePerKm(3000, Number.NaN)).toBeUndefined();
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

  it("swimming: metres, time, pace per 100 m (new and legacy records)", () => {
    const expected = { primary: "1500 m", secondary: "23:45", tertiary: "1:35 /100m" };
    expect(getActivityHeadline("swimming", { distance: 1500, elapsedTime: 1425, avgPace: 95 })).toEqual(expected);
    expect(getActivityHeadline("swimming", { distance: 1.5, elapsedTime: 1425, avgPace: 95 })).toEqual(expected);
  });

  it("works without data", () => {
    expect(getActivityHeadline("running")).toEqual({ primary: "—", secondary: "—", tertiary: "—" });
  });
});
