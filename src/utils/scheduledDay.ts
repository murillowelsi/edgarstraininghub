import { format } from "date-fns";
import type { Timestamp } from "firebase/firestore";

/**
 * A workout's scheduled date is a calendar day ("YYYY-MM-DD"), not an instant
 * in time. Persisting it as a Timestamp made the day shift for viewers in
 * other timezones (e.g. an athlete in Brazil saw the workout a day early).
 *
 * The `scheduledDay` string is the source of truth. Legacy documents that only
 * have the `scheduledDate` Timestamp were created at local midnight in the
 * coach's timezone, so we recover the intended day by reading the Timestamp
 * in that timezone.
 */
export const LEGACY_COACH_TIMEZONE = "Europe/Amsterdam";

// en-CA formats dates as YYYY-MM-DD
const legacyDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LEGACY_COACH_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Local calendar day of a Date as "YYYY-MM-DD". */
export const toDayString = (date: Date): string => format(date, "yyyy-MM-dd");

/** "YYYY-MM-DD" → Date at local midnight, so date-fns day comparisons work in the viewer's timezone. */
export const dayStringToLocalDate = (day: string): Date => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Intended calendar day of a legacy Timestamp (created at midnight in the coach's timezone). */
export const legacyTimestampToDayString = (date: Date): string =>
  legacyDayFormatter.format(date);

/**
 * Resolve a Firestore document's scheduled day to a Date at the viewer's
 * local midnight. Prefers the timezone-safe `scheduledDay` string; falls back
 * to reinterpreting the legacy Timestamp.
 */
export const resolveScheduledDate = (
  scheduledDay: string | undefined,
  scheduledDate: Timestamp | null | undefined
): Date => {
  if (scheduledDay) return dayStringToLocalDate(scheduledDay);
  if (scheduledDate) {
    return dayStringToLocalDate(legacyTimestampToDayString(scheduledDate.toDate()));
  }
  return dayStringToLocalDate(toDayString(new Date()));
};
