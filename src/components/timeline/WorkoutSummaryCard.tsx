import { GrBike, GrRun, GrSwim } from "react-icons/gr";
import { Dumbbell, Heart, MapPin, Timer, Zap } from "lucide-react";
import type { WorkoutSummary } from "@/types/timeline";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { WorkoutType } from "@/types/workout";

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  running: { icon: GrRun,    color: "#3b82f6", bg: "#3b82f610" },
  cycling: { icon: GrBike,   color: "#f59e0b", bg: "#f59e0b10" },
  swimming:{ icon: GrSwim,   color: "#06b6d4", bg: "#06b6d410" },
  strength:{ icon: Dumbbell, color: "#a855f7", bg: "#a855f710" },
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
  /** Render edge-to-edge (no horizontal margin), useful inside carousels. */
  flush?: boolean;
}

export function WorkoutSummaryCard({ summary, flush }: Props) {
  const { t } = useLanguage();
  const ts = t.timeline.summary;
  const cfg = typeConfig[summary.workoutType] ?? typeConfig.strength;
  const typeLabel =
    t.workoutMeta.types[summary.workoutType as WorkoutType] ?? summary.workoutType;
  const Icon = cfg.icon;
  const isSwimming = summary.workoutType === "swimming";

  const stats: { icon: React.ElementType; value: string; label: string }[] = [];

  if (summary.elapsedTime !== undefined)
    stats.push({ icon: Timer, value: formatTime(summary.elapsedTime), label: ts.time });
  if (summary.distance !== undefined)
    stats.push({ icon: MapPin, value: `${summary.distance}${isSwimming ? "m" : "km"}`, label: ts.distance });
  if (summary.avgHeartRate !== undefined)
    stats.push({ icon: Heart, value: `${summary.avgHeartRate}`, label: ts.avgHeartRate });
  if (summary.avgPace !== undefined)
    stats.push({ icon: Timer, value: `${formatTime(summary.avgPace)}${isSwimming ? "/100m" : "/km"}`, label: ts.avgPace });
  if (summary.avgSpeed !== undefined)
    stats.push({ icon: Zap, value: `${summary.avgSpeed}`, label: ts.avgSpeed });
  if (summary.completionPercentage !== undefined)
    stats.push({ icon: Dumbbell, value: `${summary.completionPercentage}%`, label: ts.completed });

  const cols = stats.length === 1 ? 1 : stats.length === 2 ? 2 : stats.length >= 4 ? 2 : 3;

  return (
    <div className={flush ? "w-full h-full flex flex-col overflow-hidden" : "mx-4 my-2 rounded-2xl overflow-hidden border border-border"}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ backgroundColor: cfg.bg }}>
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: cfg.color + "22", color: cfg.color }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{summary.workoutName}</p>
          <p className="text-xs" style={{ color: cfg.color }}>{typeLabel}</p>
        </div>
      </div>

      {/* Stats grid */}
      {stats.length > 0 && (
        <div
          className={cn("grid gap-px bg-border", flush && "flex-1")}
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

    </div>
  );
}
