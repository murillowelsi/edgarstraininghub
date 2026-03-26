import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTeamById } from "@/services/teamsService";
import { getUserById } from "@/services/usersService";
import { getWorkoutById } from "@/services/workoutsService";
import type { Team } from "@/types/team";
import type { User } from "@/types/user";
import type { Workout } from "@/types/workout";
import type { WorkoutAssignment, WorkoutAssignmentDocument } from "@/types/workoutAssignment";
import { format, startOfDay } from "date-fns";
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

function isCardioWorkout(workout: Workout | undefined): boolean {
  return !!workout && ["running", "cycling", "swimming"].includes(workout.type);
}

export default function AdminTeamStats() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<WorkoutAssignment[]>([]);
  const [workoutMap, setWorkoutMap] = useState<Map<string, Workout>>(new Map());

  // Sorted list of unique dates (as ISO date strings "YYYY-MM-DD")
  const [dateDays, setDateDays] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>("");

  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const t = await getTeamById(teamId);
        if (cancelled) return;
        if (!t) { navigate("/admin/teams"); return; }
        setTeam(t);

        if (t.memberIds.length === 0) { setLoading(false); return; }

        const memberResults = await Promise.all(
          t.memberIds.map((uid) => getUserById(uid))
        );
        if (cancelled) return;
        setMembers(memberResults.filter((u): u is User => u !== null));

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

        // Resolve unique workouts
        const uniqueWorkoutIds = [...new Set(allAssignments.map((a) => a.workoutId))];
        const workouts = await Promise.all(uniqueWorkoutIds.map((id) => getWorkoutById(id)));
        if (cancelled) return;
        const wMap = new Map<string, Workout>();
        workouts.forEach((w) => { if (w) wMap.set(w.id, w); });
        setWorkoutMap(wMap);

        // Build sorted unique days (most recent first)
        const daySet = new Set<string>();
        allAssignments.forEach((a) => {
          daySet.add(format(startOfDay(a.scheduledDate), "yyyy-MM-dd"));
        });
        const sortedDays = [...daySet].sort((a, b) => b.localeCompare(a));
        setDateDays(sortedDays);
        if (sortedDays.length > 0) setSelectedDay(sortedDays[0]);
      } catch {
        if (cancelled) return;
        toast({ title: t.common.error, description: t.admin.teamStats.noAssignments, variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [teamId]);

  // Assignments for the selected day, grouped by member
  // member -> list of assignments (there may be multiple workouts on same day)
  const assignmentsForDay = assignments.filter(
    (a) => format(startOfDay(a.scheduledDate), "yyyy-MM-dd") === selectedDay
  );

  // Build a map: memberId -> WorkoutAssignment[] for that day
  const memberDayMap = new Map<string, WorkoutAssignment[]>();
  assignmentsForDay.forEach((a) => {
    const list = memberDayMap.get(a.athleteId) ?? [];
    list.push(a);
    memberDayMap.set(a.athleteId, list);
  });

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

        <div className="flex items-center gap-3">
          {team.photoURL && (
            <img src={team.photoURL} alt={team.name} className="h-10 w-10 object-cover rounded-full shrink-0" />
          )}
          <AdminPageHeader
            title={`${team.name} — Stats`}
            description={t.admin.teamStats.description}
          />
        </div>

        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.admin.teamStats.noMembers}</p>
        ) : dateDays.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.admin.teamStats.noAssignments}</p>
        ) : (
          <>
            {/* Day selector */}
            <div className="max-w-xs">
              <label className="text-sm font-medium mb-1 block">{t.admin.teamStats.selectDate}</label>
              <Select value={selectedDay} onValueChange={setSelectedDay}>
                <SelectTrigger>
                  <SelectValue placeholder={t.admin.teamStats.chooseDate} />
                </SelectTrigger>
                <SelectContent>
                  {dateDays.map((day) => (
                    <SelectItem key={day} value={day}>
                      {format(new Date(day + "T00:00:00"), "EEEE, dd MMM yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stats table */}
            {selectedDay && (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-3 font-semibold">{t.admin.teamStats.columns.athlete}</th>
                      <th className="text-left px-4 py-3 font-semibold">{t.admin.teamStats.columns.workout}</th>
                      <th className="text-left px-4 py-3 font-semibold">{t.admin.teamStats.columns.status}</th>
                      <th className="text-left px-4 py-3 font-semibold">{t.admin.teamStats.columns.detail}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => {
                      const memberAssignments = memberDayMap.get(member.id) ?? [];

                      if (memberAssignments.length === 0) {
                        // Member has no assignment on this day
                        return (
                          <tr key={member.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium">{member.displayName}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">—</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                <XCircle className="h-4 w-4" />
                                {t.admin.teamStats.notAssigned}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">—</td>
                          </tr>
                        );
                      }

                      return memberAssignments.map((assignment, idx) => {
                        const workout = workoutMap.get(assignment.workoutId);
                        const completed = !!assignment.completedAt;
                        const cardio = isCardioWorkout(workout);

                        let detail = "—";
                        if (completed) {
                          if (cardio) {
                            detail = format(assignment.completedAt!, "dd/MM/yyyy HH:mm");
                          } else {
                            const pct = assignment.completionPercentage !== undefined
                              ? `${Math.round(assignment.completionPercentage)}%`
                              : "—";
                            const time = assignment.totalTime !== undefined
                              ? formatTime(assignment.totalTime)
                              : "—";
                            detail = `${pct} · ${time}`;
                          }
                        }

                        return (
                          <tr
                            key={`${member.id}-${assignment.id}`}
                            className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            {idx === 0 ? (
                              <td className="px-4 py-3" rowSpan={memberAssignments.length}>
                                <p className="font-medium">{member.displayName}</p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              </td>
                            ) : null}
                            <td className="px-4 py-3 text-muted-foreground">
                              {workout?.name ?? assignment.workoutId}
                            </td>
                            <td className="px-4 py-3">
                              {completed ? (
                                <span className="inline-flex items-center gap-1.5 text-green-600">
                                  <CheckCircle2 className="h-4 w-4" />
                                  {t.admin.teamStats.completed}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                  <XCircle className="h-4 w-4" />
                                  {t.admin.teamStats.notCompleted}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{detail}</td>
                          </tr>
                        );
                      });
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
