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

interface LibraryExercise {
  id: string;
  name: string;
  defaultReps: string;
  description: string;
  youtubeUrl?: string;
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
  youtubeUrl?: string;
  libraryExerciseId?: string;
  childStages?: Stage[];
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
  pace?: string;
  avgSpeed?: string;
  terrain?: string;
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
  const [selectedStage, setSelectedStage] = useState<Stage | Exercise | null>(
    null
  );
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(-1);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [libraryExercises, setLibraryExercises] = useState<LibraryExercise[]>(
    []
  );

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

  const getYouTubeVideoId = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
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
  const renderWorkoutItem = (
    item: Stage | Exercise,
    index: number,
    workout: Workout
  ) => {
    const isStage = 'type' in item;
    
    // Portuguese translations for stage types
    const getTypeLabel = (type: string) => {
      const labels: Record<string, string> = {
        warmup: "Aquecimento",
        work: "Exercício",
        cardio: "Corrida",
        recovery: "Recuperação",
        rest: "Descanso",
        cooldown: "Desaquecimento",
        other: "Outros"
      };
      return labels[type] || type;
    };

    // Get border color based on type
    const getTypeBorderColor = (type: string) => {
      const colors: Record<string, string> = {
        warmup: "border-l-orange-500",
        work: "border-l-blue-500",
        cardio: "border-l-red-500",
        recovery: "border-l-green-500",
        rest: "border-l-gray-500",
        cooldown: "border-l-purple-500",
        other: "border-l-yellow-500"
      };
      return colors[type] || "border-l-gray-300";
    };

    if (isStage) {
      const stage = item as Stage;

      // Handle Repetition Block
      if (stage.type === 'repetition') {
        return (
          <div key={index} className="space-y-2 bg-muted/10 rounded-lg p-4 border border-border/50">
             <div className="flex items-center gap-2 mb-2">
               <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">
                 {stage.repeat}x
               </span>
               <h4 className="font-semibold text-sm text-foreground/80">Repetir {stage.repeat} Vezes</h4>
             </div>
             <div className="space-y-4 pl-4 border-l-2 border-primary/20">
               {stage.childStages?.map((child, childIndex) => 
                 renderWorkoutItem(child, childIndex, workout)
               )}
             </div>
          </div>
        );
      }

      const itemName = stage.exerciseName || stage.name || `Stage ${index + 1}`;
      const typeLabel = getTypeLabel(stage.type);
      const borderColor = getTypeBorderColor(stage.type);

      return (
        <div key={index} className="space-y-2">
          {/* Repeat Header */}
          {stage.repeat && stage.repeat > 1 && (
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80 px-1">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74-2.74L3 12" /></svg>
              </span>
              {stage.repeat} Vezes
            </div>
          )}

          <div
            className={`bg-card rounded-lg border shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group`}
            onClick={() => {
              setSelectedStage(item);
              setSelectedStageIndex(index);
              setSelectedWorkout(workout);
              setStageDetailsOpen(true);
            }}
          >
            <div className={`flex flex-col sm:flex-row border-l-[6px] ${borderColor}`}>
              {/* Main Content */}
              <div className="flex-1 p-4 sm:p-5 space-y-4">
                {/* Header: Type and Name */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                      {typeLabel}
                    </span>
                    <h3 className="font-bold text-lg sm:text-xl text-foreground group-hover:text-primary transition-colors">
                      {itemName}
                    </h3>
                  </div>
                  {/* Edit/View Icon hint */}
                  <div className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
                  {/* Strength Metrics */}
                  {workout?.type === "strength" && (
                    <>
                      {stage.sets && (
                        <div>
                          <div className="text-xl sm:text-2xl font-bold text-foreground">{stage.sets}</div>
                          <div className="text-xs text-muted-foreground font-medium uppercase">Sets</div>
                        </div>
                      )}
                      {stage.reps && (
                        <div>
                          <div className="text-xl sm:text-2xl font-bold text-foreground">{stage.reps}</div>
                          <div className="text-xs text-muted-foreground font-medium uppercase">Reps</div>
                        </div>
                      )}
                      {stage.weight && (
                        <div>
                          <div className="text-xl sm:text-2xl font-bold text-foreground">{stage.weight}</div>
                          <div className="text-xs text-muted-foreground font-medium uppercase">Carga</div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Cardio Metrics (Run, Swim, Bike) */}
                  {workout?.type !== "strength" && (
                    <>
                      {stage.distance && (
                        <div>
                          <div className="text-xl sm:text-2xl font-bold text-foreground">
                            {stage.distance} <span className="text-sm font-normal text-muted-foreground">{stage.distanceUnit || (workout?.type === "swimming" ? "m" : "km")}</span>
                          </div>
                          <div className="text-xs text-muted-foreground font-medium uppercase">Distância</div>
                        </div>
                      )}
                      {stage.duration && (
                        <div>
                          <div className="text-xl sm:text-2xl font-bold text-foreground">{stage.duration}</div>
                          <div className="text-xs text-muted-foreground font-medium uppercase">Tempo</div>
                        </div>
                      )}
                      {stage.intensity && (
                        <div>
                          <div className="text-lg sm:text-xl font-bold text-foreground">{stage.intensity}</div>
                          <div className="text-xs text-muted-foreground font-medium uppercase">Intensidade</div>
                        </div>
                      )}
                      {stage.stroke && (
                        <div>
                          <div className="text-lg sm:text-xl font-bold text-foreground capitalize">{stage.stroke}</div>
                          <div className="text-xs text-muted-foreground font-medium uppercase">Estilo</div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer: Notes or Description */}
                {(stage.notes || stage.equipment) && (
                  <div className="pt-3 border-t border-border/50 mt-2">
                     {stage.notes && (
                      <p className="text-sm text-muted-foreground">
                        {stage.notes}
                      </p>
                     )}
                     {stage.equipment && stage.equipment.length > 0 && (
                       <div className="flex gap-2 mt-2 flex-wrap">
                         {stage.equipment.map((eq, i) => (
                           <span key={i} className="text-xs bg-secondary/50 px-2 py-1 rounded text-secondary-foreground">
                             {eq}
                           </span>
                         ))}
                       </div>
                     )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      // Legacy Exercise Format
      const exercise = item as Exercise;
      return (
        <div
          key={index}
          className="bg-card rounded-lg border shadow-sm p-4 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => {
            setSelectedStage(item);
            setSelectedStageIndex(index);
            setSelectedWorkout(workout);
            setStageDetailsOpen(true);
          }}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{exercise.name}</h3>
            <span className="bg-secondary text-secondary-foreground text-xs font-semibold px-2 py-1 rounded">
              {exercise.reps}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{exercise.details}</p>
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

        // Fetch library exercises
        const exercisesSnapshot = await getDocs(collection(db, "exercises"));
        const fetchedLibraryExercises = exercisesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LibraryExercise[];
        setLibraryExercises(fetchedLibraryExercises);

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
                        {getWorkoutItems(workoutItem).map((item, index) =>
                          renderWorkoutItem(item, index, workoutItem)
                        )}
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
                          {getWorkoutItems(dayWorkout).map((item, index) =>
                            renderWorkoutItem(item, index, dayWorkout)
                          )}
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
                <span className="font-semibold text-lg">
                  {(selectedStage && 'exerciseName' in selectedStage && selectedStage.exerciseName) ||
                    selectedStage?.name ||
                    `Stage ${selectedStageIndex + 1}`}
                </span>
                {selectedStage && 'type' in selectedStage && selectedStage.type && (
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
                  'type' in selectedStage && selectedStage.type
                    ? getStageTypeColor(selectedStage.type)
                    : "bg-muted/20"
                }`}
              >
                <h3 className="font-semibold text-base mb-3">Stage Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedWorkout?.type === "strength" ? (
                    <>
                      {'sets' in selectedStage && selectedStage.sets && (
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
                      {'weight' in selectedStage && selectedStage.weight && (
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
                      {'distance' in selectedStage && selectedStage.distance && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Distance:
                          </span>
                          <p className="text-sm">
                            {selectedStage.distance}{" "}
                            {'distanceUnit' in selectedStage && selectedStage.distanceUnit ? selectedStage.distanceUnit : "m"}
                          </p>
                        </div>
                      )}
                      {'duration' in selectedStage && selectedStage.duration && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Duration:
                          </span>
                          <p className="text-sm">{selectedStage.duration}</p>
                        </div>
                      )}
                      {'intensity' in selectedStage && selectedStage.intensity && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Intensity:
                          </span>
                          <p className="text-sm">{selectedStage.intensity}</p>
                        </div>
                      )}
                      {/* Swimming-specific fields */}
                      {'stroke' in selectedStage && selectedStage.stroke && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Stroke:
                          </span>
                          <p className="text-sm">{selectedStage.stroke}</p>
                        </div>
                      )}
                      {selectedWorkout?.swimmingType && (
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
                      {selectedWorkout?.pace && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Pace:
                          </span>
                          <p className="text-sm">{selectedWorkout.pace}</p>
                        </div>
                      )}
                      {'equipment' in selectedStage &&
                        selectedStage.equipment &&
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
                      {'distance' in selectedStage && selectedStage.distance && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Distance:
                          </span>
                          <p className="text-sm">
                            {selectedStage.distance}{" "}
                            {'distanceUnit' in selectedStage && selectedStage.distanceUnit ? selectedStage.distanceUnit : "km"}
                          </p>
                        </div>
                      )}
                      {'duration' in selectedStage && selectedStage.duration && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Duration:
                          </span>
                          <p className="text-sm">{selectedStage.duration}</p>
                        </div>
                      )}
                      {'intensity' in selectedStage && selectedStage.intensity && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Intensity:
                          </span>
                          <p className="text-sm">{selectedStage.intensity}</p>
                        </div>
                      )}
                      {selectedWorkout?.cyclingType && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Cycling Type:
                          </span>
                          <p className="text-sm">
                            {selectedWorkout.cyclingType === "indoor"
                              ? "Indoor Cycling"
                              : selectedWorkout.cyclingType === "outdoor"
                              ? "Outdoor Cycling"
                              : ""}
                          </p>
                        </div>
                      )}
                      {selectedWorkout?.avgSpeed && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Avg Speed:
                          </span>
                          <p className="text-sm">{selectedWorkout.avgSpeed}</p>
                        </div>
                      )}
                    </>
                  ) : selectedWorkout?.type === "running" ? (
                    <>
                      {'distance' in selectedStage && selectedStage.distance && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Distance:
                          </span>
                          <p className="text-sm">
                            {selectedStage.distance}{" "}
                            {'distanceUnit' in selectedStage && selectedStage.distanceUnit ? selectedStage.distanceUnit : "km"}
                          </p>
                        </div>
                      )}
                      {'duration' in selectedStage && selectedStage.duration && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Duration:
                          </span>
                          <p className="text-sm">{selectedStage.duration}</p>
                        </div>
                      )}
                      {'intensity' in selectedStage && selectedStage.intensity && (
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
                            {selectedWorkout.runningType === "indoor"
                              ? "Indoor Running"
                              : selectedWorkout.runningType === "outdoor"
                              ? "Outdoor Running"
                              : ""}
                          </p>
                        </div>
                      )}
                      {selectedWorkout?.pace && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Pace:
                          </span>
                          <p className="text-sm">{selectedWorkout.pace}</p>
                        </div>
                      )}
                      {selectedWorkout?.terrain && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Terrain:
                          </span>
                          <p className="text-sm">{selectedWorkout.terrain}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {'distance' in selectedStage && selectedStage.distance && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Distance:
                          </span>
                          <p className="text-sm">
                            {selectedStage.distance}{" "}
                            {'distanceUnit' in selectedStage && selectedStage.distanceUnit ? selectedStage.distanceUnit : "km"}
                          </p>
                        </div>
                      )}
                      {'duration' in selectedStage && selectedStage.duration && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Duration:
                          </span>
                          <p className="text-sm">{selectedStage.duration}</p>
                        </div>
                      )}
                      {'intensity' in selectedStage && selectedStage.intensity && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Intensity:
                          </span>
                          <p className="text-sm">{selectedStage.intensity}</p>
                        </div>
                      )}
                    </>
                  )}
                  {'repeat' in selectedStage && selectedStage.repeat && selectedStage.repeat > 1 && (
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
              {(( 'notes' in selectedStage && selectedStage.notes) || ('details' in selectedStage && selectedStage.details)) && (
                <div className="bg-muted/20 p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground">
                    {('notes' in selectedStage && selectedStage.notes) || ('details' in selectedStage && selectedStage.details)}
                  </p>
                </div>
              )}

              {/* Stage Type Description */}
              {'type' in selectedStage && selectedStage.type && (
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
