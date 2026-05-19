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
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

const SPORTS: WorkoutType[] = ["running", "cycling", "swimming", "strength"];

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
    const map = new Map<string, Set<WorkoutType>>();
    for (const a of assignments) {
      if (!a.completedAt) continue;
      const key = format(a.completedAt, "yyyy-MM-dd");
      const set = map.get(key) ?? new Set<WorkoutType>();
      set.add(a.workout.type as WorkoutType);
      map.set(key, set);
    }
    return map;
  }, [assignments]);

  const monthTotals = useMemo(() => {
    const totals: Record<WorkoutType, number> = { running: 0, cycling: 0, swimming: 0, strength: 0 };
    for (const a of assignments) {
      if (!a.completedAt) continue;
      if (!isSameMonth(a.completedAt, cursor)) continue;
      totals[a.workout.type as WorkoutType] += 1;
    }
    return totals;
  }, [assignments, cursor]);

  const total = SPORTS.reduce((acc, s) => acc + monthTotals[s], 0);

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
            const sports = Array.from(dayMap.get(key) ?? []);
            const inMonth = isSameMonth(day, cursor);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "aspect-square rounded-md flex flex-col items-center justify-between p-1 text-[11px]",
                  !inMonth && "opacity-30",
                  isToday(day) && "ring-1 ring-primary",
                  isSameDay(day, new Date()) ? "bg-primary/10" : "bg-muted/30",
                )}
              >
                <span className="font-medium leading-none">{format(day, "d")}</span>
                <div className="flex gap-0.5 flex-wrap justify-center">
                  {sports.map((s) => (
                    <span
                      key={s}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: modalityAccent(s) }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {total > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-border/50 text-xs">
            {SPORTS.filter((s) => monthTotals[s] > 0).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: modalityAccent(s) }}
                />
                <span className="text-muted-foreground">
                  {tp.modalities[s]}: <span className="font-semibold text-foreground">{monthTotals[s]}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
