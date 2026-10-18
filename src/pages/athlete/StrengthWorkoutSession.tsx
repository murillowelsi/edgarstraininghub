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
  updateAssignmentFeedback,
} from "@/services/workoutAssignmentsService";
import SessionSummary, { type SessionSummaryData } from "@/components/athlete/SessionSummary";
import ShareWorkoutSheet from "@/components/athlete/ShareWorkoutSheet";
import type { ComposerResult, SummaryHighlight, WorkoutSummary } from "@/types/timeline";
import type { Exercise, WorkoutExercise } from "@/types/exercise";
import {
  getYouTubeThumbnail,
  getYouTubeVideoId,
  muscleGroupLabels,
} from "@/types/exercise";
import type { AssignmentWithWorkout, SetProgressData } from "@/types/workoutAssignment";
import {
  buildBestByExercise,
  computeStrengthVolume,
  formatWeight,
  isPersonalRecord,
  isWorkingSet,
  parseNum,
  type ExerciseBest,
} from "@/utils/strengthStats";
import { format } from "date-fns";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import RestTimerPill from "@/components/athlete/RestTimerPill";
import { useWakeLock } from "@/hooks/useWakeLock";
import { cancelRestPush, scheduleRestPush } from "@/services/restTimerPush";
import {
  clearSessionDraft,
  loadSessionDraft,
  saveSessionDraft,
  type RestState,
} from "@/lib/sessionDraft";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Dumbbell,
  History,
  Minus,
  MoreVertical,
  Play,
  Plus,
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
  time: number; // Legacy per-set stopwatch; kept so saved data keeps its shape
  warmup?: boolean;
}

interface ExerciseProgress {
  exerciseId: string;
  sets: SetProgress[];
}

const DEFAULT_REST_SECONDS = 60;
const SAVE_TIMEOUT_MS = 4000;

/** Resolves "done" if the promise settles in time, else "pending" (it keeps running). */
const settleWithin = (promise: Promise<unknown>, ms: number): Promise<"done" | "pending"> =>
  Promise.race([
    promise.then(() => "done" as const),
    new Promise<"pending">((resolve) => setTimeout(() => resolve("pending"), ms)),
  ]);
const WEIGHT_STEP = 2.5;

interface SetSuggestion {
  reps: string;
  weight: string;
  /** Values come from the athlete's last session (vs. the coach target / previous set) */
  fromHistory: boolean;
}

/**
 * Most recent logged sets per exercise from the athlete's other completed
 * sessions. Only sets with reps or weight count, so empty ticks don't hide
 * older real data.
 */
const buildPreviousSets = (assignments: AssignmentWithWorkout[], currentId: string) => {
  const previous = new Map<string, SetProgressData[]>();
  const done = assignments
    .filter((a) => a.id !== currentId && a.completedAt && a.progressData?.length)
    .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime());
  for (const a of done) {
    for (const p of a.progressData ?? []) {
      if (previous.has(p.exerciseId)) continue;
      const logged = p.sets.filter((s) => !s.warmup && (s.reps.trim() || s.weight.trim()));
      if (logged.length) previous.set(p.exerciseId, logged);
    }
  }
  return previous;
};

// "8 to 12" / "8-12" / "10" are rep counts; anything else ("10 minutos 3% inclinação") is shown as written
const REP_RANGE = /^\s*\d+(\s*(-|–|to|a|até)\s*\d+)?\s*$/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatPrescription = (we: WorkoutExercise, t: any) => {
  const reps = (we.reps || "10").trim();
  const repsText = REP_RANGE.test(reps) ? `${reps.replace(/\s*(-|–|to|a|até)\s*/i, "–")} reps` : reps;
  const parts = [`${we.sets} × ${repsText}`];
  // Coach's suggested load: "20" → "20 kg", free text ("peso corporal") as written
  if (we.weight?.trim()) parts.push(/^\d+([.,]\d+)?$/.test(we.weight.trim()) ? `${we.weight.trim()} kg` : we.weight.trim());
  if (we.restSeconds > 0) parts.push(`${we.restSeconds}s ${String(t.athlete.session.rest).toLowerCase()}`);
  return parts.join(" · ");
};

// Coach target as a rep count: "10" → "10", "8 a 12" → "12" (top of the range is the goal)
const repsFromTarget = (target: string): string => {
  if (!REP_RANGE.test(target)) return "";
  const numbers = target.match(/\d+/g) ?? [];
  return numbers.length ? numbers[numbers.length - 1] : "";
};

