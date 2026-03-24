import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getAssignmentsWithWorkoutsByAthlete } from "@/services/workoutAssignmentsService";
import { getUserById } from "@/services/usersService";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import { format } from "date-fns";
import { GrSwim, GrBike, GrRun } from "react-icons/gr";
import {
  Check,
  ChevronRight,
  Dumbbell,
  Loader2,
  PersonStanding,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const workoutTypeIcons: Record<string, React.ElementType> = {
  running: GrRun,
  cycling: GrBike,
  swimming: GrSwim,
  strength: Dumbbell,
};

const workoutTypeColors: Record<string, string> = {
  running: "bg-blue-500/10 text-blue-600",
  cycling: "bg-green-500/10 text-green-600",
  swimming: "bg-cyan-500/10 text-cyan-600",
  strength: "bg-orange-500/10 text-orange-600",
};

const AthleteWorkoutsList = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState<string>("");
  const [assignments, setAssignments] = useState<AssignmentWithWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        const [userData, assignmentsData] = await Promise.all([
          getUserById(user.uid),
          getAssignmentsWithWorkoutsByAthlete(user.uid),
        ]);

        if (userData) {
          setDisplayName(userData.displayName || "Athlete");
        }
        setAssignments(assignmentsData);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: t.common.error,
          description: t.athlete.toast.workoutsLoadError,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user, toast]);

  // Filter assignments
  const filteredAssignments = assignments.filter((a) => {
    if (filter === "pending") return !a.completedAt;
    if (filter === "completed") return !!a.completedAt;
    return true;
  });

  // Stats
  const totalWorkouts = assignments.length;
  const completedWorkouts = assignments.filter((a) => a.completedAt).length;
  const pendingWorkouts = totalWorkouts - completedWorkouts;
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
      <div className="p-4 space-y-6">
        {/* Program Header */}
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20">
                <Dumbbell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{displayName}{t.athlete.workouts.program}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t.athlete.workouts.trainingSchedule}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.athlete.workouts.progress}</span>
                <span className="font-medium">
                  {completedWorkouts} / {totalWorkouts} {t.athlete.workouts.completed}
                </span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center p-3 rounded-xl bg-background/50">
                <p className="text-2xl font-bold">{totalWorkouts}</p>
                <p className="text-xs text-muted-foreground">{t.athlete.workouts.total}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-background/50">
                <p className="text-2xl font-bold text-green-600">
                  {completedWorkouts}
                </p>
                <p className="text-xs text-muted-foreground">{t.athlete.workouts.done}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-background/50">
                <p className="text-2xl font-bold text-primary">{pendingWorkouts}</p>
                <p className="text-xs text-muted-foreground">{t.athlete.workouts.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter Tabs */}
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as typeof filter)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              {t.athlete.workouts.tabAll} ({totalWorkouts})
            </TabsTrigger>
            <TabsTrigger value="pending">
              {t.athlete.workouts.tabPending} ({pendingWorkouts})
            </TabsTrigger>
            <TabsTrigger value="completed">
              {t.athlete.workouts.tabDone} ({completedWorkouts})
            </TabsTrigger>
          </TabsList>
        </Tabs>

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
          <div className="space-y-3">
            {filteredAssignments.map((assignment) => {
              const workout = assignment.workout;
              const Icon = workoutTypeIcons[workout.type] || PersonStanding;
              const isCompleted = !!assignment.completedAt;

              return (
                <Link
                  key={assignment.id}
                  to={`/athlete/workout/${assignment.id}`}
                >
                  <Card
                    className={cn(
                      "transition-all hover:shadow-md",
                      isCompleted
                        ? "bg-green-50/50 border-green-200 dark:bg-green-950/20"
                        : "hover:border-primary/50"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "p-3 rounded-xl",
                            isCompleted
                              ? "bg-green-100 dark:bg-green-900/30"
                              : workoutTypeColors[workout.type]
                          )}
                        >
                          {isCompleted ? (
                            <Check className="h-6 w-6 text-green-600" />
                          ) : (
                            <Icon className="h-6 w-6" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "font-semibold truncate",
                              isCompleted && "line-through text-muted-foreground"
                            )}
                          >
                            {workout.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="secondary"
                              className="text-xs capitalize"
                            >
                              {workout.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(assignment.scheduledDate, "MMM d")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ·{" "}
                              {workout.type === "strength"
                                ? `${workout.exercises?.length || 0} ${t.athlete.workouts.exercises}`
                                : `${workout.stages.length} ${t.athlete.workouts.stages}`}
                            </span>
                          </div>
                        </div>
                        {isCompleted ? (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-700 dark:bg-green-900/50"
                          >
                            {assignment.completionPercentage !== undefined
                              ? `${assignment.completionPercentage}%`
                              : t.athlete.workouts.done}
                          </Badge>
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AthletePortalLayout>
  );
};

export default AthleteWorkoutsList;
