import { CachedAvatar } from "@/components/ui/cached-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { type WorkoutType } from "@/types/workout";
import type { User } from "@/types/user";
import { formatHours } from "@/utils/workoutDuration";
import { modalityAccent } from "@/utils/modalityColors";
import { Dumbbell } from "lucide-react";
import { GrBike, GrRun, GrSwim } from "react-icons/gr";
import { Link } from "react-router-dom";

const modalityIcons = {
  running: GrRun,
  cycling: GrBike,
  swimming: GrSwim,
  strength: Dumbbell,
} as const;

export interface AthleteAggregate {
  athlete: User;
  totalPlanned: number;
  totalCompleted: number;
  perType: Record<WorkoutType, { planned: number; completed: number }>;
}

interface Props {
  agg: AthleteAggregate;
}

const AthleteOverviewCard = ({ agg }: Props) => {
  const { t } = useLanguage();
  const tp = t.athlete.profile;

  return (
    <Link to={`/admin/athletes/${agg.athlete.id}`} className="block group">
      <Card className="h-full border-border/50 transition-all hover:shadow-lg hover:border-primary/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <CachedAvatar
              src={agg.athlete.photoURL}
              alt={agg.athlete.displayName}
              fallback={agg.athlete.displayName.charAt(0).toUpperCase()}
              className="h-12 w-12 ring-2 ring-primary/20"
              fallbackClassName="bg-primary text-primary-foreground font-semibold"
            />
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold leading-tight truncate">{agg.athlete.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{agg.athlete.email}</p>
            </div>
          </div>

          <div className="rounded-xl bg-muted/40 p-3 flex items-baseline gap-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              {tp.stats.thisWeek}
            </span>
            <span className="ml-auto font-display text-lg font-extrabold tabular-nums">
              {formatHours(agg.totalCompleted)}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              / {formatHours(agg.totalPlanned)}
            </span>
          </div>

          <div className="space-y-2">
            {(["running", "cycling", "swimming", "strength"] as WorkoutType[]).map((type) => {
              const Icon = modalityIcons[type];
              const accent = modalityAccent(type);
              const { planned, completed } = agg.perType[type];
              const hasData = planned > 0 || completed > 0;
              const pct = planned > 0 ? Math.min(100, Math.round((completed / planned) * 100)) : 0;
              return (
                <div key={type} className={cn("space-y-1", !hasData && "opacity-40")}>
                  <div className="flex items-center gap-2 text-xs">
                    <Icon className="h-3 w-3" style={{ color: accent }} />
                    <span className="text-muted-foreground">{tp.modalities[type]}</span>
                    <span className="ml-auto font-mono tabular-nums">
                      <span className="font-semibold">{formatHours(completed)}</span>
                      <span className="text-muted-foreground"> / {formatHours(planned)}</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: accent }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default AthleteOverviewCard;
