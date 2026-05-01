import AdminLayout from "@/components/AdminLayout";
import UpcomingEventsBanner from "@/components/admin/UpcomingEventsBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  deleteAssignment,
  getAllAssignmentsWithDetails,
} from "@/services/workoutAssignmentsService";
import { getUsersByRole } from "@/services/usersService";
import type { User } from "@/types/user";
import type { WorkoutType } from "@/types/workout";
import type { AssignmentWithDetails } from "@/types/workoutAssignment";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isTomorrow,
  isWeekend,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { GrSwim, GrBike, GrRun } from "react-icons/gr";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarAssignDialog } from "@/components/workout/CalendarAssignDialog";
import { useLanguage } from "../../contexts/LanguageContext";

const workoutTypeColors: Record<WorkoutType, string> = {
  running: "bg-blue-100 border-blue-300 text-blue-800",
  cycling: "bg-green-100 border-green-300 text-green-800",
  swimming: "bg-cyan-100 border-cyan-300 text-cyan-800",
  strength: "bg-amber-100 border-amber-300 text-amber-800",
};

const workoutTypeCardColors: Record<WorkoutType, string> = {
  running: "bg-blue-500/10 text-blue-600",
  cycling: "bg-green-500/10 text-green-600",
  swimming: "bg-cyan-500/10 text-cyan-600",
  strength: "bg-amber-500/10 text-amber-600",
};

const workoutTypeIcons: Record<WorkoutType, React.ElementType> = {
  running: GrRun,
  cycling: GrBike,
  swimming: GrSwim,
  strength: Dumbbell,
};

interface CalendarDayProps {
  date: Date;
  currentMonth: Date;
  assignments: AssignmentWithDetails[];
  onAssignmentClick: (assignment: AssignmentWithDetails) => void;
  onEmptyCellClick: (date: Date) => void;
}

