import { Badge } from "@/components/ui/badge";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import { modalityAccent } from "@/utils/modalityColors";
import { Dumbbell, Trophy } from "lucide-react";
import type { CSSProperties } from "react";
import { buildWorkoutSummary } from "@/utils/buildWorkoutSummary";
import { workoutCardModel } from "@/utils/workoutSummaryStats";
import { SportIcon } from "@/components/icons/sport-icons";
import { sportKey } from "@/components/timeline/sport";
import { GrSwim, GrBike, GrRun } from "react-icons/gr";
import { Link } from "react-router-dom";
import { getActivityHeadline } from "@/utils/activityFormat";
import { computeStrengthVolume } from "@/utils/strengthStats";
import { formatDate } from "@/lib/dates";

interface Props {
  assignment: AssignmentWithWorkout;
  athleteName: string;
  athletePhotoURL?: string | null;
  href?: string;
  /** On the athlete's own feed the avatar + name on every card is noise */
  hideAuthor?: boolean;
  /**
   * "compact": the feed card language at ~112 px (athlete profile, docs/design/profile §2.4).
   * Default keeps the original card (coach athlete history).
   */
  variant?: "default" | "compact";
  /** Compact: all the athlete's assignments, to tell strength PRs */
  allAssignments?: AssignmentWithWorkout[];
}

const icons = {
  running: GrRun,
  cycling: GrBike,
  swimming: GrSwim,
  strength: Dumbbell,
} as const;

const ActivityCard = (props: Props) => {
  if (props.variant === "compact") return <CompactActivityCard {...props} />;
  return <DefaultActivityCard {...props} />;
};

const DefaultActivityCard = ({ assignment, athleteName, athletePhotoURL, href, hideAuthor }: Props) => {
  const { t, language } = useLanguage();
  const m = t.athlete.activity.metrics;
  const type = assignment.workout.type;
  const Icon = icons[type];
  const activityDate = assignment.completedAt || assignment.scheduledDate;
  // Short "22 Oct, 06:42" like the rest of the app; the year only when it isn't this one
  const dateStr = formatDate(activityDate, "dateTime", language);
  const accentColor = modalityAccent(type);

  let metrics: { label: string; value: string }[] = [];
  if (type === "strength") {
    const { sets, volume } = computeStrengthVolume(assignment.progressData);
    metrics = [
      { label: m.sets, value: String(sets) },
      { label: m.time, value: assignment.totalTime ? `${Math.round(assignment.totalTime / 60)}min` : "—" },
      { label: m.volume, value: volume > 0 ? `${Math.round(volume)} kg` : "—" },
    ];
  } else {
    const h = getActivityHeadline(type, assignment.activityData);
    const labelMap: Record<string, [string, string, string]> = {
      running: [m.distance, m.pace, m.time],
      cycling: [m.distance, m.time, m.speed],
      swimming: [m.distance, m.time, m.pace],
    };
    const ls = labelMap[type] || [m.distance, m.time, m.pace];
    metrics = [
      { label: ls[0], value: h.primary },
      { label: ls[1], value: h.secondary },
      { label: ls[2], value: h.tertiary },
    ];
  }

  return (
    <Link
      to={href ?? `/athlete/activity/${assignment.id}`}
      className={cn(
        "block group bg-card rounded-2xl border border-border/50 overflow-hidden",
        "transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
      )}
    >
      <div className="flex">
        <div className="w-1.5 shrink-0" style={{ background: accentColor }} aria-hidden />
        <div className="flex-1 p-4 space-y-3">
          {hideAuthor ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: accentColor }} />
              <span className="truncate">{dateStr}</span>
            </p>
          ) : (
          <div className="flex items-center gap-3">
            <CachedAvatar
              src={athletePhotoURL || undefined}
              alt={athleteName}
              fallback={athleteName.charAt(0).toUpperCase()}
              className="h-10 w-10 shrink-0"
              fallbackClassName="bg-primary text-primary-foreground text-sm font-semibold"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{athleteName}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: accentColor }} />
                <span className="truncate">{dateStr}</span>
              </p>
            </div>
          </div>
          )}

          <h3 className="font-display font-bold text-lg leading-tight flex items-center gap-2">
            <span>{assignment.workout.name}</span>
            {assignment.selfLogged && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-sans font-medium">{t.athlete.home.extra}</Badge>
            )}
          </h3>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {metrics.map((row, i) => (
              <div key={i} className="space-y-0.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{row.label}</p>
                <p className="font-display font-bold text-base leading-none">{row.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
};

/**
 * Compact workout card in the feed's language: sport glow and border, sport + short
 * date, name, one hero number (time for strength, as in the feed) and up to two
 * secondaries, PR or partial badge.
 */
const CompactActivityCard = ({ assignment, allAssignments, href }: Props) => {
  const { t, language } = useLanguage();
  const ts = t.timeline.summary;
  const type = assignment.workout.type;
  const sport = sportKey(type);
  const summary = buildWorkoutSummary(assignment, allAssignments ?? [assignment]);
  const { hero, secondary } = workoutCardModel(summary, ts, language === "pt" ? "pt-BR" : "en");
  const typeLabel = t.workoutMeta.types[type] ?? type;
  const date = formatDate(assignment.completedAt || assignment.scheduledDate, "weekdayShort", language);
  const partial = assignment.completionPercentage !== undefined && assignment.completionPercentage < 100;
  const records = summary.records ?? 0;

  const style: CSSProperties = {
    backgroundImage: `radial-gradient(130% 120% at 100% 0%, hsl(var(--sport-${sport}) / var(--wc-glow)) 0%, transparent 55%)`,
    borderColor: `hsl(var(--sport-${sport}) / 0.3)`,
  };

  return (
    <Link
      to={href ?? `/athlete/activity/${assignment.id}`}
      style={style}
      className="relative block overflow-hidden rounded-[18px] border bg-workout-card px-3.5 py-3 text-card-foreground transition-colors [--wc-glow:0.14] dark:[--wc-glow:0.30] hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.07em] text-foreground/80">
        <span
          className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-lg"
          style={{ backgroundColor: `hsl(var(--sport-${sport}) / 0.18)`, color: `hsl(var(--sport-${sport}))` }}
        >
          <SportIcon type={type} className="h-[15px] w-[15px]" aria-hidden />
        </span>
        <span className="truncate">{typeLabel}</span>
        <span className="ml-auto shrink-0 text-xs font-medium normal-case tracking-normal text-muted-foreground">{date}</span>
      </div>

      <p className="mt-1.5 flex items-center gap-2 truncate text-base font-semibold">
        <span className="truncate">{assignment.workout.name}</span>
        {assignment.selfLogged && (
          <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px] font-medium">{t.athlete.home.extra}</Badge>
        )}
      </p>

      <div className="mt-2 flex items-baseline gap-3.5 pr-16">
        {hero && (
          <span className="font-display text-[26px] font-extrabold leading-none tabular-nums">
            {hero.value}
            {hero.unit && <small className="ml-0.5 text-[13px] font-bold text-muted-foreground">{hero.unit}</small>}
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

      {records > 0 ? (
        <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-extrabold text-primary-ink dark:bg-primary dark:text-primary-foreground">
          <Trophy className="h-[11px] w-[11px]" aria-hidden />
          {records > 1 ? `${records} PR` : "PR"}
        </span>
      ) : partial ? (
        <span className="absolute bottom-3 right-3 rounded-md bg-warning/15 px-1.5 py-0.5 text-[11px] font-bold text-warning-ink">
          {assignment.completionPercentage}%
        </span>
      ) : null}
    </Link>
  );
};

export default ActivityCard;
