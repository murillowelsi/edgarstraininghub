import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import { ListItemCard } from "@/components/shared/ListItemCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { subscribeToAssignmentsByAthlete, markAssignmentSkipped, unmarkAssignmentSkipped } from "@/services/workoutAssignmentsService";
import { getUserById } from "@/services/usersService";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import { format } from "date-fns";
import { GrSwim, GrBike, GrRun } from "react-icons/gr";
import {
  Check,
  ChevronRight,
  Dumbbell,
  EllipsisVertical,
  Loader2,
  PersonStanding,
  PlayCircle,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const workoutTypeIcons: Record<string, React.ElementType> = {
  running: GrRun,
  cycling: GrBike,
  swimming: GrSwim,
  strength: Dumbbell,
};

const workoutTypeColors: Record<string, string> = {
  running: "#3b82f6",
  cycling: "#22c55e",
  swimming: "#06b6d4",
  strength: "#f97316",
};

const filterColors: Record<string, string> = {
  all: "hsl(var(--primary))",
  pending: "#f59e0b",
  completed: "#22c55e",
  skipped: "#ef4444",
};

const AthleteWorkoutsList = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [displayName, setDisplayName] = useState<string>("");
  const [assignments, setAssignments] = useState<AssignmentWithWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  const initialFilter = (searchParams.get("filter") ?? "pending") as "all" | "pending" | "completed" | "skipped";
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "skipped">(initialFilter);

  useEffect(() => {
    if (!user) return;

    getUserById(user.uid).then((userData) => {
      if (userData) setDisplayName(userData.displayName || "Athlete");
    });

    const unsubscribe = subscribeToAssignmentsByAthlete(user.uid, (data) => {
      setAssignments(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const [search, setSearch] = useState("");
  const [actionAssignment, setActionAssignment] = useState<AssignmentWithWorkout | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);

  const handleMarkSkipped = async (assignment: AssignmentWithWorkout) => {
    setActioning(assignment.id);
    try {
      await markAssignmentSkipped(assignment.id);
      setAssignments((prev) => prev.map((a) =>
        a.id === assignment.id ? { ...a, skipped: true, completedAt: null, completionPercentage: undefined } : a
      ));
      toast({ title: t.athlete.workouts.markedNotDone });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      setActioning(null);
      setActionAssignment(null);
    }
  };

  const handleUnmarkSkipped = async (assignment: AssignmentWithWorkout) => {
    setActioning(assignment.id);
    try {
      await unmarkAssignmentSkipped(assignment.id);
      setAssignments((prev) => prev.map((a) =>
        a.id === assignment.id ? { ...a, skipped: false } : a
      ));
      toast({ title: t.athlete.workouts.reopened });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      setActioning(null);
      setActionAssignment(null);
    }
  };

  // Filter assignments
  const filteredAssignments = assignments.filter((a) => {
    if (filter === "pending" && (a.completedAt || a.skipped)) return false;
    if (filter === "completed" && !a.completedAt) return false;
    if (filter === "skipped" && !a.skipped) return false;
    if (search.trim() && !a.workout.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Stats
  const totalWorkouts = assignments.length;
  const completedWorkouts = assignments.filter((a) => a.completedAt).length;
  const skippedWorkouts = assignments.filter((a) => a.skipped).length;
  const pendingWorkouts = assignments.filter((a) => !a.completedAt && !a.skipped).length;
  const completionRate =
    totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

  if (loading) {
    return (
      <AthletePortalLayout title={t.athlete.workouts.title}>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AthletePortalLayout>
    );
  }

  return (
    <AthletePortalLayout title={t.athlete.workouts.title}>
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t.athlete.workouts.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm rounded-full"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {([
            { key: "all",       label: t.athlete.workouts.tabAll,     count: totalWorkouts },
            { key: "pending",   label: t.athlete.workouts.tabPending,  count: pendingWorkouts },
            { key: "completed", label: t.athlete.workouts.tabDone,     count: completedWorkouts },
            { key: "skipped",   label: t.athlete.workouts.tabNotDone,  count: skippedWorkouts },
          ] as const).map(({ key, label, count }) => {
            const isActive = filter === key;
            const color = filterColors[key];
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all border"
                style={isActive
                  ? { backgroundColor: color, color: "#fff", borderColor: "transparent" }
                  : { backgroundColor: "transparent", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
                }
              >
                {label}
                <span className="ml-0.5 text-[10px] opacity-75">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Workouts List */}
        {filteredAssignments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {filter === "pending"
                  ? t.athlete.workouts.noPending
                  : filter === "completed"
                    ? t.athlete.workouts.noCompleted
                    : t.athlete.workouts.noAssigned}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredAssignments.map((assignment) => {
              const workout = assignment.workout;
              const Icon = workoutTypeIcons[workout.type] || PersonStanding;
              const isCompleted = !!assignment.completedAt;

              const isSkipped = !!assignment.skipped;
              const color = isCompleted ? "#22c55e" : isSkipped ? "#ef4444" : (workoutTypeColors[workout.type] ?? "#8b5cf6");
              const badgeLabel = isCompleted
                ? (assignment.completionPercentage !== undefined ? `${assignment.completionPercentage}%` : t.athlete.workouts.done)
                : isSkipped ? t.athlete.workouts.notDone : workout.type;
              return (
                <ListItemCard
                  key={assignment.id}
                  to={`/athlete/workout/${assignment.id}`}
                  icon={isCompleted ? <Check className="h-5 w-5" /> : isSkipped ? <XCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  iconStyle={{ backgroundColor: `${color}1a`, color }}
                  title={workout.name}
                  titleClassName={(isCompleted || isSkipped) ? "line-through text-muted-foreground" : undefined}
                  subtitle={
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{format(assignment.scheduledDate, "MMM d")}</span>
                      <span>·</span>
                      <span>
                        {workout.type === "strength"
                          ? `${workout.exercises?.length || 0} ${t.athlete.workouts.exercises}`
                          : `${workout.stages.length} ${t.athlete.workouts.stages}`}
                      </span>
                    </div>
                  }
                  right={
                    <Badge
                      variant="outline"
                      className="text-xs font-normal border-transparent"
                      style={{ backgroundColor: `${color}18`, color }}
                    >
                      {badgeLabel}
                    </Badge>
                  }
                  actions={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={(e) => { e.preventDefault(); setActionAssignment(assignment); }}
                    >
                      {actioning === assignment.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <EllipsisVertical className="h-4 w-4" />}
                    </Button>
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      <Drawer open={!!actionAssignment} onOpenChange={(open) => { if (!open) setActionAssignment(null); }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="truncate">{actionAssignment?.workout.name}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-2">
            {/* Resume workout — always shown */}
            <button
              className="flex items-center gap-3 w-full p-4 rounded-lg bg-primary text-primary-foreground transition-colors text-sm font-medium"
              onClick={() => { window.location.href = `/athlete/workout/${actionAssignment?.id}/session`; setActionAssignment(null); }}
            >
              <PlayCircle className="h-5 w-5" />
              {t.athlete.workouts.resumeWorkout}
            </button>
            {/* Mark as not done — shown for pending and completed */}
            {!actionAssignment?.skipped && (
              <button
                className="flex items-center gap-3 w-full p-4 rounded-lg border bg-card hover:bg-muted transition-colors text-sm font-medium"
                onClick={() => actionAssignment && handleMarkSkipped(actionAssignment)}
              >
                {actioning === actionAssignment?.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <XCircle className="h-5 w-5" />}
                {t.athlete.workouts.markAsNotDone}
              </button>
            )}
            {/* Undo — shown for skipped */}
            {actionAssignment?.skipped && (
              <button
                className="flex items-center gap-3 w-full p-4 rounded-lg bg-card border hover:bg-muted transition-colors text-sm font-medium"
                onClick={() => actionAssignment && handleUnmarkSkipped(actionAssignment)}
              >
                {actioning === actionAssignment?.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <RotateCcw className="h-5 w-5" />}
                {t.athlete.workouts.markAsPending}
              </button>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </AthletePortalLayout>
  );
};

export default AthleteWorkoutsList;
