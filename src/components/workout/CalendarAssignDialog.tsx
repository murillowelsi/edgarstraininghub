import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getAllWorkouts } from "@/services/workoutsService";
import type { Workout, WorkoutType } from "@/types/workout";
import { modalityColors } from "@/utils/modalityColors";
import { workoutLabels } from "@/utils/workoutLabels";
import { format } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import { GrBike, GrRun, GrSwim } from "react-icons/gr";
import { ArrowLeft, ChevronRight, Dumbbell, Loader2, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AssignmentForm } from "./AssignmentForm";

const typeIcons: Record<WorkoutType, React.ElementType> = {
  running: GrRun,
  cycling: GrBike,
  swimming: GrSwim,
  strength: Dumbbell,
};

const typeOrder: WorkoutType[] = ["running", "cycling", "swimming", "strength"];

interface CalendarAssignDialogProps {
  selectedDate: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preSelectedWorkoutId?: string | null;
  onClearPreSelectedWorkout?: () => void;
  /** Assigning from an athlete's page: that athlete comes pre-ticked */
  preSelectedAthleteId?: string;
}

/**
 * Calendar / dashboard / athlete-page entry point: pick a workout (filter +
 * search, like the exercise library), then who and when.
 */
export const CalendarAssignDialog = ({
  selectedDate,
  open,
  onOpenChange,
  onSuccess,
  preSelectedWorkoutId,
  onClearPreSelectedWorkout,
  preSelectedAthleteId,
}: CalendarAssignDialogProps) => {
  const { t, language } = useLanguage();
  const ta = t.admin.assign;
  const L = workoutLabels(t);
  const { toast } = useToast();
  const navigate = useNavigate();
  const locale = language === "pt" ? ptBR : enUS;

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedType, setSelectedType] = useState<WorkoutType | "all">("all");
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingData, setLoadingData] = useState(false);

  // Inline callbacks from parents change every render; keep them out of the effect deps
  const clearPreSelectedRef = useRef(onClearPreSelectedWorkout);
  clearPreSelectedRef.current = onClearPreSelectedWorkout;

  useEffect(() => {
    if (!open) return;
    setSelectedType("all");
    setSelectedWorkout(null);
    setSearchQuery("");
    setLoadingData(true);
    getAllWorkouts()
      .then((list) => {
        setWorkouts(list);
        // Coming back after creating a workout: jump straight to who/when
        if (preSelectedWorkoutId) {
          const found = list.find((w) => w.id === preSelectedWorkoutId);
          if (found) setSelectedWorkout(found);
          clearPreSelectedRef.current?.();
        }
      })
      .catch(() => toast({ title: t.common.error, description: ta.loadError, variant: "destructive" }))
      .finally(() => setLoadingData(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preSelectedWorkoutId]);

  const query = searchQuery.trim().toLowerCase();
  const filteredWorkouts = workouts.filter(
    (w) => (selectedType === "all" || w.type === selectedType) && w.name.toLowerCase().includes(query)
  );

  const handleCreateNewWorkout = () => {
    const type = selectedType === "all" ? null : selectedType;
    if (selectedDate) {
      sessionStorage.setItem("calendarAssignState", JSON.stringify({ date: selectedDate.toISOString(), type }));
    }
    onOpenChange(false);
    const params = new URLSearchParams({ fromCalendar: "true" });
    if (type === "strength") {
      navigate(`/admin/workouts/strength/new?${params.toString()}`);
    } else {
      if (type) params.set("type", type);
      navigate(`/admin/workouts/new?${params.toString()}`);
    }
  };

  const workoutMeta = (w: Workout) =>
    w.type === "strength"
      ? ta.exercisesCount.replace("{{n}}", String(w.exercises?.length || 0))
      : ta.stagesCount.replace("{{n}}", String(w.stages.length));

  const WorkoutIcon = ({ type, size = "md" }: { type: WorkoutType; size?: "md" | "sm" }) => {
    const Icon = typeIcons[type];
    const hex = modalityColors[type];
    return (
      <div
        className={cn("shrink-0 rounded-xl flex items-center justify-center", size === "md" ? "h-10 w-10" : "h-9 w-9")}
        style={{ backgroundColor: `${hex}1a`, color: hex }}
      >
        <Icon className="h-4 w-4" />
      </div>
    );
  };

  const description = selectedDate
    ? ta.schedulingFor.replace(
        "{{date}}",
        format(selectedDate, language === "pt" ? "EEEE, d 'de' MMMM" : "EEEE, MMMM d", { locale })
      )
    : undefined;

  // One drawer for both steps, so switching steps doesn't re-open it
  const picking = !selectedWorkout;
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={picking ? ta.title : ta.stepTargets}
      description={description}
      className="sm:w-[560px]"
      bodyClassName={picking ? "flex-1 flex flex-col overflow-hidden" : undefined}
      fullHeight={picking}
      footer={
        picking ? (
          <Button variant="outline" className="w-full rounded-full h-11" onClick={handleCreateNewWorkout}>
            <Plus className="h-4 w-4 mr-2" />
            {ta.createNew}
          </Button>
        ) : undefined
      }
    >
      {selectedWorkout ? (
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 rounded-full text-muted-foreground"
            onClick={() => setSelectedWorkout(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {ta.stepWorkout}
          </Button>
          <div className="flex items-center gap-3 rounded-2xl border bg-card p-3">
            <WorkoutIcon type={selectedWorkout.type} size="sm" />
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{selectedWorkout.name}</p>
              <p className="text-xs text-muted-foreground">
                {workoutMeta(selectedWorkout)} · {L.type(selectedWorkout.type)}
              </p>
            </div>
          </div>
          <AssignmentForm
            workout={selectedWorkout}
            initialDates={selectedDate ? [selectedDate] : []}
            preSelectedAthleteIds={preSelectedAthleteId ? [preSelectedAthleteId] : undefined}
            onCancel={() => onOpenChange(false)}
            onBack={() => setSelectedWorkout(null)}
            onDone={(result) => {
              if (result.created > 0) {
                onOpenChange(false);
                onSuccess?.();
              }
            }}
          />
        </div>
      ) : (
        <>
      <div className="px-4 pb-3 space-y-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={ta.searchWorkouts}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-10 rounded-full"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={ta.clearAll}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {/* Modality filter — same chips as the workouts list */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(["all", ...typeOrder] as const).map((type) => {
            const count = type === "all" ? workouts.length : workouts.filter((w) => w.type === type).length;
            const Icon = type === "all" ? null : typeIcons[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={cn(
                  "shrink-0 h-8 px-3 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-colors",
                  selectedType === type
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/50"
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {type === "all" ? ta.allTypes : L.type(type)}
                <span className="tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredWorkouts.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">{ta.noWorkouts}</p>
        ) : (
          <div className="space-y-2">
            {filteredWorkouts.map((workout) => (
              <button
                key={workout.id}
                type="button"
                onClick={() => setSelectedWorkout(workout)}
                className="w-full flex items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-colors hover:border-primary/50"
              >
                <WorkoutIcon type={workout.type} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{workout.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {workoutMeta(workout)} · {L.type(workout.type)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </ResponsiveModal>
  );
};
