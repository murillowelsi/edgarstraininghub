import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * One time format for posts, comments and activity: "now", "5m", "2h", "3d"
 * within a week, then a short date ("12 Oct" / "12 out", with the year when
 * it isn't this year).
 */
export const relativeTime = (date: Date, language: string, nowLabel: string, now = new Date()): string => {
  const diff = Math.max(0, now.getTime() - date.getTime());
  if (diff < MINUTE) return nowLabel;
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d`;
  const pattern = date.getFullYear() === now.getFullYear() ? "d MMM" : "d MMM yyyy";
  return format(date, pattern, language === "pt" ? { locale: ptBR } : {}).replace(".", "");
};

/** Full date and time, for the title tooltip / screen readers. */
export const fullDateTime = (date: Date, language: string): string =>
  format(date, "PPp", language === "pt" ? { locale: ptBR } : {});
