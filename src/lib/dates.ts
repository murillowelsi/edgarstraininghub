import { format, formatDistanceToNowStrict, isThisYear, type Locale } from "date-fns";
import { enGB, ptBR } from "date-fns/locale";

export type DateLanguage = "pt" | "en";

/**
 * One set of date formats for the whole app. Day first in both languages
 * (the coach is UK based), short month names, the year only when it is not
 * the current one.
 *
 *  style          pt                              en
 *  short          19 out (2025)                   19 Oct (2025)
 *  long           19 de outubro de 2026           19 October 2026
 *  weekday        segunda-feira, 19 out           Monday, 19 Oct
 *  weekdayLong    segunda-feira, 19 de outubro    Monday, 19 October
 *  weekdayShort   seg, 19 out                     Mon, 19 Oct
 *  dayName        segunda-feira                   Monday
 *  dayNameShort   seg                             Mon
 *  monthYear      outubro 2026                    October 2026
 *  monthYearShort out 2026                        Oct 2026
 *  month          out                             Oct
 *  time           14:05                           14:05
 *  dateTime       19 out, 14:05 (2025)            19 Oct, 14:05 (2025)
 *  dateTimeLong   19 de outubro de 2026 às 14:05  19 October 2026 at 14:05
 *  relative       agora, 5m, 2h, 3d, then "short"
 *  relativeLong   agora, há 5 minutos, há 2 horas, há 6 dias, then "short"
 */
export type DateStyle =
  | "short"
  | "long"
  | "weekday"
  | "weekdayLong"
  | "weekdayShort"
  | "dayName"
  | "dayNameShort"
  | "monthYear"
  | "monthYearShort"
  | "month"
  | "time"
  | "dateTime"
  | "dateTimeLong"
  | "relative"
  | "relativeLong";

export const dateLocale = (language: DateLanguage): Locale => (language === "pt" ? ptBR : enGB);

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const nowLabels: Record<DateLanguage, string> = { pt: "agora", en: "now" };
const justNowLabels: Record<DateLanguage, string> = { pt: "agora", en: "just now" };

const pattern = (style: Exclude<DateStyle, "relative" | "relativeLong">, date: Date, language: DateLanguage): string => {
  const year = isThisYear(date) ? "" : " yyyy";
  const pt = language === "pt";
  switch (style) {
    case "short":
      return `d MMM${year}`;
    case "long":
      return "PPP";
    case "weekday":
      return "EEEE, d MMM";
    case "weekdayLong":
      return pt ? "EEEE, d 'de' MMMM" : "EEEE, d MMMM";
    case "weekdayShort":
      return pt ? "EEEEEE, d MMM" : "EEE, d MMM";
    case "dayName":
      return "EEEE";
    case "dayNameShort":
      return pt ? "EEEEEE" : "EEE";
    case "monthYear":
      return "LLLL yyyy";
    case "monthYearShort":
      return "LLL yyyy";
    case "month":
      return "LLL";
    case "time":
      return "HH:mm";
    case "dateTime":
      return `d MMM${year}, HH:mm`;
    case "dateTimeLong":
      return "PPPp";
  }
};

/** Formats a date in the given language. Prefer `useFormatDate()` in components. */
export const formatDate = (
  date: Date | number,
  style: DateStyle,
  language: DateLanguage,
  now: Date = new Date()
): string => {
  const d = typeof date === "number" ? new Date(date) : date;
  if (style === "relative") {
    const diff = Math.max(0, now.getTime() - d.getTime());
    if (diff < MINUTE) return nowLabels[language];
    if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
    if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
    if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d`;
    return formatDate(d, "short", language);
  }
  if (style === "relativeLong") {
    const diff = Math.max(0, now.getTime() - d.getTime());
    if (diff < MINUTE) return justNowLabels[language];
    if (diff < 7 * DAY) {
      return formatDistanceToNowStrict(d, { addSuffix: true, locale: dateLocale(language), roundingMethod: "floor" });
    }
    return formatDate(d, "short", language);
  }
  // pt-BR abbreviations sometimes end with a dot ("set."); drop it for a cleaner UI
  return format(d, pattern(style, d, language), { locale: dateLocale(language) }).replace(/\.(?=[\s,]|$)/g, "");
};