const CalendarDay = ({
  date,
  currentMonth,
  assignments,
  onAssignmentClick,
  onEmptyCellClick,
}: CalendarDayProps) => {
  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isTodayDate = isToday(date);
  const isWeekendDay = isWeekend(date);
  const dayAssignments = assignments.filter((a) =>
    isSameDay(a.scheduledDate, date)
  );

  const maxVisible = 3;
  const visibleAssignments = dayAssignments.slice(0, maxVisible);
  const hiddenCount = dayAssignments.length - maxVisible;

  return (
    <div
      className={cn(
        "min-h-[120px] border border-border p-1 relative group",
        !isCurrentMonth && "bg-muted/30",
        isWeekendDay && isCurrentMonth && "bg-muted/10",
        isTodayDate && "bg-primary/5 ring-2 ring-primary ring-inset"
      )}
    >
      {/* Date number */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
            !isCurrentMonth && "text-muted-foreground",
            isTodayDate && "bg-primary text-primary-foreground"
          )}
        >
          {format(date, "d")}
        </span>

        {/* Quick assign button - shows on hover */}
        {isCurrentMonth && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onEmptyCellClick(date)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Assignments */}
      <ScrollArea className="h-[calc(100%-32px)]">
        <div className="space-y-1 pr-2">
          {visibleAssignments.map((assignment) => {
            const Icon = workoutTypeIcons[assignment.workout.type];
            const isCompleted = !!assignment.completedAt;

            return (
              <Tooltip key={assignment.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onAssignmentClick(assignment)}
                    className={cn(
                      "w-full text-left text-xs p-1.5 rounded border truncate flex items-center gap-1",
                      workoutTypeColors[assignment.workout.type],
                      isCompleted && "opacity-60"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <Icon className="h-3 w-3 flex-shrink-0" />
                    )}
                    <span className={cn(isCompleted && "line-through")}>
                      {assignment.athlete.displayName.split(" ")[0]}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[250px]">
                  <div className="space-y-1">
                    <p className="font-medium">{assignment.workout.name}</p>
                    <p className="text-muted-foreground">
                      {assignment.athlete.displayName}
                    </p>
                    {isCompleted && (
                      <p className="text-green-600 text-xs">
                        Completed {format(assignment.completedAt!, "PPp")}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Show more indicator */}
          {hiddenCount > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full text-left text-xs p-1 text-muted-foreground hover:text-foreground">
                  +{hiddenCount} more
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-1">
                    {dayAssignments.map((assignment) => {
                      const Icon = workoutTypeIcons[assignment.workout.type];
                      const isCompleted = !!assignment.completedAt;

                      return (
                        <button
                          key={assignment.id}
                          onClick={() => onAssignmentClick(assignment)}
                          className={cn(
                            "w-full text-left text-xs p-2 rounded border flex items-center gap-2",
                            workoutTypeColors[assignment.workout.type],
                            isCompleted && "opacity-60"
                          )}
                        >
                          {isCompleted ? (
                            <Check className="h-3 w-3 flex-shrink-0" />
                          ) : (
                            <Icon className="h-3 w-3 flex-shrink-0" />
                          )}
                          <div className="truncate">
                            <p
                              className={cn(
                                "font-medium",
                                isCompleted && "line-through"
                              )}
                            >
                              {assignment.athlete.displayName}
                            </p>
                            <p className="text-muted-foreground truncate">
                              {assignment.workout.name}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

const AdminCalendar = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [athletes, setAthletes] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("all");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [preSelectedWorkoutId, setPreSelectedWorkoutId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<AssignmentWithDetails | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const todayRef = useRef<HTMLDivElement>(null);
  const stickyHeaderRef = useRef<HTMLDivElement>(null);

  // 60-day rolling window for mobile (7 days back, 53 forward)
  const mobileDays = Array.from({ length: 60 }, (_, i) =>
    addDays(new Date(), i - 7)
  );

  const formatDateLabel = (date: Date) => {
    if (isToday(date)) return t.admin.calendar.today;
    if (isTomorrow(date)) return t.admin.calendar.tomorrow;
    return format(date, "EEEE");
  };

  const scrollToToday = (behavior: ScrollBehavior = "smooth") => {
    const el = todayRef.current;
    const header = stickyHeaderRef.current;
    if (!el) return;
    // If sub-header is hidden (mobile), fall back to AdminTopBar height (73px)
    const headerBottom =
      header && header.getBoundingClientRect().height > 0
        ? header.getBoundingClientRect().bottom
        : 73;
    const diff = el.getBoundingClientRect().top - headerBottom;
    window.scrollBy({ top: diff, behavior });
  };

  // Generate calendar days for current month view
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  // Group days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const loadData = async () => {
    try {
      const [assignmentsData, athletesData] = await Promise.all([
        getAllAssignmentsWithDetails(),
        getUsersByRole("athlete"),
      ]);
      setAssignments(assignmentsData);
      setAthletes(athletesData);
    } catch (error) {
      console.error("Error loading calendar data:", error);
      toast({
        title: t.common.error,
        description: t.admin.calendar.toast.loadError,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => scrollToToday("instant"), 0);
    }
  }, [loading]);

  useEffect(() => {
    if (isSameMonth(currentMonth, new Date())) {
      setTimeout(() => scrollToToday("instant"), 0);
    }
  }, [currentMonth]);

  // Check for return from workout editor with new workout
  useEffect(() => {
    const newWorkoutId = searchParams.get("newWorkoutId");
    if (newWorkoutId) {
      // Restore state from sessionStorage
      const savedState = sessionStorage.getItem("calendarAssignState");
      if (savedState) {
        try {
          const { date } = JSON.parse(savedState);
          if (date) {
            const restoredDate = new Date(date);
            setSelectedDate(restoredDate);
            setCurrentMonth(restoredDate); // Navigate calendar to that month
            setPreSelectedWorkoutId(newWorkoutId);
            setAssignDialogOpen(true);
          }
          // Clean up
          sessionStorage.removeItem("calendarAssignState");
        } catch (e) {
          console.error("Failed to parse calendar state:", e);
        }
      }
      // Remove the query param from URL
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };


  const handleAssignmentClick = (assignment: AssignmentWithDetails) => {
    setSelectedAssignment(assignment);
    setDetailsDialogOpen(true);
  };

  const handleEmptyCellClick = (date: Date) => {
    setSelectedDate(date);
    setAssignDialogOpen(true);
  };

  const handleAssignSuccess = () => {
    loadData();
  };

  const handleEditWorkout = () => {
    if (selectedAssignment) {
      setDetailsDialogOpen(false);
      navigate(`/admin/workouts/${selectedAssignment.workoutId}/edit`);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!selectedAssignment) return;

    setDeletingAssignment(true);
    try {
      await deleteAssignment(selectedAssignment.id);
      toast({
        title: t.admin.calendar.toast.assignmentDeleted,
        description: t.admin.calendar.toast.assignmentDeletedDescription,
      });
      setConfirmDeleteOpen(false);
      setDetailsDialogOpen(false);
      setSelectedAssignment(null);
      loadData();
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast({
        title: t.common.error,
        description: t.admin.calendar.toast.deleteError,
        variant: "destructive",
      });
    } finally {
      setDeletingAssignment(false);
    }
  };

  // Filter assignments by selected athlete
  const filteredAssignments =
    selectedAthleteId === "all"
      ? assignments
      : assignments.filter((a) => a.athleteId === selectedAthleteId);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="h-full flex flex-col">
        <UpcomingEventsBanner athleteIdFilter={selectedAthleteId} />
        {/* Header — desktop only on mobile */}
        <div ref={stickyHeaderRef} className="hidden md:block px-4 pt-4 pb-3 border-b bg-background md:sticky md:top-0 z-10 space-y-3">
          {/* Row 1: Title + month navigation */}
          <div className="flex items-center justify-between">
            <h1 className="hidden md:block text-xl md:text-2xl font-bold">{t.admin.calendar.title}</h1>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={handleToday}
                className="px-3 py-1.5 text-sm font-semibold rounded-md hover:bg-muted transition-colors min-w-[120px] text-center"
              >
                {format(currentMonth, "MMM yyyy")}
              </button>
              <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Row 2: Athlete filter + Today */}
          <div className="flex items-center gap-2">
            <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
              <SelectTrigger className="flex-1 h-8 text-sm">
                <SelectValue placeholder={t.admin.calendar.allAthletes} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.admin.calendar.allAthletes}</SelectItem>
                {athletes.map((athlete) => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    {athlete.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleToday} className="shrink-0">
              {t.admin.calendar.today}
            </Button>
          </div>
        </div>

        {/* Calendar Grid — desktop only */}
        <div className="hidden md:block flex-1 p-4 overflow-auto">
          <div className="min-w-[800px]">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0 mb-1">
              {t.admin.calendar.days.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Week rows */}
            <div className="grid grid-cols-1 gap-0">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-0">
                  {week.map((day) => (
                    <CalendarDay
                      key={day.toISOString()}
                      date={day}
                      currentMonth={currentMonth}
                      assignments={filteredAssignments}
                      onAssignmentClick={handleAssignmentClick}
                      onEmptyCellClick={handleEmptyCellClick}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile List View — visible below md breakpoint */}
        <div className="md:hidden flex-1 overflow-auto divide-y divide-border/50">
          {mobileDays.map((day) => {
              const dayAssignments = filteredAssignments.filter((a) =>
                isSameDay(a.scheduledDate, day)
              );
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
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
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
                    <div className="flex items-center gap-2">
                      {hasWorkouts && (
                        <Badge
                          variant={isTodayDate ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {dayAssignments.length}{" "}
                          {dayAssignments.length > 1
                            ? t.admin.calendar.workouts
                            : t.admin.calendar.workout}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => handleEmptyCellClick(day)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Assignments for this day */}
                  {hasWorkouts && (
                    <div className="px-4 pb-3">
                      {dayAssignments.map((assignment) => {
                        const Icon = workoutTypeIcons[assignment.workout.type];
                        const isCompleted = !!assignment.completedAt;

                        return (
                          <button
                            key={assignment.id}
                            onClick={() => handleAssignmentClick(assignment)}
                            className="w-full mb-2 text-left"
                          >
                            <Card
                              className={cn(
                                "transition-all hover:shadow-md",
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
                                        : workoutTypeCardColors[assignment.workout.type]
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
                                      {assignment.workout.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {assignment.athlete.displayName} ·{" "}
                                      {assignment.workout.stages.length} stages ·{" "}
                                      <span className="capitalize">
                                        {assignment.workout.type}
                                      </span>
                                    </p>
                                  </div>
                                  {isCompleted ? (
                                    <Badge
                                      variant="secondary"
                                      className="bg-green-100 text-green-700 dark:bg-green-900/50 shrink-0"
                                    >
                                      Done
                                    </Badge>
                                  ) : (
                                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Legend */}
        <div className="p-4 border-t bg-background">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-muted-foreground">{t.admin.calendar.legend.workoutTypes}</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-cyan-200 border border-cyan-300" />
              <span>Swimming</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-200 border border-green-300" />
              <span>Cycling</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-200 border border-blue-300" />
              <span>Running</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-200 border border-amber-300" />
              <span>Strength</span>
            </div>
            <div className="flex items-center gap-1 ml-4">
              <Check className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{t.admin.calendar.legend.completed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Details Modal */}
      <ResponsiveModal
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        title={selectedAssignment?.workout.name ?? ""}
        description={
          selectedAssignment
            ? `${selectedAssignment.workout.stages.length} stages · ${selectedAssignment.workout.type}`
            : undefined
        }
        className="sm:max-w-[425px]"
      >
        {selectedAssignment && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              {selectedAssignment.workout.type === "running" && (
                <GrRun className="h-5 w-5" />
              )}
              {selectedAssignment.workout.type === "cycling" && (
                <GrBike className="h-5 w-5" />
              )}
              {selectedAssignment.workout.type === "swimming" && (
                <GrSwim className="h-5 w-5" />
              )}
              {selectedAssignment.workout.type === "strength" && (
                <Dumbbell className="h-5 w-5 text-amber-600" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Athlete</p>
                <p className="font-medium">
                  {selectedAssignment.athlete.displayName}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="font-medium">
                  {format(selectedAssignment.scheduledDate, "PPP")}
                </p>
              </div>
            </div>

            {selectedAssignment.completedAt && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                <Check className="h-4 w-4" />
                <span className="text-sm">
                  {t.admin.calendar.completedOn} {format(selectedAssignment.completedAt, "PPp")}
                </span>
              </div>
            )}

            {selectedAssignment.workout.notes && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-sm bg-muted p-2 rounded">
                  {selectedAssignment.workout.notes}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="destructive"
                onClick={() => setConfirmDeleteOpen(true)}
                className="w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t.admin.calendar.deleteAssignment}
              </Button>
              <Button
                variant="outline"
                onClick={handleEditWorkout}
                className="w-full sm:w-auto"
              >
                <Pencil className="h-4 w-4 mr-2" />
                {t.admin.calendar.editWorkout}
              </Button>
            </div>
          </div>
        )}
      </ResponsiveModal>

      {/* Delete Assignment Confirm */}
      <ResponsiveConfirm
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={t.admin.calendar.deleteAssignment}
        description={t.admin.calendar.deleteAssignmentDescription}
        confirmLabel={t.common.delete}
        destructive
        loading={deletingAssignment}
        onConfirm={handleDeleteAssignment}
      />

      {/* Assign Workout Dialog */}
      <CalendarAssignDialog
        selectedDate={selectedDate}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onSuccess={handleAssignSuccess}
        preSelectedWorkoutId={preSelectedWorkoutId}
        onClearPreSelectedWorkout={() => setPreSelectedWorkoutId(null)}
      />
    </AdminLayout>
  );
};

export default AdminCalendar;
