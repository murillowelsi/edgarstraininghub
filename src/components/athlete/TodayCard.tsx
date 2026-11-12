import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Moon, Play, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dates";
import { SportIcon } from "@/components/icons/sport-icons";
import { sportKey } from "@/components/timeline/sport";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import type { TodayState } from "@/utils/homePlan";
import { estimateWorkoutDistanceKm, estimateWorkoutDurationSec, hasFullTimeEstimate } from "@/utils/workoutDuration";
import { buildWorkoutSummary } from "@/utils/buildWorkoutSummary";
import { workoutCardModel } from "@/utils/workoutSummaryStats";
import { formatTotalTime } from "@/hooks/useAthleteStats";
import { isTomorrow } from "date-fns";

interface Props {
  state: TodayState;
  /** All assignments, to tell strength PRs on the "done" state */
  assignments: AssignmentWithWorkout[];
  onDiscard: (assignment: AssignmentWithWorkout) => void;
  onLogExtra: () => void;
}

/** Colour of the card: the sport, success when done, neutral on a rest day */
const accentVar = (state: TodayState) =>
  state.kind === "rest" ? "--sport-other" : state.kind === "done" ? "--success" : `--sport-${sportKey(state.assignment.workout.type)}`;

/**
 * Today's workout as the hero of the athlete Home (docs/design/home-athlete §2.2):
 * the feed's workout card language at full size with a 52 px main action.
 * States: in progress (draft on this phone), planned ("1 of 2"), done, rest day.
 */
