import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { createAssignments } from "@/services/workoutAssignmentsService";
import { getUsersByRole } from "@/services/usersService";
import { getAllWorkouts } from "@/services/workoutsService";
import { getTeamsByCoach, addTeamWorkoutAssignment } from "@/services/teamsService";
import type { Team } from "@/types/team";
import type { User } from "@/types/user";
import type { Workout, WorkoutType } from "@/types/workout";
import { format } from "date-fns";
import { GrSwim, GrBike, GrRun } from "react-icons/gr";
import {
  ArrowLeft,
  Check,
  Dumbbell,
  Loader2,
  Plus,
  Search,
  Users2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const workoutTypeConfig: Record<
  WorkoutType,
  { label: string; icon: React.ElementType; hex: string }
> = {
  swimming: { label: "Swimming", icon: GrSwim, hex: "#06b6d4" },
  cycling:  { label: "Cycling",  icon: GrBike, hex: "#22c55e" },
  running:  { label: "Running",  icon: GrRun,  hex: "#3b82f6" },
  strength: { label: "Strength", icon: Dumbbell, hex: "#f97316" },
};

// Define the order of workout types for display
const workoutTypeOrder: WorkoutType[] = ["swimming", "cycling", "running", "strength"];

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

  // Team tab state
  const [assignTab, setAssignTab] = useState<"athletes" | "team">("athletes");
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Load workouts and athletes when dialog opens
  useEffect(() => {
    const loadData = async () => {
      if (!open) return;

      setLoadingData(true);
      try {
        const [workoutsData, athletesData, teamsData] = await Promise.all([
          getAllWorkouts(),
          getUsersByRole("athlete"),
          user ? getTeamsByCoach(user.uid) : Promise.resolve([]),
        ]);
        setWorkouts(workoutsData);
        setAthletes(athletesData);
        setTeams(teamsData);

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
      setAssignTab("athletes");
      setSelectedTeamId("");
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

  const handleTeamSubmit = async () => {
    if (!selectedWorkout || !user || !selectedTeamId || !selectedDate) return;
    const selectedTeam = teams.find((t) => t.id === selectedTeamId);
    if (!selectedTeam) return;

    setLoadingTeam(true);
    try {
      const result = await createAssignments(
        {
          workoutId: selectedWorkout.id,
          athleteIds: selectedTeam.memberIds,
          scheduledDate: selectedDate,
        },
        user.uid
      );

      const assignedCount = result.length;
      const skippedCount = selectedTeam.memberIds.length - assignedCount;

      if (assignedCount === 0) {
        toast({ title: "Nothing to assign", description: "All team members are already scheduled for this workout on that date.", variant: "destructive" });
      } else {
        await addTeamWorkoutAssignment(selectedTeam.id, selectedWorkout.id, selectedDate);
        toast({ title: "Assignments created", description: `${assignedCount} assigned, ${skippedCount} already scheduled` });
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error) {
      console.error("Error assigning workout to team:", error);
      toast({ title: "Error", description: "Failed to assign workout to team.", variant: "destructive" });
    } finally {
      setLoadingTeam(false);
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
    <div className="space-y-2">
      {workoutTypeOrder.map((type) => {
        const { label, icon: Icon, hex } = workoutTypeConfig[type];
        const count = workouts.filter((w) => w.type === type).length;
        return (
          <button
            key={type}
            onClick={() => handleTypeSelect(type)}
            className="flex items-center gap-3 w-full p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-sm transition-all text-left"
          >
            <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: `${hex}1a`, color: hex }}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-muted-foreground">{count} workout{count !== 1 ? "s" : ""}</p>
            </div>
          </button>
        );
      })}
      <button
        className="w-full text-center text-xs text-muted-foreground py-2 hover:text-foreground transition-colors"
        onClick={() => { setSelectedType(null); setStep("workout"); }}
      >
        View all workouts
      </button>
    </div>
  );

  const renderWorkoutStep = () => (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search workouts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-sm rounded-full"
        />
      </div>
      {selectedType && (
        <div
          className="inline-flex px-3 py-1 rounded-full text-xs font-medium border border-transparent"
          style={{ backgroundColor: `${workoutTypeConfig[selectedType].hex}18`, color: workoutTypeConfig[selectedType].hex }}
        >
          {workoutTypeConfig[selectedType].label}
        </div>
      )}

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
                    "w-full text-left p-3 rounded-xl border transition-all hover:border-primary/40 hover:shadow-sm",
                    selectedWorkout?.id === workout.id && "ring-2 ring-primary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: `${config.hex}1a`, color: config.hex }}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{workout.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {workout.type === "strength" ? `${workout.exercises?.length || 0} exercises` : `${workout.stages.length} stages`} · {config.label}
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
        <div className="p-3 rounded-xl border bg-card flex items-center gap-3">
          <div
            className="p-2 rounded-lg shrink-0"
            style={{ backgroundColor: `${workoutTypeConfig[selectedWorkout.type].hex}1a`, color: workoutTypeConfig[selectedWorkout.type].hex }}
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

      <Tabs value={assignTab} onValueChange={(v) => setAssignTab(v as "athletes" | "team")}>
        <TabsList className="w-full">
          <TabsTrigger value="athletes" className="flex-1">Athletes</TabsTrigger>
          <TabsTrigger value="team" className="flex-1">Team</TabsTrigger>
        </TabsList>

        {/* Athletes tab */}
        <TabsContent value="athletes" className="space-y-2 mt-3">
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
        </TabsContent>

        {/* Team tab */}
        <TabsContent value="team" className="space-y-3 mt-3">
          {teams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-center">
              <Users2 className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No teams found. Create a team first.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Select Team</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team…" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.memberIds.length} member{team.memberIds.length !== 1 ? "s" : ""})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  const stepTitle =
    step === "type"
      ? "Select Workout Type"
      : step === "workout"
        ? "Choose Workout"
        : "Select Athletes";

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={stepTitle}
      description={
        selectedDate
          ? `Scheduling for ${format(selectedDate, "EEEE, MMMM d, yyyy")}`
          : undefined
      }
    >
        {step !== "type" && (
          <div className="mb-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
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
          {step === "athletes" && assignTab === "athletes" && (
            <Button
              onClick={handleSubmit}
              disabled={selectedAthletes.length === 0 || loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Workout
            </Button>
          )}
          {step === "athletes" && assignTab === "team" && (
            <Button
              onClick={handleTeamSubmit}
              disabled={!selectedTeamId || loadingTeam}
            >
              {loadingTeam && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign to Team
            </Button>
          )}
        </DialogFooter>
    </ResponsiveModal>
  );
};
