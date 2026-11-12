import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import { formatHold, parseTimedReps } from "@/utils/timedReps";
import WorkoutChecklistDrawer from "@/components/athlete/WorkoutChecklistDrawer";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
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
import { createMentionNotifications, createTimelinePost, hasPostForAssignment } from "@/services/timelineService";
import { useLanguage, type TranslationsType } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { clearSessionDraft, getDraftProgress, loadSessionDraft } from "@/lib/sessionDraft";
import ShareWorkoutSheet from "@/components/athlete/ShareWorkoutSheet";
import { buildWorkoutSummary } from "@/utils/buildWorkoutSummary";
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
} from "@/types/exercise";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import type { WorkoutStage } from "@/types/workout";
import { durationUnitLabel, workoutLabels, type WorkoutLabels } from "@/utils/workoutLabels";
import { pacePer100m, pacePerKm, swimDistanceMeters } from "@/utils/activityFormat";
import { formatDuration as formatElapsed, nextDurationInput, normalizeDurationInput, parseDuration, type DurationInputMode } from "@/utils/durationInput";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardList,
  Dumbbell,
  Loader2,
  Play,
  X,
  Share2,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatDate } from "@/lib/dates";
import { DetailSkeleton } from "@/components/feedback/skeletons";
import { WorkoutPlanCard } from "@/components/athlete/WorkoutPlanCard";
import { WorkoutSummaryCard } from "@/components/timeline/WorkoutSummaryCard";
import { sportKey } from "@/components/timeline/sport";
import { stepSeconds } from "@/components/timeline/workout-viz/planModel";




// Utility functions for formatting
const formatDuration = (stage: WorkoutStage, L: WorkoutLabels, lapLabel: string): string => {
  if (stage.duration.type === "lapButton") {
    return lapLabel;
  }
  if (stage.duration.value !== undefined) {
    // Older workouts may store the legacy unit "minutes", so widen to string
    const unit: string = stage.duration.unit || "";
    const value = stage.duration.value;
    if ((unit === "min" || unit === "minutes") && value % 1 !== 0) {
      const totalSeconds = Math.round(value * 60);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")} ${unit}`;
    }
    return `${value} ${durationUnitLabel(unit)}`;
  }
  return L.duration(stage.duration.type);
};

// Convert decimal pace (e.g. 5.3 → "5:30", 5.45 → "5:45") to MM:SS
const decimalToMMSS = (val: number): string => {
  const mins = Math.floor(val);
  const secs = Math.round((val - mins) * 100);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const isPaceType = (type: string) => type === "pace" || type === "targetPace" || type === "cssBasedPace";

const formatIntensity = (stage: WorkoutStage, L: WorkoutLabels, t: TranslationsType): string | null => {
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
    return `${t.workoutMeta.hrZone} ${stage.intensity.value}`;
  }
  if (stage.intensity.type === "powerZone" && stage.intensity.value !== undefined) {
    return `${t.workoutMeta.powerZoneShort} ${stage.intensity.value}`;
  }
  if (stage.intensity.min !== undefined && stage.intensity.max !== undefined) {
    return `${stage.intensity.min}-${stage.intensity.max} ${stage.intensity.unit || ""}`;
  }
  if (stage.intensity.value !== undefined) {
    return `${stage.intensity.value} ${stage.intensity.unit || ""}`;
  }
  return L.intensity(stage.intensity.type);
};

const formatSwimmingDetails = (stage: WorkoutStage, L: WorkoutLabels): string[] => {
  const details: string[] = [];
  if (stage.strokeType) {
    details.push(L.stroke(stage.strokeType));
  }
  if (stage.drillType && stage.drillType !== "none") {
    details.push(L.drill(stage.drillType));
  }
  if (stage.equipment && stage.equipment !== "none") {
    details.push(L.swimEquipment(stage.equipment));
  }
  return details;
};