// Short double beep for the end of a rest. The AudioContext must be created
// from a user gesture on iOS, so it's unlocked when a set is ticked.
const playRestBeep = (ctx: AudioContext | null) => {
  if (!ctx) return;
  [0, 0.25].forEach((offset) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + offset);
    osc.stop(ctx.currentTime + offset + 0.2);
  });
};

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
  isCurrent,
  isOpen,
  onToggleOpen,
  suggestions,
  best,
  onUseSuggestion,
  onStepWeight,
  onToggleWarmup,
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
  /** The exercise the athlete is on (next set after a rest) */
  isCurrent: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  /** Per set: what to prefill (last session > previous set > coach target) */
  suggestions: (SetSuggestion | null)[];
  onUseSuggestion: (setIndex: number) => void;
  /** Heaviest previous working set for this exercise, for 🏆 PR badges */
  best?: ExerciseBest;
  onStepWeight: (setIndex: number, delta: number) => void;
  onToggleWarmup: (setIndex: number) => void;
  onUpdateSet: (setIndex: number, field: "reps" | "weight", value: string) => void;
  onAddSet: () => void;
  onRemoveLastSet: () => void;
  onToggleSetComplete: (setIndex: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) => {
  const isActive = isCurrent;
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

  const summary = progress.sets
    .filter(isWorkingSet)
    .map((set) => [set.weight && `${set.weight}kg`, set.reps && `×${set.reps}`].filter(Boolean).join(""))
    .filter(Boolean)
    .join(" · ");

  return (
    <Card
      id={`exercise-${workoutExercise.id}`}
      className={cn(
        "overflow-hidden scroll-mt-4 transition-colors",
        isActive && "ring-2 ring-primary border-primary",
        allComplete && !isActive && "border-primary/40 bg-primary/5"
      )}
    >
      {/* Header — always visible, toggles the card */}
      <button
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-3 p-4 text-left [-webkit-tap-highlight-color:transparent]"
      >
        <div
          className={cn(
            "h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-bold tabular-nums",
            allComplete ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70"
          )}
        >
          {allComplete ? <Check className="h-4 w-4" /> : index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base leading-tight truncate">{exerciseName}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {!isOpen && summary ? summary : formatPrescription(workoutExercise, t)}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 text-xs font-semibold tabular-nums px-2 py-1 rounded-full",
            allComplete ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          {completedSets}/{totalSets}
        </span>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="overflow-hidden"
          >
            <CardContent className="px-4 pb-4 pt-0">
              {/* Coach's cue for this exercise */}
              {workoutExercise.notes?.trim() && (
                <p className="mb-3 rounded-xl bg-primary/10 px-3 py-2 text-sm whitespace-pre-wrap">
                  {workoutExercise.notes}
                </p>
              )}
              {/* Media — compact row; opens the player/GIF on demand */}
              {hasMedia && (
                isPlaying ? (
                  <div className={cn(
                    "relative rounded-xl overflow-hidden mb-4 shadow-lg",
                    hasGif ? "aspect-square max-w-xs mx-auto" : "aspect-video"
                  )}>
                    {hasGif ? (
                      <img src={gifUrl} alt={exerciseName} className="w-full h-full object-cover" />
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
                      className="absolute top-2 right-2 z-10 w-9 h-9 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="w-full flex items-center gap-3 rounded-xl bg-muted/50 hover:bg-muted p-2 mb-3 text-left transition-colors"
                  >
                    <div className="relative h-12 w-16 shrink-0 rounded-lg overflow-hidden bg-black">
                      {mediaUrl && <img src={mediaUrl} alt="" className="w-full h-full object-cover" />}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="h-4 w-4 text-white" fill="currentColor" />
                      </div>
                    </div>
                    <span className="flex-1 text-sm font-medium">
                      {hasGif ? t.athlete.session.viewFullAnimation : t.athlete.session.watchHowTo}
                    </span>
                    <Badge className={hasGif ? "bg-green-600 text-white border-0" : "bg-red-600 text-white border-0"}>
                      {hasGif ? "GIF" : "Video"}
                    </Badge>
                  </button>
                )
              )}

              {/* Instructions */}
              {instructions && (
                <div className="bg-muted/50 rounded-lg mb-3 overflow-hidden">
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

              {/* Sets Table */}
              <div>
                <div className="grid grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)_48px] gap-2 text-xs font-medium text-muted-foreground mb-2 px-1">
                  <span className="text-center">{t.athlete.session.setHeader}</span>
                  <span className="text-center">{t.athlete.session.repsHeader}</span>
                  <span className="text-center">{t.athlete.session.kgHeader}</span>
                  <span></span>
                </div>

                <div className="space-y-2">
                  {progress.sets.map((set, setIndex) => {
                    const suggestion = suggestions[setIndex];
                    const showHistory =
                      !!suggestion?.fromHistory && !set.completed && !set.reps && !set.weight;
                    const isPR = isPersonalRecord(set, best);
                    return (
                      <div key={setIndex}>
                        <div
                          className={cn(
                            "grid grid-cols-[40px_minmax(0,1fr)_minmax(0,1.25fr)_48px] gap-2 items-center rounded-xl transition-colors",
                            set.completed && "bg-primary/5"
                          )}
                        >
                          {/* Tap the set number to mark it as warm-up */}
                          <button
                            onClick={() => onToggleWarmup(setIndex)}
                            aria-label={set.warmup ? t.athlete.session.warmupOff : t.athlete.session.warmupOn}
                            title={t.athlete.session.warmupHint}
                            className={cn(
                              "relative h-12 w-10 rounded-lg flex items-center justify-center text-base font-semibold tabular-nums",
                              set.warmup ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                            )}
                          >
                            {set.warmup ? t.athlete.session.warmupShort : set.setNumber}
                            {isPR && (
                              <span className="absolute -top-1 -right-1 text-sm" aria-label={t.athlete.session.personalRecord}>
                                🏆
                              </span>
                            )}
                          </button>
                          <Input
                            type="text"
                            inputMode="numeric"
                            enterKeyHint="next"
                            value={set.reps}
                            onChange={(e) => onUpdateSet(setIndex, "reps", e.target.value)}
                            placeholder={suggestion?.reps || workoutExercise.reps || "10"}
                            className="h-12 text-center text-base px-1 min-w-0"
                          />
                          {/* Weight with ±2.5 kg steppers so the keyboard isn't needed between sets */}
                          <div className="relative min-w-0">
                            <button
                              onClick={() => onStepWeight(setIndex, -WEIGHT_STEP)}
                              aria-label={`−${WEIGHT_STEP} kg`}
                              className="absolute left-0 inset-y-0 z-10 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-transform"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <Input
                              type="text"
                              inputMode="decimal"
                              enterKeyHint="done"
                              value={set.weight}
                              onChange={(e) => onUpdateSet(setIndex, "weight", e.target.value)}
                              placeholder={suggestion?.weight || "0"}
                              className="h-12 text-center text-base px-9 min-w-0"
                            />
                            <button
                              onClick={() => onStepWeight(setIndex, WEIGHT_STEP)}
                              aria-label={`+${WEIGHT_STEP} kg`}
                              className="absolute right-0 inset-y-0 z-10 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-transform"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => onToggleSetComplete(setIndex)}
                            aria-label={t.athlete.session.complete}
                            className={cn(
                              "h-12 w-12 rounded-full flex items-center justify-center transition-all",
                              set.completed
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "bg-muted hover:bg-primary/15 hover:text-primary border-2 border-dashed border-muted-foreground/30"
                            )}
                          >
                            <Check className={cn("h-5 w-5", !set.completed && "opacity-50")} />
                          </button>
                        </div>
                        {showHistory && (
                          <button
                            onClick={() => onUseSuggestion(setIndex)}
                            className="ml-12 mt-1 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                          >
                            <History className="h-3.5 w-3.5" />
                            <span>
                              {t.athlete.session.previousHeader}:{" "}
                              <span className="font-semibold tabular-nums text-foreground/80">
                                {[suggestion.weight && `${suggestion.weight} kg`, suggestion.reps && `× ${suggestion.reps}`]
                                  .filter(Boolean)
                                  .join(" ")}
                              </span>
                            </span>
                          </button>
                        )}
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
          </motion.div>
        )}
      </AnimatePresence>
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
  const [shareSummary, setShareSummary] = useState<WorkoutSummary | undefined>();
  const [showShareSheet, setShowShareSheet] = useState(false);
  const postedRef = useRef(false);
  // Workout session state. Time is derived from timestamps (not counted with
  // setInterval) so it stays correct when iOS freezes the page while the
  // screen is locked or the app is in the background.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [rest, setRest] = useState<RestState | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [summary, setSummary] = useState<SessionSummaryData | null>(null);
  const [finishing, setFinishing] = useState(false);
  // Last logged sets per exerciseId from the athlete's other completed sessions
  // Exercise cards currently expanded (workoutExercise.id). Only the current one opens by default.
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [previousSets, setPreviousSets] = useState<Map<string, SetProgressData[]>>(new Map());
  // Heaviest previous working set per exerciseId, to flag new PRs
  const [bestByExercise, setBestByExercise] = useState<Map<string, ExerciseBest>>(new Map());
  const [exerciseProgress, setExerciseProgress] = useState<Map<string, ExerciseProgress>>(
    new Map()
  );
  const isWorkoutStarted = startedAt !== null;
  const totalElapsedTime = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;

  // Set once the session is saved or discarded so the autosave stops writing
  const finishedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useWakeLock(isWorkoutStarted);

  // Load data (restoring an on-device draft if the session was interrupted)
  useEffect(() => {
    const loadData = async () => {
      if (!user || !id) return;

      try {
        const assignments = await getAssignmentsWithWorkoutsByAthlete(user.uid);
        const found = assignments.find((a) => a.id === id);
        if (found && found.workout.type === "strength") {
          setAssignment(found);
          setPreviousSets(buildPreviousSets(assignments, id));
          setBestByExercise(
            buildBestByExercise(assignments.filter((a) => a.id !== id && a.completedAt))
          );

          // Load exercises
          try {
            const allExercises = await getAllExercises();
            setExercises(allExercises);
          } catch (e) {
            console.error("Error loading exercises:", e);
          }

          const draft = loadSessionDraft(id);
          // A draft older than the last save belongs to a session that was already finished
          const useDraft =
            !!draft && (!found.completedAt || draft.updatedAt > found.completedAt.getTime());

          // Initialize progress for each exercise: draft > saved data > empty sets
          const initialProgress = new Map<string, ExerciseProgress>();
          found.workout.exercises?.forEach((we) => {
            const drafted = useDraft ? draft.progress[we.id] : undefined;
            if (drafted) {
              initialProgress.set(we.id, {
                exerciseId: drafted.exerciseId,
                sets: drafted.sets.map((s) => ({ ...s, time: s.time ?? 0 })),
              });
              return;
            }
            const saved = found.progressData?.find((p) => p.exerciseId === we.exerciseId);
            const sets: SetProgress[] = saved
              ? saved.sets.map((s) => ({
                  setNumber: s.setNumber,
                  reps: s.reps,
                  weight: s.weight,
                  completed: s.completed,
                  time: s.time ?? 0,
                  warmup: s.warmup ?? false,
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
          const firstOpen =
            found.workout.exercises?.find((we) => initialProgress.get(we.id)?.sets.some((s) => !s.completed)) ??
            found.workout.exercises?.[0];
          setOpenIds(new Set(firstOpen ? [firstOpen.id] : []));

          // Start (or resume) the clock
          if (useDraft) {
            setStartedAt(draft.startedAt);
            if (draft.rest && draft.rest.endsAt > Date.now()) setRest(draft.rest);
            toast({ title: t.athlete.session.draftRestored });
          } else {
            // Resuming a saved workout continues from its recorded time
            setStartedAt(Date.now() - (found.totalTime ?? 0) * 1000);
          }
          setNow(Date.now());
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
  }, [user, id, toast]);

  // Tick once a second for display, and immediately when the page comes back
  useEffect(() => {
    if (!isWorkoutStarted) return;
    const tick = () => setNow(Date.now());
    const interval = setInterval(tick, 1000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isWorkoutStarted]);

  // Autosave the session on this device after every change
  useEffect(() => {
    if (!id || !startedAt || finishedRef.current || exerciseProgress.size === 0) return;
    saveSessionDraft(id, {
      startedAt,
      progress: Object.fromEntries(exerciseProgress),
      rest,
    });
  }, [id, startedAt, exerciseProgress, rest]);

  // Screen locked / app backgrounded mid-rest: ask the server to push when the
  // rest ends; cancel it as soon as the athlete is back in the app.
  const restRef = useRef<RestState | null>(null);
  restRef.current = rest;
  useEffect(() => {
    if (!isWorkoutStarted) return;
    let scheduled = false;
    const onVisibility = () => {
      const current = restRef.current;
      if (document.visibilityState === "hidden" && current) {
        const remaining = Math.ceil((current.endsAt - Date.now()) / 1000);
        if (remaining > 3) {
          const next = assignment?.workout.exercises?.find((we) => we.id === current.nextExerciseId);
          const nextName = next ? getExerciseByIdOrName(next)?.name || next.exerciseName || "" : "";
          scheduleRestPush(
            remaining,
            t.athlete.session.restDone,
            nextName
              ? t.athlete.session.restNext.replace("{{name}}", nextName).replace("{{set}}", String(current.nextSetIndex + 1))
              : "",
            `/athlete/workout/${id}/session`
          );
          scheduled = true;
        }
      } else if (document.visibilityState === "visible" && scheduled) {
        cancelRestPush();
        scheduled = false;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWorkoutStarted, assignment, id, t]);

  // End of rest: clear it and alert (vibration on Android, beep, toast)
  useEffect(() => {
    if (!rest || now < rest.endsAt) return;
    setRest(null);
    if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
    playRestBeep(audioCtxRef.current);
    toast({ title: t.athlete.session.restDone });
  }, [now, rest, toast, t]);

  const restRemainingSec = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;

  const handleAdjustRest = useCallback((deltaSec: number) => {
    setRest((prev) => {
      if (!prev) return prev;
      const endsAt = prev.endsAt + deltaSec * 1000;
      if (endsAt <= Date.now()) return null;
      return { ...prev, endsAt, durationSec: Math.max(1, prev.durationSec + deltaSec) };
    });
    setNow(Date.now());
  }, []);

  const handleSkipRest = useCallback(() => setRest(null), []);

  // Cancel workout — ask whether to keep the draft for later or discard it
  const handleCancel = () => setShowExitConfirm(true);

  const handleExitKeep = () => {
    finishedRef.current = true;
    navigate(`/athlete/workout/${id}`);
  };

  const handleExitDiscard = () => {
    finishedRef.current = true;
    if (id) clearSessionDraft(id);
    navigate(`/athlete/workout/${id}`);
  };

  // Save workout
  const handleSave = async () => {
    if (!assignment) return;

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
            ...(set.warmup ? { warmup: true } : {}),
          })),
        })
      );

      const completionPercentage = getCompletionPercentage();
      const elapsed = totalElapsedTime;

      // Offline, Firestore queues the write (persistent cache) and the promise
      // only settles once it reaches the server — don't block the athlete on it.
      const result = await settleWithin(
        completeWorkoutWithProgress(assignment.id, progressData, completionPercentage, elapsed),
        SAVE_TIMEOUT_MS
      );

      finishedRef.current = true;
      clearSessionDraft(assignment.id);
      setRest(null);
      setStartedAt(null);

      if (result === "pending") {
        toast({ title: t.athlete.session.savedOffline });
      }

      // Recap: working sets, volume and new personal records
      const { sets: workingSets, volume } = computeStrengthVolume(progressData);
      const records: SessionSummaryData["records"] = [];
      assignment.workout.exercises?.forEach((we) => {
        const sets = exerciseProgress.get(we.id)?.sets ?? [];
        const best = bestByExercise.get(we.exerciseId);
        const top = sets
          .filter((set) => isPersonalRecord(set, best))
          .sort((a, b) => parseNum(b.weight) - parseNum(a.weight) || parseNum(b.reps) - parseNum(a.reps))[0];
        if (top) {
          records.push({
            exercise: getExerciseByIdOrName(we)?.name || we.exerciseName || "",
            value: `${top.weight} kg × ${top.reps || "–"}`,
          });
        }
      });
      setSummary({
        workoutName: assignment.workout.name,
        elapsed: formatTime(elapsed),
        workingSets,
        totalSets: progressData.reduce((sum, ex) => sum + ex.sets.length, 0),
        volumeKg: volume,
        records,
      });

      // Feed post: full workout card + a natural caption
      const highlights: SummaryHighlight[] = (assignment.workout.exercises ?? [])
        .map((we) => {
          const sets = (exerciseProgress.get(we.id)?.sets ?? []).filter(
            (set) => isWorkingSet(set) && parseNum(set.weight) > 0
          );
          const top = sets.sort(
            (a, b) => parseNum(b.weight) - parseNum(a.weight) || parseNum(b.reps) - parseNum(a.reps)
          )[0];
          if (!top) return null;
          const pr = isPersonalRecord(top, bestByExercise.get(we.exerciseId));
          return {
            name: getExerciseByIdOrName(we)?.name || we.exerciseName || "",
            value: `${top.weight} kg × ${top.reps || "–"}`,
            ...(pr ? { pr: true } : {}),
            weight: parseNum(top.weight),
          };
        })
        .filter((h): h is SummaryHighlight & { weight: number } => !!h)
        // PRs first, then the heaviest lifts
        .sort((a, b) => Number(!!b.pr) - Number(!!a.pr) || b.weight - a.weight)
        .slice(0, 3)
        .map(({ weight: _weight, ...h }) => h);

      setShareSummary({
        workoutName: assignment.workout.name,
        workoutType: "strength",
        elapsedTime: elapsed,
        completionPercentage,
        volumeKg: Math.round(volume),
        workingSets,
        totalSets: progressData.reduce((sum, ex) => sum + ex.sets.length, 0),
        records: records.length,
        highlights,
      });

      const captionParts = [t.athlete.session.shareCaptionTitle.replace("{{name}}", assignment.workout.name)];
      if (records.length) {
        captionParts.push(
          (records.length === 1 ? t.athlete.session.shareCaptionRecord : t.athlete.session.shareCaptionRecords).replace(
            "{{n}}",
            String(records.length)
          )
        );
      }
      setShareCaption(captionParts.join(" · "));
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

  const saveFeedback = (feedback: { rpe?: number; notes: string }) => {
    if (!assignment) return Promise.resolve();
    return settleWithin(
      updateAssignmentFeedback(assignment.id, { rpe: feedback.rpe, athleteNotes: feedback.notes.trim() }).catch(
        (error) => console.error("Error saving feedback:", error)
      ),
      SAVE_TIMEOUT_MS
    );
  };

  const handleFinishSummary = async (feedback: { rpe?: number; notes: string }) => {
    setFinishing(true);
    await saveFeedback(feedback);
    setFinishing(false);
    navigate("/athlete");
  };

  const handleShareSummary = (feedback: { rpe?: number; notes: string }) => {
    saveFeedback(feedback);
    // Effort shows on the card; the note is private, for the coach only
    setShareSummary((prev) => (prev && feedback.rpe !== undefined ? { ...prev, rpe: feedback.rpe } : prev));
    setShowShareSheet(true);
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

  // Next set to do after (exerciseId, setIndex): the next open set of the same
  // exercise, else the first open set of a later exercise.
  const findNextSet = useCallback(
    (progressMap: Map<string, ExerciseProgress>, exerciseId: string, setIndex: number) => {
      const order = assignment?.workout.exercises ?? [];
      const start = order.findIndex((we) => we.id === exerciseId);
      for (let i = Math.max(0, start); i < order.length; i++) {
        const sets = progressMap.get(order[i].id)?.sets ?? [];
        const from = i === start ? setIndex + 1 : 0;
        const next = sets.findIndex((s, idx) => idx >= from && !s.completed);
        if (next >= 0) return { exerciseId: order[i].id, setIndex: next };
      }
      return null;
    },
    [assignment]
  );

  const toggleOpen = useCallback((workoutExerciseId: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(workoutExerciseId)) next.delete(workoutExerciseId);
      else next.add(workoutExerciseId);
      return next;
    });
  }, []);

  // Finished exercise → collapse it, open the next one and bring it into view
  const advanceTo = useCallback((finishedId: string, nextId: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.delete(finishedId);
      next.add(nextId);
      return next;
    });
    // The finished card collapses while the next one expands, which keeps
    // moving the target; scroll once its position has stopped changing.
    let lastTop: number | null = null;
    let stableTicks = 0;
    let attempts = 0;
    const settle = () => {
      const el = document.getElementById(`exercise-${nextId}`);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      stableTicks = lastTop !== null && Math.abs(top - lastTop) < 1 ? stableTicks + 1 : 0;
      lastTop = top;
      if (stableTicks >= 2 || ++attempts > 20) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.setTimeout(settle, 80);
      }
    };
    window.setTimeout(settle, 80);
  }, []);

  // What to prefill for a set: the same set from the last session, else the
  // last filled set of this session, else the coach's target reps.
  const getSuggestion = useCallback(
    (progressMap: Map<string, ExerciseProgress>, workoutExerciseId: string, setIndex: number): SetSuggestion | null => {
      const progress = progressMap.get(workoutExerciseId);
      if (!progress) return null;
      const history = previousSets.get(progress.exerciseId);
      if (history?.length) {
        const prev = history[Math.min(setIndex, history.length - 1)];
        return { reps: prev.reps, weight: prev.weight, fromHistory: true };
      }
      // Warm-up sets are lighter on purpose, so they never seed the next set
      const earlier = progress.sets
        .slice(0, setIndex)
        .reverse()
        .find((s) => !s.warmup && (s.reps || s.weight));
      if (earlier) return { reps: earlier.reps, weight: earlier.weight, fromHistory: false };
      const target = assignment?.workout.exercises?.find((we) => we.id === workoutExerciseId)?.reps ?? "";
      const reps = repsFromTarget(target);
      return reps ? { reps, weight: "", fromHistory: false } : null;
    },
    [previousSets, assignment]
  );

  const updateSet = useCallback(
    (workoutExerciseId: string, setIndex: number, patch: (set: SetProgress) => SetProgress) => {
      setExerciseProgress((prev) => {
        const newMap = new Map(prev);
        const progress = newMap.get(workoutExerciseId);
        if (progress?.sets[setIndex]) {
          const newSets = [...progress.sets];
          newSets[setIndex] = patch(newSets[setIndex]);
          newMap.set(workoutExerciseId, { ...progress, sets: newSets });
        }
        return newMap;
      });
    },
    []
  );

  // ±2.5 kg from the typed value, else from the suggestion
  const handleStepWeight = useCallback(
    (workoutExerciseId: string, setIndex: number, delta: number) => {
      const suggested = getSuggestion(exerciseProgress, workoutExerciseId, setIndex)?.weight ?? "";
      updateSet(workoutExerciseId, setIndex, (set) => {
        const base = set.weight || suggested;
        const next = Math.max(0, parseNum(base) + delta);
        return { ...set, weight: formatWeight(next, base) };
      });
    },
    [exerciseProgress, getSuggestion, updateSet]
  );

  const handleToggleWarmup = useCallback(
    (workoutExerciseId: string, setIndex: number) =>
      updateSet(workoutExerciseId, setIndex, (set) => ({ ...set, warmup: !set.warmup })),
    [updateSet]
  );

  const handleUseSuggestion = useCallback(
    (workoutExerciseId: string, setIndex: number) => {
      const suggestion = getSuggestion(exerciseProgress, workoutExerciseId, setIndex);
      if (!suggestion) return;
      setExerciseProgress((prev) => {
        const newMap = new Map(prev);
        const progress = newMap.get(workoutExerciseId);
        if (progress?.sets[setIndex]) {
          const newSets = [...progress.sets];
          newSets[setIndex] = { ...newSets[setIndex], reps: suggestion.reps, weight: suggestion.weight };
          newMap.set(workoutExerciseId, { ...progress, sets: newSets });
        }
        return newMap;
      });
    },
    [exerciseProgress, getSuggestion]
  );

  // Toggle set complete — ticking a set starts the rest countdown
  const handleToggleSetComplete = useCallback(
    (exerciseId: string, setIndex: number) => {
      // Unlock audio from this user gesture so the end-of-rest beep can play on iOS
      if (!audioCtxRef.current && typeof window !== "undefined" && "AudioContext" in window) {
        try {
          audioCtxRef.current = new AudioContext();
        } catch {
          audioCtxRef.current = null;
        }
      }
      audioCtxRef.current?.resume().catch(() => {});

      const current = exerciseProgress.get(exerciseId);
      if (!current?.sets[setIndex]) return;
      const nowCompleted = !current.sets[setIndex].completed;

      const newMap = new Map(exerciseProgress);
      const newSets = [...current.sets];
      let ticked = { ...newSets[setIndex], completed: nowCompleted };
      // One-tap logging: an empty set takes the suggested values instead of being saved blank
      if (nowCompleted && (!ticked.reps || !ticked.weight)) {
        const suggestion = getSuggestion(exerciseProgress, exerciseId, setIndex);
        if (suggestion) {
          ticked = {
            ...ticked,
            reps: ticked.reps || suggestion.reps,
            weight: ticked.weight || suggestion.weight,
          };
        }
      }
      newSets[setIndex] = ticked;
      newMap.set(exerciseId, { ...current, sets: newSets });
      setExerciseProgress(newMap);

      if (!nowCompleted) return;
      const next = findNextSet(newMap, exerciseId, setIndex);
      const exerciseDone = newSets.every((set) => set.completed);
      if (exerciseDone) {
        if (next && next.exerciseId !== exerciseId) advanceTo(exerciseId, next.exerciseId);
        else setOpenIds((prev) => {
          const updated = new Set(prev);
          updated.delete(exerciseId);
          return updated;
        });
      }
      if (!next) {
        setRest(null);
        return;
      }
      const workoutExercise = assignment?.workout.exercises?.find((we) => we.id === exerciseId);
      const durationSec = workoutExercise?.restSeconds || DEFAULT_REST_SECONDS;
      const startNow = Date.now();
      setNow(startNow);
      setRest({
        endsAt: startNow + durationSec * 1000,
        durationSec,
        nextExerciseId: next.exerciseId,
        nextSetIndex: next.setIndex,
      });
    },
    [exerciseProgress, findNextSet, assignment, getSuggestion, advanceTo]
  );

  // Remove last set
  const handleRemoveLastSet = useCallback((exerciseId: string) => {
    setExerciseProgress((prev) => {
      const newMap = new Map(prev);
      const progress = newMap.get(exerciseId);
      if (progress && progress.sets.length > 1) {
        newMap.set(exerciseId, {
          ...progress,
          sets: progress.sets.slice(0, -1),
        });
      }
      return newMap;
    });
  }, []);

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
  const allSets = Array.from(exerciseProgress.values()).flatMap((p) => p.sets);
  const completedSetCount = allSets.filter((set) => set.completed).length;
  const totalSetCount = allSets.length;

  const restNextExercise = rest ? workout.exercises?.find((we) => we.id === rest.nextExerciseId) : undefined;
  const restNextLabel = restNextExercise
    ? t.athlete.session.restNext
        .replace("{{name}}", getExerciseByIdOrName(restNextExercise)?.name || restNextExercise.exerciseName || "")
        .replace("{{set}}", String((rest?.nextSetIndex ?? 0) + 1))
    : undefined;

  const handleSharePost = async ({ caption, imageUrls, mentions }: ComposerResult) => {
    if (!user) return;
    const authorName = displayName || user.email || "Athlete";
    const postId = await createTimelinePost(
      { caption, imageUrls, mentions, workoutSummary: shareSummary, assignmentId: assignment?.id },
      user.uid,
      authorName,
      userRole ?? "athlete",
      photoURL
    );
    if (mentions.length) {
      await createMentionNotifications(postId, mentions.map((m) => m.id), authorName, caption);
    }
    postedRef.current = true;
    toast({ title: t.timeline.postShared });
  };

  return (
    <>
    <CreatePostModal
      open={showShareModal}
      onOpenChange={(open) => {
        setShowShareModal(open);
        // Posted → done; closed without posting → back to the recap
        if (!open && postedRef.current) navigate("/athlete");
      }}
      onSubmit={handleSharePost}
      initialCaption={shareCaption}
      workoutSummary={shareSummary}
    />
    {shareSummary && (
      <ShareWorkoutSheet
        open={showShareSheet}
        onOpenChange={setShowShareSheet}
        summary={shareSummary}
        onPostToFeed={() => {
          setShowShareSheet(false);
          setShowShareModal(true);
        }}
      />
    )}
    {summary && !showShareModal && !showShareSheet && (
      <SessionSummary
        data={summary}
        t={t}
        finishing={finishing}
        onFinish={handleFinishSummary}
        onShare={handleShareSummary}
      />
    )}
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header — before start only; once started the controls live in the floating glass bar */}
      {!isWorkoutStarted && (
        <header className="sticky top-0 z-50 bg-background border-b border-border">
          <div className="px-4 h-14 flex items-center justify-between">
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
          </div>
        </header>
      )}

      {/* Floating glass session bar: cancel · total time + progress · save */}
      {isWorkoutStarted && (
        <MotionConfig reducedMotion="user">
          <motion.div
            initial={{ y: 96, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed inset-x-3 z-50 mx-auto max-w-lg space-y-2"
            style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <AnimatePresence>
              {rest && (
                <RestTimerPill
                  key="rest"
                  remainingSec={restRemainingSec}
                  durationSec={rest.durationSec}
                  nextLabel={restNextLabel}
                  labels={{ rest: t.athlete.session.rest, skip: t.athlete.session.restSkip }}
                  onAdjust={handleAdjustRest}
                  onSkip={handleSkipRest}
                />
              )}
            </AnimatePresence>
            <div className="glass flex items-center gap-2 h-16 p-1.5 rounded-full">
              <motion.button
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 600, damping: 22 }}
                onClick={handleCancel}
                aria-label={t.athlete.session.cancel}
                className="glass-lens h-[52px] w-[52px] shrink-0 flex items-center justify-center rounded-full text-foreground/70"
              >
                <X className="h-5 w-5" />
              </motion.button>

              <div className="flex-1 min-w-0 flex flex-col items-center justify-center">
                <span className="sr-only">{t.athlete.session.totalTime}</span>
                <span className="text-xl font-mono font-bold text-primary leading-none tabular-nums">
                  {formatTime(totalElapsedTime)}
                </span>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className="h-1 w-20 rounded-full bg-foreground/10 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      animate={{ width: `${completionPercentage}%` }}
                      transition={{ type: "spring", stiffness: 200, damping: 26 }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                    {completionPercentage}%
                  </span>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 600, damping: 22 }}
                onClick={() => setShowSaveConfirm(true)}
                disabled={saving}
                className="h-[52px] shrink-0 px-6 flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold shadow-md disabled:opacity-60"
              >
                {saving ? <Spinner size="xs" className="mr-2" /> : null}
                {t.athlete.session.save}
              </motion.button>
            </div>
          </motion.div>
        </MotionConfig>
      )}

      {/* Content */}
      <div className={cn("flex-1 overflow-auto", rest ? "pb-48" : "pb-28")}>
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

              return (
                <ExerciseSessionCard
                  key={workoutExercise.id}
                  workoutExercise={workoutExercise}
                  exercise={exercise}
                  index={index}
                  progress={progress}
                  isCurrent={rest?.nextExerciseId === workoutExercise.id}
                  isOpen={openIds.has(workoutExercise.id)}
                  onToggleOpen={() => toggleOpen(workoutExercise.id)}
                  suggestions={progress.sets.map((_, setIndex) =>
                    getSuggestion(exerciseProgress, workoutExercise.id, setIndex)
                  )}
                  onUseSuggestion={(setIndex) => handleUseSuggestion(workoutExercise.id, setIndex)}
                  best={bestByExercise.get(workoutExercise.exerciseId)}
                  onStepWeight={(setIndex, delta) => handleStepWeight(workoutExercise.id, setIndex, delta)}
                  onToggleWarmup={(setIndex) => handleToggleWarmup(workoutExercise.id, setIndex)}
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

      <Drawer open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t.athlete.session.exitTitle}</DrawerTitle>
            <DrawerDescription>{t.athlete.session.exitDescription}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button className="w-full" onClick={handleExitKeep}>
              {t.athlete.session.exitKeep}
            </Button>
            <Button variant="outline" className="w-full text-destructive" onClick={handleExitDiscard}>
              {t.athlete.session.exitDiscard}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setShowExitConfirm(false)}>
              {t.athlete.session.exitStay}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t.athlete.session.saveConfirmTitle}</DrawerTitle>
            <DrawerDescription>
              {completedSetCount < totalSetCount
                ? t.athlete.session.saveIncomplete
                    .replace("{{done}}", String(completedSetCount))
                    .replace("{{total}}", String(totalSetCount))
                : t.athlete.session.saveConfirmDescription}
            </DrawerDescription>
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
