import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { modalityAccent } from "@/utils/modalityColors";
import {
  actualDurationSec,
  estimateWorkoutDistanceKm,
  estimateWorkoutDurationSec,
} from "@/utils/workoutDuration";
import type { WorkoutType } from "@/types/workout";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import {
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RangeKey = "4w" | "12w" | "1y";
type MetricKey = "distance" | "time";

const SPORTS: WorkoutType[] = ["running", "cycling", "swimming", "strength"];

const distanceKm = (a: AssignmentWithWorkout): number => {
  const d = a.activityData?.distance ?? 0;
  if (a.workout.type === "swimming") return d / 1000;
  return d;
};

const timeHours = (a: AssignmentWithWorkout): number => actualDurationSec(a) / 3600;

const plannedTimeHours = (a: AssignmentWithWorkout): number =>
  estimateWorkoutDurationSec(a.workout) / 3600;

const plannedDistanceKm = (a: AssignmentWithWorkout): number =>
  estimateWorkoutDistanceKm(a.workout);

interface Bucket {
  label: string;
  start: Date;
  end: Date;
  done: Record<WorkoutType, number>;
  planned: number;
}

const buildBuckets = (range: RangeKey): Bucket[] => {
  const now = new Date();
  if (range === "1y") {
    const start = startOfMonth(subMonths(now, 11));
    return Array.from({ length: 12 }, (_, i) => {
      const s = addMonths(start, i);
      return {
        label: format(s, "MMM"),
        start: s,
        end: endOfMonth(s),
        done: { running: 0, cycling: 0, swimming: 0, strength: 0 },
        planned: 0,
      };
    });
  }
  const weeks = range === "4w" ? 4 : 12;
  const start = startOfWeek(subWeeks(now, weeks - 1), { weekStartsOn: 1 });
  return Array.from({ length: weeks }, (_, i) => {
    const s = addWeeks(start, i);
    return {
      label: format(s, "d MMM"),
      start: s,
      end: endOfWeek(s, { weekStartsOn: 1 }),
      done: { running: 0, cycling: 0, swimming: 0, strength: 0 },
      planned: 0,
    };
  });
};

export const ProgressSummaryChart = ({
  assignments,
}: {
  assignments: AssignmentWithWorkout[];
}) => {
  const { t } = useLanguage();
  const tp = t.athlete.profile;
  const [range, setRange] = useState<RangeKey>("12w");
  const [metric, setMetric] = useState<MetricKey>("time");

  const data = useMemo(() => {
    const buckets = buildBuckets(range);
    for (const a of assignments) {
      const plannedDate = a.scheduledDate;
      const plannedBucket = buckets.find((b) =>
        isWithinInterval(plannedDate, { start: b.start, end: b.end }),
      );
      if (plannedBucket) {
        const plannedValue =
          metric === "distance" ? plannedDistanceKm(a) : plannedTimeHours(a);
        if (plannedValue) plannedBucket.planned += plannedValue;
      }
      if (a.completedAt) {
        const doneBucket = buckets.find((b) =>
          isWithinInterval(a.completedAt!, { start: b.start, end: b.end }),
        );
        if (doneBucket) {
          const doneValue = metric === "distance" ? distanceKm(a) : timeHours(a);
          if (doneValue) doneBucket.done[a.workout.type as WorkoutType] += doneValue;
        }
      }
    }
    return buckets.map((b) => ({
      label: b.label,
      planned: b.planned,
      done_running: b.done.running,
      done_cycling: b.done.cycling,
      done_swimming: b.done.swimming,
      done_strength: b.done.strength,
    }));
  }, [assignments, range, metric]);

  const hasAnyData = useMemo(
    () =>
      data.some(
        (d) =>
          d.planned > 0 ||
          d.done_running > 0 ||
          d.done_cycling > 0 ||
          d.done_swimming > 0 ||
          d.done_strength > 0,
      ),
    [data],
  );

  const unit = metric === "distance" ? "km" : "h";
  const sportsForMetric: WorkoutType[] =
    metric === "distance" ? ["running", "cycling", "swimming"] : SPORTS;

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-display font-bold">{tp.progressSummary}</h3>
          <SegmentedControl
            value={range}
            onChange={setRange}
            options={[
              { value: "4w" as RangeKey, label: tp.ranges.fourWeeks },
              { value: "12w" as RangeKey, label: tp.ranges.twelveWeeks },
              { value: "1y" as RangeKey, label: tp.ranges.oneYear },
            ]}
          />
        </div>

        <SegmentedControl
          value={metric}
          onChange={setMetric}
          fullWidth
          options={[
            { value: "time" as MetricKey, label: tp.metrics.time },
            { value: "distance" as MetricKey, label: tp.metrics.distance },
          ]}
        />

        {hasAnyData ? (
          <>
            <div className="h-56 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    width={32}
                    tickFormatter={(v: number) => (v >= 10 ? v.toFixed(0) : v.toFixed(1))}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--background))",
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "planned")
                        return [`${value.toFixed(1)} ${unit}`, tp.stats.planned];
                      const sport = name.replace("done_", "") as WorkoutType;
                      return [`${value.toFixed(1)} ${unit}`, tp.modalities[sport]];
                    }}
                  />
                  <Bar
                    dataKey="planned"
                    stackId="planned"
                    fill="hsl(var(--muted-foreground) / 0.35)"
                    radius={[2, 2, 0, 0]}
                  />
                  {sportsForMetric.map((s, i) => (
                    <Bar
                      key={s}
                      dataKey={`done_${s}`}
                      stackId="done"
                      fill={modalityAccent(s)}
                      radius={i === sportsForMetric.length - 1 ? [2, 2, 0, 0] : 0}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: "hsl(var(--muted-foreground) / 0.35)" }}
                />
                <span className="text-muted-foreground">{tp.stats.planned}</span>
              </div>
              {sportsForMetric.map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: modalityAccent(s) }}
                  />
                  <span className="text-muted-foreground">{tp.modalities[s]}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic py-4 text-center">{tp.noActivity}</p>
        )}
      </CardContent>
    </Card>
  );
};

function SegmentedControl({
  value,
  onChange,
  options,
  fullWidth,
}: {
  value: string;
  onChange: (v: never) => void;
  options: { value: string; label: string }[];
  fullWidth?: boolean;
}) {
  return (
  <div
    className={cn(
      "inline-flex bg-muted/50 rounded-lg p-0.5 text-xs",
      fullWidth && "w-full",
    )}
  >
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value as never)}
        className={cn(
          "px-3 py-1.5 rounded-md font-medium transition-colors",
          fullWidth && "flex-1",
          value === opt.value
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