/** Duration of a step for the timeline: "15 min", "400 m", "1:30" ... */
const stepSecondsLabel = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m >= 60) return `${Math.floor(m / 60)}h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}` : ""}`;
  return s ? `${m}:${String(s).padStart(2, "0")}` : `${m} min`;
};

/** Target as a chip: "Z2", "Pace 5:00–5:30 /km", ... (pace always in mm:ss) */
const intensityChip = (stage: WorkoutStage, L: WorkoutLabels, t: TranslationsType): { kind: string; value: string } | null => {
  const i = stage.intensity;
  if (!i || i.type === "none") return null;
  if ((i.type === "heartRateZone" || i.type === "powerZone") && i.value !== undefined) return { kind: `Z${i.value}`, value: "" };
  const text = formatIntensity(stage, L, t);
  if (!text) return null;
  return { kind: isPaceType(i.type) ? t.athlete.workoutView.paceChip : L.intensity(i.type), value: text };
};

/**
 * One step of the timeline: dot in the sport colour (lighter for easy steps),
 * name, duration on the right, the target as a chip and the coach's note — all
 * visible, nothing to expand (docs/design/workout-screens §2.1).
 */
const StepRow = ({ stage, sport, t, nested = false }: { stage: WorkoutStage; sport: string; t: TranslationsType; nested?: boolean }) => {
  const L = workoutLabels(t);
  const easy = stage.type === "warmup" || stage.type === "cooldown" || stage.type === "recovery" || stage.type === "rest";
  const chip = intensityChip(stage, L, t);
  const swim = formatSwimmingDetails(stage, L);
  return (
    <li className={cn("relative flex gap-3", nested ? "py-1.5" : "py-2")}>
      <span
        aria-hidden
        className="relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full ring-4 ring-background"
        style={{ backgroundColor: `hsl(var(--sport-${sport}) / ${easy ? 0.4 : 1})` }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-sm font-semibold">{L.stage(stage.type)}</p>
          <p className="shrink-0 text-sm font-semibold tabular-nums">{formatDuration(stage, L, t.athlete.workoutView.pressLapButton)}</p>
        </div>
        {(chip || swim.length > 0) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {chip && (
              <span className="inline-flex items-center gap-1 rounded-md border border-foreground/10 bg-foreground/[0.05] px-1.5 py-0.5">
                <b className="font-semibold text-foreground">{chip.kind}</b>
                {chip.value && <span className="tabular-nums">{chip.value}</span>}
              </span>
            )}
            {swim.map((d) => <span key={d}>{d}</span>)}
          </div>
        )}
        {stage.notes && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{stage.notes}</p>}
      </div>
    </li>
  );
};

/** All steps open, in order, with repeats as a dashed block */
const StageTimeline = ({ stages, sport, workoutType, t }: { stages: WorkoutStage[]; sport: string; workoutType: string; t: TranslationsType }) => (
  <ol className="relative space-y-1 before:absolute before:bottom-3 before:left-[5px] before:top-3 before:w-px before:bg-border">
    {stages.map((stage) =>
      stage.type === "repeat" ? (
        <li key={stage.id} className="relative ml-6 rounded-2xl border border-dashed border-foreground/20 px-3 py-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-bold">{t.athlete.workoutView.repeatBlock.replace("{{n}}", String(stage.repeatCount || 2))}</p>
            {(() => {
              const inner = (stage.stages ?? []).map((s) => (s.duration?.type === "time" ? stepSeconds(s, workoutType) : undefined));
              if (!inner.length || inner.some((x) => x === undefined)) return null;
              const total = (inner as number[]).reduce((a, b) => a + b, 0) * (stage.repeatCount || 2);
              return <p className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">{stepSecondsLabel(total)}</p>;
            })()}
          </div>
          <ol className="-ml-[2px]">
            {(stage.stages ?? []).map((nested) => (
              <StepRow key={nested.id} stage={nested} sport={sport} t={t} nested />
            ))}
          </ol>
        </li>
      ) : (
        <StepRow key={stage.id} stage={stage} sport={sport} t={t} />
      )
    )}
  </ol>
);

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
  const holdSeconds = parseTimedReps(workoutExercise.reps);
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
              <p className="font-semibold text-sm line-clamp-2 break-words">{exerciseName}</p>
              <p className="text-xs text-muted-foreground">
                {workoutExercise.sets} {t.athlete.workoutView.sets.toLowerCase()} × {holdSeconds ? formatHold(holdSeconds) : `${workoutExercise.reps || "10"} ${t.athlete.workoutView.reps.toLowerCase()}`}
                {workoutExercise.restSeconds > 0 && ` · ${workoutExercise.restSeconds}s ${t.athlete.workoutView.rest.toLowerCase()}`}
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
                      src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`}
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
                  {holdSeconds ? t.athlete.session.timeHeader : t.athlete.workoutView.reps}
                </p>
                <p className="font-medium mt-1">{holdSeconds ? formatHold(holdSeconds) : workoutExercise.reps || "10"}</p>
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
                    {t.workout.muscleGroups[mg] || mg}
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
  const { t, language } = useLanguage();
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
  const [shareCaption, setShareCaption] = useState("");
  const [shareWorkoutSummary, setShareWorkoutSummary] = useState<import("@/types/timeline").WorkoutSummary | undefined>();
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [alreadyPosted, setAlreadyPosted] = useState(false);
  // All of the athlete's assignments — PRs of a past session are measured against earlier ones
  const [allAssignments, setAllAssignments] = useState<AssignmentWithWorkout[]>([]);
  const [showActivityDrawer, setShowActivityDrawer] = useState(false);
  const [showChecklistDrawer, setShowChecklistDrawer] = useState(false);
  const [showIncompleteDrawer, setShowIncompleteDrawer] = useState(false);
  const [showMarkDoneConfirm, setShowMarkDoneConfirm] = useState(false);
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
  // How the elapsed-time field groups digits (see nextDurationInput)
  const elapsedMode = useRef<DurationInputMode>("auto");

  useEffect(() => {
    const loadAssignment = async () => {
      if (!user || !id) return;

      try {
        const assignments = await getAssignmentsWithWorkoutsByAthlete(user.uid);
        const found = assignments.find((a) => a.id === id);
        if (found) {
          setAssignment(found);
          setAllAssignments(assignments);
          if (found.completedAt) {
            hasPostForAssignment(user.uid, found.id)
              .then(setAlreadyPosted)
              .catch(() => {});
          }
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

  // "h:mm:ss" or "m:ss" to seconds; 0 when empty or invalid (see utils/durationInput)
  const parseElapsedTime = (val: string): number => parseDuration(val) ?? 0;
  const elapsedInvalid = !!activityForm.elapsedTime.trim() && parseDuration(activityForm.elapsedTime) === undefined;

  // Derive pace from elapsed time string and distance
  const derivePace = (elapsedTime: string, distance: string, type: string): string => {
    const totalSecs = parseElapsedTime(elapsedTime);
    const dist = parseFloat(distance);
    // Swim distance is typed in metres, run distance in km
    const pace = type === "swimming" ? pacePer100m(totalSecs, dist) : pacePerKm(totalSecs, dist);
    return pace ? formatPace(pace) : "";
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
      elapsedMode.current = "auto";
      setActivityForm({ elapsedTime: "", distance: "", avgHeartRate: "", avgPace: "", avgSpeed: "", avgPower: "", paceManuallyEdited: false, stageInputs });
      setShowActivityDrawer(true);
      return;
    }

    // One tap would close the whole workout without any sets logged, so confirm first
    if (newCompletedState) {
      setShowMarkDoneConfirm(true);
      return;
    }

    await applyToggleComplete(false);
  };

  const undoMarkDone = async (assignmentId: string) => {
    try {
      await toggleAssignmentComplete(assignmentId, false);
      setAssignment((prev) => (prev ? { ...prev, completedAt: null } : prev));
      setShowShareSheet(false);
    } catch (error) {
      console.error("Error updating workout:", error);
      toast({ title: t.common.error, description: t.athlete.toast.workoutStatusError, variant: "destructive" });
    }
  };

  const applyToggleComplete = async (newCompletedState: boolean) => {
    if (!assignment) return;
    setShowMarkDoneConfirm(false);
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
        ...(newCompletedState
          ? {
              // Longer than the default 3 s so there's time to hit Undo
              duration: 6000,
              action: (
                <ToastAction altText={t.athlete.workoutView.undo} onClick={() => undoMarkDone(assignment.id)}>
                  {t.athlete.workoutView.undo}
                </ToastAction>
              ),
            }
          : {}),
      });
      if (newCompletedState && assignment) {
        setShareCaption(t.athlete.workoutView.shareCaption.replace("{{name}}", assignment.workout.name));
        setShareWorkoutSummary({
          workoutName: assignment.workout.name,
          workoutType: assignment.workout.type,
          completionPercentage: assignment.completionPercentage,
        });
        setShowShareSheet(true);
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
    elapsedMode.current = "auto";
    setActivityForm({
      elapsedTime: existing.elapsedTime ? formatElapsed(existing.elapsedTime) : "",
      distance:
        existing.distance === undefined
          ? ""
          : assignment.workout.type === "swimming"
          ? String(swimDistanceMeters(existing.distance) ?? "")
          : String(existing.distance),
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
    // Keep the drawer open so the person can fix the time (the field shows why)
    if (!skip && elapsedInvalid) {
      document.getElementById("elapsed-time")?.focus();
      return;
    }
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
      setShareCaption(t.athlete.workoutView.shareCaption.replace("{{name}}", assignment.workout.name));
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
              nestedLabels: (workoutStage?.stages ?? []).map((ns) => workoutLabels(t).stage(ns.type)),
              reps: st.reps,
            };
          }
          return {
            label: workoutLabels(t).stage(workoutStage?.type ?? "run"),
            type: "regular" as const,
            time: st.time,
          };
        }),
      });
      setShowShareSheet(true);
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
      clearSessionDraft(assignment.id);
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
      <div className="min-h-screen bg-background">
        <DetailSkeleton className="mx-auto max-w-2xl p-4 pt-[max(1rem,env(safe-area-inset-top))]" />
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
  const isCompleted = !!assignment.completedAt;

  // An unfinished session on this phone (same rule the session uses to restore it)
  const draft = workout.type === "strength" ? loadSessionDraft(assignment.id) : null;
  const draftProgress =
    draft && (!assignment.completedAt || draft.updatedAt > assignment.completedAt.getTime())
      ? getDraftProgress(draft)
      : null;
  const sessionLink = (
    <Link
      to={`/athlete/workout/${id}/session`}
      className={cn(
        buttonVariants({ size: "lg" }),
        "w-full h-[52px] text-base font-bold rounded-[14px] bg-primary hover:bg-primary/90 text-primary-foreground"
      )}
    >
      <Play className="h-5 w-5 mr-2" />
      {draftProgress || isCompleted ? t.athlete.workoutView.resumeWorkout : t.athlete.workoutView.startWorkout}
      {draftProgress && (
        <span className="ml-2 text-sm font-medium tabular-nums opacity-75">
          {t.athlete.workoutView.resumeProgress
            .replace("{{percent}}", String(draftProgress.percent))
            .replace("{{minutes}}", String(draftProgress.minutes))}
        </span>
      )}
    </Link>
  );

  // Share any completed workout, any time (feed post or image)
  const handleOpenShare = () => {
    if (!assignment) return;
    setShareWorkoutSummary(buildWorkoutSummary(assignment, allAssignments));
    setShareCaption(t.athlete.workoutView.shareCaption.replace("{{name}}", assignment.workout.name));
    setShowShareSheet(true);
  };

  const handleSharePost = async ({ caption, imageUrls, mentions }: import("@/types/timeline").ComposerResult) => {
    if (!user) return;
    const authorName = displayName || user.email || "Athlete";
    const mentionedUserIds = mentions.map((m) => m.id);
    const postId = await createTimelinePost(
      { caption, imageUrls, mentions, workoutSummary: shareWorkoutSummary, assignmentId: assignment?.id },
      user.uid,
      authorName,
      userRole ?? "athlete",
      photoURL
    );
    if (mentionedUserIds?.length) {
      await createMentionNotifications(postId, mentionedUserIds, authorName, caption);
    }
    setShowShareModal(false);
    setAlreadyPosted(true);
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
    {shareWorkoutSummary && (
      <ShareWorkoutSheet
        open={showShareSheet}
        onOpenChange={setShowShareSheet}
        summary={shareWorkoutSummary}
        alreadyPosted={alreadyPosted}
        onPostToFeed={() => {
          setShowShareSheet(false);
          setShowShareModal(true);
        }}
      />
    )}
    <AthletePortalLayout showHeader={false} hideBottomNav>
      {/* Content */}
      <div className="flex-1 overflow-auto pb-24">
        {/* Own header (back + workout name + checklist) replaces the app header, so there's one bar, not two */}
        <div className="sticky top-0 z-40 flex items-center px-2 h-14 bg-background/90 backdrop-blur border-b border-border/50">
          <button
            onClick={() => navigate("/athlete/calendar")}
            aria-label={t.athlete.workoutView.goBack}
            className="h-11 w-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          {/* The name lives in the card below; the bar only says where you are */}
          <p className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold">{t.athlete.workoutView.title}</p>
          <button
            onClick={() => setShowChecklistDrawer(true)}
            className="ml-auto h-11 w-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label={t.athlete.workoutView.checklist}
            title={t.athlete.workoutView.checklist}
          >
            <ClipboardList className="h-5 w-5" />
          </button>
        </div>

        {/* Workout card: the plan, or the real numbers once done (same card as the feed) */}
        <div className="p-4">
          {isCompleted ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-3xl border">
                <WorkoutSummaryCard summary={buildWorkoutSummary(assignment, allAssignments)} variant="poster" />
              </div>
              <p className="flex items-center gap-1.5 px-1 text-sm text-success-ink">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                {t.athlete.workoutView.completedBadge}
                {assignment.completedAt && <span className="text-muted-foreground">· {formatDate(assignment.completedAt, "weekdayShort", language)}</span>}
                {/* The sets/steps actually done live on the activity page (same data, one place) */}
                <Link to={`/athlete/activity/${assignment.id}`} className="ml-auto -my-2 py-2 font-semibold text-primary-ink">
                  {t.athlete.workoutView.viewDone}
                </Link>
              </p>
              {workout.notes?.trim() && (
                <div className="rounded-xl bg-foreground/[0.04] px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t.athlete.workoutView.fromCoach}</p>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap">{workout.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <WorkoutPlanCard workout={workout} date={assignment.scheduledDate} />
          )}
        </div>

        {/* Stages or Exercises */}
        <div className="px-4 pb-4">
          {workout.type === "strength" ? (
            <>
              <h2 className="mb-3 text-base font-bold">{t.athlete.workoutView.exercisesSection}</h2>
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
              <h2 className="mb-2 text-base font-bold">{t.athlete.workoutView.stagesSection}</h2>
              <StageTimeline stages={workout.stages} sport={sportKey(workout.type)} workoutType={workout.type} t={t} />
            </>
          )}
        </div>
      </div>

      {/* Bottom Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border/50 safe-area-bottom">
        {isCompleted && (
          <Button
            onClick={handleOpenShare}
            size="lg"
            variant="outline"
            className="w-full h-12 mb-2 text-base font-semibold rounded-xl"
          >
            <Share2 className="h-5 w-5 mr-2" />
            {t.athlete.share.button}
          </Button>
        )}
        {workout.type === "strength" && !isCompleted ? (
          <div className="flex flex-col gap-1">
            {sessionLink}
            {/* Done without logging sets: the same handler (and confirm) as before, now one place only */}
            <Button
              type="button"
              onClick={handleToggleComplete}
              disabled={completing}
              variant="ghost"
              className="h-10 w-full text-sm font-medium text-muted-foreground"
            >
              {completing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t.athlete.workoutView.markAsDone}
            </Button>
          </div>
        ) : workout.type === "strength" && isCompleted ? (
          <div className="flex flex-col gap-2">
            {sessionLink}
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
              "w-full h-[52px] text-base font-bold rounded-[14px]",
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

      <Drawer open={showMarkDoneConfirm} onOpenChange={setShowMarkDoneConfirm}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t.athlete.workoutView.markDoneTitle}</DrawerTitle>
            <DrawerDescription>{t.athlete.workoutView.markDoneDescription}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button type="button" onClick={() => applyToggleComplete(true)} disabled={completing} className="w-full">
              {completing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t.athlete.workoutView.markDoneConfirm}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => setShowMarkDoneConfirm(false)}>
              {t.athlete.workoutView.markDoneCancel}
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
                placeholder="h:mm:ss"
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={elapsedInvalid}
                aria-describedby={elapsedInvalid ? "elapsed-time-error" : undefined}
                value={activityForm.elapsedTime}
                onBlur={() =>
                  setActivityForm((f) => ({ ...f, elapsedTime: normalizeDurationInput(f.elapsedTime) }))
                }
                onChange={(e) => {
                  const typed = nextDurationInput(activityForm.elapsedTime, e.target.value, elapsedMode.current);
                  elapsedMode.current = typed.mode;
                  const elapsedTime = typed.value;
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
              {elapsedInvalid && (
                <p id="elapsed-time-error" className="text-xs text-destructive-ink">
                  {t.athlete.workoutView.elapsedTimeInvalid}
                </p>
              )}
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
                placeholder={assignment?.workout.type === "swimming" ? t.athlete.workoutView.distanceSwimPlaceholder : t.athlete.workoutView.distancePlaceholder}
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
                placeholder={t.athlete.workoutView.avgHeartRatePlaceholder}
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
                  placeholder={t.athlete.workoutView.avgSpeedPlaceholder}
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
                    placeholder={t.athlete.workoutView.avgPowerPlaceholder}
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

    {user && (
      <WorkoutChecklistDrawer
        open={showChecklistDrawer}
        onOpenChange={setShowChecklistDrawer}
        assignmentId={assignment.id}
        userId={user.uid}
        workoutType={workout.type}
      />
    )}
    </AthletePortalLayout>
    </>
  );
};

export default AthleteWorkoutView;
