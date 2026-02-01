import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { createAssignments } from "@/services/workoutAssignmentsService";
import { getUsersByRole } from "@/services/usersService";
import { getAllWorkouts } from "@/services/workoutsService";
import type { User } from "@/types/user";
import type { Workout, WorkoutType } from "@/types/workout";
import { format } from "date-fns";
import {
  ArrowLeft,
  Bike,
  Check,
  Loader2,
  PersonStanding,
  Plus,
  Search,
  Waves,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const workoutTypeConfig: Record<
  WorkoutType,
  { label: string; icon: React.ElementType; color: string }
> = {
  running: {
    label: "Running",
    icon: PersonStanding,
    color: "bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200",
  },
  cycling: {
    label: "Cycling",
    icon: Bike,
    color: "bg-green-100 border-green-300 text-green-700 hover:bg-green-200",
  },
  swimming: {
    label: "Swimming",
    icon: Waves,
    color: "bg-cyan-100 border-cyan-300 text-cyan-700 hover:bg-cyan-200",
  },
};

type Step = "type" | "workout" | "athletes";

interface CalendarAssignDialogProps {
  selectedDate: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preSelectedWorkoutId?: string | null;
  onClearPreSelectedWorkout?: () => void;
}

export const CalendarAssignDialog = ({
  selectedDate,
  open,
  onOpenChange,
  onSuccess,
  preSelectedWorkoutId,
  onClearPreSelectedWorkout,
}: CalendarAssignDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("type");
  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [athletes, setAthletes] = useState<User[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Load workouts and athletes when dialog opens
  useEffect(() => {
    const loadData = async () => {
      if (!open) return;

      setLoadingData(true);
      try {
        const [workoutsData, athletesData] = await Promise.all([
          getAllWorkouts(),
          getUsersByRole("athlete"),
        ]);
        setWorkouts(workoutsData);
        setAthletes(athletesData);

        // If there's a pre-selected workout (from returning after creating a new one),
        // auto-select it and skip to the athletes step
        if (preSelectedWorkoutId) {
          const preSelectedWorkout = workoutsData.find(
            (w) => w.id === preSelectedWorkoutId
          );
          if (preSelectedWorkout) {
            setSelectedWorkout(preSelectedWorkout);
            setSelectedType(preSelectedWorkout.type);
            setStep("athletes");
          }
          // Clear the pre-selected workout ID after using it
          onClearPreSelectedWorkout?.();
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load data.",
          variant: "destructive",
        });
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [open, toast, preSelectedWorkoutId, onClearPreSelectedWorkout]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep("type");
      setSelectedType(null);
      setSelectedWorkout(null);
      setSelectedAthletes([]);
      setSearchQuery("");
    }
  }, [open]);

  const filteredWorkouts = workouts.filter((w) => {
    const matchesType = selectedType ? w.type === selectedType : true;
    const matchesSearch = w.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleTypeSelect = (type: WorkoutType) => {
    setSelectedType(type);
    setStep("workout");
  };

  const handleWorkoutSelect = (workout: Workout) => {
    setSelectedWorkout(workout);
    setStep("athletes");
  };

  const handleCreateNewWorkout = () => {
    // Store the selected date in sessionStorage before navigating
    if (selectedDate) {
      sessionStorage.setItem(
        "calendarAssignState",
        JSON.stringify({
          date: selectedDate.toISOString(),
          type: selectedType,
        })
      );
    }
    // Navigate to workout editor with the selected type and fromCalendar flag
    onOpenChange(false);
    const params = new URLSearchParams();
    if (selectedType) params.set("type", selectedType);
    params.set("fromCalendar", "true");
    navigate(`/admin/workouts/new?${params.toString()}`);
  };

  const handleAthleteToggle = (athleteId: string) => {
    setSelectedAthletes((prev) =>
      prev.includes(athleteId)
        ? prev.filter((id) => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAthletes.length === athletes.length) {
      setSelectedAthletes([]);
    } else {
      setSelectedAthletes(athletes.map((a) => a.id));
    }
  };

  const handleBack = () => {
    if (step === "workout") {
      setStep("type");
      setSelectedType(null);
      setSearchQuery("");
    } else if (step === "athletes") {
      setStep("workout");
      setSelectedWorkout(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedWorkout || !user || selectedAthletes.length === 0 || !selectedDate) {
      return;
    }

    setLoading(true);
    try {
      await createAssignments(
        {
          workoutId: selectedWorkout.id,
          athleteIds: selectedAthletes,
          scheduledDate: selectedDate,
        },
        user.uid
      );

      toast({
        title: "Workout assigned",
        description: `Successfully assigned "${selectedWorkout.name}" to ${selectedAthletes.length} athlete${selectedAthletes.length > 1 ? "s" : ""} on ${format(selectedDate, "PPP")}.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error assigning workout:", error);
      toast({
        title: "Error",
        description: "Failed to assign workout.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-4">
      {["type", "workout", "athletes"].map((s, i) => (
        <div key={s} className="flex items-center">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              step === s
                ? "bg-primary text-primary-foreground"
                : ["type", "workout", "athletes"].indexOf(step) > i
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {["type", "workout", "athletes"].indexOf(step) > i ? (
              <Check className="h-4 w-4" />
            ) : (
              i + 1
            )}
          </div>
          {i < 2 && (
            <div
              className={cn(
                "w-8 h-0.5 mx-1",
                ["type", "workout", "athletes"].indexOf(step) > i
                  ? "bg-primary/20"
                  : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderTypeStep = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        What type of workout do you want to assign?
      </p>
      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(workoutTypeConfig) as WorkoutType[]).map((type) => {
          const config = workoutTypeConfig[type];
          const Icon = config.icon;
          const count = workouts.filter((w) => w.type === type).length;

          return (
            <button
              key={type}
              onClick={() => handleTypeSelect(type)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors",
                config.color
              )}
            >
              <Icon className="h-8 w-8" />
              <span className="font-medium">{config.label}</span>
              <span className="text-xs opacity-70">{count} workouts</span>
            </button>
          );
        })}
      </div>
      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedType(null);
            setStep("workout");
          }}
        >
          Or view all workouts
        </Button>
      </div>
    </div>
  );

  const renderWorkoutStep = () => (
    <div className="space-y-4">
      {/* Search and filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workouts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {selectedType && (
          <div
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border",
              workoutTypeConfig[selectedType].color
            )}
          >
            {workoutTypeConfig[selectedType].label}
          </div>
        )}
      </div>

      {/* Workout list */}
      {loadingData ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredWorkouts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? "No workouts found matching your search."
              : selectedType
                ? `No ${selectedType} workouts found.`
                : "No workouts found."}
          </p>
          <Button onClick={handleCreateNewWorkout}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Workout
          </Button>
        </div>
      ) : (
        <ScrollArea className="h-[280px]">
          <div className="space-y-2 pr-4">
            {filteredWorkouts.map((workout) => {
              const config = workoutTypeConfig[workout.type];
              const Icon = config.icon;

              return (
                <button
                  key={workout.id}
                  onClick={() => handleWorkoutSelect(workout)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent",
                    selectedWorkout?.id === workout.id && "ring-2 ring-primary"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        config.color.split(" ").slice(0, 2).join(" ")
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{workout.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {workout.stages.length} stages · {config.label}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Create new option */}
      {filteredWorkouts.length > 0 && (
        <div className="pt-2 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCreateNewWorkout}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Workout
          </Button>
        </div>
      )}
    </div>
  );

  const renderAthletesStep = () => (
    <div className="space-y-4">
      {/* Selected workout summary */}
      {selectedWorkout && (
        <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-lg",
              workoutTypeConfig[selectedWorkout.type].color
                .split(" ")
                .slice(0, 2)
                .join(" ")
            )}
          >
            {(() => {
              const Icon = workoutTypeConfig[selectedWorkout.type].icon;
              return <Icon className="h-4 w-4" />;
            })()}
          </div>
          <div className="flex-1">
            <p className="font-medium">{selectedWorkout.name}</p>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate!, "EEEE, MMMM d, yyyy")}
            </p>
          </div>
        </div>
      )}

      {/* Athletes list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Select Athletes</Label>
          {athletes.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedAthletes.length === athletes.length
                ? "Deselect All"
                : "Select All"}
            </Button>
          )}
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : athletes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No athletes found. Create athlete users first.
          </div>
        ) : (
          <ScrollArea className="h-[200px] rounded-md border p-4">
            <div className="space-y-3">
              {athletes.map((athlete) => (
                <div key={athlete.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={`cal-athlete-${athlete.id}`}
                    checked={selectedAthletes.includes(athlete.id)}
                    onCheckedChange={() => handleAthleteToggle(athlete.id)}
                  />
                  <Label
                    htmlFor={`cal-athlete-${athlete.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <span className="font-medium">{athlete.displayName}</span>
                    <span className="text-muted-foreground ml-2 text-sm">
                      {athlete.email}
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {selectedAthletes.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {selectedAthletes.length} athlete
            {selectedAthletes.length > 1 ? "s" : ""} selected
          </p>
        )}
      </div>
    </div>
  );

  const getStepTitle = () => {
    switch (step) {
      case "type":
        return "Select Workout Type";
      case "workout":
        return "Choose Workout";
      case "athletes":
        return "Assign to Athletes";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== "type" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {getStepTitle()}
          </DialogTitle>
          <DialogDescription>
            {selectedDate && (
              <span className="font-medium">
                Scheduling for {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        <div className="py-2">
          {step === "type" && renderTypeStep()}
          {step === "workout" && renderWorkoutStep()}
          {step === "athletes" && renderAthletesStep()}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          {step === "athletes" && (
            <Button
              onClick={handleSubmit}
              disabled={selectedAthletes.length === 0 || loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Workout
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
