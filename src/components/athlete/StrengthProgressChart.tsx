import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import { isWorkingSet, parseNum } from "@/utils/strengthStats";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Point {
  date: Date;
  label: string;
  weight: number;
  reps: number;
}

interface Series {
  exerciseId: string;
  name: string;
  points: Point[];
}

/** Top working-set weight per session for each strength exercise the athlete logged. */
const buildSeries = (assignments: AssignmentWithWorkout[], dateFormat: (d: Date) => string): Series[] => {
  const byExercise = new Map<string, Series>();
  const done = assignments
    .filter((a) => a.workout.type === "strength" && a.completedAt && a.progressData?.length)
    .sort((a, b) => a.completedAt!.getTime() - b.completedAt!.getTime());

  for (const a of done) {
    for (const ex of a.progressData ?? []) {
      let top: { weight: number; reps: number } | null = null;
      for (const set of ex.sets) {
        if (!isWorkingSet(set)) continue;
        const weight = parseNum(set.weight);
        const reps = parseNum(set.reps);
        if (weight <= 0) continue;
        if (!top || weight > top.weight || (weight === top.weight && reps > top.reps)) top = { weight, reps };
      }
      if (!top) continue;
      const name = a.workout.exercises?.find((we) => we.exerciseId === ex.exerciseId)?.exerciseName || "—";
      const series = byExercise.get(ex.exerciseId) ?? { exerciseId: ex.exerciseId, name, points: [] };
      series.points.push({ date: a.completedAt!, label: dateFormat(a.completedAt!), ...top });
      byExercise.set(ex.exerciseId, series);
    }
  }
  // Most-trained exercises first
  return [...byExercise.values()].sort((a, b) => b.points.length - a.points.length);
};

export function StrengthProgressChart({ assignments }: { assignments: AssignmentWithWorkout[] }) {
  const { t, language } = useLanguage();
  const tp = t.athlete.strengthProgress;
  const locale = language === "pt" ? ptBR : undefined;

  const series = useMemo(
    () => buildSeries(assignments, (d) => format(d, "d MMM", { locale })),
    [assignments, locale]
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = series.find((s) => s.exerciseId === selectedId) ?? series[0];

  if (!selected) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="font-semibold mb-1">{tp.title}</p>
          <p className="text-sm text-muted-foreground">{tp.empty}</p>
        </CardContent>
      </Card>
    );
  }

  const first = selected.points[0];
  const best = selected.points.reduce((a, b) => (b.weight > a.weight ? b : a), first);
  const delta = best.weight - first.weight;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{tp.title}</p>
            <p className="text-xs text-muted-foreground">{tp.subtitle}</p>
          </div>
          {delta > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 text-xs font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />+{delta} kg
            </span>
          )}
        </div>

        {/* Exercise picker */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {series.map((s) => (
            <button
              key={s.exerciseId}
              onClick={() => setSelectedId(s.exerciseId)}
              className={cn(
                "shrink-0 rounded-full px-3 h-8 text-xs font-medium transition-colors border",
                s.exerciseId === selected.exerciseId
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "text-muted-foreground border-border hover:text-foreground"
              )}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{tp.best}</p>
            <p className="text-lg font-bold tabular-nums">
              {best.weight} kg × {best.reps}
            </p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{tp.sessions}</p>
            <p className="text-lg font-bold tabular-nums">{selected.points.length}</p>
          </div>
        </div>

        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={selected.points} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" className="text-muted-foreground" />
              <YAxis
                tick={{ fontSize: 10 }}
                width={36}
                // Round the axis to 5 kg steps so ticks read 35 / 40 / 45 / 50
                domain={[
                  (min: number) => Math.max(0, Math.floor((min - 5) / 5) * 5),
                  (max: number) => Math.ceil((max + 5) / 5) * 5,
                ]}
                allowDecimals={false}
                tickCount={5}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as Point;
                  return (
                    <div className="glass-menu rounded-xl px-3 py-2 text-xs">
                      <p className="font-semibold">{p.label}</p>
                      <p className="tabular-nums">
                        {p.weight} kg × {p.reps}
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
