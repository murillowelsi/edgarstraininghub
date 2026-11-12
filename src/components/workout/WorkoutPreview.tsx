import { Play } from "lucide-react";
import type { Workout, WorkoutFormData, WorkoutStage } from "@/types/workout";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { WorkoutPlanCard } from "@/components/athlete/WorkoutPlanCard";
import { sportKey } from "@/components/timeline/sport";
import { workoutLabels } from "@/utils/workoutLabels";
import { stepLine } from "./stageText";

/**
 * Live preview of what the athlete will see (WE-1): the same card as the athlete's
 * workout detail (WS-1), fed from the form instead of Firestore, with an inactive
 * "Start" and the compact list of steps (or exercises). The step being edited is
 * highlighted.
 */
export function WorkoutPreview({ form, highlightId, className }: { form: WorkoutFormData; highlightId?: string | null; className?: string }) {
  const { t } = useLanguage();
  const tw = t.admin.workoutEditor;
  const workout = { id: "preview", ...form, stages: form.stages ?? [] } as unknown as Workout;

  return (
    <div className={cn("space-y-3", className)} aria-label={tw.previewTitle}>
      <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{tw.previewTitle}</p>
      <WorkoutPlanCard workout={workout} />
      <div
        aria-disabled
        className="flex h-[52px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-[14px] bg-primary/60 text-base font-bold text-primary-foreground"
      >
        <Play className="h-[18px] w-[18px]" fill="currentColor" aria-hidden />
        {t.athlete.workoutView.startWorkout}
      </div>
      {form.type === "strength" ? (
        <ol className="space-y-1.5">
          {(form.exercises ?? []).map((we, i) => (
            <li key={we.id} className={cn("flex items-center gap-3 rounded-xl border bg-card px-3 py-2", highlightId === we.id && "border-primary/60 ring-1 ring-primary/60")}>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{we.exercise?.name || we.exerciseName || "—"}</span>
                <span className="block text-xs text-muted-foreground tabular-nums">
                  {[`${we.sets} × ${we.reps || "10"}`, we.weight?.trim() && (/^\d+([.,]\d+)?$/.test(we.weight.trim()) ? `${we.weight.trim()} kg` : we.weight.trim()), we.restSeconds > 0 && `${we.restSeconds}s`]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <PreviewSteps stages={form.stages ?? []} sport={sportKey(form.type)} highlightId={highlightId} />
      )}
    </div>
  );
}

function PreviewSteps({ stages, sport, highlightId }: { stages: WorkoutStage[]; sport: string; highlightId?: string | null }) {
  const { t } = useLanguage();
  const L = workoutLabels(t);
  const row = (s: WorkoutStage) => (
    <li key={s.id} className={cn("flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm", highlightId === s.id && "bg-primary/10 ring-1 ring-primary/60")}>
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: `hsl(var(--sport-${sport}) / ${["warmup", "cooldown", "recovery", "rest"].includes(s.type) ? 0.4 : 1})` }}
      />
      <span className="min-w-0 flex-1 truncate font-medium">{L.stage(s.type)}</span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{stepLine(s, t)}</span>
    </li>
  );
  return (
    <ol className="space-y-0.5">
      {stages.map((s) =>
        s.type === "repeat" ? (
          <li key={s.id} className={cn("rounded-xl border border-dashed px-1.5 py-1", highlightId === s.id && "border-primary/60")}>
            <p className="px-2 py-1 text-xs font-bold">{t.admin.workoutEditor.repeatTitle.replace("{{n}}", String(s.repeatCount || 2))}</p>
            <ol>{(s.stages ?? []).map(row)}</ol>
          </li>
        ) : (
          row(s)
        )
      )}
    </ol>
  );
}
