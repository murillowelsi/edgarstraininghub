import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import LogExtraWorkoutSheet from "@/components/athlete/LogExtraWorkoutSheet";
import { WeekStrip } from "@/components/athlete/WeekStrip";
import { MonthGrid } from "@/components/athlete/MonthGrid";
import { SportIcon } from "@/components/icons/sport-icons";
import { sportKey } from "@/components/timeline/sport";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dates";
import { getAssignmentsWithWorkoutsByAthlete } from "@/services/workoutAssignmentsService";
import { subscribeToEventsByAthlete } from "@/services/athleteEventsService";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import type { AthleteEvent } from "@/types/athleteEvent";
import {
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  isSameWeek,
  isToday,
  isValid,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Flag, Play, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarSkeleton } from "@/components/feedback/skeletons";
import { assignmentStatus, monthDone, monthGrid, weekSummary, type AssignmentStatus } from "@/utils/homePlan";
import { actualDurationSec } from "@/utils/workoutDuration";
import { formatTotalTime } from "@/hooks/useAthleteStats";

type View = "week" | "month";

const STATUS_CLASS: Record<AssignmentStatus, string> = {
  done: "text-success-ink",
  partial: "text-warning-ink",
  missed: "text-destructive-ink",
  planned: "text-muted-foreground",
  extra: "text-muted-foreground",
};

/**
 * Athlete calendar (docs/design/athlete-calendar): Week by default (the Home's
 * WeekStrip + the chosen day + the rest of the week, no empty rows), Month as a
 * grid. Two questions: what do I have, what did I do or miss.
 */
