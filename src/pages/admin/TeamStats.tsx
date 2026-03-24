import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useToast } from "@/hooks/use-toast";
import { getTeamById } from "@/services/teamsService";
import { getUserById } from "@/services/usersService";
import { getWorkoutById } from "@/services/workoutsService";
import type { Team } from "@/types/team";
import type { User } from "@/types/user";
import type { Workout } from "@/types/workout";
import type { WorkoutAssignment, WorkoutAssignmentDocument } from "@/types/workoutAssignment";
import { format } from "date-fns";
import { Loader2, ChevronLeft, CheckCircle2, XCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// Format seconds as mm:ss
function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function AdminTeamStats() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  // All assignments for all team members
  const [assignments, setAssignments] = useState<WorkoutAssignment[]>([]);
  // Map of workoutId -> workout name
  const [workoutMap, setWorkoutMap] = useState<Map<string, Workout>>(new Map());
  // Selected workout filter
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("");
  const [workoutOptions, setWorkoutOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;

    const load = async () => {
      try {
        // 1. Load team
        const t = await getTeamById(teamId);
        if (cancelled) return;
        if (!t) {
          navigate("/admin/teams");
          return;
        }
        setTeam(t);

        if (t.memberIds.length === 0) {
          setLoading(false);
          return;
        }

        // 2. Load members in parallel
        const memberResults = await Promise.all(
          t.memberIds.map((uid) => getUserById(uid))
        );
        if (cancelled) return;
        setMembers(memberResults.filter((u): u is User => u !== null));

        // 3. Query all assignments for team members (in query, safe up to 30)
        if (t.memberIds.length === 0) {
          setLoading(false);
          return;
        }
        const q = query(
          collection(db, "workoutAssignments"),
          where("athleteId", "in", t.memberIds)
        );
        const snap = await getDocs(q);
        const allAssignments: WorkoutAssignment[] = snap.docs.map((d) => {
          const data = d.data() as WorkoutAssignmentDocument;
          return {
            id: d.id,
            workoutId: data.workoutId,
            athleteId: data.athleteId,
            scheduledDate: data.scheduledDate?.toDate() || new Date(),
            assignedBy: data.assignedBy,
            completedAt: data.completedAt?.toDate() || null,
            completionPercentage: data.completionPercentage,
            totalTime: data.totalTime,
            progressData: data.progressData,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
        });
        if (cancelled) return;
        setAssignments(allAssignments);

        // 4. Resolve unique workout names in parallel
        const uniqueWorkoutIds = [...new Set(allAssignments.map((a) => a.workoutId))];
        const workouts = await Promise.all(
          uniqueWorkoutIds.map((id) => getWorkoutById(id))
        );
        if (cancelled) return;
        const wMap = new Map<string, Workout>();
        workouts.forEach((w) => {
          if (w) wMap.set(w.id, w);
        });
        setWorkoutMap(wMap);

        const sortedWorkoutIds = [...wMap.keys()].sort((a, b) => {
          const nameA = wMap.get(a)?.name ?? "";
          const nameB = wMap.get(b)?.name ?? "";
          return nameA.localeCompare(nameB);
        });
        setWorkoutOptions(sortedWorkoutIds);
        if (sortedWorkoutIds.length > 0) setSelectedWorkoutId(sortedWorkoutIds[0]);
      } catch {
        if (cancelled) return;
        toast({
          title: "Error",
          description: "Failed to load team stats.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  // For selected workout, build a lookup of athleteId -> assignment
  const assignmentByAthlete = new Map<string, WorkoutAssignment>();
  if (selectedWorkoutId) {
    assignments
      .filter((a) => a.workoutId === selectedWorkoutId)
      .forEach((a) => {
        // If multiple assignments for same athlete+workout, prefer the completed one
        const existing = assignmentByAthlete.get(a.athleteId);
        if (!existing || (!existing.completedAt && a.completedAt)) {
          assignmentByAthlete.set(a.athleteId, a);
        }
      });
  }

  const selectedWorkout = workoutMap.get(selectedWorkoutId) ?? null;
  const isCardio =
    selectedWorkout &&
    (selectedWorkout.type === "running" ||
      selectedWorkout.type === "cycling" ||
      selectedWorkout.type === "swimming");

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!team) return null;

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 space-y-6">
        {/* Back button + header */}
        <div className="flex items-center gap-2 -mb-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground px-2"
            onClick={() => navigate(`/admin/teams/${team.id}`)}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <AdminPageHeader
          title={`${team.name} — Stats`}
          description="See which athletes completed a workout."
        />

        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No members in this team yet.
          </p>
        ) : workoutOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No workout assignments found for team members.
          </p>
        ) : (
          <>
            {/* Workout selector */}
            <div className="max-w-xs">
              <label className="text-sm font-medium mb-1 block">
                Select Workout
              </label>
              <Select
                value={selectedWorkoutId}
                onValueChange={setSelectedWorkoutId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a workout" />
                </SelectTrigger>
                <SelectContent>
                  {workoutOptions.map((wid) => (
                    <SelectItem key={wid} value={wid}>
                      {workoutMap.get(wid)?.name ?? wid}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stats table */}
            {selectedWorkoutId && (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-3 font-semibold">
                        Athlete
                      </th>
                      <th className="text-left px-4 py-3 font-semibold">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 font-semibold">
                        Detail
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => {
                      const assignment = assignmentByAthlete.get(member.id);
                      const completed = !!assignment?.completedAt;

                      let detail = "—";
                      if (completed && assignment && selectedWorkout) {
                        if (isCardio) {
                          detail = format(assignment.completedAt!, "dd/MM/yyyy");
                        } else {
                          // Strength
                          const pct =
                            assignment.completionPercentage !== undefined
                              ? `${Math.round(assignment.completionPercentage)}%`
                              : "—";
                          const time =
                            assignment.totalTime !== undefined
                              ? formatTime(assignment.totalTime)
                              : "—";
                          const date = format(
                            assignment.completedAt!,
                            "dd/MM/yyyy"
                          );
                          detail = `${pct} · ${time} · ${date}`;
                        }
                      }

                      return (
                        <tr
                          key={member.id}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium">{member.displayName}</p>
                            <p className="text-xs text-muted-foreground">
                              {member.email}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {completed ? (
                              <span className="inline-flex items-center gap-1.5 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                Completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                <XCircle className="h-4 w-4" />
                                Not completed
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {detail}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
