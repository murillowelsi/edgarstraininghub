import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageSpinner, Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { CreatePostModal } from "@/components/timeline/CreatePostModal";
import { createMentionNotifications, createTimelinePost } from "@/services/timelineService";
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
  ChevronDown,
  Clock,
  Dumbbell,
  Minus,
  MoreVertical,
  Play,
  Plus,
  RotateCcw,
  Square,
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
  time: number; // Time spent on this set in seconds
}

interface ExerciseProgress {
  exerciseId: string;
  sets: SetProgress[];
}

interface ActiveSet {
  exerciseId: string;
  setIndex: number;
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
  activeSetIndex,
  onStartSetTimer,
  onStopSetTimer,
  onResetSetTimer,
  onUpdateSet,
  onAddSet,
  onRemoveLastSet,
  onToggleSetComplete,
  t,
}: {
  workoutExercise: WorkoutExercise;
  exercise?: Exercise;
  index: number;
  progress: ExerciseProgress;
  activeSetIndex: number | null;
  onStartSetTimer: (setIndex: number) => void;
  onStopSetTimer: () => void;
  onResetSetTimer: (setIndex: number) => void;
  onUpdateSet: (setIndex: number, field: "reps" | "weight", value: string) => void;
  onAddSet: () => void;
  onRemoveLastSet: () => void;
  onToggleSetComplete: (setIndex: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) => {
  const isActive = activeSetIndex !== null;
  const [isPlaying, setIsPlaying] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

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
        "overflow-hidden",
        isActive && "ring-2 ring-primary border-primary",
        allComplete && !isActive && "border-primary/40 bg-primary/5"
      )}
    >
      <CardContent className="p-4">
        {/* Exercise Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-lg">{exerciseName}</h3>
            <p className="text-sm text-muted-foreground">
              {workoutExercise.sets} sets × {workoutExercise.reps || "10"} reps
            </p>
          </div>
          {allComplete && (
            <Badge className="bg-primary/15 text-primary border-primary/30">
              <Check className="h-3 w-3 mr-1" />
              {t.athlete.session.complete}
            </Badge>
          )}
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
          <div className="bg-muted/50 rounded-lg mb-4 overflow-hidden">
            <button
              className="flex items-center justify-between w-full p-3 text-left"
              onClick={() => setInstructionsOpen((v) => !v)}
            >
              <p className="text-xs text-muted-foreground uppercase font-medium">{t.athlete.session.howToPerform}</p>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", instructionsOpen && "rotate-180")} />
            </button>
            {instructionsOpen && (
              <p className="text-sm px-3 pb-3 leading-relaxed whitespace-pre-wrap">{instructions}</p>
            )}
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

        {/* Rest Time Info */}
        {workoutExercise.restSeconds > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 p-2 bg-muted/30 rounded">
            <Clock className="h-4 w-4" />
            <span>{t.athlete.session.restBetweenSets.replace("{{seconds}}", String(workoutExercise.restSeconds))}</span>
          </div>
        )}

        {/* Sets Table */}
        <div>
          <div className="grid grid-cols-[24px_minmax(0,1fr)_52px_52px_32px] gap-1.5 text-xs font-medium text-muted-foreground mb-2 px-1">
            <span>{t.athlete.session.setHeader}</span>
            <span className="truncate">{t.athlete.session.exerciseTimer}</span>
            <span className="text-center">{t.athlete.session.repsHeader}</span>
            <span className="text-center">{t.athlete.session.kgHeader}</span>
            <span></span>
          </div>

          <div className="space-y-2">
            {progress.sets.map((set, setIndex) => {
              const isSetActive = activeSetIndex === setIndex;
              return (
                <div
                  key={setIndex}
                  className={cn(
                    "grid grid-cols-[24px_minmax(0,1fr)_52px_52px_32px] gap-1.5 items-center",
                    set.completed && "opacity-60"
                  )}
                >
                  <span className="text-sm font-medium text-center">{set.setNumber}</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <button
                      onClick={() => (isSetActive ? onStopSetTimer() : onStartSetTimer(setIndex))}
                      disabled={set.completed}
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                        isSetActive
                          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
                      )}
                      aria-label={isSetActive ? t.athlete.session.stop : t.athlete.session.start}
                    >
                      {isSetActive ? <Square className="h-2.5 w-2.5" fill="currentColor" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                    </button>
                    <span
                      className={cn(
                        "text-xs font-mono tabular-nums truncate",
                        isSetActive ? "text-primary font-semibold" : "text-muted-foreground"
                      )}
                    >
                      {formatTime(set.time)}
                    </span>
                    {set.time > 0 && !set.completed && !isSetActive && (
                      <button
                        onClick={() => onResetSetTimer(setIndex)}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground flex-shrink-0"
                        aria-label={t.athlete.session.reset ?? "Reset"}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <Input
                    type="text"
                    value={set.reps}
                    onChange={(e) => onUpdateSet(setIndex, "reps", e.target.value)}
                    placeholder={workoutExercise.reps || "10"}
                    className="h-10 text-center text-sm px-1 min-w-0"
                    disabled={set.completed}
                  />
                  <Input
                    type="text"
                    value={set.weight}
                    onChange={(e) => onUpdateSet(setIndex, "weight", e.target.value)}
                    placeholder="0"
                    className="h-10 text-center text-sm px-1 min-w-0"
                    disabled={set.completed}
                  />
                  <button
                    onClick={() => onToggleSetComplete(setIndex)}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                      set.completed
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted hover:bg-primary/15 hover:text-primary border-2 border-dashed border-muted-foreground/30"
                    )}
                  >
                    <Check className={cn("h-4 w-4", !set.completed && "opacity-50")} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add / Remove Set Buttons */}
          <div className="flex items-center justify-between mt-4">
            {progress.sets.length > 1 ? (
              <button
                onClick={onRemoveLastSet}
                className="flex items-center gap-2 text-sm text-muted-foreground font-medium hover:text-destructive hover:underline"
              >
                <Minus className="h-4 w-4" />
                {t.athlete.session.removeLastSet}
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={onAddSet}
              className="flex items-center gap-2 text-sm text-primary font-medium hover:underline"
            >
              <Plus className="h-4 w-4" />
              {t.athlete.session.addNewSet}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const StrengthWorkoutSession = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, displayName, photoURL, userRole } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  // State
  const [assignment, setAssignment] = useState<AssignmentWithWorkout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCaption, setShareCaption] = useState("");
  // Workout session state
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const [activeSet, setActiveSet] = useState<ActiveSet | null>(null);
  const [exerciseProgress, setExerciseProgress] = useState<Map<string, ExerciseProgress>>(
    new Map()
  );

  // Timer refs
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const setTimerRef = useRef<NodeJS.Timeout | null>(null);

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

          // Initialize progress for each exercise, restoring saved data if available
          const initialProgress = new Map<string, ExerciseProgress>();
          found.workout.exercises?.forEach((we) => {
            const saved = found.progressData?.find((p) => p.exerciseId === we.exerciseId);
            const sets: SetProgress[] = saved
              ? saved.sets.map((s) => ({
                  setNumber: s.setNumber,
                  reps: s.reps,
                  weight: s.weight,
                  completed: s.completed,
                  time: s.time ?? 0,
                }))
              : Array.from({ length: we.sets }, (_, i) => ({
                  setNumber: i + 1,
                  reps: "",
                  weight: "",
                  completed: false,
                  time: 0,
                }));
            initialProgress.set(we.id, {
              exerciseId: we.exerciseId,
              sets,
            });
          });
          setExerciseProgress(initialProgress);

          // Restore previously elapsed time if resuming a saved workout
          if (found.totalTime) {
            setTotalElapsedTime(found.totalTime);
          }
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
      if (setTimerRef.current) clearInterval(setTimerRef.current);
    };
  }, [user, id, toast]);

  // Auto-start workout when data is loaded
  useEffect(() => {
    if (!loading && assignment && !isWorkoutStarted) {
      startWorkout();
    }
  }, [loading, assignment, isWorkoutStarted, startWorkout]);

  // Start set timer (auto-stops any other running set timer)
  const handleStartSetTimer = useCallback((exerciseId: string, setIndex: number) => {
    if (setTimerRef.current) {
      clearInterval(setTimerRef.current);
    }

    setActiveSet({ exerciseId, setIndex });

    setTimerRef.current = setInterval(() => {
      setExerciseProgress((prev) => {
        const newMap = new Map(prev);
        const progress = newMap.get(exerciseId);
        if (progress && progress.sets[setIndex]) {
          const newSets = [...progress.sets];
          newSets[setIndex] = {
            ...newSets[setIndex],
            time: newSets[setIndex].time + 1,
          };
          newMap.set(exerciseId, { ...progress, sets: newSets });
        }
        return newMap;
      });
    }, 1000);
  }, []);

  // Stop set timer
  const handleStopSetTimer = useCallback(() => {
    if (setTimerRef.current) {
      clearInterval(setTimerRef.current);
      setTimerRef.current = null;
    }
    setActiveSet(null);
  }, []);

  // Reset a set's timer to zero (also stops it if currently running)
  const handleResetSetTimer = useCallback(
    (exerciseId: string, setIndex: number) => {
      if (
        activeSet &&
        activeSet.exerciseId === exerciseId &&
        activeSet.setIndex === setIndex
      ) {
        if (setTimerRef.current) {
          clearInterval(setTimerRef.current);
          setTimerRef.current = null;
        }
        setActiveSet(null);
      }
      setExerciseProgress((prev) => {
        const newMap = new Map(prev);
        const progress = newMap.get(exerciseId);
        if (progress && progress.sets[setIndex]) {
          const newSets = [...progress.sets];
          newSets[setIndex] = { ...newSets[setIndex], time: 0 };
          newMap.set(exerciseId, { ...progress, sets: newSets });
        }
        return newMap;
      });
    },
    [activeSet]
  );

  // Cancel workout
  const handleCancel = () => {
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    if (setTimerRef.current) clearInterval(setTimerRef.current);
    navigate(`/athlete/workout/${id}`);
  };

  // Save workout
  const handleSave = async () => {
    if (!assignment) return;

    // Stop all timers
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    if (setTimerRef.current) clearInterval(setTimerRef.current);

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
            time: set.time,
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
      const workoutName = assignment.workout.name;
      setShareCaption(`Treino concluído: ${workoutName} — ${completionPercentage}% em ${formatTime(totalElapsedTime)} 💪`);
      setShowShareModal(true);
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
      // Stop set timer if the toggled set is currently active
      if (
        activeSet &&
        activeSet.exerciseId === exerciseId &&
        activeSet.setIndex === setIndex
      ) {
        if (setTimerRef.current) {
          clearInterval(setTimerRef.current);
          setTimerRef.current = null;
        }
        setActiveSet(null);
      }
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
    [activeSet]
  );

  // Remove last set (also stops timer if that set was active)
  const handleRemoveLastSet = useCallback(
    (exerciseId: string) => {
      setExerciseProgress((prev) => {
        const newMap = new Map(prev);
        const progress = newMap.get(exerciseId);
        if (progress && progress.sets.length > 1) {
          const lastIndex = progress.sets.length - 1;
          if (
            activeSet &&
            activeSet.exerciseId === exerciseId &&
            activeSet.setIndex === lastIndex
          ) {
            if (setTimerRef.current) {
              clearInterval(setTimerRef.current);
              setTimerRef.current = null;
            }
            setActiveSet(null);
          }
          newMap.set(exerciseId, {
            ...progress,
            sets: progress.sets.slice(0, -1),
          });
        }
        return newMap;
      });
    },
    [activeSet]
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
          time: 0,
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
    return <PageSpinner />;
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

  const handleSharePost = async (caption: string, imageUrl?: string, mentionedUserIds?: string[]) => {
    if (!user) return;
    const authorName = displayName || user.email || "Athlete";
    const postId = await createTimelinePost(
      { caption, imageUrl },
      user.uid,
      authorName,
      userRole ?? "athlete",
      photoURL
    );
    if (mentionedUserIds?.length) {
      await createMentionNotifications(postId, mentionedUserIds, authorName, caption);
    }
  };

  return (
    <>
    <CreatePostModal
      open={showShareModal}
      onOpenChange={(open) => {
        setShowShareModal(open);
        if (!open) navigate("/athlete");
      }}
      onSubmit={handleSharePost}
      initialCaption={shareCaption}
    />
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
                <Button onClick={() => setShowSaveConfirm(true)} disabled={saving}>
                  {saving ? (
                    <Spinner size="xs" className="mr-2" />
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
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  )}
                >
                  {completionPercentage === 100 && (
                    <Check className="h-5 w-5 text-primary-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-balance break-words">{workout.name}</h1>
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
                  className="h-full bg-primary transition-all duration-300"
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

              const activeSetIndex =
                activeSet?.exerciseId === workoutExercise.id ? activeSet.setIndex : null;

              return (
                <ExerciseSessionCard
                  key={workoutExercise.id}
                  workoutExercise={workoutExercise}
                  exercise={exercise}
                  index={index}
                  progress={progress}
                  activeSetIndex={activeSetIndex}
                  onStartSetTimer={(setIndex) =>
                    handleStartSetTimer(workoutExercise.id, setIndex)
                  }
                  onStopSetTimer={handleStopSetTimer}
                  onResetSetTimer={(setIndex) =>
                    handleResetSetTimer(workoutExercise.id, setIndex)
                  }
                  onUpdateSet={(setIndex, field, value) =>
                    handleUpdateSet(workoutExercise.id, setIndex, field, value)
                  }
                  onAddSet={() => handleAddSet(workoutExercise.id)}
                  onRemoveLastSet={() => handleRemoveLastSet(workoutExercise.id)}
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

      <Drawer open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t.athlete.session.saveConfirmTitle}</DrawerTitle>
            <DrawerDescription>{t.athlete.session.saveConfirmDescription}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Spinner size="xs" className="mr-2" /> : null}
              {t.athlete.session.saveConfirmConfirm}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setShowSaveConfirm(false)}>
              {t.athlete.session.saveConfirmCancel}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

    </div>
    </>
  );
};

export default StrengthWorkoutSession;
