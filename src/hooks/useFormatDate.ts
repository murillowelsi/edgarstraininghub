import { useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate, type DateStyle } from "@/lib/dates";

/** `formatDate` bound to the active language: `const fmt = useFormatDate(); fmt(date, "short")`. */
export const useFormatDate = () => {
  const { language } = useLanguage();
  return useCallback((date: Date | number, style: DateStyle) => formatDate(date, style, language), [language]);
};
