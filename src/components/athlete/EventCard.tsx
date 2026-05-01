import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AthleteEvent } from "@/types/athleteEvent";
import { differenceInCalendarDays, differenceInWeeks, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Flag, Target, Trophy, Sparkles, ChevronRight } from "lucide-react";

interface Props {
  event: AthleteEvent;
  onClick?: () => void;
  compact?: boolean;
}

const typeIcon = {
  race: Flag,
  test: Target,
  milestone: Trophy,
  other: Sparkles,
} as const;

const EventCard = ({ event, onClick, compact }: Props) => {
  const { t, language } = useLanguage();
  const te = t.athlete.events;
  const Icon = typeIcon[event.type];
  const days = differenceInCalendarDays(event.eventDate, new Date());
  const weeks = differenceInWeeks(event.eventDate, new Date());
  const dateLocale = language === "pt" ? ptBR : undefined;

  const countdown = (() => {
    if (days < 0) return te.countdown.past;
    if (days === 0) return te.countdown.today;
    if (days === 1) return te.countdown.tomorrow;
    if (days < 14) return te.countdown.days.replace("{{count}}", String(days));
    return te.countdown.weeks.replace("{{count}}", String(weeks));
  })();

  const monthLabel = format(event.eventDate, "MMM", { locale: dateLocale }).toUpperCase().replace(".", "");
  const day = event.eventDate.getDate();
  const isPast = days < 0;
  const goalsText = te.goalsCount
    .replace("{{done}}", String(event.goals.filter((g) => g.achieved).length))
    .replace("{{total}}", String(event.goals.length));

  return (
    <Card
      onClick={onClick}
      className={cn(
        "overflow-hidden border-border/50 transition-all duration-300 cursor-pointer",
        "hover:shadow-lg hover:border-primary/30",
        compact && "shadow-sm"
      )}
    >
      <div className="flex">
        <div
          className={cn(
            "flex flex-col items-center justify-center px-4 py-3 shrink-0 text-primary-foreground",
            "bg-gradient-to-br from-primary to-primary/80 relative",
            isPast && "from-muted to-muted/70 text-muted-foreground"
          )}
          style={{ minWidth: 72 }}
        >
          <span className="text-[10px] font-bold tracking-widest opacity-90">{monthLabel}</span>
          <span className="font-display text-3xl font-extrabold leading-none">{day}</span>
          <Icon className="h-3.5 w-3.5 mt-1 opacity-80" />
        </div>

        <div className="flex-1 p-3 min-w-0 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-bold text-base leading-tight truncate">{event.title}</h3>
            <p className={cn(
              "text-xs font-bold tracking-wide uppercase mt-1",
              isPast ? "text-muted-foreground" : "text-primary"
            )}>
              {countdown}
            </p>
            {event.goals.length > 0 && !compact && (
              <p className="text-xs text-muted-foreground mt-1.5 truncate">{goalsText}</p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </div>
    </Card>
  );
};

export default EventCard;
