import type { CSSProperties } from "react";
import type { Workout } from "@/types/workout";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate } from "@/lib/dates";
import { SportIcon } from "@/components/icons/sport-icons";
import { sportKey } from "@/components/timeline/sport";
import { PlanViz } from "@/components/timeline/workout-viz/PlanViz";
import { planTotals } from "@/components/timeline/workout-viz/planModel";
import { formatTotalTime } from "@/hooks/useAthleteStats";

/**
 * The planned workout in the feed card language (docs/design/workout-screens §2.1):
 * sport + date, name, only the totals that can be summed, the step chart and the
 * coach's note. No completion control here: that is the bottom bar's job.
 */
export function WorkoutPlanCard({ workout, date }: { workout: Workout; date: Date }) {
  const { t, language } = useLanguage();
  const tw = t.athlete.workoutView;
  const sport = sportKey(workout.type);
  const locale = language === "pt" ? "pt-BR" : "en";

  const totals: { label: string; value: string }[] = [];
  if (workout.type === "strength") {
    const exercises = workout.exercises ?? [];
    totals.push({ label: tw.exercisesSection, value: String(exercises.length) });
    const sets = exercises.reduce((n, we) => n + (Number(we.sets) || 0), 0);
    if (sets > 0) totals.push({ label: t.athlete.session.summary.sets, value: String(sets) });
  } else {
    const p = planTotals(workout);
    if (p.seconds) totals.push({ label: tw.duration, value: `~${formatTotalTime(p.seconds)}` });
    if (p.km)
      totals.push({
        label: t.timeline.summary.distance,
        value:
          workout.type === "swimming"
            ? `${Math.round(p.km * 1000).toLocaleString(locale)} m`
            : `${p.km.toLocaleString(locale, { maximumFractionDigits: 1 })} km`,
      });
    if (p.zones) totals.push({ label: tw.intensity, value: p.zones[0] === p.zones[1] ? `Z${p.zones[0]}` : `Z${p.zones[0]} → Z${p.zones[1]}` });
  }

  const style: CSSProperties = {
    backgroundImage: `radial-gradient(130% 100% at 100% 0%, hsl(var(--sport-${sport}) / var(--wc-glow)) 0%, transparent 58%)`,
    borderColor: `hsl(var(--sport-${sport}) / 0.35)`,
  };
  const stepCount = workout.stages?.length ?? 0;

  return (
    <section style={style} className="rounded-3xl border bg-workout-card p-4 text-card-foreground [--wc-glow:0.14] dark:[--wc-glow:0.30]">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/80">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px]"
          style={{ backgroundColor: `hsl(var(--sport-${sport}) / 0.18)`, color: `hsl(var(--sport-${sport}))` }}
        >
          <SportIcon type={workout.type} className="h-4 w-4" aria-hidden />
        </span>
        <span className="truncate">{t.workoutMeta.types[workout.type] ?? workout.type}</span>
        <span className="ml-auto shrink-0 text-xs font-semibold normal-case tracking-normal text-muted-foreground first-letter:uppercase">
          {formatDate(date, "weekdayShort", language)}
        </span>
      </div>

      <h1 className="mt-3 font-display text-[22px] font-extrabold leading-tight text-balance break-words">{workout.name}</h1>

      {totals.length > 0 && (
        <dl className="mt-3 flex gap-5">
          {totals.map((x) => (
            <div key={x.label} className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{x.label}</dt>
              <dd className="font-display text-lg font-extrabold tabular-nums">{x.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <PlanViz
        workout={workout}
        label={tw.stagesChart.replace("{{n}}", String(stepCount))}
        className="mt-4"
      />

      {workout.notes?.trim() && (
        <div className="mt-4 rounded-xl bg-foreground/[0.04] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{tw.fromCoach}</p>
          <p className="mt-0.5 text-sm whitespace-pre-wrap">{workout.notes}</p>
        </div>
      )}
    </section>
  );
}
