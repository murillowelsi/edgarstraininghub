import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { createAssignments } from "@/services/workoutAssignmentsService";
import { getUsersByRole } from "@/services/usersService";
import { getTeamsByCoach } from "@/services/teamsService";
import type { Team } from "@/types/team";
import type { User } from "@/types/user";
import type { Workout } from "@/types/workout";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

interface AssignWorkoutDialogProps {
  workout: Workout | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AssignWorkoutDialog = ({
  workout,
  open,
  onOpenChange,
  onSuccess,
}: AssignWorkoutDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [athletes, setAthletes] = useState<User[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    undefined
  );
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [loadingAthletesList, setLoadingAthletesList] = useState(false);

  // Team tab state
  const [activeTab, setActiveTab] = useState<"athletes" | "team">("athletes");
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamScheduledDate, setTeamScheduledDate] = useState<Date | undefined>(
    undefined
  );

  useEffect(() => {
    const loadAthletes = async () => {
      setLoadingAthletesList(true);
      try {
        const athleteUsers = await getUsersByRole("athlete");
        setAthletes(athleteUsers);
      } catch (error) {
        console.error("Error loading athletes:", error);
        toast({
          title: "Error",
          description: "Failed to load athletes.",
          variant: "destructive",
        });
      } finally {
        setLoadingAthletesList(false);
      }
    };

    const loadTeams = async () => {
      if (!user) return;
      setLoadingTeams(true);
      try {
        const coachTeams = await getTeamsByCoach(user.uid);
        setTeams(coachTeams);
      } catch (error) {
        console.error("Error loading teams:", error);
        toast({
          title: "Error",
          description: "Failed to load teams.",
          variant: "destructive",
        });
      } finally {
        setLoadingTeams(false);
      }
    };

    if (open) {
      loadAthletes();
      loadTeams();
      // Reset form when dialog opens
      setSelectedAthletes([]);
      setScheduledDate(undefined);
      setActiveTab("athletes");
      setSelectedTeamId("");
      setTeamScheduledDate(undefined);
    }
  }, [open, toast, user]);

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

  const handleSubmit = async () => {
    if (!workout || !user || selectedAthletes.length === 0 || !scheduledDate) {
      return;
    }

    setLoadingAthletes(true);
    try {
      await createAssignments(
        {
          workoutId: workout.id,
          athleteIds: selectedAthletes,
          scheduledDate,
        },
        user.uid
      );

      toast({
        title: "Workout assigned",
        description: `Successfully assigned "${workout.name}" to ${selectedAthletes.length} athlete${selectedAthletes.length > 1 ? "s" : ""}.`,
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
      setLoadingAthletes(false);
    }
  };

  const handleTeamSubmit = async () => {
    if (!workout || !user || !selectedTeamId || !teamScheduledDate) {
      return;
    }

    const selectedTeam = teams.find((t) => t.id === selectedTeamId);
    if (!selectedTeam || selectedTeam.memberIds.length === 0) {
      toast({
        title: "Error",
        description: "Selected team has no members.",
        variant: "destructive",
      });
      return;
    }

    setLoadingTeam(true);
    try {
      const result = await createAssignments(
        {
          workoutId: workout.id,
          athleteIds: selectedTeam.memberIds,
          scheduledDate: teamScheduledDate,
        },
        user.uid
      );

      const assignedCount = result.length;
      const skippedCount = selectedTeam.memberIds.length - assignedCount;

      if (assignedCount === 0) {
        toast({ title: "Nothing to assign", description: "All team members are already scheduled for this workout on that date.", variant: "destructive" });
      } else {
        toast({ title: "Assignments created", description: `${assignedCount} assigned, ${skippedCount} already scheduled` });
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error) {
      console.error("Error assigning workout to team:", error);
      toast({
        title: "Error",
        description: "Failed to assign workout to team.",
        variant: "destructive",
      });
    } finally {
      setLoadingTeam(false);
    }
  };

  const isValid = selectedAthletes.length > 0 && scheduledDate;
  const isTeamValid = selectedTeamId && teamScheduledDate;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Assign Workout"
      description={`Assign "${workout?.name}" to athletes with a scheduled date.`}
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "athletes" | "team")}
      >
        <TabsList className="w-full">
          <TabsTrigger value="athletes" className="flex-1">
            Athletes
          </TabsTrigger>
          <TabsTrigger value="team" className="flex-1">
            Team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="athletes">
          <div className="space-y-4 py-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate
                      ? format(scheduledDate, "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Athletes List */}
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

              {loadingAthletesList ? (
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
                      <div
                        key={athlete.id}
                        className="flex items-center space-x-3"
                      >
                        <Checkbox
                          id={`athlete-${athlete.id}`}
                          checked={selectedAthletes.includes(athlete.id)}
                          onCheckedChange={() =>
                            handleAthleteToggle(athlete.id)
                          }
                        />
                        <Label
                          htmlFor={`athlete-${athlete.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <span className="font-medium">
                            {athlete.displayName}
                          </span>
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loadingAthletes}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid || loadingAthletes}>
              {loadingAthletes && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Workout
            </Button>
          </DialogFooter>
        </TabsContent>

        <TabsContent value="team">
          <div className="space-y-4 py-4">
            {/* Team Selector */}
            <div className="space-y-2">
              <Label>Select Team</Label>
              {loadingTeams ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select
                  value={selectedTeamId}
                  onValueChange={setSelectedTeamId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.length === 0 ? (
                      <SelectItem value="__none__" disabled>
                        No teams found
                      </SelectItem>
                    ) : (
                      teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name} ({team.memberIds.length} member
                          {team.memberIds.length !== 1 ? "s" : ""})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !teamScheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {teamScheduledDate
                      ? format(teamScheduledDate, "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={teamScheduledDate}
                    onSelect={setTeamScheduledDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loadingTeam}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTeamSubmit}
              disabled={!isTeamValid || loadingTeam}
            >
              {loadingTeam && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign to Team
            </Button>
          </DialogFooter>
        </TabsContent>
      </Tabs>
    </ResponsiveModal>
  );
};
