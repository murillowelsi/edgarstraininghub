import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getAllExercises } from "@/services/exercisesService";
import {
  completeWorkoutWithProgress,
  getAssignmentsWithWorkoutsByAthlete,
} from "@/services/workoutAssignmentsService";
import type { Exercise, WorkoutExercise } from "@/types/exercise";
import {
  getYouTubeThumbnail,
  getYouTubeVideoId,
  muscleGroupLabels,
} from "@/types/exercise";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import { format } from "date-fns";
import {
  Check,
  CheckCircle2,
  Clock,
  Dumbbell,
  Loader2,
  MoreVertical,
  Pause,
  Play,
  Plus,
  StopCircle,
  Timer,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

// Types for tracking workout progress
interface SetProgress {
  setNumber: number;
  reps: string;
  weight: string;
  completed: boolean;
}

interface ExerciseProgress {
  exerciseId: string;
  sets: SetProgress[];
  exerciseTime: number; // Time spent on this exercise in seconds
}

// Format time as MM:SS
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// Exercise Card in Session
const ExerciseSessionCard = ({
  workoutExercise,
  exercise,
  index,
  progress,
  isActive,
  onStartTimer,
  onStopTimer,
  onUpdateSet,
  onAddSet,
  onToggleSetComplete,
  t,
}: {
  workoutExercise: WorkoutExercise;
  exercise?: Exercise;
  index: number;
  progress: ExerciseProgress;
  isActive: boolean;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onUpdateSet: (setIndex: number, field: "reps" | "weight", value: string) => void;
  onAddSet: () => void;
  onToggleSetComplete: (setIndex: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Use exercise from lookup, or fall back to denormalized data stored with workout
  const exerciseName = exercise?.name || workoutExercise.exerciseName || t.athlete.session.exerciseFallback;
  const videoUrl = exercise?.videoUrl || workoutExercise.exerciseVideoUrl;
  const gifUrl = exercise?.gifUrl || workoutExercise.exerciseGifUrl;
  const instructions = exercise?.instructions || workoutExercise.exerciseInstructions;
  const videoId = videoUrl ? getYouTubeVideoId(videoUrl) : null;
  const thumbnail = videoId ? getYouTubeThumbnail(videoId) : null;
  const hasGif = !!gifUrl;
  const mediaUrl = gifUrl || thumbnail;
  const hasMedia = !!mediaUrl || !!videoId;

  const completedSets = progress.sets.filter((s) => s.completed).length;
  const totalSets = progress.sets.length;
  const allComplete = completedSets === totalSets;

  return (
    <Card
      className={cn(
        "overflow-hidden relative",
        isActive && "ring-2 ring-primary border-primary",
        allComplete && !isActive && "border-green-300 bg-green-50/30 dark:bg-green-950/10"
      )}
    >
      {/* Left color bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{
          backgroundColor: isActive ? "#3b82f6" : allComplete ? "#22c55e" : "#f97316",
        }}
      />

      <CardContent className="p-4 pl-5">
        {/* Exercise Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-lg">{exerciseName}</h3>
            <p className="text-sm text-muted-foreground">
              {workoutExercise.sets} sets × {workoutExercise.reps || "10"} reps
            </p>
          </div>
          <div className="flex items-center gap-2">
            {allComplete && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50">
                <Check className="h-3 w-3 mr-1" />
                {t.athlete.session.complete}
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Media - Inline Player or Thumbnail */}
        {hasMedia && (
          isPlaying ? (
            <div className={cn(
              "relative rounded-xl overflow-hidden mb-4 shadow-lg",
              hasGif ? "aspect-square max-w-xs mx-auto" : "aspect-video"
            )}>
              {hasGif ? (
                <img
                  src={gifUrl}
                  alt={exerciseName}
                  className="w-full h-full object-cover"
                />
              ) : videoId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`}
                  title={exerciseName}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : null}
              <button
                onClick={() => setIsPlaying(false)}
                className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsPlaying(true)}
              className={cn(
                "w-full rounded-xl overflow-hidden bg-black relative group mb-4 shadow-lg",
                hasGif ? "aspect-square max-w-xs mx-auto" : "aspect-video"
              )}
            >
              {mediaUrl && (
                <img
                  src={mediaUrl}
                  alt={exerciseName}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              {!hasGif && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                    <Play className="h-7 w-7 text-black ml-1" />
                  </div>
                </div>
              )}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="text-white text-sm font-medium">
                  {hasGif ? t.athlete.session.viewFullAnimation : t.athlete.session.watchHowTo}
                </span>
                <Badge className={hasGif ? "bg-green-600 text-white border-0" : "bg-red-600 text-white border-0"}>
                  <Play className="h-3 w-3 mr-1" />
                  {hasGif ? "GIF" : "Video"}
                </Badge>
              </div>
            </button>
          )
        )}

        {/* Instructions */}
        {instructions && (
          <div className="bg-muted/50 p-3 rounded-lg mb-4">
            <p className="text-xs text-muted-foreground uppercase font-medium">{t.athlete.session.howToPerform}</p>
            <p className="text-sm mt-1 leading-relaxed whitespace-pre-wrap">{instructions}</p>
          </div>
        )}

        {/* No media placeholder */}
        {!hasMedia && (
          <div className="w-full aspect-[3/1] rounded-xl bg-muted/50 flex items-center justify-center mb-4 border-2 border-dashed border-muted-foreground/20">
            <div className="text-center text-muted-foreground">
              <Dumbbell className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">{t.athlete.session.noVideoAvailable}</p>
            </div>
          </div>
        )}

        {/* Exercise Timer Control */}
        <div
          className={cn(
            "flex items-center justify-between p-3 rounded-lg border mb-4",
            isActive
              ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300"
              : "bg-muted/50 border-border"
          )}
        >
          <div className="flex items-center gap-2">
            <Timer className={cn("h-5 w-5", isActive ? "text-blue-600" : "text-muted-foreground")} />
            <div>
              <p className={cn("text-sm font-medium", isActive && "text-blue-600")}>
                {t.athlete.session.exerciseTimer}
              </p>
              <p className={cn("text-2xl font-mono font-bold", isActive && "text-blue-600")}>
                {formatTime(progress.exerciseTime)}
              </p>
            </div>
          </div>

          {isActive ? (
            <Button
              onClick={onStopTimer}
              variant="destructive"
              size="sm"
              className="gap-2"
            >
              <StopCircle className="h-4 w-4" />
              {t.athlete.session.stop}
            </Button>
          ) : (
            <Button
              onClick={onStartTimer}
              variant="default"
              size="sm"
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Play className="h-4 w-4" />
              {t.athlete.session.start}
            </Button>
          )}
        </div>

        {/* Rest Time Info */}
        {workoutExercise.restSeconds > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 p-2 bg-muted/30 rounded">
            <Clock className="h-4 w-4" />
            <span>{t.athlete.session.restBetweenSets.replace("{{seconds}}", String(workoutExercise.restSeconds))}</span>
          </div>
        )}

        {/* Sets Table */}
        <div>
          <div className="grid grid-cols-[40px_1fr_80px_80px_40px] gap-2 text-xs font-medium text-muted-foreground mb-2 px-1">
            <span>{t.athlete.session.setHeader}</span>
            <span>{t.athlete.session.previousHeader}</span>
            <span className="text-center">{t.athlete.session.repsHeader}</span>
            <span className="text-center">{t.athlete.session.kgHeader}</span>
            <span></span>
          </div>

          <div className="space-y-2">
            {progress.sets.map((set, setIndex) => (
              <div
                key={setIndex}
                className={cn(
                  "grid grid-cols-[40px_1fr_80px_80px_40px] gap-2 items-center",
                  set.completed && "opacity-60"
                )}
              >
                <span className="text-sm font-medium text-center">{set.setNumber}</span>
                <span className="text-sm text-muted-foreground">-</span>
                <Input
                  type="text"
                                    value={set.reps}
                  onChange={(e) => onUpdateSet(setIndex, "reps", e.target.value)}
                  placeholder={workoutExercise.reps || "10"}
                  className="h-10 text-center text-base"
                  disabled={set.completed}
                />
                <Input
                  type="text"
                                    value={set.weight}
                  onChange={(e) => onUpdateSet(setIndex, "weight", e.target.value)}
                  placeholder="0"
                  className="h-10 text-center text-base"
                  disabled={set.completed}
                />
                <button
                  onClick={() => onToggleSetComplete(setIndex)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    set.completed
                      ? "bg-green-500 text-white shadow-md"
                      : "bg-muted hover:bg-green-100 hover:text-green-600 border-2 border-dashed border-muted-foreground/30"
                  )}
                >
                  <Check className={cn("h-5 w-5", !set.completed && "opacity-50")} />
                </button>
              </div>
            ))}
          </div>

          {/* Add Set Button */}
          <button
            onClick={onAddSet}
            className="flex items-center gap-2 text-sm text-primary font-medium mt-4 hover:underline"
          >
            <Plus className="h-4 w-4" />
            {t.athlete.session.addNewSet}
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

const StrengthWorkoutSession = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  // State
  const [assignment, setAssignment] = useState<AssignmentWithWorkout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Workout session state
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [exerciseProgress, setExerciseProgress] = useState<Map<string, ExerciseProgress>>(
    new Map()
  );

  // Timer refs
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const exerciseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Start workout function
  const startWorkout = useCallback(() => {
    if (isWorkoutStarted) return;
    setIsWorkoutStarted(true);
    totalTimerRef.current = setInterval(() => {
      setTotalElapsedTime((prev) => prev + 1);
    }, 1000);
  }, [isWorkoutStarted]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!user || !id) return;

      try {
        const assignments = await getAssignmentsWithWorkoutsByAthlete(user.uid);
        const found = assignments.find((a) => a.id === id);
        if (found && found.workout.type === "strength") {
          setAssignment(found);

          // Load exercises
          try {
            const allExercises = await getAllExercises();
            setExercises(allExercises);
          } catch (e) {
            console.error("Error loading exercises:", e);
          }

          // Initialize progress for each exercise
          const initialProgress = new Map<string, ExerciseProgress>();
          found.workout.exercises?.forEach((we) => {
            const sets: SetProgress[] = Array.from({ length: we.sets }, (_, i) => ({
              setNumber: i + 1,
              reps: "",
              weight: "",
              completed: false,
            }));
            initialProgress.set(we.id, {
              exerciseId: we.exerciseId,
              sets,
              exerciseTime: 0,
            });
          });
          setExerciseProgress(initialProgress);
        }
      } catch (error) {
        console.error("Error loading workout:", error);
        toast({
          title: t.common.error,
          description: t.athlete.toast.sessionLoadError,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      // Cleanup timers
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
      if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    };
  }, [user, id, toast]);

  // Auto-start workout when data is loaded
  useEffect(() => {
    if (!loading && assignment && !isWorkoutStarted) {
      startWorkout();
    }
  }, [loading, assignment, isWorkoutStarted, startWorkout]);

  // Start exercise timer
  const handleStartExerciseTimer = useCallback((exerciseId: string) => {
    // Stop any existing exercise timer
    if (exerciseTimerRef.current) {
      clearInterval(exerciseTimerRef.current);
    }

    setActiveExerciseId(exerciseId);

    // Start new timer for this exercise
    exerciseTimerRef.current = setInterval(() => {
      setExerciseProgress((prev) => {
        const newMap = new Map(prev);
        const progress = newMap.get(exerciseId);
        if (progress) {
          newMap.set(exerciseId, {
            ...progress,
            exerciseTime: progress.exerciseTime + 1,
          });
        }
        return newMap;
      });
    }, 1000);
  }, []);

  // Stop exercise timer
  const handleStopExerciseTimer = useCallback(() => {
    if (exerciseTimerRef.current) {
      clearInterval(exerciseTimerRef.current);
      exerciseTimerRef.current = null;
    }
    setActiveExerciseId(null);
  }, []);

  // Cancel workout
  const handleCancel = () => {
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    navigate(`/athlete/workout/${id}`);
  };

  // Save workout
  const handleSave = async () => {
    if (!assignment) return;

    // Stop all timers
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);

    setSaving(true);
    try {
      // Convert exercise progress to the format expected by the service
      const progressData = Array.from(exerciseProgress.entries()).map(
        ([, progress]) => ({
          exerciseId: progress.exerciseId,
          sets: progress.sets.map((set) => ({
            setNumber: set.setNumber,
            reps: set.reps,
            weight: set.weight,
            completed: set.completed,
          })),
        })
      );

      const completionPercentage = getCompletionPercentage();

      await completeWorkoutWithProgress(
        assignment.id,
        progressData,
        completionPercentage,
        totalElapsedTime
      );

      toast({
        title: t.athlete.toast.sessionCompleted,
        description: t.athlete.toast.sessionCompletedDescription
          .replace("{{percentage}}", String(completionPercentage))
          .replace("{{time}}", formatTime(totalElapsedTime)),
      });
      navigate("/athlete");
    } catch (error) {
      console.error("Error saving workout:", error);
      toast({
        title: t.common.error,
        description: t.athlete.toast.sessionSaveError,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Update set
  const handleUpdateSet = useCallback(
    (exerciseId: string, setIndex: number, field: "reps" | "weight", value: string) => {
      setExerciseProgress((prev) => {
        const newMap = new Map(prev);
        const progress = newMap.get(exerciseId);
        if (progress) {
          const newSets = [...progress.sets];
          newSets[setIndex] = { ...newSets[setIndex], [field]: value };
          newMap.set(exerciseId, { ...progress, sets: newSets });
        }
        return newMap;
      });
    },
    []
  );

  // Toggle set complete
  const handleToggleSetComplete = useCallback(
    (exerciseId: string, setIndex: number) => {
      setExerciseProgress((prev) => {
        const newMap = new Map(prev);
        const progress = newMap.get(exerciseId);
        if (progress) {
          const newSets = [...progress.sets];
          newSets[setIndex] = {
            ...newSets[setIndex],
            completed: !newSets[setIndex].completed,
          };
          newMap.set(exerciseId, { ...progress, sets: newSets });
        }
        return newMap;
      });
    },
    []
  );

  // Add set
  const handleAddSet = useCallback((exerciseId: string) => {
    setExerciseProgress((prev) => {
      const newMap = new Map(prev);
      const progress = newMap.get(exerciseId);
      if (progress) {
        const newSet: SetProgress = {
          setNumber: progress.sets.length + 1,
          reps: "",
          weight: "",
          completed: false,
        };
        newMap.set(exerciseId, {
          ...progress,
          sets: [...progress.sets, newSet],
        });
      }
      return newMap;
    });
  }, []);

  // Helper to get exercise by ID or name (fallback for old workouts)
  const getExerciseByIdOrName = (workoutExercise: WorkoutExercise) => {
    // Try by ID first
    let exercise = exercises.find((e) => e.id === workoutExercise.exerciseId);
    // If not found, try by name
    if (!exercise && workoutExercise.exerciseName) {
      exercise = exercises.find((e) => e.name === workoutExercise.exerciseName);
    }
    return exercise;
  };

  // Calculate completion percentage
  const getCompletionPercentage = () => {
    let totalSets = 0;
    let completedSets = 0;
    exerciseProgress.forEach((progress) => {
      totalSets += progress.sets.length;
      completedSets += progress.sets.filter((s) => s.completed).length;
    });
    return totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!assignment || assignment.workout.type !== "strength") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">{t.athlete.session.workoutNotFound}</p>
        <Button onClick={() => navigate("/athlete")}>{t.athlete.session.goBack}</Button>
      </div>
    );
  }

  const workout = assignment.workout;
  const completionPercentage = getCompletionPercentage();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        {/* Total Timer Bar (when workout started) */}
        {isWorkoutStarted && (
          <div className="bg-primary/10 py-3 text-center border-b">
            <p className="text-xs text-muted-foreground mb-1">{t.athlete.session.totalTime}</p>
            <div className="text-3xl font-mono font-bold text-primary">
              {formatTime(totalElapsedTime)}
            </div>
          </div>
        )}

        <div className="px-4 h-14 flex items-center justify-between">
          {isWorkoutStarted ? (
            <>
              <Button variant="ghost" onClick={handleCancel}>
                {t.athlete.session.cancel}
              </Button>
              <div className="flex items-center gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {t.athlete.session.save}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link
                to={`/athlete/workout/${id}`}
                className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-5 w-5" />
              </Link>
              <span className="font-medium">
                {format(assignment.scheduledDate, "d MMM yyyy")}
              </span>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto pb-24">
        <div className="p-4 space-y-4">
          {/* Workout Info Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    completionPercentage === 100
                      ? "border-green-500 bg-green-500"
                      : "border-muted-foreground"
                  )}
                >
                  {completionPercentage === 100 && (
                    <Check className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold">{workout.name}</h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Dumbbell className="h-4 w-4" />
                      {workout.exercises?.length || 0} {t.athlete.session.exercisesCount}
                    </div>
                    {isWorkoutStarted && (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        {completionPercentage}% {t.athlete.session.completePercent}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Exercises */}
          <div className="space-y-4">
            {workout.exercises?.map((workoutExercise, index) => {
              const exercise = getExerciseByIdOrName(workoutExercise);
              const progress = exerciseProgress.get(workoutExercise.id);

              if (!progress) return null;

              return (
                <ExerciseSessionCard
                  key={workoutExercise.id}
                  workoutExercise={workoutExercise}
                  exercise={exercise}
                  index={index}
                  progress={progress}
                  isActive={activeExerciseId === workoutExercise.id}
                  onStartTimer={() => handleStartExerciseTimer(workoutExercise.id)}
                  onStopTimer={handleStopExerciseTimer}
                  onUpdateSet={(setIndex, field, value) =>
                    handleUpdateSet(workoutExercise.id, setIndex, field, value)
                  }
                  onAddSet={() => handleAddSet(workoutExercise.id)}
                  onToggleSetComplete={(setIndex) =>
                    handleToggleSetComplete(workoutExercise.id, setIndex)
                  }
                  t={t}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Button - only shown during loading before auto-start */}

    </div>
  );
};

export default StrengthWorkoutSession;
