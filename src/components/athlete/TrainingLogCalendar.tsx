import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { modalityAccent } from "@/utils/modalityColors";
import type { WorkoutType } from "@/types/workout";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

const SPORTS: WorkoutType[] = ["running", "cycling", "swimming", "strength"];

type DayInfo = {
  done: Map<WorkoutType, number>;
  planned: Map<WorkoutType, number>;
};

const emptyDay = (): DayInfo => ({ done: new Map(), planned: new Map() });

const bump = (map: Map<WorkoutType, number>, key: WorkoutType) =>
  map.set(key, (map.get(key) ?? 0) + 1);

export const TrainingLogCalendar = ({
  assignments,
}: {
  assignments: AssignmentWithWorkout[];
}) => {
  const { t } = useLanguage();
  const tp = t.athlete.profile;
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const weekdayLabels = useMemo(() => {
    const ref = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) =>
      format(new Date(ref.getTime() + i * 86400000), "EEEEE"),
    );
  }, []);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const dayMap = useMemo(() => {
    const map = new Map<string, DayInfo>();
    for (const a of assignments) {
      const sport = a.workout.type as WorkoutType;
      if (a.completedAt) {
        const key = format(a.completedAt, "yyyy-MM-dd");
        const info = map.get(key) ?? emptyDay();
        bump(info.done, sport);
        map.set(key, info);
      }
      const plannedKey = format(a.scheduledDate, "yyyy-MM-dd");
      const info = map.get(plannedKey) ?? emptyDay();
      bump(info.planned, sport);
      map.set(plannedKey, info);
    }
    return map;
  }, [assignments]);

  const monthTotals = useMemo(() => {
    const totals: Record<WorkoutType, { done: number; planned: number }> = {
      running: { done: 0, planned: 0 },
      cycling: { done: 0, planned: 0 },
      swimming: { done: 0, planned: 0 },
      strength: { done: 0, planned: 0 },
    };
    for (const a of assignments) {
      if (!isSameMonth(a.scheduledDate, cursor)) continue;
      totals[a.workout.type as WorkoutType].planned += 1;
      if (a.completedAt && isSameMonth(a.completedAt, cursor))
        totals[a.workout.type as WorkoutType].done += 1;
    }
    return totals;
  }, [assignments, cursor]);

  const totalDone = SPORTS.reduce((acc, s) => acc + monthTotals[s].done, 0);
  const totalPlanned = SPORTS.reduce((acc, s) => acc + monthTotals[s].planned, 0);

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold">{tp.trainingLog}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCursor((c) => addMonths(c, -1))}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold w-28 text-center capitalize">
              {format(cursor, "MMMM yyyy")}
            </span>
            <button
              onClick={() => setCursor((c) => addMonths(c, 1))}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground font-medium uppercase text-center">
          {weekdayLabels.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const info = dayMap.get(key);
            const doneSports = info ? Array.from(info.done.keys()) : [];
            const plannedSports = info ? Array.from(info.planned.keys()) : [];
            const doneCount = info
              ? Array.from(info.done.values()).reduce((a, b) => a + b, 0)
              : 0;
            const plannedCount = info
              ? Array.from(info.planned.values()).reduce((a, b) => a + b, 0)
              : 0;
            const inMonth = isSameMonth(day, cursor);
            const today = isToday(day);
            const hasDone = doneSports.length > 0;
            const hasMissedPlan = !hasDone && plannedCount > 0;
            const primarySport = doneSports[0];

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "relative aspect-square sm:aspect-auto sm:min-h-[68px] md:min-h-[80px]",
                  "rounded-md flex flex-col p-1.5 text-[11px] overflow-hidden",
                  !inMonth && "opacity-30",
                  today && "ring-1 ring-primary",
                  hasDone ? "" : "bg-muted/30",
                  hasMissedPlan && "border border-dashed border-border/70",
                )}
                style={
                  hasDone && primarySport
                    ? { background: `${modalityAccent(primarySport)}1F` }
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-1">
                  <span className={cn("font-semibold leading-none", today && "text-primary")}>
                    {format(day, "d")}
                  </span>
                  {hasDone && doneCount > 1 && (
                    <span className="text-[9px] font-bold leading-none px-1 py-0.5 rounded bg-background/80 text-foreground">
                      ×{doneCount}
                    </span>
                  )}
                </div>

                <div className="hidden sm:flex flex-wrap gap-1 mt-1">
                  {doneSports.map((s) => (
                    <span
                      key={s}
                      className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-sm"
                      style={{
                        background: modalityAccent(s),
                        color: "#fff",
                      }}
                    >
                      {tp.modalities[s].slice(0, 3)}
                    </span>
                  ))}
                  {!hasDone &&
                    plannedSports.map((s) => (
                      <span
                        key={s}
                        className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-sm border"
                        style={{
                          borderColor: modalityAccent(s),
                          color: modalityAccent(s),
                        }}
                      >
                        {tp.modalities[s].slice(0, 3)}
                      </span>
                    ))}
                </div>

                {(hasDone || hasMissedPlan) && (
                  <div className="mt-auto pt-1 flex h-1.5 gap-0.5 sm:hidden">
                    {(hasDone ? doneSports : plannedSports).map((s) => (
                      <span
                        key={s}
                        className={cn("flex-1 rounded-sm", !hasDone && "opacity-40")}
                        style={{ backgroundColor: modalityAccent(s) }}
                      />
                    ))}
                  </div>
                )}

                {(hasDone || hasMissedPlan) && (
                  <div
                    className="hidden sm:block absolute inset-x-1 bottom-1 h-1 rounded-full flex gap-0.5 overflow-hidden"
                    aria-hidden
                  >
                    <div className="flex h-full gap-0.5 w-full">
                      {(hasDone ? doneSports : plannedSports).map((s) => (
                        <span
                          key={s}
                          className={cn("flex-1", !hasDone && "opacity-40")}
                          style={{ backgroundColor: modalityAccent(s) }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {totalPlanned > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-border/50 text-xs">
            {SPORTS.filter(
              (s) => monthTotals[s].done > 0 || monthTotals[s].planned > 0,
            ).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: modalityAccent(s) }}
                />
                <span className="text-muted-foreground">
                  {tp.modalities[s]}:{" "}
                  <span className="font-semibold text-foreground">
                    {monthTotals[s].done}
                  </span>
                  <span className="text-muted-foreground"> / {monthTotals[s].planned}</span>
                </span>
              </div>
            ))}
            <div className="ml-auto text-muted-foreground">
              <span className="font-semibold text-foreground">{totalDone}</span>
              <span> / {totalPlanned}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
