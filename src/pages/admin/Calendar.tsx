import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
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
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
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
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarAssignDialog } from "@/components/workout/CalendarAssignDialog";

const workoutTypeColors: Record<WorkoutType, string> = {
  running: "bg-blue-100 border-blue-300 text-blue-800",
  cycling: "bg-green-100 border-green-300 text-green-800",
  swimming: "bg-cyan-100 border-cyan-300 text-cyan-800",
  strength: "bg-orange-100 border-orange-300 text-orange-800",
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
        title: "Error",
        description: "Failed to load calendar data.",
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
        title: "Assignment deleted",
        description: "The workout assignment has been removed.",
      });
      setConfirmDeleteOpen(false);
      setDetailsDialogOpen(false);
      setSelectedAssignment(null);
      loadData();
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast({
        title: "Error",
        description: "Failed to delete the assignment.",
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
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b bg-background sticky top-0 z-10 space-y-3">
          {/* Row 1: Title + month navigation */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold">Calendar</h1>
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
                <SelectValue placeholder="All Athletes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Athletes</SelectItem>
                {athletes.map((athlete) => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    {athlete.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleToday} className="shrink-0">
              Today
            </Button>
          </div>
        </div>

        {/* Calendar Grid — desktop only */}
        <div className="hidden md:block flex-1 p-4 overflow-auto">
          <div className="min-w-[800px]">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0 mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
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
        <div className="md:hidden flex-1 overflow-auto p-4 space-y-4">
          {calendarDays
            .filter((day) => isSameMonth(day, currentMonth))
            .map((day) => {
              const dayAssignments = filteredAssignments.filter((a) =>
                isSameDay(a.scheduledDate, day)
              );
              return (
                <div key={day.toISOString()} className="space-y-2">
                  {/* Day header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isToday(day) && "text-primary"
                      )}
                    >
                      {format(day, "EEEE, MMM d")}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={() => handleEmptyCellClick(day)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>

                  {/* Assignments for this day */}
                  {dayAssignments.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-1">
                      No workouts
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {dayAssignments.map((assignment) => {
                        const Icon = workoutTypeIcons[assignment.workout.type];
                        const isCompleted = !!assignment.completedAt;
                        return (
                          <div
                            key={assignment.id}
                            className={cn(
                              "flex items-center justify-between rounded-lg border p-3",
                              workoutTypeColors[assignment.workout.type],
                              isCompleted && "opacity-60"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isCompleted ? (
                                <Check className="h-4 w-4 flex-shrink-0" />
                              ) : (
                                <Icon className="h-4 w-4 flex-shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p
                                  className={cn(
                                    "text-sm font-medium truncate",
                                    isCompleted && "line-through"
                                  )}
                                >
                                  {assignment.workout.name}
                                </p>
                                <p className="text-xs truncate opacity-75">
                                  {assignment.athlete.displayName}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleAssignmentClick(assignment)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleAssignmentClick(assignment)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
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
            <span className="text-muted-foreground">Workout types:</span>
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
              <div className="w-3 h-3 rounded bg-orange-200 border border-orange-300" />
              <span>Strength</span>
            </div>
            <div className="flex items-center gap-1 ml-4">
              <Check className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">= Completed</span>
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
                <Dumbbell className="h-5 w-5 text-orange-600" />
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
                  Completed on {format(selectedAssignment.completedAt, "PPp")}
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
                Delete Assignment
              </Button>
              <Button
                variant="outline"
                onClick={handleEditWorkout}
                className="w-full sm:w-auto"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Workout
              </Button>
            </div>
          </div>
        )}
      </ResponsiveModal>

      {/* Delete Assignment Confirm */}
      <ResponsiveConfirm
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete Assignment"
        description="Are you sure you want to delete this assignment? This action cannot be undone."
        confirmLabel="Delete"
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
