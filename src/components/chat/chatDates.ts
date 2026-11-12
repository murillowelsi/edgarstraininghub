import { isToday, isYesterday } from "date-fns";
import { formatDate, type DateLanguage } from "@/lib/dates";

/** Conversation list: "14:05" today, "Yesterday", else "18 Oct" / "18 out" */
export const formatChatTime = (date: Date, language: DateLanguage, yesterday: string) => {
    if (isToday(date)) return formatDate(date, "time", language);
    if (isYesterday(date)) return yesterday;
    return formatDate(date, "short", language);
};

/** Day separator inside a conversation: "Today", "Yesterday", else "18 Oct" / "18 out" */
export const formatChatDay = (date: Date, language: DateLanguage, labels: { today: string; yesterday: string }) => {
    if (isToday(date)) return labels.today;
    if (isYesterday(date)) return labels.yesterday;
    return formatDate(date, "short", language);
};
