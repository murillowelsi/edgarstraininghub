import { formatDate, type DateLanguage } from "@/lib/dates";

/**
 * One time format for posts, comments and activity: "now", "5m", "2h", "3d"
 * within a week, then a short date ("12 Oct" / "12 out", with the year when
 * it isn't this year).
 */
export const relativeTime = (date: Date, language: DateLanguage, nowLabel: string, now = new Date()): string => {
  const value = formatDate(date, "relative", language, now);
  return now.getTime() - date.getTime() < 60_000 ? nowLabel : value;
};

/** Full date and time, for the title tooltip / screen readers. */
export const fullDateTime = (date: Date, language: DateLanguage): string => formatDate(date, "dateTimeLong", language);
