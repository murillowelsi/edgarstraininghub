import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import {
  buildBestByExercise,
  computeStrengthVolume,
  isPersonalRecord,
  isWorkingSet,
} from "@/utils/strengthStats";
import { formatDuration } from "@/utils/workoutSummaryStats";
import { Ban, Flame, MessageSquareQuote, Sparkles, Trophy } from "lucide-react";
import { useMemo } from "react";

interface Props {
  assignment: AssignmentWithWorkout;
  /** The athlete's other assignments, to flag personal records */
  history?: AssignmentWithWorkout[];
  /** Hide the per-set table (e.g. a compact card) */
  compact?: boolean;
  /** Hide the time / volume / sets tiles when the page already shows them */
  hideStats?: boolean;
  /** Coach view: say so explicitly when the athlete left no RPE / note */
  showMissingFeedback?: boolean;
  className?: string;
}

const effortColor = (rpe: number) =>
  rpe >= 9 ? "bg-red-500/15 text-red-500" : rpe >= 7 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-green-500/15 text-green-600 dark:text-green-400";

/**
 * What the athlete actually did: effort (RPE), their note for the coach,
 * skipped / extra state and — for strength — every set with load, reps,
 * warm-ups and personal records.
 */
export function SessionResults({ assignment, history = [], compact, hideStats, showMissingFeedback = true, className }: Props) {
  const { t, language } = useLanguage();
  const tr = t.admin.results;
  const locale = language === "pt" ? "pt-BR" : "en";
  const { workout } = assignment;
  const isStrength = workout.type === "strength";

  // PRs are measured against sessions completed before this one
  const best = useMemo(() => {
    const finishedAt = assignment.completedAt?.getTime() ?? Date.now();
    return buildBestByExercise(
      history.filter((a) => a.id !== assignment.id && a.completedAt && a.completedAt.getTime() < finishedAt)
    );
  }, [history, assignment]);

  const progress = assignment.progressData ?? [];
  const allSets = progress.flatMap((p) => p.sets);
  const { volume } = computeStrengthVolume(progress);
  const records = progress.reduce(
    (sum, ex) => sum + ex.sets.filter((set) => isPersonalRecord(set, best.get(ex.exerciseId))).length,
    0
  );
  const nameOf = (exerciseId: string) =>
    workout.exercises?.find((we) => we.exerciseId === exerciseId)?.exerciseName || "—";

  const hasFeedback = assignment.rpe !== undefined || !!assignment.athleteNotes;

  return (
    <div className={cn("space-y-3", className)}>
      {assignment.selfLogged && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {tr.extra}
        </p>
      )}

      {assignment.skipped ? (
        <div className="flex items-center gap-2 rounded-xl bg-muted p-3 text-sm">
          <Ban className="h-4 w-4 text-muted-foreground" />
          {tr.skipped}
        </div>
      ) : !assignment.completedAt ? (
        <p className="text-sm text-muted-foreground">{tr.notDone}</p>
      ) : (
        <>
          {/* Effort + note */}
          {hasFeedback ? (
            <div className="rounded-xl border p-3 space-y-2">
              {assignment.rpe !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{tr.effort}</span>
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold", effortColor(assignment.rpe))}>
                    <Flame className="h-3 w-3" />
                    {tr.effortValue.replace("{{n}}", String(assignment.rpe))}
                  </span>
                </div>
              )}
              {assignment.athleteNotes && (
                <div className="flex gap-2">
                  <MessageSquareQuote className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <p className="text-sm whitespace-pre-wrap">
                    <span className="sr-only">{tr.note}: </span>
                    {assignment.athleteNotes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            showMissingFeedback && <p className="text-xs text-muted-foreground">{tr.noFeedback}</p>
          )}

          {/* Strength summary + sets */}
          {isStrength && progress.length > 0 && (
            <>
              {!hideStats && <div className="grid grid-cols-3 gap-2">
                {[
                  { label: tr.time, value: assignment.totalTime ? formatDuration(assignment.totalTime) : "—" },
                  { label: tr.volume, value: volume > 0 ? `${Math.round(volume).toLocaleString(locale)} kg` : "—" },
                  {
                    label: t.athlete.activity.metrics.sets,
                    value: tr.setsSummary
                      .replace("{{done}}", String(allSets.filter((s) => s.completed).length))
                      .replace("{{total}}", String(allSets.length)),
                  },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-muted/50 p-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{stat.label}</p>
                    <p className="text-sm font-bold tabular-nums mt-0.5">{stat.value}</p>
                  </div>
                ))}
              </div>}

              {records > 0 && (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Trophy className="h-3.5 w-3.5" />
                  {tr.records.replace("{{n}}", String(records))}
                </p>
              )}

              {!compact && (
                <div className="space-y-2">
                  {progress.map((ex, exIndex) =>
                    !ex.sets.some((set) => set.completed || set.reps || set.weight) ? (
                      // Untouched exercise: one muted line instead of a row per empty set
                      <div key={exIndex} className="flex items-center justify-between rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground">
                        <span className="truncate">{nameOf(ex.exerciseId)}</span>
                        <span className="text-xs shrink-0">{tr.skippedExercise}</span>
                      </div>
                    ) : (
                    <div key={exIndex} className="rounded-xl border p-3">
                      <p className="text-sm font-semibold mb-1.5">{nameOf(ex.exerciseId)}</p>
                      <div className="space-y-1">
                        {ex.sets.map((set, i) => {
                          const pr = isPersonalRecord(set, best.get(ex.exerciseId));
                          const logged = !!(set.reps || set.weight);
                          return (
                            <div
                              key={i}
                              className={cn(
                                "flex items-center justify-between text-sm tabular-nums",
                                !set.completed && "text-muted-foreground line-through decoration-muted-foreground/40"
                              )}
                            >
                              <span className="flex items-center gap-2">
                                <span className="w-5 text-xs text-muted-foreground text-center">
                                  {set.warmup ? "A" : set.setNumber}
                                </span>
                                {set.warmup && <span className="text-[10px] uppercase text-amber-600">{tr.warmup}</span>}
                                {pr && <span aria-label={t.athlete.session.personalRecord}>🏆</span>}
                              </span>
                              <span className={cn("font-medium", isWorkingSet(set) && pr && "text-amber-600 dark:text-amber-400")}>
                                {logged
                                  ? [set.weight && `${set.weight} kg`, set.reps && `× ${set.reps}`].filter(Boolean).join(" ")
                                  : tr.notLogged}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    )
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
