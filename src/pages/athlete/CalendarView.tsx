import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getAssignmentsWithWorkoutsByAthlete } from "@/services/workoutAssignmentsService";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import { addDays, format, isSameDay, isToday, isTomorrow } from "date-fns";
import { GrSwim, GrBike, GrRun } from "react-icons/gr";
import {
  Check,
  ChevronRight,
  Dumbbell,
  Loader2,
  PersonStanding,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

const AthleteCalendarView = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<AssignmentWithWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const todayRef = useRef<HTMLDivElement>(null);

  // Generate 60 days (7 days back, 53 days forward)
  const today = new Date();
  const days = Array.from({ length: 60 }, (_, i) => addDays(today, i - 7));

  const scrollToToday = (behavior: ScrollBehavior = "smooth") => {
    const el = todayRef.current;
    if (!el) return;
    // 64px = h-16 main sticky header
    const diff = el.getBoundingClientRect().top - 64;
    window.scrollBy({ top: diff, behavior });
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const data = await getAssignmentsWithWorkoutsByAthlete(user.uid);
        setAssignments(data);
      } catch (error) {
        console.error("Error loading assignments:", error);
        toast({
          title: t.common.error,
          description: t.athlete.toast.calendarLoadError,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, toast]);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => scrollToToday("instant"), 0);
    }
  }, [loading]);

  const getAssignmentsForDate = (date: Date) =>
    assignments.filter((a) => isSameDay(a.scheduledDate, date));

  const formatDateLabel = (date: Date) => {
    if (isToday(date)) return t.athlete.calendar.today;
    if (isTomorrow(date)) return t.athlete.calendar.tomorrow;
    return format(date, "EEEE");
  };

  if (loading) {
    return (
      <AthletePortalLayout title={t.athlete.calendar.title}>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AthletePortalLayout>
    );
  }

  return (
    <AthletePortalLayout title={t.athlete.calendar.title}>
      <div className="divide-y divide-border/50">
        {days.map((day) => {
          const dayAssignments = getAssignmentsForDate(day);
          const isTodayDate = isToday(day);
          const hasWorkouts = dayAssignments.length > 0;

          return (
            <div
              key={day.toISOString()}
              ref={isTodayDate ? todayRef : undefined}
              className={cn(
                "transition-colors",
                isTodayDate && "bg-primary/5"
              )}
            >
              {/* Date Header */}
              <div className="px-4 py-3 flex items-center gap-3">
                {isTodayDate && (
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                )}
                <div className="flex-1">
                  <span
                    className={cn(
                      "font-semibold",
                      isTodayDate ? "text-primary" : "text-foreground"
                    )}
                  >
                    {formatDateLabel(day)}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {format(day, "MMM d")}
                  </span>
                </div>
                {hasWorkouts && (
                  <Badge
                    variant={isTodayDate ? "default" : "secondary"}
                    className="text-xs shrink-0"
                  >
                    {dayAssignments.length}{" "}
                    {dayAssignments.length > 1
                      ? t.athlete.calendar.workouts
                      : t.athlete.calendar.workout}
                  </Badge>
                )}
              </div>

              {/* Workouts for this day */}
              {hasWorkouts && (
                <div className="px-4 pb-3">
                  {dayAssignments.map((assignment) => {
                    const workout = assignment.workout;
                    const Icon =
                      workoutTypeIcons[workout.type] || PersonStanding;
                    const isCompleted = !!assignment.completedAt;

                    return (
                      <Link
                        key={assignment.id}
                        to={`/athlete/workout/${assignment.id}`}
                      >
                        <Card
                          className={cn(
                            "transition-all hover:shadow-md mb-2",
                            isCompleted
                              ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                              : "hover:border-primary/50"
                          )}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "p-2 rounded-lg",
                                  isCompleted
                                    ? "bg-green-100 dark:bg-green-900/30"
                                    : workoutTypeColors[workout.type]
                                )}
                              >
                                {isCompleted ? (
                                  <Check className="h-5 w-5 text-green-600" />
                                ) : (
                                  <Icon className="h-5 w-5" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={cn(
                                    "font-medium truncate",
                                    isCompleted &&
                                      "line-through text-muted-foreground"
                                  )}
                                >
                                  {workout.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {workout.type === "strength"
                                    ? `${workout.exercises?.length || 0} ${t.athlete.workouts.exercises}`
                                    : `${workout.stages.length} ${t.athlete.workouts.stages}`}{" "}
                                  ·{" "}
                                  <span className="capitalize">
                                    {workout.type}
                                  </span>
                                </p>
                              </div>
                              {isCompleted ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-green-100 text-green-700 dark:bg-green-900/50 shrink-0"
                                >
                                  {assignment.completionPercentage !== undefined
                                    ? `${assignment.completionPercentage}%`
                                    : t.athlete.workouts.done}
                                </Badge>
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
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
          );
        })}
      </div>
    </AthletePortalLayout>
  );
};

export default AthleteCalendarView;