const AthleteCalendarView = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const tc = t.athlete.calendar;
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<AssignmentWithWorkout[]>([]);
  const [events, setEvents] = useState<AthleteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [extraDate, setExtraDate] = useState<Date | null>(null);

  // ?d=yyyy-MM-dd (from the Home week strip) picks the day; ?v=month the view
  const dParam = searchParams.get("d");
  const selectedKey = (() => {
    const parsed = dParam ? parseISO(dParam) : null;
    return format(parsed && isValid(parsed) ? parsed : new Date(), "yyyy-MM-dd");
  })();
  const selected = useMemo(() => startOfDay(parseISO(selectedKey)), [selectedKey]);
  const view: View = searchParams.get("v") === "month" ? "month" : "week";

  const setState = (next: { d?: Date; v?: View }) => {
    const d = next.d ?? selected;
    const v = next.v ?? view;
    const params: Record<string, string> = {};
    if (!isToday(d)) params.d = format(d, "yyyy-MM-dd");
    if (v === "month") params.v = "month";
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        setAssignments(await getAssignmentsWithWorkoutsByAthlete(user.uid));
      } catch (error) {
        console.error("Error loading assignments:", error);
        toast({ title: t.common.error, description: t.athlete.toast.calendarLoadError, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;
    return subscribeToEventsByAthlete(user.uid, setEvents);
  }, [user]);

  const week = useMemo(() => weekSummary(assignments, new Date(), selected), [assignments, selected]);
  const month = useMemo(() => monthGrid(assignments, selected), [assignments, selected]);

  if (loading) {
    return (
      <AthletePortalLayout title={tc.title}>
        <CalendarSkeleton className="p-4" />
      </AthletePortalLayout>
    );
  }

  const now = new Date();
  const onDay = (d: Date) =>
    assignments
      .filter((a) => isSameDay(a.scheduledDate, d))
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  const racesOn = (d: Date) => events.filter((e) => isSameDay(e.eventDate, d));

  const step = (dir: 1 | -1) =>
    setState({ d: view === "week" ? addWeeks(selected, dir) : startOfDay(new Date(selected.getFullYear(), selected.getMonth() + dir, 1)) });
  const title = view === "week" ? weekTitle(selected, language) : formatDate(selected, "monthYear", language);
  const showToday = view === "week" ? !(isSameWeek(selected, now, { weekStartsOn: 1 }) && isToday(selected)) : !(isSameMonth(selected, now) && isToday(selected));

  // Week list: the chosen day first, then the other days of the week that have something
  const otherDays = week.days
    .map((d) => d.date)
    .filter((d) => !isSameDay(d, selected) && (onDay(d).length > 0 || racesOn(d).length > 0));
  const md = monthDone(assignments, selected);
  const summaryLine =
    view === "week"
      ? weekLine(week, tc)
      : md.planned > 0
      ? tc.doneOf.replace("{{done}}", String(md.done)).replace("{{planned}}", String(md.planned))
      : tc.nothingPlanned;

  return (
    <AthletePortalLayout title={tc.title}>
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        {/* View switch + back to today */}
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label={tc.title} className="grid grid-cols-2 rounded-full bg-muted p-1 text-sm font-semibold">
            {(["week", "month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setState({ v })}
                className={cn(
                  "h-9 rounded-full px-4 transition-colors",
                  view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v === "week" ? tc.viewWeek : tc.viewMonth}
              </button>
            ))}
          </div>
          {showToday && (
            <button
              type="button"
              onClick={() => setState({ d: startOfDay(new Date()) })}
              className="ml-auto h-9 rounded-full px-3 text-sm font-semibold text-primary-ink hover:bg-accent"
            >
              {tc.backToToday}
            </button>
          )}
        </div>

        {/* ‹ period › with its one-line summary */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label={view === "week" ? tc.prevWeek : tc.prevMonth}
            className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 text-center">
            <h1 className="text-base font-bold first-letter:uppercase">{title}</h1>
            <p className="text-xs text-muted-foreground tabular-nums">{summaryLine}</p>
          </div>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={view === "week" ? tc.nextWeek : tc.nextMonth}
            className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {view === "week" ? (
          <WeekStrip week={week} selected={selected} onSelectDay={(d) => setState({ d })} showHeader={false} summary={null} />
        ) : (
          <div className="rounded-[18px] border bg-card p-2">
            <MonthGrid days={month} selected={selected} onSelect={(d) => setState({ d })} raceDays={events.map((e) => e.eventDate)} />
          </div>
        )}

        {/* The chosen day */}
        <DaySection
          date={selected}
          items={onDay(selected)}
          races={racesOn(selected)}
          onLogExtra={!isAfter(selected, startOfDay(now)) ? () => setExtraDate(selected) : undefined}
        />

        {/* The rest of the week: only days with something */}
        {view === "week" && otherDays.length > 0 && (
          <section aria-labelledby="cal-week-rest" className="space-y-3 pt-1">
            <h2 id="cal-week-rest" className="px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {tc.inWeek}
            </h2>
            {otherDays.map((d) => (
              <DaySection key={d.toISOString()} date={d} items={onDay(d)} races={racesOn(d)} compact />
            ))}
          </section>
        )}
      </div>

      {user && (
        <LogExtraWorkoutSheet
          open={!!extraDate}
          onOpenChange={(open) => {
            if (!open) setExtraDate(null);
          }}
          athleteId={user.uid}
          date={extraDate ?? selected}
          assignments={assignments}
        />
      )}
    </AthletePortalLayout>
  );
};

const weekTitle = (d: Date, language: "pt" | "en") =>
  `${formatDate(startOfWeek(d, { weekStartsOn: 1 }), "short", language)} – ${formatDate(endOfWeek(d, { weekStartsOn: 1 }), "short", language)}`;

type CalendarLabels = { doneOf: string; missedOne: string; missedOther: string; nothingPlanned: string };

/** "1 de 4 feitos · 1 não feito · 58 min" */
const weekLine = (week: ReturnType<typeof weekSummary>, tc: CalendarLabels) => {
  if (week.planned === 0 && week.seconds === 0) return tc.nothingPlanned;
  const parts = [tc.doneOf.replace("{{done}}", String(week.done)).replace("{{planned}}", String(week.planned))];
  if (week.missed > 0) parts.push((week.missed === 1 ? tc.missedOne : tc.missedOther).replace("{{n}}", String(week.missed)));
  if (week.seconds > 0) parts.push(formatTotalTime(week.seconds));
  return parts.join(" · ");
};

function DaySection({
  date,
  items,
  races,
  compact = false,
  onLogExtra,
}: {
  date: Date;
  items: AssignmentWithWorkout[];
  races: AthleteEvent[];
  compact?: boolean;
  onLogExtra?: () => void;
}) {
  const { t, language } = useLanguage();
  const tc = t.athlete.calendar;
  const heading = isToday(date) ? `${tc.today} · ${formatDate(date, "weekdayShort", language)}` : formatDate(date, "weekdayShort", language);

  return (
    <section aria-label={heading} className="space-y-2">
      <h2 className={cn("px-1 first-letter:uppercase", compact ? "text-sm font-semibold" : "text-base font-bold")}>{heading}</h2>

      {races.map((race) => {
        const n = differenceInCalendarDays(race.eventDate, new Date());
        return (
          <Link
            key={race.id}
            to={`/athlete/events/${race.id}`}
            className="flex items-center gap-3 rounded-2xl border bg-card p-3 transition-colors hover:bg-accent/40"
            style={{ backgroundImage: "radial-gradient(120% 100% at 100% 0%, hsl(var(--sport-strength) / 0.16), transparent 60%)" }}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sport-strength/15 text-sport-strength">
              <Flag className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">{race.title}</span>
              <span className="block text-[13px] text-muted-foreground">
                {tc.race}
                {n === 0 ? ` · ${tc.raceToday}` : n > 0 ? ` · ${tc.daysToRace.replace("{{n}}", String(n))}` : ""}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        );
      })}

      {items.map((a) => (
        <WorkoutRow key={a.id} assignment={a} showStart={!compact} />
      ))}

      {items.length === 0 &&
        races.length === 0 &&
        (onLogExtra ? (
          <button
            type="button"
            onClick={onLogExtra}
            className="flex min-h-[52px] w-full flex-wrap items-center gap-x-2 rounded-2xl border border-dashed px-3 py-2 text-left text-sm transition-colors hover:border-primary/50"
          >
            <span className="font-semibold">{tc.freeDay}</span>
            <span aria-hidden className="text-muted-foreground">·</span>
            <span className="flex items-center gap-1 font-semibold text-primary-ink">
              <Plus className="h-4 w-4" aria-hidden />
              {t.athlete.home.logExtra}
            </span>
          </button>
        ) : (
          <p className="rounded-2xl border border-dashed px-3 py-3.5 text-sm text-muted-foreground">{tc.freeDay}</p>
        ))}

      {/* A past day with workouts can still get an extra session (today has the top-bar button) */}
      {items.length > 0 && onLogExtra && !isToday(date) && (
        <button type="button" onClick={onLogExtra} className="flex min-h-11 items-center gap-1 px-1 text-sm font-semibold text-primary-ink">
          <Plus className="h-4 w-4" aria-hidden />
          {t.athlete.home.logExtra}
        </button>
      )}
    </section>
  );
}

function WorkoutRow({ assignment, showStart }: { assignment: AssignmentWithWorkout; showStart: boolean }) {
  const { t, language } = useLanguage();
  const tc = t.athlete.calendar;
  const w = assignment.workout;
  const sport = sportKey(w.type);
  const status = assignmentStatus(assignment);
  const secs = actualDurationSec(assignment);
  const canStart = showStart && status === "planned" && isToday(assignment.scheduledDate);
  const startTo = w.type === "strength" ? `/athlete/workout/${assignment.id}/session` : `/athlete/workout/${assignment.id}`;

  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-3">
      <Link to={`/athlete/workout/${assignment.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
          style={{ backgroundColor: `hsl(var(--sport-${sport}) / 0.14)`, color: `hsl(var(--sport-${sport}))` }}
        >
          <SportIcon type={w.type} className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{w.name}</span>
          <span className="block text-[13px] text-muted-foreground">
            <span className={cn("font-semibold", STATUS_CLASS[status])}>
              {tc.status[status]}
              {status === "partial" && assignment.completionPercentage !== undefined && ` · ${assignment.completionPercentage}%`}
            </span>
            {secs > 0 && <span className="tabular-nums"> · {formatTotalTime(secs)}</span>}
            {assignment.completedAt && !isSameDay(assignment.completedAt, assignment.scheduledDate) && (
              <span> · {formatDate(assignment.completedAt, "weekdayShort", language)}</span>
            )}
          </span>
        </span>
      </Link>
      {canStart ? (
        <Link to={startTo} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-bold text-primary-foreground">
          <Play className="h-4 w-4" fill="currentColor" aria-hidden />
          {tc.start}
        </Link>
      ) : (
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
      )}
    </div>
  );
}

export default AthleteCalendarView;
