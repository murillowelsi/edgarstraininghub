import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { stageColors } from "@/types/workout";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import { addDays, format, isAfter, isSameDay, isToday, isTomorrow, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronRight, Dumbbell } from "lucide-react";
import { GrBike, GrRun, GrSwim } from "react-icons/gr";
import { Link } from "react-router-dom";

const icons = {
  running: GrRun,
  cycling: GrBike,
  swimming: GrSwim,
  strength: Dumbbell,
} as const;

const accentFor = (type: keyof typeof icons): string => {
  if (type === "running") return stageColors.run;
  if (type === "cycling") return stageColors.bike;
  if (type === "swimming") return stageColors.swim;
  return "hsl(var(--primary))";
};

interface Props {
  assignments: AssignmentWithWorkout[];
  language: "pt" | "en";
}

const UpcomingWorkoutsList = ({ assignments, language }: Props) => {
  const t = (pt: string, en: string) => (language === "pt" ? pt : en);
  const dateLocale = language === "pt" ? ptBR : undefined;

  const now = new Date();
  const today = startOfDay(now);
  const weekEnd = addDays(today, 7);

  const pending = assignments
    .filter((a) => !a.completedAt && !a.skipped)
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

  const todayItems = pending.filter((a) => isSameDay(a.scheduledDate, now));
  const weekItems = pending.filter(
    (a) => !isSameDay(a.scheduledDate, now) && isAfter(a.scheduledDate, today) && a.scheduledDate <= weekEnd
  );
  const laterItems = pending.filter((a) => isAfter(a.scheduledDate, weekEnd));
  const overdueItems = pending.filter((a) => a.scheduledDate < today && !isSameDay(a.scheduledDate, now));

  if (pending.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border/60 bg-muted/20">
        <p className="text-sm text-muted-foreground">{t("Nenhum treino pendente.", "No pending workouts.")}</p>
      </div>
    );
  }

  const renderGroup = (label: string, items: AssignmentWithWorkout[], tone?: "warning") => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <h3 className={cn(
          "text-xs uppercase tracking-wider font-bold px-1",
          tone === "warning" ? "text-destructive" : "text-muted-foreground"
        )}>
          {label}
        </h3>
        <div className="space-y-2">
          {items.map((a) => {
            const Icon = icons[a.workout.type];
            const accent = accentFor(a.workout.type);
            const isOverdue = a.scheduledDate < today && !isSameDay(a.scheduledDate, now);
            const dayLabel = isToday(a.scheduledDate)
              ? t("Hoje", "Today")
              : isTomorrow(a.scheduledDate)
              ? t("Amanhã", "Tomorrow")
              : format(a.scheduledDate, language === "pt" ? "EEE, dd MMM" : "EEE, MMM dd", { locale: dateLocale });

            return (
              <Link
                key={a.id}
                to={`/athlete/workout/${a.id}`}
                className="block group bg-card rounded-2xl border border-border/50 overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-stretch">
                  <div className="w-1.5 shrink-0" style={{ background: accent }} aria-hidden />
                  <div className="flex-1 p-3 flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${accent}1A` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: accent }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm leading-tight truncate">{a.workout.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <span className={cn(isOverdue && "text-destructive font-medium")}>{dayLabel}</span>
                        {a.workout.stages?.length > 0 && (
                          <>
                            <span>·</span>
                            <span>{a.workout.stages.length} {t("etapas", "stages")}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {renderGroup(t("Atrasados", "Overdue"), overdueItems, "warning")}
      {renderGroup(t("Hoje", "Today"), todayItems)}
      {renderGroup(t("Esta semana", "This week"), weekItems)}
      {renderGroup(t("Mais tarde", "Later"), laterItems)}
    </div>
  );
};

export default UpcomingWorkoutsList;
