import { Flame, Trophy } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { WorkoutSummary } from "@/types/timeline";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { WorkoutType } from "@/types/workout";
import { workoutCardModel, type CardMetric } from "@/utils/workoutSummaryStats";
import { SportIcon } from "@/components/icons/sport-icons";
import { sportKey } from "./sport";
import { WorkoutViz } from "./workout-viz/WorkoutViz";

export type WorkoutCardVariant = "inline" | "poster";

interface Props {
  summary: WorkoutSummary;
  /**
   * inline: inside a post without photos (free height, side margins);
   * poster: a carousel slide, filling the box the carousel gives it.
   */
  variant?: WorkoutCardVariant;
  /** @deprecated use variant="poster" */
  flush?: boolean;
  /** Poster in a landscape box: no highlights, smaller hero */
  compact?: boolean;
}

/**
 * Workout "achievement" card (docs/design/feed, FD-4). Follows the theme: card
 * surface + a soft glow in the sport colour. Only tokens (bg-card, --sport-*,
 * primary/primary-ink), so a palette change needs no edits here.
 */
export function WorkoutSummaryCard({ summary, variant, flush, compact = false }: Props) {
  const { t, language } = useLanguage();
  const ts = t.timeline.summary;
  const v: WorkoutCardVariant = variant ?? (flush ? "poster" : "inline");
  const poster = v === "poster";
  const sport = sportKey(summary.workoutType);
  const typeLabel = t.workoutMeta.types[summary.workoutType as WorkoutType] ?? summary.workoutType;
  const { hero, secondary } = workoutCardModel(summary, ts, language === "pt" ? "pt-BR" : "en");
  const partial = summary.completionPercentage !== undefined && summary.completionPercentage < 100;
  const highlights = compact ? [] : summary.highlights?.slice(0, poster ? 2 : 3) ?? [];

  // Glow and border in the sport colour; stronger glow on dark surfaces
  const style: CSSProperties = {
    backgroundImage: `radial-gradient(140% 90% at 100% 0%, hsl(var(--sport-${sport}) / var(--wc-glow)) 0%, transparent 55%)`,
    borderColor: `hsl(var(--sport-${sport}) / 0.35)`,
  };

  return (
    <div
      style={style}
      className={cn(
        "relative overflow-hidden bg-card text-card-foreground [--wc-glow:0.14] dark:[--wc-glow:0.32]",
        poster ? "flex h-full w-full flex-col border-0" : "mx-3 rounded-2xl border"
      )}
    >
      <div className={cn("flex flex-1 flex-col", compact ? "px-4 pt-3.5 pb-7" : poster ? "p-5 pb-9" : "px-4 pt-3.5 pb-8")}>
        {/* Sport + badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-overline text-foreground/80">
            <span
              className="grid h-7 w-7 place-items-center rounded-lg"
              style={{ backgroundColor: `hsl(var(--sport-${sport}) / 0.18)`, color: `hsl(var(--sport-${sport}))` }}
            >
              <SportIcon type={summary.workoutType} className="h-4 w-4" aria-hidden />
            </span>
            {typeLabel}
          </span>
          <span className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
            {!!summary.records && (
              <Badge pr>
                <Trophy className="h-3 w-3" aria-hidden />
                {summary.records > 1 ? `${summary.records} ${ts.records}` : ts.pr}
              </Badge>
            )}
            {partial && <Badge>{ts.percentDone.replace("{{p}}", String(summary.completionPercentage))}</Badge>}
            {summary.rpe !== undefined && (
              <Badge>
                <Flame className="h-3 w-3" aria-hidden />
                {ts.rpe.replace("{{n}}", String(summary.rpe))}
              </Badge>
            )}
          </span>
        </div>

        <p className="mt-2.5 text-title-sm leading-snug text-balance">{summary.workoutName}</p>

        {/* Hero number */}
        {hero && (
          <div className="mt-2.5">
            <p className="flex items-baseline gap-1.5">
              <span className={cn("font-display font-extrabold tracking-tight tabular-nums leading-none", poster && !compact ? "text-[56px]" : compact ? "text-[40px]" : "text-[48px]")}>
                {hero.value}
              </span>
              {hero.unit && <span className="font-display text-lg font-bold text-muted-foreground">{hero.unit}</span>}
            </p>
            <p className="mt-1 text-overline text-muted-foreground">{hero.label}</p>
          </div>
        )}

        {/* Secondary numbers: only the ones with data */}
        {secondary.length > 0 && (
          <div className={cn("mt-3.5 grid gap-2", secondary.length === 1 ? "grid-cols-1" : secondary.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
            {secondary.map((m) => (
              <Metric key={m.key} metric={m} />
            ))}
          </div>
        )}

        {/* Mini chart from data the summary already has (stages, reps, sets) */}
        <WorkoutViz summary={summary} className={cn("mt-3.5", poster && "mt-auto pt-3.5")} />

        {/* Strength highlights */}
        {highlights.length > 0 && (
          <div className="mt-3 grid gap-1.5">
            {highlights.map((h) => (
              <div key={h.name} className="flex items-center justify-between gap-3 text-body-sm">
                <span className="flex min-w-0 items-center gap-1.5">
                  {h.pr && (
                    <span className="shrink-0 rounded-sm bg-primary/15 px-1 text-[10px] font-extrabold leading-4 text-primary-ink dark:bg-primary dark:text-primary-foreground">
                      PR
                    </span>
                  )}
                  <span className="truncate">{h.name}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{h.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Signature when the card travels as an image */}
      <span aria-hidden className="absolute bottom-2.5 right-4 font-display text-[13px] font-extrabold tracking-tight text-primary-ink">
        EZ
      </span>
    </div>
  );
}

function Metric({ metric }: { metric: CardMetric }) {
  return (
    <div className="min-w-0 rounded-xl border border-foreground/[0.07] bg-foreground/[0.04] px-2.5 py-2">
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{metric.label}</p>
      <p className="mt-0.5 whitespace-nowrap text-metric-md tabular-nums">
        {metric.value}
        {metric.unit && <span className="ml-0.5 text-caption text-muted-foreground">{metric.unit}</span>}
      </p>
    </div>
  );
}

function Badge({ children, pr }: { children: ReactNode; pr?: boolean }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        pr
          ? // PR in yellow: readable ink on light, navy text on yellow on dark
            "bg-primary/15 font-extrabold text-primary-ink dark:bg-primary dark:text-primary-foreground"
          : "border border-foreground/10 bg-foreground/[0.06]"
      )}
    >
      {children}
    </span>
  );
}