export function TodayCard({ state, assignments, onDiscard, onLogExtra }: Props) {
  const { t, language } = useLanguage();
  const tt = t.athlete.home.todayCard;
  const accent = accentVar(state);
  const style: CSSProperties = {
    backgroundImage: `radial-gradient(130% 100% at 100% 0%, hsl(var(${accent}) / var(--wc-glow)) 0%, transparent 58%)`,
    borderColor: `hsl(var(${accent}) / 0.35)`,
  };

  const nextLine = (next?: AssignmentWithWorkout) =>
    next
      ? tt.restNext
          .replace("{{when}}", isTomorrow(next.scheduledDate) ? tt.tomorrow : formatDate(next.scheduledDate, "weekdayShort", language))
          .replace("{{name}}", next.workout.name)
      : undefined;

  return (
    <section
      style={style}
      aria-label={tt.label}
      className="relative overflow-hidden rounded-3xl border bg-workout-card p-4 text-card-foreground [--wc-glow:0.14] dark:[--wc-glow:0.30]"
    >
      {state.kind === "inProgress" && (
        <>
          <TopLine accent={accent} icon={<SportIcon type={state.assignment.workout.type} className="h-4 w-4" aria-hidden />} right={tt.startedAgo.replace("{{n}}", String(state.minutes))}>
            {tt.inProgress}
          </TopLine>
          <Title>{state.assignment.workout.name}</Title>
          <Meta>{tt.setsProgress.replace("{{done}}", String(state.done)).replace("{{total}}", String(state.total))}</Meta>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={state.total}
            aria-valuenow={state.done}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${state.total ? (state.done / state.total) * 100 : 0}%` }} />
          </div>
          <MainAction to={`/athlete/workout/${state.assignment.id}/session`} icon={<Play className="h-[18px] w-[18px]" fill="currentColor" />}>
            {tt.resume}
          </MainAction>
          <SubActions>
            <button type="button" onClick={() => onDiscard(state.assignment)} className="min-h-11 px-1 hover:text-foreground">
              {tt.discard}
            </button>
            {state.moreToday > 0 ? (
              <Link to="/athlete/calendar" className="flex min-h-11 items-center gap-0.5 px-1 font-semibold text-foreground">
                {(state.moreToday === 1 ? tt.moreToday : tt.moreTodayOther).replace("{{n}}", String(state.moreToday))}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : (
              <Link to={`/athlete/workout/${state.assignment.id}`} className="flex min-h-11 items-center px-1 hover:text-foreground">
                {tt.view}
              </Link>
            )}
          </SubActions>
        </>
      )}

      {state.kind === "planned" && (
        <PlannedBody state={state} accent={accent} />
      )}

      {state.kind === "done" && (
        // "Next" has its own row right below, so the done card doesn't repeat it
        <DoneBody assignment={state.assignment} assignments={assignments} accent={accent} />
      )}

      {state.kind === "rest" && (
        <>
          <TopLine accent={accent} icon={<Moon className="h-4 w-4" aria-hidden />}>{tt.label}</TopLine>
          <Title>{tt.restTitle}</Title>
          <Meta>
            {tt.restNone}
            {state.next && <> {nextLine(state.next)}</>}
          </Meta>
          <button
            type="button"
            onClick={onLogExtra}
            className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] border bg-surface-2 text-base font-bold transition-colors hover:bg-accent"
          >
            <Plus className="h-[18px] w-[18px]" aria-hidden />
            {t.athlete.home.logExtra}
          </button>
        </>
      )}
    </section>
  );
}

function PlannedBody({ state, accent }: { state: Extract<TodayState, { kind: "planned" }>; accent: string }) {
  const { t, language } = useLanguage();
  const tt = t.athlete.home.todayCard;
  const { assignment } = state;
  const w = assignment.workout;
  const isStrength = w.type === "strength";

  // "3 stages · ~40 min · 1.500 m": only what can be summed from the planned stages
  const parts: string[] = [];
  if (isStrength) {
    const n = w.exercises?.length ?? 0;
    parts.push(n === 1 ? tt.exerciseOne : tt.exercises.replace("{{n}}", String(n)));
  } else {
    const n = w.stages?.length ?? 0;
    parts.push(n === 1 ? tt.stageOne : tt.stages.replace("{{n}}", String(n)));
  }
  const sec = hasFullTimeEstimate(w) ? estimateWorkoutDurationSec(w) : 0;
  if (sec > 0) parts.push(`~${formatTotalTime(sec)}`);
  const km = estimateWorkoutDistanceKm(w);
  if (km > 0) {
    const locale = language === "pt" ? "pt-BR" : "en";
    parts.push(
      w.type === "swimming"
        ? `${Math.round(km * 1000).toLocaleString(locale)} m`
        : `${km.toLocaleString(locale, { maximumFractionDigits: 1 })} km`
    );
  }
  const typeLabel = t.workoutMeta.types[w.type] ?? w.type;

  return (
    <>
      <TopLine
        accent={accent}
        icon={<SportIcon type={w.type} className="h-4 w-4" aria-hidden />}
        right={state.count > 1 ? tt.xOfY.replace("{{i}}", String(state.index)).replace("{{n}}", String(state.count)) : undefined}
      >
        {typeLabel} · {tt.label}
      </TopLine>
      <Title>{w.name}</Title>
      <Meta>{parts.join(" · ")}</Meta>
      <MainAction
        to={isStrength ? `/athlete/workout/${assignment.id}/session` : `/athlete/workout/${assignment.id}`}
        icon={<Play className="h-[18px] w-[18px]" fill="currentColor" />}
      >
        {isStrength ? tt.start : tt.open}
      </MainAction>
      <SubActions>
        {isStrength ? (
          <Link to={`/athlete/workout/${assignment.id}`} className="flex min-h-11 items-center px-1 hover:text-foreground">
            {tt.view}
          </Link>
        ) : (
          <span />
        )}
        {state.more > 0 && (
          <Link to="/athlete/calendar" className="flex min-h-11 items-center gap-0.5 px-1 font-semibold text-foreground">
            {(state.more === 1 ? tt.moreToday : tt.moreTodayOther).replace("{{n}}", String(state.more))}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </SubActions>
    </>
  );
}

function DoneBody({
  assignment,
  assignments,
  accent,
}: {
  assignment: AssignmentWithWorkout;
  assignments: AssignmentWithWorkout[];
  accent: string;
}) {
  const { t, language } = useLanguage();
  const tt = t.athlete.home.todayCard;
  // Same numbers as the feed card: time is the strength hero, not the summed load
  const summary = buildWorkoutSummary(assignment, assignments);
  const { hero, secondary } = workoutCardModel(summary, t.timeline.summary, language === "pt" ? "pt-BR" : "en");
  const partial = assignment.completionPercentage !== undefined && assignment.completionPercentage < 100;

  return (
    <>
      <TopLine
        accent={accent}
        icon={<Check className="h-4 w-4" aria-hidden />}
        right={assignment.completedAt ? formatDate(assignment.completedAt, "time", language) : undefined}
      >
        {tt.doneToday}
        {partial && <span className="text-warning-ink"> · {assignment.completionPercentage}%</span>}
      </TopLine>
      <Title>{assignment.workout.name}</Title>
      {(hero || secondary.length > 0) && (
        <div className="mt-2 flex items-baseline gap-4">
          {hero && (
            <span className="font-display text-[30px] font-extrabold leading-none tabular-nums">
              {hero.value}
              {hero.unit && <small className="ml-0.5 text-sm font-bold text-muted-foreground">{hero.unit}</small>}
            </span>
          )}
          {secondary.slice(0, 2).map((m) => (
            <span key={m.key} className="min-w-0 text-sm font-semibold tabular-nums">
              <small className="block truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{m.label}</small>
              <span className="whitespace-nowrap">
                {m.value}
                {m.unit && <span className="ml-0.5 text-muted-foreground">{m.unit}</span>}
              </span>
            </span>
          ))}
        </div>
      )}
      <Link
        to={`/athlete/activity/${assignment.id}`}
        className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] border bg-surface-2 text-base font-bold transition-colors hover:bg-accent"
      >
        {tt.viewSummary}
      </Link>
    </>
  );
}

function TopLine({ accent, icon, right, children }: { accent: string; icon: ReactNode; right?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/80">
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px]"
        style={{ backgroundColor: `hsl(var(${accent}) / 0.18)`, color: `hsl(var(${accent}))` }}
      >
        {icon}
      </span>
      <span className="min-w-0 truncate">{children}</span>
      {right && <span className="ml-auto shrink-0 text-xs font-semibold normal-case tracking-normal text-muted-foreground">{right}</span>}
    </div>
  );
}

const Title = ({ children }: { children: ReactNode }) => (
  <h2 className="mt-3 font-display text-[22px] font-extrabold leading-tight text-balance">{children}</h2>
);

const Meta = ({ children }: { children: ReactNode }) => <p className="mt-1 text-sm text-muted-foreground">{children}</p>;

function MainAction({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={cn(
        "mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-primary text-base font-bold text-primary-foreground",
        "transition-transform hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

const SubActions = ({ children }: { children: ReactNode }) => (
  <div className="mt-1 flex items-center justify-between text-[13px] text-muted-foreground">{children}</div>
);
