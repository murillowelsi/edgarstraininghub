import { ListItemCard } from "@/components/shared/ListItemCard";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { createSelfLoggedAssignment } from "@/services/workoutAssignmentsService";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import type { Workout } from "@/types/workout";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronRight, Dumbbell, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: string;
  date: Date;
  assignments: AssignmentWithWorkout[];
  /** Workouts still loading (opened from the top bar before they're fetched) */
  loading?: boolean;
}

interface WorkoutOption {
  workout: Workout;
  lastCompletedAt: Date | null;
  lastScheduledAt: Date;
}

// Lets the athlete repeat one of their assigned strength workouts on a day
// the coach didn't schedule it, then jumps straight into the session.
const LogExtraWorkoutSheet = ({ open, onOpenChange, athleteId, date, assignments, loading = false }: Props) => {
  const { t, language } = useLanguage();
  const th = t.athlete.home;
  const dateLocale = language === "pt" ? ptBR : undefined;
  const { toast } = useToast();
  const navigate = useNavigate();
  const [creating, setCreating] = useState<string | null>(null);

  const options = useMemo(() => {
    const byWorkout = new Map<string, WorkoutOption>();
    for (const a of assignments) {
      if (a.workout.type !== "strength") continue;
      const current = byWorkout.get(a.workoutId);
      const completedAt = a.completedAt ?? null;
      if (!current) {
        byWorkout.set(a.workoutId, { workout: a.workout, lastCompletedAt: completedAt, lastScheduledAt: a.scheduledDate });
        continue;
      }
      if (completedAt && (!current.lastCompletedAt || completedAt > current.lastCompletedAt)) {
        current.lastCompletedAt = completedAt;
      }
      if (a.scheduledDate > current.lastScheduledAt) current.lastScheduledAt = a.scheduledDate;
    }
    // Most recently scheduled first — usually the current training block
    return [...byWorkout.values()].sort((a, b) => b.lastScheduledAt.getTime() - a.lastScheduledAt.getTime());
  }, [assignments]);

  const handlePick = async (workoutId: string) => {
    setCreating(workoutId);
    try {
      const id = await createSelfLoggedAssignment(workoutId, athleteId, date);
      onOpenChange(false);
      navigate(`/athlete/workout/${id}/session`);
    } catch (error) {
      console.error("Error logging extra session:", error);
      toast({ title: t.common.error, description: th.logExtraError, variant: "destructive" });
    } finally {
      setCreating(null);
    }
  };

  const dateLabel = format(date, language === "pt" ? "EEEE, d MMM" : "EEEE, MMM d", { locale: dateLocale });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{th.logExtraTitle}</DrawerTitle>
          <DrawerDescription>{th.logExtraDescription.replace("{{date}}", dateLabel)}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-2 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : options.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Dumbbell className="h-10 w-10 mx-auto mb-2" />
              <p className="text-sm">{th.logExtraEmpty}</p>
            </div>
          ) : (
            options.map(({ workout, lastCompletedAt }) => (
              <ListItemCard
                key={workout.id}
                onClick={creating ? undefined : () => handlePick(workout.id)}
                compact
                icon={<Dumbbell className="h-5 w-5" />}
                iconClassName="bg-amber-500/10 text-amber-600 border-amber-200"
                title={workout.name}
                subtitle={`${workout.exercises?.length || 0} ${th.exercises} · ${
                  lastCompletedAt
                    ? th.logExtraLastDone.replace(
                        "{{date}}",
                        format(lastCompletedAt, language === "pt" ? "d MMM" : "MMM d", { locale: dateLocale })
                      )
                    : th.logExtraNeverDone
                }`}
                right={
                  creating === workout.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )
                }
              />
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default LogExtraWorkoutSheet;
