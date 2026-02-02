import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getAllExercises } from "@/services/exercisesService";
import {
  getAssignmentsWithWorkoutsByAthlete,
  toggleAssignmentComplete,
} from "@/services/workoutAssignmentsService";
import type { Exercise, WorkoutExercise } from "@/types/exercise";
import {
  equipmentTypeLabels,
  getYouTubeThumbnail,
  getYouTubeVideoId,
  muscleGroupLabels,
} from "@/types/exercise";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import type { WorkoutStage } from "@/types/workout";
import {
  drillLabels,
  durationLabels,
  equipmentLabels,
  intensityLabels,
  stageColors,
  stageLabels,
  strokeLabels,
} from "@/types/workout";
import { format } from "date-fns";
import {
  ArrowLeft,
  Bike,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Dumbbell,
  Layers,
  Loader2,
  PersonStanding,
  Play,
  Repeat,
  Waves,
} from "lucide-react";

// Format time as MM:SS or HH:MM:SS
const formatTime = (seconds: number | undefined) => {
  if (seconds === undefined) return null;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const workoutTypeIcons: Record<string, React.ElementType> = {
  running: PersonStanding,
  cycling: Bike,
  swimming: Waves,
  strength: Dumbbell,
};

const workoutTypeColors: Record<string, string> = {
  running: "bg-blue-500/10 text-blue-600 border-blue-200",
  cycling: "bg-green-500/10 text-green-600 border-green-200",
  swimming: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
  strength: "bg-orange-500/10 text-orange-600 border-orange-200",
};

// Utility functions for formatting
const formatDuration = (stage: WorkoutStage): string => {
  if (stage.duration.type === "lapButton") {
    return "Press Lap Button";
  }
  if (stage.duration.value !== undefined) {
    const unit = stage.duration.unit || "";
    return `${stage.duration.value} ${unit}`;
  }
  return durationLabels[stage.duration.type];
};

const formatIntensity = (stage: WorkoutStage): string | null => {
  if (stage.intensity.type === "none") {
    return null;
  }
  if (stage.intensity.type === "pace" && stage.intensity.value) {
    return `${stage.intensity.value} ${stage.intensity.unit || "min/km"}`;
  }
  if (stage.intensity.min !== undefined && stage.intensity.max !== undefined) {
    return `${stage.intensity.min}-${stage.intensity.max} ${stage.intensity.unit || ""}`;
  }
  return intensityLabels[stage.intensity.type];
};

const formatSwimmingDetails = (stage: WorkoutStage): string[] => {
  const details: string[] = [];
  if (stage.strokeType) {
    details.push(strokeLabels[stage.strokeType]);
  }
  if (stage.drillType && stage.drillType !== "none") {
    details.push(drillLabels[stage.drillType]);
  }
  if (stage.equipment && stage.equipment !== "none") {
    details.push(equipmentLabels[stage.equipment]);
  }
  return details;
};

// Stage display component
const StageItem = ({
  stage,
  index,
}: {
  stage: WorkoutStage;
  index: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const color = stageColors[stage.type];
  const intensity = formatIntensity(stage);
  const swimmingDetails = formatSwimmingDetails(stage);

  if (stage.type === "repeat") {
    return (
      <Card className="overflow-hidden border-l-4 border-l-indigo-500">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger className="w-full">
            <div className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Repeat className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Repeat {stage.repeatCount || 2}x</p>
                <p className="text-sm text-muted-foreground">
                  {stage.stages?.length || 0} stages
                </p>
              </div>
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            {stage.stages && stage.stages.length > 0 && (
              <div className="px-4 pb-4 space-y-2">
                {stage.stages.map((nestedStage, nestedIndex) => (
                  <div
                    key={nestedStage.id}
                    className="pl-4 border-l-2 py-2 bg-muted/30 rounded-r-lg"
                    style={{ borderLeftColor: stageColors[nestedStage.type] }}
                  >
                    <p className="font-medium text-sm">
                      {nestedIndex + 1}. {stageLabels[nestedStage.type]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(nestedStage)}
                      {formatIntensity(nestedStage) &&
                        ` · ${formatIntensity(nestedStage)}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

  return (
    <Card
      className="overflow-hidden border-l-4"
      style={{ borderLeftColor: color }}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="w-full">
          <div className="p-4 flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: color }}
            >
              {index + 1}
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">{stageLabels[stage.type]}</p>
              <p className="text-sm text-muted-foreground">
                {formatDuration(stage)}
                {swimmingDetails.length > 0 && ` · ${swimmingDetails[0]}`}
              </p>
            </div>
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-medium">
                  Duration
                </p>
                <p className="font-medium mt-1">{formatDuration(stage)}</p>
              </div>
              {intensity && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-medium">
                    Intensity
                  </p>
                  <p className="font-medium mt-1">{intensity}</p>
                </div>
              )}
              {stage.strokeType && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-medium">
                    Stroke
                  </p>
                  <p className="font-medium mt-1">
                    {strokeLabels[stage.strokeType]}
                  </p>
                </div>
              )}
              {stage.drillType && stage.drillType !== "none" && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-medium">
                    Drill
                  </p>
                  <p className="font-medium mt-1">
                    {drillLabels[stage.drillType]}
                  </p>
                </div>
              )}
              {stage.equipment && stage.equipment !== "none" && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-medium">
                    Equipment
                  </p>
                  <p className="font-medium mt-1">
                    {equipmentLabels[stage.equipment]}
                  </p>
                </div>
              )}
            </div>
            {stage.notes && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-medium">
                  Notes
                </p>
                <p className="text-sm mt-1">{stage.notes}</p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

// Exercise data type for video dialog (can be from Exercise or denormalized data)
interface ExerciseDialogData {
  name: string;
  videoUrl?: string;
  gifUrl?: string;
  instructions?: string;
  muscleGroups?: string[];
  equipment?: string[];
  targetMuscle?: string;
}

// Video dialog for exercises
const ExerciseVideoDialog = ({
  exerciseData,
  open,
  onOpenChange,
}: {
  exerciseData: ExerciseDialogData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  if (!exerciseData) return null;

  const videoId = exerciseData.videoUrl ? getYouTubeVideoId(exerciseData.videoUrl) : null;
  const hasGif = !!exerciseData.gifUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{exerciseData.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Media - GIF or Video */}
          <div className={cn("bg-muted rounded-lg overflow-hidden", hasGif ? "aspect-square max-w-md mx-auto" : "aspect-video")}>
            {hasGif ? (
              <img
                src={exerciseData.gifUrl}
                alt={exerciseData.name}
                className="w-full h-full object-cover"
              />
            ) : videoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title={exerciseData.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No video available
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            {exerciseData.targetMuscle && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Target Muscle
                </p>
                <Badge variant="default" className="capitalize">
                  {exerciseData.targetMuscle}
                </Badge>
              </div>
            )}

            {exerciseData.muscleGroups && exerciseData.muscleGroups.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Muscle Groups
                </p>
                <div className="flex flex-wrap gap-1">
                  {exerciseData.muscleGroups.map((mg) => (
                    <Badge key={mg} variant="secondary">
                      {muscleGroupLabels[mg as keyof typeof muscleGroupLabels] || mg}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {exerciseData.equipment && exerciseData.equipment.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Equipment
                </p>
                <div className="flex flex-wrap gap-1">
                  {exerciseData.equipment.map((eq) => (
                    <Badge key={eq} variant="outline">
                      {equipmentTypeLabels[eq as keyof typeof equipmentTypeLabels] || eq}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {exerciseData.instructions && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Instructions
                </p>
                <p className="text-sm whitespace-pre-wrap">{exerciseData.instructions}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Exercise item component for strength workouts
const ExerciseItem = ({
  workoutExercise,
  exercise,
  index,
  onVideoClick,
}: {
  workoutExercise: WorkoutExercise;
  exercise?: Exercise;
  index: number;
  onVideoClick: () => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Use exercise from lookup, or fall back to denormalized data stored with workout
  const exerciseName = exercise?.name || workoutExercise.exerciseName || "Exercise";
  const videoUrl = exercise?.videoUrl || workoutExercise.exerciseVideoUrl;
  const thumbnailUrl = exercise?.thumbnailUrl || workoutExercise.exerciseThumbnailUrl;
  const gifUrl = exercise?.gifUrl || workoutExercise.exerciseGifUrl;
  const muscleGroups = exercise?.muscleGroups || workoutExercise.exerciseMuscleGroups;

  const videoId = videoUrl ? getYouTubeVideoId(videoUrl) : null;
  const thumbnail = videoId
    ? getYouTubeThumbnail(videoId)
    : thumbnailUrl || null;
  const hasGif = !!gifUrl;
  const mediaUrl = gifUrl || thumbnail;

  return (
    <Card className="overflow-hidden border-l-4 border-l-orange-500">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="w-full">
          <div className="p-4 flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 text-sm font-medium"
            >
              {index + 1}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-medium truncate">
                {exerciseName}
              </p>
              <p className="text-sm text-muted-foreground">
                {workoutExercise.sets} sets × {workoutExercise.reps || "10"} reps
                {workoutExercise.restSeconds > 0 &&
                  ` · ${workoutExercise.restSeconds}s rest`}
              </p>
            </div>
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-3">
            {/* Media Thumbnail - GIF or Video */}
            {mediaUrl && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVideoClick();
                }}
                className={cn(
                  "relative w-full bg-muted rounded-lg overflow-hidden group",
                  hasGif ? "aspect-square max-w-xs mx-auto" : "aspect-video"
                )}
              >
                <img
                  src={mediaUrl}
                  alt={exerciseName}
                  className="w-full h-full object-cover"
                />
                {!hasGif && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="h-8 w-8 text-black ml-1" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {hasGif ? "View Animation" : "Watch Video"}
                </div>
              </button>
            )}

            {/* Exercise Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-medium">
                  Sets
                </p>
                <p className="font-medium mt-1">{workoutExercise.sets}</p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-medium">
                  Reps
                </p>
                <p className="font-medium mt-1">{workoutExercise.reps || "10"}</p>
              </div>
              {workoutExercise.restSeconds > 0 && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-medium">
                    Rest
                  </p>
                  <p className="font-medium mt-1">{workoutExercise.restSeconds}s</p>
                </div>
              )}
              {workoutExercise.weight && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-medium">
                    Weight
                  </p>
                  <p className="font-medium mt-1">{workoutExercise.weight}</p>
                </div>
              )}
            </div>

            {/* Muscle Groups */}
            {muscleGroups && muscleGroups.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {muscleGroups.map((mg) => (
                  <Badge key={mg} variant="secondary" className="text-xs">
                    {muscleGroupLabels[mg] || mg}
                  </Badge>
                ))}
              </div>
            )}

            {/* Notes */}
            {workoutExercise.notes && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-medium">
                  Notes
                </p>
                <p className="text-sm mt-1">{workoutExercise.notes}</p>
              </div>
            )}

            {/* Watch Video Button (if no media preview) */}
            {(videoId || hasGif) && !mediaUrl && (
              <Button
                variant="outline"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onVideoClick();
                }}
              >
                <Play className="h-4 w-4 mr-2" />
                {hasGif ? "View Animation" : "Watch Video"}
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

const AthleteWorkoutView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignment, setAssignment] = useState<AssignmentWithWorkout | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseData, setSelectedExerciseData] = useState<ExerciseDialogData | null>(null);

  useEffect(() => {
    const loadAssignment = async () => {
      if (!user || !id) return;

      try {
        const assignments = await getAssignmentsWithWorkoutsByAthlete(user.uid);
        const found = assignments.find((a) => a.id === id);
        if (found) {
          setAssignment(found);
          // Load exercises if it's a strength workout
          if (found.workout.type === "strength") {
            try {
              const allExercises = await getAllExercises();
              setExercises(allExercises);
            } catch (exerciseError) {
              console.error("Error loading exercises:", exerciseError);
              // Continue without exercises - workout will still display
            }
          }
        }
      } catch (error) {
        console.error("Error loading workout:", error);
        toast({
          title: "Error",
          description: "Failed to load workout details.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user && id) {
      loadAssignment();
    }
  }, [user, id, toast]);

  // Helper to find exercise by ID or name (fallback for old workouts)
  const getExerciseByIdOrName = (workoutExercise: WorkoutExercise): Exercise | undefined => {
    // Try by ID first
    let exercise = exercises.find((e) => e.id === workoutExercise.exerciseId);
    // If not found, try by name
    if (!exercise && workoutExercise.exerciseName) {
      exercise = exercises.find((e) => e.name === workoutExercise.exerciseName);
    }
    return exercise;
  };

  // Build exercise data for video dialog (from exercise or denormalized data)
  const buildExerciseDialogData = (
    workoutExercise: WorkoutExercise,
    exercise?: Exercise
  ): ExerciseDialogData => ({
    name: exercise?.name || workoutExercise.exerciseName || "Exercise",
    videoUrl: exercise?.videoUrl || workoutExercise.exerciseVideoUrl,
    gifUrl: exercise?.gifUrl || workoutExercise.exerciseGifUrl,
    instructions: exercise?.instructions || workoutExercise.exerciseInstructions,
    muscleGroups: exercise?.muscleGroups || workoutExercise.exerciseMuscleGroups,
    equipment: exercise?.equipment,
    targetMuscle: exercise?.targetMuscle,
  });

  const handleToggleComplete = async () => {
    if (!assignment) return;

    setCompleting(true);
    try {
      const newCompletedState = !assignment.completedAt;
      await toggleAssignmentComplete(assignment.id, newCompletedState);

      setAssignment({
        ...assignment,
        completedAt: newCompletedState ? new Date() : null,
      });

      toast({
        title: newCompletedState ? "Workout completed!" : "Workout unmarked",
        description: newCompletedState
          ? "Great job on completing your workout!"
          : "Workout marked as incomplete.",
      });
    } catch (error) {
      console.error("Error updating workout:", error);
      toast({
        title: "Error",
        description: "Failed to update workout status.",
        variant: "destructive",
      });
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Workout not found</p>
        <Button onClick={() => navigate("/athlete")}>Go Back</Button>
      </div>
    );
  }

  const workout = assignment.workout;
  const Icon = workoutTypeIcons[workout.type] || PersonStanding;
  const isCompleted = !!assignment.completedAt;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="px-4 h-14 flex items-center gap-3">
          <Link
            to="/athlete"
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold truncate">{workout.name}</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto pb-24">
        {/* Workout Header Card */}
        <div className="p-4">
          <Card
            className={cn(
              "overflow-hidden",
              isCompleted &&
                "bg-green-50/50 border-green-200 dark:bg-green-950/20"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <button
                  onClick={handleToggleComplete}
                  disabled={completing}
                  className="mt-1 transition-transform hover:scale-110"
                >
                  {completing ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  ) : (
                    <Circle className="h-8 w-8 text-muted-foreground/50" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <h2
                    className={cn(
                      "text-xl font-bold",
                      isCompleted && "line-through text-muted-foreground"
                    )}
                  >
                    {workout.name}
                  </h2>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge
                      className={cn(
                        "capitalize",
                        workoutTypeColors[workout.type]
                      )}
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {workout.type}
                    </Badge>
                    {isCompleted && (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50">
                        <Check className="h-3 w-3 mr-1" />
                        {assignment.completionPercentage !== undefined
                          ? `${assignment.completionPercentage}% Completed`
                          : "Completed"}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {format(assignment.scheduledDate, "EEEE, MMM d")}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-4 w-4" />
                      {workout.type === "strength"
                        ? `${workout.exercises?.length || 0} exercises`
                        : `${workout.stages.length} stages`}
                    </div>
                    {assignment.totalTime !== undefined && assignment.totalTime > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {formatTime(assignment.totalTime)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {workout.notes && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{workout.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stages or Exercises */}
        <div className="px-4 pb-4">
          {workout.type === "strength" ? (
            <>
              <h3 className="font-semibold text-lg mb-3">
                Exercises ({workout.exercises?.length || 0})
              </h3>
              <div className="space-y-3">
                {workout.exercises?.map((workoutExercise, index) => {
                  const exercise = getExerciseByIdOrName(workoutExercise);
                  return (
                    <ExerciseItem
                      key={workoutExercise.id}
                      workoutExercise={workoutExercise}
                      exercise={exercise}
                      index={index}
                      onVideoClick={() => setSelectedExerciseData(buildExerciseDialogData(workoutExercise, exercise))}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-lg mb-3">
                Workout Stages ({workout.stages.length})
              </h3>
              <div className="space-y-2">
                {workout.stages.map((stage, index) => (
                  <StageItem key={stage.id} stage={stage} index={index} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border/50 safe-area-bottom">
        {workout.type === "strength" && !isCompleted ? (
          <Link to={`/athlete/workout/${id}/session`} className="block">
            <Button
              size="lg"
              className="w-full h-12 text-base font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Workout
            </Button>
          </Link>
        ) : (
          <Button
            onClick={handleToggleComplete}
            disabled={completing}
            size="lg"
            className={cn(
              "w-full h-12 text-base font-semibold rounded-xl",
              isCompleted
                ? "bg-muted text-muted-foreground hover:bg-muted/80"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {completing ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : isCompleted ? (
              <>
                <Circle className="h-5 w-5 mr-2" />
                Mark as Incomplete
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Complete Workout
              </>
            )}
          </Button>
        )}
      </div>

      {/* Exercise Video Dialog */}
      <ExerciseVideoDialog
        exerciseData={selectedExerciseData}
        open={!!selectedExerciseData}
        onOpenChange={(open) => !open && setSelectedExerciseData(null)}
      />
    </div>
  );
};

export default AthleteWorkoutView;
