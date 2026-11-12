import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDate } from "./dates";

// Fixed "now" so "this year" and relative times are stable
const NOW = new Date(2026, 10, 12, 18, 0); // 12 Nov 2026, 18:00 local
const d = new Date(2026, 8, 21, 14, 5); // Monday 21 Sep 2026, 14:05

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("formatDate", () => {
  it.each([
    ["short", "21 set", "21 Sep"],
    ["long", "21 de setembro de 2026", "21 September 2026"],
    ["weekday", "segunda-feira, 21 set", "Monday, 21 Sep"],
    ["weekdayLong", "segunda-feira, 21 de setembro", "Monday, 21 September"],
    ["weekdayShort", "seg, 21 set", "Mon, 21 Sep"],
    ["dayName", "segunda-feira", "Monday"],
    ["dayNameShort", "seg", "Mon"],
    ["monthYear", "setembro 2026", "September 2026"],
    ["month", "set", "Sep"],
    ["time", "14:05", "14:05"],
    ["dateTime", "21 set, 14:05", "21 Sep, 14:05"],
  ] as const)("%s", (style, pt, en) => {
    expect(formatDate(d, style, "pt")).toBe(pt);
    expect(formatDate(d, style, "en")).toBe(en);
  });

  it("adds the year only when it is not the current one", () => {
    const old = new Date(2025, 8, 21, 9, 0);
    expect(formatDate(old, "short", "en")).toBe("21 Sep 2025");
    expect(formatDate(old, "dateTime", "pt")).toBe("21 set 2025, 09:00");
  });

  it("relative: now, minutes, hours, days, then a short date", () => {
    const ago = (ms: number) => new Date(NOW.getTime() - ms);
    expect(formatDate(ago(10_000), "relative", "pt")).toBe("agora");
    expect(formatDate(ago(10_000), "relative", "en")).toBe("now");
    expect(formatDate(ago(5 * 60_000), "relative", "en")).toBe("5m");
    expect(formatDate(ago(3 * 3_600_000), "relative", "en")).toBe("3h");
    expect(formatDate(ago(2 * 86_400_000), "relative", "en")).toBe("2d");
    expect(formatDate(ago(30 * 86_400_000), "relative", "pt")).toBe("13 out");
  });

  it("accepts a timestamp in ms", () => {
    expect(formatDate(d.getTime(), "short", "en")).toBe("21 Sep");
  });
});
