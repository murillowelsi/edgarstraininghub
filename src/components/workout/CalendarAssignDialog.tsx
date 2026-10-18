import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getAllWorkouts } from "@/services/workoutsService";
import type { Workout, WorkoutType } from "@/types/workout";
import { workoutLabels } from "@/utils/workoutLabels";
import { format } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import { GrBike, GrRun, GrSwim } from "react-icons/gr";
import { ArrowLeft, Check, Dumbbell, Loader2, Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AssignmentForm } from "./AssignmentForm";

const workoutTypeConfig: Record<WorkoutType, { icon: React.ElementType; hex: string }> = {
  swimming: { icon: GrSwim, hex: "#06b6d4" },
  cycling: { icon: GrBike, hex: "#22c55e" },
  running: { icon: GrRun, hex: "#3b82f6" },
  strength: { icon: Dumbbell, hex: "#f97316" },
};

const workoutTypeOrder: WorkoutType[] = ["swimming", "cycling", "running", "strength"];

type Step = "type" | "workout" | "targets";

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

/** Calendar / dashboard / athlete-page entry point: pick a workout, then who and when. */
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

  const [step, setStep] = useState<Step>("type");
  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingData, setLoadingData] = useState(false);

  // Inline callbacks from parents change every render; keep them out of the effect deps
  const clearPreSelectedRef = useRef(onClearPreSelectedWorkout);
  clearPreSelectedRef.current = onClearPreSelectedWorkout;

  useEffect(() => {
    if (!open) return;
    setStep("type");
    setSelectedType(null);
    setSelectedWorkout(null);
    setSearchQuery("");
    setLoadingData(true);
    getAllWorkouts()
      .then((list) => {
        setWorkouts(list);
        // Coming back after creating a workout: jump straight to who/when
        if (preSelectedWorkoutId) {
          const found = list.find((w) => w.id === preSelectedWorkoutId);
          if (found) {
            setSelectedWorkout(found);
            setSelectedType(found.type);
            setStep("targets");
          }
          clearPreSelectedRef.current?.();
        }
      })
      .catch(() => toast({ title: t.common.error, description: ta.loadError, variant: "destructive" }))
      .finally(() => setLoadingData(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preSelectedWorkoutId]);

  const filteredWorkouts = workouts.filter(
    (w) =>
      (!selectedType || w.type === selectedType) && w.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleCreateNewWorkout = () => {
    if (selectedDate) {
      sessionStorage.setItem(
        "calendarAssignState",
        JSON.stringify({ date: selectedDate.toISOString(), type: selectedType })
      );
    }
    onOpenChange(false);
    const params = new URLSearchParams();
    params.set("fromCalendar", "true");
    if (selectedType === "strength") {
      navigate(`/admin/workouts/strength/new?${params.toString()}`);
    } else {
      if (selectedType) params.set("type", selectedType);
      navigate(`/admin/workouts/new?${params.toString()}`);
    }
  };

  const handleBack = () => {
    if (step === "targets") {
      setStep("workout");
      setSelectedWorkout(null);
    } else if (step === "workout") {
      setStep("type");
      setSelectedType(null);
      setSearchQuery("");
    }
  };

  const steps: Step[] = ["type", "workout", "targets"];
  const stepTitle = step === "type" ? ta.stepType : step === "workout" ? ta.stepWorkout : ta.stepTargets;

  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 mb-4">
      {steps.map((s, i) => {
        const done = steps.indexOf(step) > i;
        return (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold",
                step === s ? "bg-primary text-primary-foreground" : done ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            {i < steps.length - 1 && <div className={cn("w-6 h-0.5 mx-1", done ? "bg-primary/20" : "bg-muted")} />}
          </div>
        );
      })}
      <span className="ml-2 text-sm font-medium">{stepTitle}</span>
    </div>
  );

  const workoutMeta = (w: Workout) =>
    w.type === "strength"
      ? ta.exercisesCount.replace("{{n}}", String(w.exercises?.length || 0))
      : ta.stagesCount.replace("{{n}}", String(w.stages.length));

  const renderTypeStep = () => (
    <div className="space-y-2">
      {workoutTypeOrder.map((type) => {
        const { icon: Icon, hex } = workoutTypeConfig[type];
        const count = workouts.filter((w) => w.type === type).length;
        return (
          <button
            key={type}
            onClick={() => {
              setSelectedType(type);
              setStep("workout");
            }}
            className="flex items-center gap-3 w-full p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-sm transition-all text-left"
          >
            <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: `${hex}1a`, color: hex }}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{L.type(type)}</p>
              <p className="text-xs text-muted-foreground">{ta.workoutsCount.replace("{{n}}", String(count))}</p>
            </div>
          </button>
        );
      })}
      <button
        className="w-full text-center text-xs text-muted-foreground py-2 hover:text-foreground transition-colors"
        onClick={() => {
          setSelectedType(null);
          setStep("workout");
        }}
      >
        {ta.viewAll}
      </button>
    </div>
  );

  const renderWorkoutStep = () => (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          autoFocus
          placeholder={ta.searchWorkouts}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10"
        />
      </div>
      {loadingData ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredWorkouts.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">{ta.noWorkouts}</p>
      ) : (
        <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
          {filteredWorkouts.map((workout) => {
            const { icon: Icon, hex } = workoutTypeConfig[workout.type];
            return (
              <button
                key={workout.id}
                onClick={() => {
                  setSelectedWorkout(workout);
                  setStep("targets");
                }}
                className="w-full text-left p-3 rounded-xl border transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: `${hex}1a`, color: hex }}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{workout.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {workoutMeta(workout)} · {L.type(workout.type)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <Button variant="outline" className="w-full" onClick={handleCreateNewWorkout}>
        <Plus className="h-4 w-4 mr-2" />
        {ta.createNew}
      </Button>
    </div>
  );

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={ta.title}
      description={
        selectedDate
          ? ta.schedulingFor.replace(
              "{{date}}",
              format(selectedDate, language === "pt" ? "EEEE, d 'de' MMMM" : "EEEE, MMMM d", { locale })
            )
          : undefined
      }
      className="sm:w-[680px]"
    >
      {step !== "type" && step !== "targets" && (
        <Button variant="ghost" size="sm" onClick={handleBack} className="-ml-2 mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {ta.back}
        </Button>
      )}
      {renderStepIndicator()}
      <div className="min-w-0">
        {step === "type" && renderTypeStep()}
        {step === "workout" && renderWorkoutStep()}
        {step === "targets" && selectedWorkout && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border p-3">
              {(() => {
                const { icon: Icon, hex } = workoutTypeConfig[selectedWorkout.type];
                return (
                  <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: `${hex}1a`, color: hex }}>
                    <Icon className="h-4 w-4" />
                  </div>
                );
              })()}
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{selectedWorkout.name}</p>
                <p className="text-xs text-muted-foreground">{workoutMeta(selectedWorkout)}</p>
              </div>
            </div>
            <AssignmentForm
              workout={selectedWorkout}
              initialDates={selectedDate ? [selectedDate] : []}
              preSelectedAthleteIds={preSelectedAthleteId ? [preSelectedAthleteId] : undefined}
              onCancel={() => onOpenChange(false)}
              onBack={handleBack}
              onDone={(result) => {
                if (result.created > 0) {
                  onOpenChange(false);
                  onSuccess?.();
                }
              }}
            />
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
};
