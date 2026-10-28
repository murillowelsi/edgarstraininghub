import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

const localeFor = (language: string) => (language === "pt" ? { locale: ptBR } : undefined);

/** Conversation list: "14:05" today, "Yesterday", else "18 Oct" / "18 out" */
export const formatChatTime = (date: Date, language: string, yesterday: string) => {
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return yesterday;
    return format(date, "d MMM", localeFor(language));
};

/** Day separator inside a conversation: "Today", "Yesterday", else "18 Oct" / "18 out" */
export const formatChatDay = (date: Date, language: string, labels: { today: string; yesterday: string }) => {
    if (isToday(date)) return labels.today;
    if (isYesterday(date)) return labels.yesterday;
    return format(date, "d MMM", localeFor(language));
};
