import { CachedAvatar } from "@/components/ui/cached-avatar";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AssignmentWithWorkout, ExerciseProgressData } from "@/types/workoutAssignment";
import { modalityAccent } from "@/utils/modalityColors";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dumbbell } from "lucide-react";
import { GrSwim, GrBike, GrRun } from "react-icons/gr";
import { Link } from "react-router-dom";
import { getActivityHeadline } from "@/utils/activityFormat";

interface Props {
  assignment: AssignmentWithWorkout;
  athleteName: string;
  athletePhotoURL?: string | null;
  href?: string;
}

const icons = {
  running: GrRun,
  cycling: GrBike,
  swimming: GrSwim,
  strength: Dumbbell,
} as const;

const computeStrengthVolume = (progressData?: ExerciseProgressData[]) => {
  if (!progressData) return { sets: 0, volume: 0 };
  let sets = 0;
  let volume = 0;
  for (const ex of progressData) {
    for (const set of ex.sets) {
      if (!set.completed) continue;
      sets += 1;
      const reps = parseInt(set.reps, 10) || 0;
      const weight = parseFloat(set.weight) || 0;
      volume += reps * weight;
    }
  }
  return { sets, volume };
};

const ActivityCard = ({ assignment, athleteName, athletePhotoURL, href }: Props) => {
  const { t, language } = useLanguage();
  const m = t.athlete.activity.metrics;
  const type = assignment.workout.type;
  const Icon = icons[type];
  const dateLocale = language === "pt" ? ptBR : undefined;
  const dateStr = format(
    assignment.completedAt || assignment.scheduledDate,
    language === "pt" ? "dd 'de' MMMM 'de' yyyy 'às' HH:mm" : "MMMM d, yyyy 'at' HH:mm",
    { locale: dateLocale }
  );
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

          <h3 className="font-display font-bold text-lg leading-tight">{assignment.workout.name}</h3>

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

export default ActivityCard;
