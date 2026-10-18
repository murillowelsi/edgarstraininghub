import { GrBike, GrRun, GrSwim } from "react-icons/gr";
import { Dumbbell, Flame, Trophy } from "lucide-react";
import type { WorkoutSummary } from "@/types/timeline";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { WorkoutType } from "@/types/workout";
import { modalityGradient, summaryStats } from "@/utils/workoutSummaryStats";

const typeIcon: Record<string, React.ElementType> = {
  running: GrRun,
  cycling: GrBike,
  swimming: GrSwim,
  strength: Dumbbell,
};

interface Props {
  summary: WorkoutSummary;
  /** Render edge-to-edge (no horizontal margin), useful inside carousels. */
  flush?: boolean;
}

/** Workout "achievement" card: modality gradient header, big numbers, PRs and highlights. */
export function WorkoutSummaryCard({ summary, flush }: Props) {
  const { t, language } = useLanguage();
  const ts = t.timeline.summary;
  const palette = modalityGradient[summary.workoutType] ?? modalityGradient.strength;
  const typeLabel = t.workoutMeta.types[summary.workoutType as WorkoutType] ?? summary.workoutType;
  const Icon = typeIcon[summary.workoutType] ?? Dumbbell;
  const stats = summaryStats(summary, ts, language === "pt" ? "pt-BR" : "en").filter((s) => s.key !== "records");
  const highlights = summary.highlights?.slice(0, 3) ?? [];

  return (
    <div
      className={cn(
        "overflow-hidden",
        flush ? "w-full h-full flex flex-col" : "mx-4 my-2 rounded-3xl border border-border/60"
      )}
    >
      {/* Gradient header */}
      <div
        className="relative px-4 pt-4 pb-5 text-white shrink-0"
        style={{ backgroundImage: `linear-gradient(135deg, ${palette.from}, ${palette.to})` }}
      >
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" aria-hidden />
        <div className="relative flex items-center gap-2">
          <span className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-white/85">{typeLabel}</span>
          <span className="ml-auto flex items-center gap-1.5">
            {!!summary.records && (
              <span className="flex items-center gap-1 rounded-full bg-amber-400 text-amber-950 px-2 py-0.5 text-[11px] font-bold">
                <Trophy className="h-3 w-3" />
                {summary.records}
              </span>
            )}
            {summary.rpe !== undefined && (
              <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
                <Flame className="h-3 w-3" />
                {ts.rpe.replace("{{n}}", String(summary.rpe))}
              </span>
            )}
          </span>
        </div>
        <p className="relative mt-3 text-lg font-extrabold leading-tight text-balance">{summary.workoutName}</p>
      </div>

      {/* Big numbers */}
      {stats.length > 0 && (
        <div
          className={cn("grid bg-card", flush && "flex-1 content-center")}
          style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, stats.length === 4 ? 2 : 3)}, minmax(0, 1fr))` }}
        >
          {stats.map((stat) => (
            <div key={stat.key} className="px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-extrabold tabular-nums leading-tight mt-0.5">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Strength highlights */}
      {highlights.length > 0 && (
        <div className="bg-card border-t border-border/60 px-4 py-3 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{ts.highlights}</p>
          {highlights.map((h) => (
            <div key={h.name} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">
                {h.pr && <span className="mr-1" aria-label={ts.pr}>🏆</span>}
                {h.name}
              </span>
              <span className="font-semibold tabular-nums shrink-0">{h.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
