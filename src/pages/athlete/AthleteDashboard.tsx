import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Calendar as CalendarIcon, Dumbbell } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";

interface Exercise {
  name: string;
  reps: string;
  details: string;
}

interface Stage {
  name?: string;
  exerciseName?: string;
  type: string;
  sets?: string;
  reps?: string;
  weight?: string;
  duration?: string;
  distance?: string;
  distanceUnit?: string;
  intensity?: string;
  notes?: string;
  repeat?: number;
  stroke?: string;
  equipment?: string[];
}

interface Workout {
  id: string;
  date: string;
  exercises?: Exercise[];
  stages?: Stage[];
  type?: string;
  notes?: string;
  swimmingType?: string;
  cyclingType?: string;
  runningType?: string;
}

const MOCK_WORKOUT: Workout = {
  id: "mock-1",
  date: new Date().toISOString().split("T")[0],
  type: "strength",
  stages: [
    {
      exerciseName: "Push-ups",
      type: "work",
      sets: "3",
      reps: "15",
      notes: "Keep your back straight and core engaged.",
    },
    {
      exerciseName: "Squats",
      type: "work",
      sets: "4",
      reps: "12",
      notes: "Go as deep as possible while maintaining form.",
    },
    {
      name: "Plank",
      type: "work",
      duration: "3 sets of 60 seconds",
      notes: "Focus on breathing.",
    },
  ],
};

const AthleteDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
  const [todayWorkouts, setTodayWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [stageDetailsOpen, setStageDetailsOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<any>(null);
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(-1);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  // Get dates that have workouts
  const workoutDates = allWorkouts.map((workout) => new Date(workout.date));

  // Helper function to get stage type color
  const getStageTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      warmup:
        "border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/20",
      work: "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
      cardio: "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20",
      recovery:
        "border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20",
      rest: "border-l-4 border-l-gray-500 bg-gray-50 dark:bg-gray-950/20",
      cooldown:
        "border-l-4 border-l-purple-500 bg-purple-50 dark:bg-purple-950/20",
      other:
        "border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
    };
    return colors[type] || "border-l-4 border-l-gray-300 bg-muted/20";
  };

  // Helper function to get workout items (exercises or stages)
  const getWorkoutItems = (workout: Workout) => {
    if (workout.stages && workout.stages.length > 0) {
      return workout.stages;
    }
    if (workout.exercises && workout.exercises.length > 0) {
      return workout.exercises;
    }
    return [];
  };

  // Helper function to get item count
  const getWorkoutItemCount = (workout: Workout) => {
    return getWorkoutItems(workout).length;
  };

  // Helper function to render workout item
  const renderWorkoutItem = (item: any, index: number, workout: Workout) => {
    // Check if it's a stage (new format) or exercise (old format)
    const isStage = item.type !== undefined;

    if (isStage) {
      // Stage format
      const stage = item as Stage;
      const itemName = stage.exerciseName || stage.name || `Stage ${index + 1}`;
      let itemDetails = "";

      if (workout?.type === "strength") {
        const parts = [];
        if (stage.sets) parts.push(`${stage.sets} sets`);
        if (stage.reps) parts.push(`${stage.reps} reps`);
        if (stage.weight) parts.push(stage.weight);
        itemDetails = parts.join(", ");
      } else if (workout?.type === "swimming") {
        const parts = [];
        if (stage.stroke) parts.push(stage.stroke);
        if (workout.swimmingType === "pool") parts.push("Pool");
        if (workout.swimmingType === "open-water") parts.push("Open Water");
        if (stage.distance)
          parts.push(`${stage.distance} ${stage.distanceUnit || "m"}`);
        if (stage.duration) parts.push(stage.duration);
        if (stage.intensity) parts.push(stage.intensity);
        itemDetails = parts.join(", ");
      } else if (workout?.type === "cycling") {
        const parts = [];
        if (workout.cyclingType === "indoor") parts.push("Indoor");
        if (workout.cyclingType === "outdoor") parts.push("Outdoor");
        if (stage.distance)
          parts.push(`${stage.distance} ${stage.distanceUnit || "km"}`);
        if (stage.duration) parts.push(stage.duration);
        if (stage.intensity) parts.push(stage.intensity);
        itemDetails = parts.join(", ");
      } else if (workout?.type === "running") {
        const parts = [];
        if (workout.runningType === "indoor") parts.push("Indoor");
        if (workout.runningType === "outdoor") parts.push("Outdoor");
        if (stage.distance)
          parts.push(`${stage.distance} ${stage.distanceUnit || "km"}`);
        if (stage.duration) parts.push(stage.duration);
        if (stage.intensity) parts.push(stage.intensity);
        itemDetails = parts.join(", ");
      } else {
        const parts = [];
        if (stage.distance)
          parts.push(`${stage.distance} ${stage.distanceUnit || "km"}`);
        if (stage.duration) parts.push(stage.duration);
        if (stage.intensity) parts.push(stage.intensity);
        itemDetails = parts.join(", ");
      }

      return (
        <div
          key={index}
          className={`flex flex-col sm:flex-row gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer ${getStageTypeColor(
            stage.type
          )}`}
          onClick={() => {
            setSelectedStage(item);
            setSelectedStageIndex(index);
            setSelectedWorkout(workout);
            setStageDetailsOpen(true);
          }}
        >
          <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
            {index + 1}
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-lg">{itemName}</h3>
            <p className="text-sm text-muted-foreground">
              {stage.notes || itemDetails || `Type: ${stage.type}`}
            </p>
          </div>
          <div className="flex-none flex items-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-secondary text-secondary-foreground capitalize">
              {stage.type}
            </span>
          </div>
        </div>
      );
    } else {
      // Exercise format (legacy)
      const exercise = item as Exercise;
      return (
        <div
          key={index}
          className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer"
          onClick={() => {
            setSelectedStage(item);
            setSelectedStageIndex(index);
            setSelectedWorkout(workout);
            setStageDetailsOpen(true);
          }}
        >
          <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
            {index + 1}
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-lg">{exercise.name}</h3>
            <p className="text-sm text-muted-foreground">{exercise.details}</p>
          </div>
          <div className="flex-none flex items-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-secondary text-secondary-foreground">
              {exercise.reps}
            </span>
          </div>
        </div>
      );
    }
  };

  useEffect(() => {
    const fetchWorkouts = async () => {
      if (!user) return;

      try {
        // Fetch all workouts for the athlete
        const q = query(
          collection(db, "workouts"),
          where("athleteId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        const fetchedWorkouts = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Workout[];

        // Sort by date (most recent first)
        fetchedWorkouts.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setAllWorkouts(fetchedWorkouts);

        // Find today's workouts
        const today = new Date().toISOString().split("T")[0];
        const todayWorkoutsList = fetchedWorkouts.filter(
          (w) => w.date === today
        );
        setTodayWorkouts(todayWorkoutsList);

        // For backward compatibility, set the first workout if any
        setWorkout(todayWorkoutsList.length > 0 ? todayWorkoutsList[0] : null);
      } catch (error) {
        console.error("Error fetching workouts:", error);
        setWorkout(MOCK_WORKOUT);
        setAllWorkouts([MOCK_WORKOUT]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkouts();
  }, [user]);

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back!
            </h1>
            <p className="text-muted-foreground mt-1 sm:mt-2">
              Here is your training plan for today.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setCalendarOpen(true)}
            className="flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 px-3 sm:px-4 py-2 rounded-lg self-start sm:self-auto border-primary/20"
          >
            <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="font-medium text-sm sm:text-base">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading workouts...</div>
        ) : todayWorkouts.length > 0 ? (
          todayWorkouts.length === 1 ? (
            <div className="bg-card rounded-lg border shadow-sm">
              <CardHeader className="flex flex-row items-center gap-4 border-b bg-muted/50 pb-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Dumbbell className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Today's Workout</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {getWorkoutItemCount(todayWorkouts[0])} exercises scheduled
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {getWorkoutItems(todayWorkouts[0]).map((item, index) =>
                  renderWorkoutItem(item, index, todayWorkouts[0])
                )}
              </CardContent>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-4">
              {todayWorkouts.map((workoutItem, workoutIndex) => (
                <AccordionItem
                  key={workoutItem.id}
                  value={`workout-${workoutIndex}`}
                  className="bg-card rounded-lg border shadow-sm"
                >
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Dumbbell className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-semibold">
                          Workout {workoutIndex + 1}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {getWorkoutItemCount(workoutItem)} exercises scheduled
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="bg-muted/20 p-4 rounded-lg border">
                      <h3 className="font-semibold text-base mb-4">
                        Workout Details
                      </h3>
                      <div className="space-y-3 text-sm">
                        {getWorkoutItems(workoutItem).map((item, index) => {
                          const isStage = item.type !== undefined;
                          if (!isStage) return null; // Skip exercises for summary
                          const stage = item as Stage;
                          const stageName =
                            stage.name || stage.type || `Stage ${index + 1}`;
                          const details = [];
                          if (stage.duration) details.push(`${stage.duration}`);
                          // Add pace if available, perhaps from workout.pace or calculate
                          const pace = (workoutItem as any).pace;
                          if (pace && stage.duration && stage.distance) {
                            // Calculate pace range or something, but for now just show pace
                            details.push(`@ ${pace} min/km`);
                          } else if (pace) {
                            details.push(`@ ${pace} min/km`);
                          }
                          const detailLine = details.join(" ");
                          return (
                            <div key={index} className="space-y-1">
                              <div className="font-medium capitalize">
                                {stageName}
                              </div>
                              {detailLine && (
                                <div className="text-muted-foreground">
                                  {detailLine}
                                </div>
                              )}
                              {stage.intensity && (
                                <div className="text-muted-foreground">
                                  {stage.intensity}
                                </div>
                              )}
                              {stage.repeat && stage.repeat > 1 && (
                                <div className="text-muted-foreground">
                                  Repeat {stage.repeat} times
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )
        ) : (
          <div className="bg-card rounded-lg border shadow-sm">
            <div className="text-center py-12 text-muted-foreground">
              No workouts scheduled for today.
            </div>
          </div>
        )}
      </div>

      <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30 flex-none">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Training Calendar
            </DialogTitle>
          </DialogHeader>

          <div className="grid md:grid-cols-2 divide-x flex-1 min-h-0">
            {/* Left Side - Calendar */}
            <div className="flex flex-col">
              <div className="p-6 pb-4 flex-none">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide text-center">
                  Select a Date
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto flex items-start justify-center px-6 pt-8">
                <div className="space-y-4 w-full max-w-md">
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      modifiers={{
                        hasWorkout: workoutDates,
                      }}
                      modifiersClassNames={{
                        hasWorkout:
                          "bg-primary/10 text-primary font-semibold relative after:absolute after:bottom-0.5 after:left-1/2 after:transform after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full",
                      }}
                      className="rounded-md !border-none"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md py-2 px-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Workout scheduled</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Workout Details */}
            <div className="bg-muted/20 flex flex-col min-h-0">
              <div className="p-6 pb-4 flex-none">
                <p className="text-lg font-bold text-center">
                  {selectedDate
                    ? selectedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "No date selected"}
                </p>
              </div>

              {selectedDate &&
                (() => {
                  const selectedDateString = selectedDate
                    .toISOString()
                    .split("T")[0];
                  const dayWorkout = allWorkouts.find(
                    (w) => w.date === selectedDateString
                  );

                  if (!dayWorkout) {
                    return (
                      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Dumbbell className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <h4 className="font-semibold text-base mb-1">
                          No Workout Scheduled
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          This is a rest day or free training day
                        </p>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="px-6 pb-4 flex-none">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Dumbbell className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">
                              Workout Plan
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {getWorkoutItemCount(dayWorkout)}{" "}
                              {getWorkoutItemCount(dayWorkout) === 1
                                ? "exercise"
                                : "exercises"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto px-6 min-h-0">
                        <div className="space-y-2 pb-4">
                          {getWorkoutItems(dayWorkout).map((item, index) => {
                            const isStage = item.type !== undefined;
                            const itemName = isStage
                              ? item.exerciseName ||
                                item.name ||
                                `Stage ${index + 1}`
                              : item.name;
                            const itemDetails = isStage
                              ? dayWorkout.type === "strength"
                                ? `${item.sets || ""} ${item.reps || ""} ${
                                    item.weight || ""
                                  }`.trim()
                                : dayWorkout.type === "swimming"
                                ? `${item.stroke || ""} ${
                                    dayWorkout.swimmingType === "pool"
                                      ? "Pool"
                                      : dayWorkout.swimmingType === "open-water"
                                      ? "Open Water"
                                      : ""
                                  } ${item.distance || ""} ${
                                    item.distanceUnit || ""
                                  } ${item.duration || ""} ${
                                    item.intensity || ""
                                  }`.trim()
                                : dayWorkout.type === "cycling"
                                ? `${
                                    dayWorkout.cyclingType === "indoor"
                                      ? "Indoor"
                                      : dayWorkout.cyclingType === "outdoor"
                                      ? "Outdoor"
                                      : ""
                                  } ${item.distance || ""} ${
                                    item.distanceUnit || ""
                                  } ${item.duration || ""} ${
                                    item.intensity || ""
                                  }`.trim()
                                : dayWorkout.type === "running"
                                ? `${
                                    dayWorkout.runningType === "indoor"
                                      ? "Indoor"
                                      : dayWorkout.runningType === "outdoor"
                                      ? "Outdoor"
                                      : ""
                                  } ${item.distance || ""} ${
                                    item.distanceUnit || ""
                                  } ${item.duration || ""} ${
                                    item.intensity || ""
                                  }`.trim()
                                : `${item.distance || ""} ${
                                    item.distanceUnit || ""
                                  } ${item.duration || ""} ${
                                    item.intensity || ""
                                  }`.trim()
                              : item.reps;

                            return (
                              <div
                                key={index}
                                className={`bg-background rounded-lg p-4 border border-border/50 hover:border-primary/30 transition-colors cursor-pointer ${
                                  isStage ? getStageTypeColor(item.type) : ""
                                }`}
                                onClick={() => {
                                  setSelectedStage(item);
                                  setSelectedStageIndex(index);
                                  setStageDetailsOpen(true);
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-none w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-semibold text-sm mb-1">
                                      {itemName}
                                    </h5>
                                    {itemDetails && (
                                      <p className="text-xs text-muted-foreground mb-2">
                                        <span className="font-medium">
                                          {dayWorkout.type === "strength"
                                            ? "Sets/Reps:"
                                            : "Details:"}
                                        </span>{" "}
                                        {itemDetails}
                                      </p>
                                    )}
                                    {(isStage ? item.notes : item.details) && (
                                      <p className="text-xs text-muted-foreground">
                                        {isStage ? item.notes : item.details}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-6 pt-4 border-t bg-background flex-none">
                        <Button
                          className="w-full"
                          onClick={() => {
                            setCalendarOpen(false);
                            navigate(`/athlete/workout/${dayWorkout.id}`);
                          }}
                        >
                          View Full Workout Details
                        </Button>
                      </div>
                    </>
                  );
                })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stage Details Dialog */}
      <Dialog open={stageDetailsOpen} onOpenChange={setStageDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg">
                {selectedStageIndex + 1}
              </div>
              <div>
                <span className="text-lg">
                  {selectedStage?.exerciseName ||
                    selectedStage?.name ||
                    `Stage ${selectedStageIndex + 1}`}
                </span>
                {selectedStage?.type && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground capitalize">
                      {selectedStage.type}
                    </span>
                  </div>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedStage && (
            <div className="space-y-6 py-4">
              {/* Stage Details */}
              <div
                className={`p-4 rounded-lg border ${
                  selectedStage.type
                    ? getStageTypeColor(selectedStage.type)
                    : "bg-muted/20"
                }`}
              >
                <h3 className="font-semibold text-base mb-3">Stage Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedWorkout?.type === "strength" ? (
                    <>
                      {selectedStage.sets && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Sets:
                          </span>
                          <p className="text-sm">{selectedStage.sets}</p>
                        </div>
                      )}
                      {selectedStage.reps && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Reps:
                          </span>
                          <p className="text-sm">{selectedStage.reps}</p>
                        </div>
                      )}
                      {selectedStage.weight && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Weight:
                          </span>
                          <p className="text-sm">{selectedStage.weight}</p>
                        </div>
                      )}
                    </>
                  ) : selectedWorkout?.type === "swimming" ? (
                    <>
                      {selectedStage.distance && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Distance:
                          </span>
                          <p className="text-sm">
                            {selectedStage.distance}{" "}
                            {selectedStage.distanceUnit || "m"}
                          </p>
                        </div>
                      )}
                      {selectedStage.duration && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Duration:
                          </span>
                          <p className="text-sm">{selectedStage.duration}</p>
                        </div>
                      )}
                      {selectedStage.intensity && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Intensity:
                          </span>
                          <p className="text-sm">{selectedStage.intensity}</p>
                        </div>
                      )}
                      {/* Swimming-specific fields */}
                      {selectedStage.stroke && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Stroke:
                          </span>
                          <p className="text-sm">{selectedStage.stroke}</p>
                        </div>
                      )}
                      {selectedStage.swimmingType && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Swimming Type:
                          </span>
                          <p className="text-sm">
                            {selectedWorkout?.swimmingType === "pool"
                              ? "Pool Swimming"
                              : selectedWorkout?.swimmingType === "open-water"
                              ? "Open Water Swimming"
                              : ""}
                          </p>
                        </div>
                      )}
                      {(workout as any).pace && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Pace:
                          </span>
                          <p className="text-sm">{(workout as any).pace}</p>
                        </div>
                      )}
                      {selectedStage.equipment &&
                        selectedStage.equipment.length > 0 && (
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">
                              Equipment:
                            </span>
                            <p className="text-sm">
                              {selectedStage.equipment.join(", ")}
                            </p>
                          </div>
                        )}
                    </>
                  ) : selectedWorkout?.type === "cycling" ? (
                    <>
                      {selectedStage.distance && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Distance:
                          </span>
                          <p className="text-sm">
                            {selectedStage.distance}{" "}
                            {selectedStage.distanceUnit || "km"}
                          </p>
                        </div>
                      )}
                      {selectedStage.duration && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Duration:
                          </span>
                          <p className="text-sm">{selectedStage.duration}</p>
                        </div>
                      )}
                      {selectedStage.intensity && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Intensity:
                          </span>
                          <p className="text-sm">{selectedStage.intensity}</p>
                        </div>
                      )}
                      {/* Cycling-specific fields */}
                      {selectedWorkout?.cyclingType && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Cycling Type:
                          </span>
                          <p className="text-sm">
                            {workout.cyclingType === "indoor"
                              ? "Indoor Cycling"
                              : workout.cyclingType === "outdoor"
                              ? "Outdoor Cycling"
                              : ""}
                          </p>
                        </div>
                      )}
                      {(workout as any).avgSpeed && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Avg Speed:
                          </span>
                          <p className="text-sm">{(workout as any).avgSpeed}</p>
                        </div>
                      )}
                    </>
                  ) : selectedWorkout?.type === "running" ? (
                    <>
                      {selectedStage.distance && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Distance:
                          </span>
                          <p className="text-sm">
                            {selectedStage.distance}{" "}
                            {selectedStage.distanceUnit || "km"}
                          </p>
                        </div>
                      )}
                      {selectedStage.duration && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Duration:
                          </span>
                          <p className="text-sm">{selectedStage.duration}</p>
                        </div>
                      )}
                      {selectedStage.intensity && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Intensity:
                          </span>
                          <p className="text-sm">{selectedStage.intensity}</p>
                        </div>
                      )}
                      {/* Running-specific fields */}
                      {selectedWorkout?.runningType && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Running Type:
                          </span>
                          <p className="text-sm">
                            {workout.runningType === "indoor"
                              ? "Indoor Running"
                              : workout.runningType === "outdoor"
                              ? "Outdoor Running"
                              : ""}
                          </p>
                        </div>
                      )}
                      {(workout as any).pace && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Pace:
                          </span>
                          <p className="text-sm">{(workout as any).pace}</p>
                        </div>
                      )}
                      {(workout as any).terrain && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Terrain:
                          </span>
                          <p className="text-sm">{(workout as any).terrain}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {selectedStage.distance && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Distance:
                          </span>
                          <p className="text-sm">
                            {selectedStage.distance}{" "}
                            {selectedStage.distanceUnit || "km"}
                          </p>
                        </div>
                      )}
                      {selectedStage.duration && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Duration:
                          </span>
                          <p className="text-sm">{selectedStage.duration}</p>
                        </div>
                      )}
                      {selectedStage.intensity && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Intensity:
                          </span>
                          <p className="text-sm">{selectedStage.intensity}</p>
                        </div>
                      )}
                    </>
                  )}
                  {selectedStage.repeat && selectedStage.repeat > 1 && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">
                        Repeat:
                      </span>
                      <p className="text-sm">{selectedStage.repeat}x</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {(selectedStage.notes || selectedStage.details) && (
                <div className="bg-muted/20 p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedStage.notes || selectedStage.details}
                  </p>
                </div>
              )}

              {/* Stage Type Description */}
              {selectedStage.type && (
                <div className="bg-muted/20 p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-2">Stage Type</h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {selectedStage.type === "warmup" &&
                      "Aquecimento - Prepare your body for the main workout"}
                    {selectedStage.type === "work" &&
                      "Exercícios - Main working phase of the workout"}
                    {selectedStage.type === "cardio" &&
                      "Corrida - Cardiovascular training phase"}
                    {selectedStage.type === "recovery" &&
                      "Recuperação - Active recovery between intense efforts"}
                    {selectedStage.type === "rest" &&
                      "Descanso - Rest or recovery period"}
                    {selectedStage.type === "cooldown" &&
                      "Desaquecimento - Cool down and recovery phase"}
                    {selectedStage.type === "other" &&
                      "Outros - Additional or miscellaneous activities"}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AthleteDashboard;
