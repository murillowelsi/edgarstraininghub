import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import {
  dayStringToLocalDate,
  legacyTimestampToDayString,
  resolveScheduledDate,
  toDayString,
} from "./scheduledDay";

// vitest.config.ts pins TZ=America/Sao_Paulo (UTC-3), a viewer timezone
// different from the legacy coach timezone (Europe/Amsterdam).
describe("scheduledDay", () => {
  it("runs in the pinned test timezone", () => {
    expect(new Date(2026, 0, 15).getTimezoneOffset()).toBe(180);
  });

  it("toDayString formats the local calendar day", () => {
    expect(toDayString(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(toDayString(new Date(2026, 11, 31, 0, 0))).toBe("2026-12-31");
  });

  it("dayStringToLocalDate returns local midnight of that day", () => {
    const d = dayStringToLocalDate("2026-03-09");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 2, 9, 0, 0]);
  });

  it("toDayString and dayStringToLocalDate round-trip", () => {
    for (const day of ["2026-01-01", "2026-02-28", "2028-02-29", "2026-10-25", "2026-12-31"]) {
      expect(toDayString(dayStringToLocalDate(day))).toBe(day);
    }
  });

  it("legacyTimestampToDayString reads the instant in the coach timezone (Amsterdam)", () => {
    // Midnight 10 Nov in Amsterdam (UTC+1) is 9 Nov 23:00 UTC and 9 Nov 20:00 in São Paulo.
    const amsterdamMidnight = new Date(Date.UTC(2026, 10, 9, 23, 0));
    expect(legacyTimestampToDayString(amsterdamMidnight)).toBe("2026-11-10");
    // Viewer-local day would be wrong here — the bug the helper exists for.
    expect(toDayString(amsterdamMidnight)).toBe("2026-11-09");
  });

  it("legacyTimestampToDayString handles Amsterdam summer time (UTC+2)", () => {
    const amsterdamMidnight = new Date(Date.UTC(2026, 6, 14, 22, 0)); // 15 Jul 00:00 CEST
    expect(legacyTimestampToDayString(amsterdamMidnight)).toBe("2026-07-15");
  });

  it("resolveScheduledDate prefers the scheduledDay string over the Timestamp", () => {
    const ts = Timestamp.fromDate(new Date(Date.UTC(2026, 0, 1, 12)));
    expect(toDayString(resolveScheduledDate("2026-05-20", ts))).toBe("2026-05-20");
  });

  it("resolveScheduledDate falls back to the legacy Timestamp in the coach timezone", () => {
    const ts = Timestamp.fromDate(new Date(Date.UTC(2026, 10, 9, 23, 0)));
    const d = resolveScheduledDate(undefined, ts);
    expect(toDayString(d)).toBe("2026-11-10");
    expect(d.getHours()).toBe(0);
  });

  it("resolveScheduledDate falls back to today when there is no date at all", () => {
    expect(toDayString(resolveScheduledDate(undefined, null))).toBe(toDayString(new Date()));
  });
});
