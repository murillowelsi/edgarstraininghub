import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { CreatePostModal } from "@/components/timeline/CreatePostModal";
import { createMentionNotifications, createTimelinePost } from "@/services/timelineService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getAllExercises } from "@/services/exercisesService";
import {
  getAssignmentsWithWorkoutsByAthlete,
  resetWorkoutAssignment,
  toggleAssignmentComplete,
  completeEnduranceWorkout,
} from "@/services/workoutAssignmentsService";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActivityData } from "@/types/workoutAssignment";
import type { Exercise, WorkoutExercise } from "@/types/exercise";
import {
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
  Circle,
  Clock,
  Dumbbell,
  Flame,
  Heart,
  Layers,
  Loader2,
  PersonStanding,
  Play,
  Repeat,
  Waves,
  Wind,
  X,
  Zap,
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

const stageIcons: Record<string, React.ElementType> = {
  warmup: Flame,
  run: PersonStanding,
  cooldown: Wind,
  recovery: Heart,
  interval: Zap,
  repeat: Repeat,
  bike: Bike,
  rest: Clock,
  swim: Waves,
};

const workoutTypeColors: Record<string, string> = {
  running: "bg-blue-500/10 text-blue-600 border-blue-200",
  cycling: "bg-green-500/10 text-green-600 border-green-200",
  swimming: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
  strength: "bg-amber-500/10 text-amber-600 border-amber-200",
};

// Utility functions for formatting
const formatDuration = (stage: WorkoutStage, lapLabel: string = "Press Lap Button"): string => {
  if (stage.duration.type === "lapButton") {
    return lapLabel;
  }
  if (stage.duration.value !== undefined) {
    const unit = stage.duration.unit || "";
    const value = stage.duration.value;
    if ((unit === "min" || unit === "minutes") && value % 1 !== 0) {
      const totalSeconds = Math.round(value * 60);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")} ${unit}`;
    }
    return `${value} ${unit}`;
  }
  return durationLabels[stage.duration.type];
};

// Convert decimal pace (e.g. 5.3 → "5:30", 5.45 → "5:45") to MM:SS
const decimalToMMSS = (val: number): string => {
  const mins = Math.floor(val);
  const secs = Math.round((val - mins) * 100);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const isPaceType = (type: string) => type === "pace" || type === "targetPace" || type === "cssBasedPace";

const formatIntensity = (stage: WorkoutStage): string | null => {
  if (stage.intensity.type === "none") {
    return null;
  }
  if (isPaceType(stage.intensity.type)) {
    const unit = stage.intensity.unit || "min/km";
    if (stage.intensity.min !== undefined && stage.intensity.max !== undefined) {
      return `${decimalToMMSS(stage.intensity.min)}-${decimalToMMSS(stage.intensity.max)} ${unit}`;
    }
    if (stage.intensity.value !== undefined) {
      return `${decimalToMMSS(stage.intensity.value)} ${unit}`;
    }
  }
  if (stage.intensity.type === "heartRateZone" && stage.intensity.value !== undefined) {
    return `HR Zone ${stage.intensity.value}`;
  }
  if (stage.intensity.type === "powerZone" && stage.intensity.value !== undefined) {
    return `Power Zone ${stage.intensity.value}`;
  }
  if (stage.intensity.min !== undefined && stage.intensity.max !== undefined) {
    return `${stage.intensity.min}-${stage.intensity.max} ${stage.intensity.unit || ""}`;
  }
  if (stage.intensity.value !== undefined) {
    return `${stage.intensity.value} ${stage.intensity.unit || ""}`;
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
  index: _index,
  t,
}: {
  stage: WorkoutStage;
  index: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const color = stageColors[stage.type];
  const intensity = formatIntensity(stage);
  const swimmingDetails = formatSwimmingDetails(stage);
  const StageIcon = stageIcons[stage.type] || PersonStanding;

  if (stage.type === "repeat") {
    return (
      <div className="rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all overflow-hidden">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger className="w-full">
            <div className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: "#6366f11a", color: "#6366f1" }}>
                <Repeat className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-semibold text-sm">{t.athlete.workoutView.repeat} {stage.repeatCount || 2}x</p>
                <p className="text-xs text-muted-foreground">
                  {stage.stages?.length || 0} {t.athlete.workoutView.stages}
                </p>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200", isExpanded && "rotate-180")} />
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            {stage.stages && stage.stages.length > 0 && (
              <div className="px-4 pb-4 pt-3 border-t border-border/50 space-y-2">
                {stage.stages.map((nestedStage, nestedIndex) => {
                  const NestedIcon = stageIcons[nestedStage.type] || PersonStanding;
                  const nestedColor = stageColors[nestedStage.type];
                  return (
                    <div key={nestedStage.id} className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg shrink-0 flex items-center justify-center" style={{ backgroundColor: `${nestedColor}1a`, color: nestedColor }}>
                          <NestedIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs">{nestedIndex + 1}. {stageLabels[nestedStage.type]}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDuration(nestedStage, t.athlete.workoutView.pressLapButton)}
                            {formatIntensity(nestedStage) && ` · ${formatIntensity(nestedStage)}`}
                          </p>
                        </div>
                      </div>
                      {nestedStage.notes && (
                        <div className="mt-2 ml-9 bg-background/60 p-2 rounded-md">
                          <p className="text-xs text-muted-foreground uppercase font-medium mb-0.5">{t.athlete.workoutView.notes}</p>
                          <p className="text-xs">{nestedStage.notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="w-full">
          <div className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: `${color}1a`, color }}>
              <StageIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold text-sm truncate">{stageLabels[stage.type]}</p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(stage, t.athlete.workoutView.pressLapButton)}
                {swimmingDetails.length > 0 && ` · ${swimmingDetails[0]}`}
                {intensity && ` · ${intensity}`}
              </p>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200", isExpanded && "rotate-180")} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-3 border-t border-border/50 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-medium">
                  {t.athlete.workoutView.duration}
                </p>
                <p className="font-medium mt-1">{formatDuration(stage, t.athlete.workoutView.pressLapButton)}</p>
              </div>
              {intensity && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-medium">
                    {t.athlete.workoutView.intensity}
                  </p>
                  <p className="font-medium mt-1">{intensity}</p>
                </div>
              )}
              {stage.strokeType && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-medium">
                    {t.athlete.workoutView.stroke}
                  </p>
                  <p className="font-medium mt-1">{strokeLabels[stage.strokeType]}</p>
                </div>
              )}
              {stage.drillType && stage.drillType !== "none" && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-medium">
                    {t.athlete.workoutView.drill}
                  </p>
                  <p className="font-medium mt-1">{drillLabels[stage.drillType]}</p>
                </div>
              )}
              {stage.equipment && stage.equipment !== "none" && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-medium">
                    {t.athlete.workoutView.equipment}
                  </p>
                  <p className="font-medium mt-1">{equipmentLabels[stage.equipment]}</p>
                </div>
              )}
            </div>
            {stage.notes && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-medium">
                  {t.athlete.workoutView.notes}
                </p>
                <p className="text-sm mt-1">{stage.notes}</p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

// Exercise item component for strength workouts
const ExerciseItem = ({
  workoutExercise,
  exercise,
  index: _index,
  t,
}: {
  workoutExercise: WorkoutExercise;
  exercise?: Exercise;
  index: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  // Use exercise from lookup, or fall back to denormalized data stored with workout
  const exerciseName = exercise?.name || workoutExercise.exerciseName || t.athlete.workoutView.exercisesSection;
  const videoUrl = exercise?.videoUrl || workoutExercise.exerciseVideoUrl;
  const thumbnailUrl = exercise?.thumbnailUrl || workoutExercise.exerciseThumbnailUrl;
  const gifUrl = exercise?.gifUrl || workoutExercise.exerciseGifUrl;
  const muscleGroups = exercise?.muscleGroups || workoutExercise.exerciseMuscleGroups;
  const instructions = exercise?.instructions || workoutExercise.exerciseInstructions;

  const videoId = videoUrl ? getYouTubeVideoId(videoUrl) : null;
  const thumbnail = videoId
    ? getYouTubeThumbnail(videoId)
    : thumbnailUrl || null;
  const hasGif = !!gifUrl;
  const mediaUrl = gifUrl || thumbnail;

  return (
    <div className="rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="w-full">
          <div className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: "#f59e0b1a", color: "#d97706" }}>
              <Dumbbell className="h-4 w-4" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold text-sm truncate">{exerciseName}</p>
              <p className="text-xs text-muted-foreground">
                {workoutExercise.sets} sets × {workoutExercise.reps || "10"} reps
                {workoutExercise.restSeconds > 0 && ` · ${workoutExercise.restSeconds}s rest`}
              </p>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200", isExpanded && "rotate-180")} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-3">
            {/* Media - Inline Player or Thumbnail */}
            {mediaUrl && (
              isPlaying ? (
                <div className={cn(
                  "relative rounded-lg overflow-hidden",
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
                    onClick={(e) => { e.stopPropagation(); setIsPlaying(false); }}
                    className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPlaying(true);
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
                    {hasGif ? t.athlete.workoutView.viewAnimation : t.athlete.workoutView.watchVideo}
                  </div>
                </button>
              )
            )}

            {/* Exercise Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-medium">
                  {t.athlete.workoutView.sets}
                </p>
                <p className="font-medium mt-1">{workoutExercise.sets}</p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-medium">
                  {t.athlete.workoutView.reps}
                </p>
                <p className="font-medium mt-1">{workoutExercise.reps || "10"}</p>
              </div>
              {workoutExercise.restSeconds > 0 && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-medium">
                    {t.athlete.workoutView.rest}
                  </p>
                  <p className="font-medium mt-1">{workoutExercise.restSeconds}s</p>
                </div>
              )}
              {workoutExercise.weight && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-medium">
                    {t.athlete.workoutView.weight}
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

            {/* Instructions */}
            {instructions && (
              <div className="bg-muted/50 rounded-lg overflow-hidden">
                <button
                  className="flex items-center justify-between w-full p-3 text-left"
                  onClick={(e) => { e.stopPropagation(); setInstructionsOpen((v) => !v); }}
                >
                  <p className="text-xs text-muted-foreground uppercase font-medium">{t.athlete.session.howToPerform}</p>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", instructionsOpen && "rotate-180")} />
                </button>
                {instructionsOpen && (
                  <p className="text-sm px-3 pb-3 leading-relaxed whitespace-pre-wrap">{instructions}</p>
                )}
              </div>
            )}

            {/* Notes */}
            {workoutExercise.notes && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-medium">
                  {t.athlete.workoutView.notes}
                </p>
                <p className="text-sm mt-1">{workoutExercise.notes}</p>
              </div>
            )}

            {/* Watch Video Button (if no media preview but has video/gif data) */}
            {(videoId || hasGif) && !mediaUrl && (
              <Button
                variant="outline"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(true);
                }}
              >
                <Play className="h-4 w-4 mr-2" />
                {hasGif ? t.athlete.workoutView.viewAnimation : t.athlete.workoutView.watchVideo}
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

const AthleteWorkoutView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, displayName, photoURL, userRole } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [assignment, setAssignment] = useState<AssignmentWithWorkout | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPostConfirm, setShowPostConfirm] = useState(false);
  const [shareCaption, setShareCaption] = useState("");
  const [shareWorkoutSummary, setShareWorkoutSummary] = useState<import("@/types/timeline").WorkoutSummary | undefined>();
  const [showActivityDrawer, setShowActivityDrawer] = useState(false);
  const [showIncompleteDrawer, setShowIncompleteDrawer] = useState(false);
  // stageInputs mirrors workout.stages:
  //   regular stage → { type: "regular", pace: "MM:SS" }
  //   repeat stage  → { type: "repeat", reps: string[][] } (reps[repIdx][nestedStageIdx] = pace "MM:SS")
  const [activityForm, setActivityForm] = useState<{
    elapsedTime: string;
    distance: string;
    avgHeartRate: string;
    avgPace: string;
    avgSpeed: string;
    avgPower: string;
    paceManuallyEdited: boolean;
    stageInputs: Array<
      | { type: "regular"; pace: string }
      | { type: "repeat"; reps: string[][] }
    >;
  }>({
    elapsedTime: "",
    distance: "",
    avgHeartRate: "",
    avgPace: "",
    avgSpeed: "",
    avgPower: "",
    paceManuallyEdited: false,
    stageInputs: [],
  });

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
          title: t.common.error,
          description: t.athlete.toast.workoutLoadError,
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

  const isEnduranceWorkout = (type: string) =>
    type === "running" || type === "cycling" || type === "swimming";

  // Parse "MM:SS" string to seconds
  const parsePaceInput = (val: string): number | undefined => {
    const parts = val.trim().split(":").map(Number);
    if (parts.length !== 2 || parts.some(isNaN)) return undefined;
    return parts[0] * 60 + parts[1];
  };

  // Format seconds to "MM:SS"
  const formatPace = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Parse "HH:MM:SS" or "MM:SS" to seconds
  const parseElapsedTime = (val: string): number => {
    const parts = val.trim().split(":").map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  };

  // Derive pace from elapsed time string and distance
  const derivePace = (elapsedTime: string, distance: string, type: string): string => {
    const totalSecs = parseElapsedTime(elapsedTime);
    const dist = parseFloat(distance);
    if (!totalSecs || !dist || dist <= 0) return "";
    if (type === "swimming") return formatPace(totalSecs / (dist / 100));
    return formatPace(totalSecs / dist);
  };

  // Derive avg speed (km/h) from elapsed time and distance (km)
  const deriveSpeed = (elapsedTime: string, distance: string): string => {
    const totalSecs = parseElapsedTime(elapsedTime);
    const dist = parseFloat(distance);
    if (!totalSecs || !dist || dist <= 0) return "";
    return ((dist / totalSecs) * 3600).toFixed(1);
  };

  // Convert a decimal pace (e.g. 5.3 → "05:30") to "MM:SS" string
  const decimalPaceToMMSS = (dec: number): string => {
    const m = Math.floor(dec);
    const s = Math.round((dec - m) * 100);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Pre-fill pace "MM:SS" from a stage's coach-defined intensity.
  // Uses min pace (fastest / lowest number) when a range is set.
  const stageToPaceString = (stage: import("@/types/workout").WorkoutStage): string => {
    if (!isPaceType(stage.intensity.type)) return "";
    const paceDec = stage.intensity.min ?? stage.intensity.value;
    if (!paceDec) return "";
    return decimalPaceToMMSS(paceDec);
  };

  // Apply HH:MM:SS mask to raw input
  const applyTimeMask = (raw: string): string => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4)}`;
  };

  const handleToggleComplete = async () => {
    if (!assignment) return;

    const newCompletedState = !assignment.completedAt;

    // When un-completing an endurance workout, show options drawer
    if (!newCompletedState && isEnduranceWorkout(assignment.workout.type)) {
      setShowIncompleteDrawer(true);
      return;
    }

    // When completing an endurance workout, show the data drawer
    if (newCompletedState && isEnduranceWorkout(assignment.workout.type)) {
      const stageInputs = assignment.workout.stages.map((s) => {
        if (s.type === "repeat") {
          return {
            type: "repeat" as const,
            reps: Array.from({ length: s.repeatCount || 1 }, () =>
              (s.stages ?? []).map((nested) => stageToPaceString(nested))
            ),
          };
        }
        return { type: "regular" as const, pace: stageToPaceString(s) };
      });
      setActivityForm({ elapsedTime: "", distance: "", avgHeartRate: "", avgPace: "", avgSpeed: "", avgPower: "", paceManuallyEdited: false, stageInputs });
      setShowActivityDrawer(true);
      return;
    }

    setCompleting(true);
    try {
      await toggleAssignmentComplete(assignment.id, newCompletedState);

      setAssignment({
        ...assignment,
        completedAt: newCompletedState ? new Date() : null,
      });

      toast({
        title: newCompletedState ? t.athlete.toast.workoutCompleted : t.athlete.toast.workoutUnmarked,
        description: newCompletedState
          ? t.athlete.workoutView.workoutCompletedDesc
          : t.athlete.workoutView.workoutUnmarkedDesc,
      });
      if (newCompletedState && assignment) {
        setShareCaption(`Treino concluído: ${assignment.workout.name} ✅`);
        setShareWorkoutSummary({
          workoutName: assignment.workout.name,
          workoutType: assignment.workout.type,
          completionPercentage: assignment.completionPercentage,
        });
        setShowPostConfirm(true);
      }
    } catch (error) {
      console.error("Error updating workout:", error);
      toast({
        title: t.common.error,
        description: t.athlete.toast.workoutStatusError,
        variant: "destructive",
      });
    } finally {
      setCompleting(false);
    }
  };

  // Format seconds back to HH:MM:SS for pre-filling elapsed time
  const secsToHHMMSS = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleEditActivityData = () => {
    if (!assignment) return;
    setShowIncompleteDrawer(false);
    const existing = assignment.activityData ?? {};
    const stageInputs = assignment.workout.stages.map((s) => {
      if (s.type === "repeat") {
        return {
          type: "repeat" as const,
          reps: Array.from({ length: s.repeatCount || 1 }, () =>
            (s.stages ?? []).map((nested) => stageToPaceString(nested))
          ),
        };
      }
      return { type: "regular" as const, pace: stageToPaceString(s) };
    });
    setActivityForm({
      elapsedTime: existing.elapsedTime ? secsToHHMMSS(existing.elapsedTime) : "",
      distance: existing.distance !== undefined ? String(existing.distance) : "",
      avgHeartRate: existing.avgHeartRate !== undefined ? String(existing.avgHeartRate) : "",
      avgPace: existing.avgPace !== undefined ? formatPace(existing.avgPace) : "",
      avgSpeed: existing.avgSpeed !== undefined ? String(existing.avgSpeed) : "",
      avgPower: existing.avgPower !== undefined ? String(existing.avgPower) : "",
      paceManuallyEdited: !!existing.avgPace,
      stageInputs,
    });
    setShowActivityDrawer(true);
  };

  const handleMarkIncomplete = async () => {
    if (!assignment) return;
    setShowIncompleteDrawer(false);
    setCompleting(true);
    try {
      await toggleAssignmentComplete(assignment.id, false);
      setAssignment({ ...assignment, completedAt: null, activityData: undefined });
      toast({
        title: t.athlete.toast.workoutUnmarked,
        description: t.athlete.workoutView.workoutUnmarkedDesc,
      });
    } catch (error) {
      console.error("Error updating workout:", error);
      toast({ title: t.common.error, description: t.athlete.toast.workoutStatusError, variant: "destructive" });
    } finally {
      setCompleting(false);
    }
  };

  const handleSaveActivityData = async (skip = false) => {
    if (!assignment) return;
    setCompleting(true);
    setShowActivityDrawer(false);
    try {
      const activityData: ActivityData = {};
      if (!skip) {
        const elapsed = parseElapsedTime(activityForm.elapsedTime);
        if (elapsed > 0) activityData.elapsedTime = elapsed;
        const dist = parseFloat(activityForm.distance);
        if (!isNaN(dist) && dist > 0) activityData.distance = dist;
        const hr = parseInt(activityForm.avgHeartRate);
        if (!isNaN(hr) && hr > 0) activityData.avgHeartRate = hr;
        if (assignment.workout.type === "cycling") {
          const speed = parseFloat(activityForm.avgSpeed);
          if (!isNaN(speed) && speed > 0) activityData.avgSpeed = speed;
          const power = parseFloat(activityForm.avgPower);
          if (!isNaN(power) && power > 0) activityData.avgPower = power;
        } else {
          const pace = parsePaceInput(activityForm.avgPace);
          if (pace !== undefined) activityData.avgPace = pace;
        }
        // Collect stage times
        const stageTimes: import("@/types/workoutAssignment").StageTimeData[] = [];
        activityForm.stageInputs.forEach((input, idx) => {
          if (input.type === "regular") {
            const secs = parsePaceInput(input.pace);
            if (secs !== undefined) stageTimes.push({ stageIndex: idx, time: secs });
          } else {
            const reps = input.reps.map((stageVals) => ({
              times: stageVals.map((v) => { const s = parsePaceInput(v); return s !== undefined ? s : null; }),
            }));
            const hasAny = reps.some((r) => r.times.some((t) => t !== null));
            if (hasAny) stageTimes.push({ stageIndex: idx, reps });
          }
        });
        if (stageTimes.length > 0) activityData.stageTimes = stageTimes;
      }
      await completeEnduranceWorkout(assignment.id, activityData);
      setAssignment({ ...assignment, completedAt: new Date(), activityData });
      toast({
        title: t.athlete.toast.workoutCompleted,
        description: t.athlete.workoutView.workoutCompletedDesc,
      });
      setShareCaption(`Treino concluído: ${assignment.workout.name} ✅`);
      setShareWorkoutSummary({
        workoutName: assignment.workout.name,
        workoutType: assignment.workout.type,
        ...activityData,
        stageTimes: activityData.stageTimes?.map((st) => {
          const workoutStage = assignment.workout.stages[st.stageIndex];
          if (st.reps !== undefined) {
            return {
              label: `${workoutStage?.repeatCount ?? ""}x`,
              type: "repeat" as const,
              nestedLabels: (workoutStage?.stages ?? []).map((ns) => stageLabels[ns.type] ?? ns.type),
              reps: st.reps,
            };
          }
          return {
            label: stageLabels[workoutStage?.type ?? "run"] ?? workoutStage?.type ?? "",
            type: "regular" as const,
            time: st.time,
          };
        }),
      });
      setShowPostConfirm(true);
    } catch (error) {
      console.error("Error completing workout:", error);
      toast({
        title: t.common.error,
        description: t.athlete.toast.workoutStatusError,
        variant: "destructive",
      });
    } finally {
      setCompleting(false);
    }
  };

  const handleReset = async () => {
    if (!assignment) return;

    setResetting(true);
    try {
      await resetWorkoutAssignment(assignment.id);
      setAssignment({
        ...assignment,
        completedAt: null,
        progressData: undefined,
        completionPercentage: undefined,
        totalTime: undefined,
      });
      setShowResetConfirm(false);
    } catch (error) {
      console.error("Error resetting workout:", error);
      toast({
        title: t.common.error,
        description: t.athlete.toast.workoutStatusError,
        variant: "destructive",
      });
    } finally {
      setResetting(false);
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
        <p className="text-muted-foreground mb-4">{t.athlete.workoutView.workoutNotFound}</p>
        <Button onClick={() => navigate("/athlete")}>{t.athlete.workoutView.goBack}</Button>
      </div>
    );
  }

  const workout = assignment.workout;
  const Icon = workoutTypeIcons[workout.type] || PersonStanding;
  const isCompleted = !!assignment.completedAt;

  const handleSharePost = async (caption: string, imageUrl?: string, mentionedUserIds?: string[]) => {
    if (!user) return;
    const authorName = displayName || user.email || "Athlete";
    const postId = await createTimelinePost(
      { caption, imageUrl, workoutSummary: shareWorkoutSummary },
      user.uid,
      authorName,
      userRole ?? "athlete",
      photoURL
    );
    if (mentionedUserIds?.length) {
      await createMentionNotifications(postId, mentionedUserIds, authorName, caption);
    }
    setShowShareModal(false);
    navigate("/athlete/timeline");
  };

  return (
    <>
    <CreatePostModal
      open={showShareModal}
      onOpenChange={setShowShareModal}
      onSubmit={handleSharePost}
      initialCaption={shareCaption}
      workoutSummary={shareWorkoutSummary}
    />
    <Drawer open={showPostConfirm} onOpenChange={setShowPostConfirm}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t.athlete.workoutView.shareToFeedTitle}</DrawerTitle>
          <DrawerDescription>{t.athlete.workoutView.shareToFeedDesc}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-2">
          <button
            className="flex items-center gap-3 w-full p-4 rounded-xl border bg-card hover:bg-muted transition-colors text-left"
            onClick={() => {
              setShowPostConfirm(false);
              setShowShareModal(true);
            }}
          >
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">{t.athlete.workoutView.shareToFeedYes}</p>
            </div>
          </button>
          <button
            className="flex items-center gap-3 w-full p-4 rounded-xl border bg-card hover:bg-muted transition-colors text-left"
            onClick={() => setShowPostConfirm(false)}
          >
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Circle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">{t.athlete.workoutView.shareToFeedNo}</p>
            </div>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
    <AthletePortalLayout title={t.athlete.nav.workouts} hideBottomNav>
      {/* Content */}
      <div className="flex-1 overflow-auto pb-24">
        {/* Sub-header: back + centered workout name */}
        <div className="relative flex items-center px-4 py-3">
          <button
            onClick={() => navigate("/athlete/calendar")}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold truncate max-w-[60%] text-center">
            {workout.name}
          </h1>
        </div>

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
                      "text-xl font-bold text-balance break-words",
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
                          ? `${assignment.completionPercentage}% ${t.athlete.workoutView.completedBadge}`
                          : t.athlete.workoutView.completedBadge}
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
                        ? `${workout.exercises?.length || 0} ${t.athlete.workoutView.exercises}`
                        : `${workout.stages.length} ${t.athlete.workoutView.stages}`}
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

              {/* Activity data summary for completed endurance workouts */}
              {isCompleted && assignment.activityData && Object.keys(assignment.activityData).length > 0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg grid grid-cols-2 gap-2 text-sm">
                  {assignment.activityData.elapsedTime !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{formatTime(assignment.activityData.elapsedTime)}</span>
                    </div>
                  )}
                  {assignment.activityData.distance !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{assignment.activityData.distance}{workout.type === "swimming" ? "m" : "km"}</span>
                    </div>
                  )}
                  {assignment.activityData.avgHeartRate !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{assignment.activityData.avgHeartRate} bpm</span>
                    </div>
                  )}
                  {assignment.activityData.avgPace !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <Wind className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{formatTime(assignment.activityData.avgPace)}{workout.type === "swimming" ? "/100m" : "/km"}</span>
                    </div>
                  )}
                  {assignment.activityData.avgSpeed !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{assignment.activityData.avgSpeed} km/h</span>
                    </div>
                  )}
                </div>
              )}

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
                {t.athlete.workoutView.exercisesSection} ({workout.exercises?.length || 0})
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
                      t={t}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-lg mb-3">
                {t.athlete.workoutView.stagesSection} ({workout.stages.length})
              </h3>
              <div className="space-y-2">
                {workout.stages.map((stage, index) => (
                  <StageItem key={stage.id} stage={stage} index={index} t={t} />
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
              {t.athlete.workoutView.startWorkout}
            </Button>
          </Link>
        ) : workout.type === "strength" && isCompleted ? (
          <div className="flex flex-col gap-2">
            <Link to={`/athlete/workout/${id}/session`} className="block">
              <Button
                size="lg"
                className="w-full h-12 text-base font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-black"
              >
                <Play className="h-5 w-5 mr-2" />
                {t.athlete.workoutView.resumeWorkout}
              </Button>
            </Link>
            <Button
              onClick={() => setShowResetConfirm(true)}
              disabled={resetting}
              size="lg"
              variant="ghost"
              className="w-full h-10 text-sm font-medium rounded-xl text-muted-foreground"
            >
              {resetting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              {t.athlete.workoutView.resetWorkout}
            </Button>
          </div>
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
                {t.athlete.workoutView.markIncomplete}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                {t.athlete.workoutView.completeWorkout}
              </>
            )}
          </Button>
        )}
      </div>

      <Drawer open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t.athlete.workoutView.resetConfirmTitle}</DrawerTitle>
            <DrawerDescription>{t.athlete.workoutView.resetConfirmDescription}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={resetting}
              className="w-full"
            >
              {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t.athlete.workoutView.resetConfirmConfirm}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setShowResetConfirm(false)}>
              {t.athlete.workoutView.resetConfirmCancel}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Activity Data Drawer for endurance workouts */}
      <Drawer open={showActivityDrawer} onOpenChange={setShowActivityDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t.athlete.workoutView.activityDataTitle}</DrawerTitle>
            <DrawerDescription>{t.athlete.workoutView.activityDataDesc}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2 space-y-4">
            {/* HH:MM:SS time input */}
            <div className="space-y-1.5">
              <Label htmlFor="elapsed-time">{t.athlete.workoutView.elapsedTime}</Label>
              <Input
                id="elapsed-time"
                placeholder="HH:MM:SS"
                inputMode="numeric"
                value={activityForm.elapsedTime}
                onChange={(e) => {
                  const elapsedTime = applyTimeMask(e.target.value);
                  setActivityForm((f) => {
                    const next = { ...f, elapsedTime };
                    if (!next.paceManuallyEdited) {
                      if (assignment?.workout.type === "cycling") {
                        next.avgSpeed = deriveSpeed(elapsedTime, f.distance);
                      } else {
                        next.avgPace = derivePace(elapsedTime, f.distance, assignment?.workout.type ?? "");
                      }
                    }
                    return next;
                  });
                }}
              />
            </div>

            {/* Distance */}
            <div className="space-y-1.5">
              <Label htmlFor="distance">
                {assignment?.workout.type === "swimming"
                  ? t.athlete.workoutView.distanceM
                  : t.athlete.workoutView.distanceKm}
              </Label>
              <Input
                id="distance"
                type="number"
                inputMode="decimal"
                placeholder={assignment?.workout.type === "swimming" ? "Ex: 1500" : "Ex: 10.5"}
                value={activityForm.distance}
                onChange={(e) => {
                  const distance = e.target.value;
                  setActivityForm((f) => {
                    const next = { ...f, distance };
                    if (!next.paceManuallyEdited) {
                      if (assignment?.workout.type === "cycling") {
                        next.avgSpeed = deriveSpeed(f.elapsedTime, distance);
                      } else {
                        next.avgPace = derivePace(f.elapsedTime, distance, assignment?.workout.type ?? "");
                      }
                    }
                    return next;
                  });
                }}
              />
            </div>

            {/* Heart Rate */}
            <div className="space-y-1.5">
              <Label htmlFor="avg-hr">{t.athlete.workoutView.avgHeartRate}</Label>
              <Input
                id="avg-hr"
                type="number"
                inputMode="numeric"
                placeholder="Ex: 145"
                value={activityForm.avgHeartRate}
                onChange={(e) => setActivityForm((f) => ({ ...f, avgHeartRate: e.target.value }))}
              />
            </div>

            {/* Speed (cycling) or Pace (running/swimming) */}
            {assignment?.workout.type === "cycling" ? (
              <div className="space-y-1.5">
                <Label htmlFor="avg-speed">
                  {t.athlete.workoutView.avgSpeed}
                  {activityForm.avgSpeed && !activityForm.paceManuallyEdited && (
                    <span className="ml-2 text-xs text-muted-foreground font-normal">({t.athlete.workoutView.paceCalculated})</span>
                  )}
                </Label>
                <Input
                  id="avg-speed"
                  type="number"
                  inputMode="decimal"
                  placeholder="Ex: 28.5"
                  value={activityForm.avgSpeed}
                  onChange={(e) => setActivityForm((f) => ({ ...f, avgSpeed: e.target.value, paceManuallyEdited: true }))}
                  onFocus={() => setActivityForm((f) => ({ ...f, paceManuallyEdited: true }))}
                />
                <div className="space-y-1.5 pt-3">
                  <Label htmlFor="avg-power">{t.athlete.activity.metrics.avgPower} (W)</Label>
                  <Input
                    id="avg-power"
                    type="number"
                    inputMode="numeric"
                    placeholder="Ex: 220"
                    value={activityForm.avgPower}
                    onChange={(e) => setActivityForm((f) => ({ ...f, avgPower: e.target.value }))}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="avg-pace">
                  {t.athlete.workoutView.avgPace}
                  {activityForm.avgPace && !activityForm.paceManuallyEdited && (
                    <span className="ml-2 text-xs text-muted-foreground font-normal">({t.athlete.workoutView.paceCalculated})</span>
                  )}
                </Label>
                <Input
                  id="avg-pace"
                  placeholder={
                    assignment?.workout.type === "swimming"
                      ? t.athlete.workoutView.avgPaceSwimPlaceholder
                      : t.athlete.workoutView.avgPaceRunPlaceholder
                  }
                  value={activityForm.avgPace}
                  onChange={(e) => setActivityForm((f) => ({ ...f, avgPace: e.target.value, paceManuallyEdited: true }))}
                  onFocus={() => setActivityForm((f) => ({ ...f, paceManuallyEdited: true }))}
                />
              </div>
            )}

          </div>
          <DrawerFooter>
            <Button
              onClick={() => handleSaveActivityData(false)}
              disabled={completing}
              className="bg-primary text-primary-foreground"
            >
              {completing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t.athlete.workoutView.saveAndComplete}
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleSaveActivityData(true)}
              disabled={completing}
            >
              {t.athlete.workoutView.skipAndComplete}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Mark Incomplete options drawer */}
      <Drawer open={showIncompleteDrawer} onOpenChange={setShowIncompleteDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t.athlete.workoutView.incompleteDrawerTitle}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-2">
            <button
              className="flex items-center gap-3 w-full p-4 rounded-xl border bg-card hover:bg-muted transition-colors text-left"
              onClick={handleEditActivityData}
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{t.athlete.workoutView.incompleteDrawerEdit}</p>
                <p className="text-xs text-muted-foreground">{t.athlete.workoutView.incompleteDrawerEditDesc}</p>
              </div>
            </button>
            <button
              className="flex items-center gap-3 w-full p-4 rounded-xl border bg-card hover:bg-muted transition-colors text-left"
              onClick={handleMarkIncomplete}
              disabled={completing}
            >
              <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                {completing ? <Loader2 className="h-5 w-5 animate-spin text-destructive" /> : <Circle className="h-5 w-5 text-destructive" />}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-destructive">{t.athlete.workoutView.incompleteDrawerReset}</p>
                <p className="text-xs text-muted-foreground">{t.athlete.workoutView.incompleteDrawerResetDesc}</p>
              </div>
            </button>
          </div>
        </DrawerContent>
      </Drawer>

    </AthletePortalLayout>
    </>
  );
};

export default AthleteWorkoutView;
