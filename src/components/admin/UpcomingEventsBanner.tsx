import { useEffect, useState } from "react";
import { differenceInCalendarDays, differenceInWeeks, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Flag, Sparkles, Target, Trophy, ChevronRight } from "lucide-react";
import { getAllEvents } from "@/services/athleteEventsService";
import { getUserById } from "@/services/usersService";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AthleteEvent, AthleteEventType } from "@/types/athleteEvent";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const typeIcon: Record<AthleteEventType, React.ElementType> = {
  race: Flag,
  test: Target,
  milestone: Trophy,
  other: Sparkles,
};

interface EventWithAthlete extends AthleteEvent {
  athleteName: string;
}

const UpcomingEventsBanner = ({ athleteIdFilter }: { athleteIdFilter?: string }) => {
  const { t, language } = useLanguage();
  const [events, setEvents] = useState<EventWithAthlete[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await getAllEvents();
        const upcoming = all.filter((e) => differenceInCalendarDays(e.eventDate, new Date()) >= 0).slice(0, 12);
        const enriched = await Promise.all(
          upcoming.map(async (e) => ({
            ...e,
            athleteName: (await getUserById(e.athleteId))?.displayName || "Athlete",
          }))
        );
        if (!cancelled) setEvents(enriched);
      } catch (err) {
        console.warn("Failed to load events for admin banner:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = athleteIdFilter && athleteIdFilter !== "all"
    ? events.filter((e) => e.athleteId === athleteIdFilter)
    : events;

  if (loading || filtered.length === 0) return null;

  const dateLocale = language === "pt" ? ptBR : undefined;

  return (
    <div className="px-4 pt-3 pb-2">
      <div className="flex items-center gap-2 mb-2">
        <Target className="h-4 w-4 text-primary" />
        <h3 className="font-display font-bold text-sm">{t.admin.calendar.upcomingAthleteEvents}</h3>
        <span className="text-xs text-muted-foreground">({filtered.length})</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {filtered.map((e) => {
          const days = differenceInCalendarDays(e.eventDate, new Date());
          const weeks = differenceInWeeks(e.eventDate, new Date());
          const Icon = typeIcon[e.type];
          const cd = t.athlete.events.countdown;
          const countdown =
            days === 0
              ? cd.today
              : days === 1
              ? cd.tomorrow
              : days < 14
              ? cd.daysShort.replace("{{count}}", String(days))
              : cd.weeksShort.replace("{{count}}", String(weeks));
          const isClose = days <= 7;

          return (
            <Card
              key={e.id}
              className={cn(
                "shrink-0 min-w-[240px] p-3 border-border/50 transition-all",
                isClose && "border-primary/40 shadow-md ring-1 ring-primary/20"
              )}
            >
              <div className="flex items-start gap-2">
                <div
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg px-2 py-1 shrink-0",
                    isClose
                      ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                  style={{ minWidth: 44 }}
                >
                  <span className="text-[9px] font-bold tracking-widest">
                    {format(e.eventDate, "MMM", { locale: dateLocale }).toUpperCase().replace(".", "")}
                  </span>
                  <span className="font-display text-xl font-extrabold leading-none">
                    {e.eventDate.getDate()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate flex items-center gap-1">
                    <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                    {e.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{e.athleteName}</p>
                  <p className={cn(
                    "text-[11px] font-bold tracking-wide uppercase mt-1",
                    isClose ? "text-primary" : "text-muted-foreground"
                  )}>
                    {countdown}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default UpcomingEventsBanner;
