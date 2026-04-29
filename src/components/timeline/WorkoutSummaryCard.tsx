import { GrBike, GrRun, GrSwim } from "react-icons/gr";
import { Dumbbell, Heart, MapPin, Repeat, Timer, Zap } from "lucide-react";
import type { WorkoutSummary } from "@/types/timeline";

const typeConfig: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  running: { icon: GrRun,    label: "Corrida",  color: "#3b82f6", bg: "#3b82f610" },
  cycling: { icon: GrBike,   label: "Ciclismo", color: "#f59e0b", bg: "#f59e0b10" },
  swimming:{ icon: GrSwim,   label: "Natação",  color: "#06b6d4", bg: "#06b6d410" },
  strength:{ icon: Dumbbell, label: "Força",    color: "#a855f7", bg: "#a855f710" },
};

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

interface Props {
  summary: WorkoutSummary;
}

export function WorkoutSummaryCard({ summary }: Props) {
  const cfg = typeConfig[summary.workoutType] ?? typeConfig.strength;
  const Icon = cfg.icon;
  const isSwimming = summary.workoutType === "swimming";

  const stats: { icon: React.ElementType; value: string; label: string }[] = [];

  if (summary.elapsedTime !== undefined)
    stats.push({ icon: Timer, value: formatTime(summary.elapsedTime), label: "Tempo" });
  if (summary.distance !== undefined)
    stats.push({ icon: MapPin, value: `${summary.distance}${isSwimming ? "m" : "km"}`, label: "Distância" });
  if (summary.avgHeartRate !== undefined)
    stats.push({ icon: Heart, value: `${summary.avgHeartRate}`, label: "FC Média (bpm)" });
  if (summary.avgPace !== undefined)
    stats.push({ icon: Timer, value: `${formatTime(summary.avgPace)}${isSwimming ? "/100m" : "/km"}`, label: "Pace Médio" });
  if (summary.avgSpeed !== undefined)
    stats.push({ icon: Zap, value: `${summary.avgSpeed}`, label: "Vel. Média (km/h)" });
  if (summary.completionPercentage !== undefined)
    stats.push({ icon: Dumbbell, value: `${summary.completionPercentage}%`, label: "Concluído" });

  const cols = stats.length === 1 ? 1 : stats.length === 2 ? 2 : stats.length >= 4 ? 2 : 3;

  const hasStageTimes = summary.stageTimes && summary.stageTimes.length > 0;

  return (
    <div className="mx-4 my-2 rounded-2xl overflow-hidden border border-border">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: cfg.bg }}>
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: cfg.color + "22", color: cfg.color }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{summary.workoutName}</p>
          <p className="text-xs" style={{ color: cfg.color }}>{cfg.label}</p>
        </div>
      </div>

      {/* Stats grid */}
      {stats.length > 0 && (
        <div
          className="grid gap-px bg-border"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {stats.map((stat) => {
            const StatIcon = stat.icon;
            return (
              <div key={stat.label} className="bg-background flex flex-col items-center justify-center py-3 px-2 gap-0.5">
                <StatIcon className="h-3.5 w-3.5 text-muted-foreground mb-0.5" />
                <span className="font-bold text-base tabular-nums">{stat.value}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">{stat.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Per-stage pace */}
      {hasStageTimes && (
        <div className="border-t border-border divide-y divide-border/50">
          {summary.stageTimes!.map((st, i) => {
            if (st.type === "regular") {
              if (st.time === null || st.time === undefined) return null;
              return (
                <div key={i} className="flex items-center justify-between px-4 py-2 text-sm odd:bg-muted/20">
                  <span className="text-muted-foreground">{st.label}</span>
                  <span className="font-semibold tabular-nums">{formatTime(st.time)}</span>
                </div>
              );
            }

            // repeat block
            const filledReps = st.reps?.filter((r) => r.times.some((t) => t !== null && t !== undefined)) ?? [];
            if (filledReps.length === 0) return null;
            const nestedLabels = st.nestedLabels ?? [];

            return (
              <div key={i}>
                {/* repeat block header row */}
                <div
                  className="grid text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-1.5 bg-muted/40"
                  style={{ gridTemplateColumns: `1.5rem repeat(${nestedLabels.length}, 1fr)` }}
                >
                  <span className="flex items-center"><Repeat className="h-3 w-3" /></span>
                  {nestedLabels.map((lbl) => (
                    <span key={lbl} className="text-center truncate">{lbl}</span>
                  ))}
                </div>
                {st.reps!.map((rep, ri) => {
                  const hasAny = rep.times.some((t) => t !== null && t !== undefined);
                  if (!hasAny) return null;
                  return (
                    <div
                      key={ri}
                      className="grid items-center px-4 py-2 text-sm tabular-nums border-t border-border/40 odd:bg-muted/20"
                      style={{ gridTemplateColumns: `1.5rem repeat(${nestedLabels.length}, 1fr)` }}
                    >
                      <span className="text-xs text-muted-foreground font-semibold">{ri + 1}</span>
                      {rep.times.map((t, ti) => (
                        <span key={ti} className="text-center font-medium">
                          {t !== null && t !== undefined ? formatTime(t) : "—"}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
