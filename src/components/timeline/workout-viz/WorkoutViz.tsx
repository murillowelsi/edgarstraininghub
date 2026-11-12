import type { WorkoutSummary } from "@/types/timeline";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/utils/workoutSummaryStats";
import { sportKey } from "../sport";
import { vizModel } from "./vizModel";

/**
 * Mini chart on the workout card (FD-5): reps as bars (taller = faster),
 * stages as a proportional strip, swim sets as lanes, strength sets as
 * segments. Plain divs, sport colour from tokens, one aria-label summary.
 */
export function WorkoutViz({ summary, className }: { summary: WorkoutSummary; className?: string }) {
  const { t } = useLanguage();
  const tv = t.timeline.viz;
  const model = vizModel(summary);
  if (!model) return null;
  const sport = sportKey(summary.workoutType);
  const c = (alpha = 1) => `hsl(var(--sport-${sport}) / ${alpha})`;

  let title = "";
  let detail = "";
  let label = "";
  let body: React.ReactNode = null;

  if (model.kind === "reps") {
    const best = formatDuration(model.best);
    title = tv.reps;
    detail = tv.best.replace("{{t}}", best);
    label = tv.repsSummary.replace("{{n}}", String(model.values.length)).replace("{{t}}", best);
    body = (
      <div className="flex h-11 items-end gap-1">
        {model.values.map((v, i) => (
          <i
            key={i}
            className="flex-1 rounded-t-[4px] rounded-b-[2px]"
            style={{ height: `${Math.max(30, (model.best / v) * 100)}%`, backgroundColor: v === model.best ? c() : c(0.35) }}
          />
        ))}
      </div>
    );
  } else if (model.kind === "stages") {
    const total = model.segments.reduce((s, x) => s + x.seconds, 0);
    title = tv.stages;
    detail = formatDuration(total);
    label = tv.stagesSummary.replace("{{n}}", String(model.segments.length)).replace("{{t}}", detail);
    body = (
      <div className="flex h-3 gap-[3px] overflow-hidden rounded-full">
        {model.segments.map((s, i) => (
          <i key={i} className="h-full" style={{ flexGrow: s.seconds, backgroundColor: c(i % 2 ? 0.45 : 0.9) }} />
        ))}
      </div>
    );
  } else if (model.kind === "lanes") {
    title = tv.lanes;
    detail = String(model.blocks.length);
    label = tv.lanesSummary.replace("{{n}}", String(model.blocks.filter((b) => b === "main").length));
    body = (
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.min(model.blocks.length, 10)}, minmax(0, 1fr))` }}>
        {model.blocks.map((b, i) => (
          <i
            key={i}
            className="h-5 rounded"
            style={
              b === "main"
                ? { backgroundColor: c() }
                : b === "drill"
                ? { backgroundImage: `repeating-linear-gradient(45deg, ${c(0.55)} 0 4px, transparent 4px 8px)` }
                : { backgroundColor: c(0.3) }
            }
          />
        ))}
      </div>
    );
  } else {
    title = tv.sets;
    detail = tv.setsDone.replace("{{done}}", String(model.done)).replace("{{total}}", String(model.total));
    label = `${tv.sets}: ${detail}`;
    body = (
      <div className="flex gap-[3px]">
        {Array.from({ length: model.total }, (_, i) => (
          <i key={i} className={cn("h-2.5 flex-1 rounded-[3px]", i >= model.done && "bg-foreground/10")} style={i < model.done ? { backgroundColor: c() } : undefined} />
        ))}
      </div>
    );
  }

  return (
    <div className={className} role="img" aria-label={label}>
      <div aria-hidden className="mb-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <span>{title}</span>
        <span className="tabular-nums">{detail}</span>
      </div>
      <div aria-hidden>{body}</div>
    </div>
  );
}
