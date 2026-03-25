import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getAllAssignmentsWithDetails } from "@/services/workoutAssignmentsService";
import { getTeamsByCoach } from "@/services/teamsService";
import { getAllUsers, getUserById } from "@/services/usersService";
import { getAllWorkouts } from "@/services/workoutsService";
import type { AssignmentWithDetails } from "@/types/workoutAssignment";
import type { Team } from "@/types/team";
import { format, isSameDay } from "date-fns";
import {
  Award,
  CalendarCheck,
  ChevronRight,
  Dumbbell,
  Loader2,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);

  const [athleteCount, setAthleteCount] = useState(0);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const [userData, allUsers, allWorkouts, coachTeams, allAssignments] = await Promise.all([
          getUserById(user.uid),
          getAllUsers(),
          getAllWorkouts(),
          getTeamsByCoach(user.uid),
          getAllAssignmentsWithDetails(),
        ]);

        if (userData) {
          setDisplayName(userData.displayName || user.email?.split("@")[0] || "Coach");
        }
        setAthleteCount(allUsers.filter((u) => u.role === "athlete").length);
        setWorkoutCount(allWorkouts.length);
        setTeams(coachTeams);
        setAssignments(allAssignments);
      } catch (error) {
        console.error("Error loading dashboard:", error);
        toast({ title: t.common.error, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    if (user) loadData();
  }, [user, toast]);

  const completedCount = assignments.filter((a) => a.completedAt).length;
  const completionRate = assignments.length > 0
    ? Math.round((completedCount / assignments.length) * 100)
    : 0;

  const todaysAssignments = assignments.filter((a) =>
    isSameDay(a.scheduledDate, new Date())
  );
  const todaysCompleted = todaysAssignments.filter((a) => a.completedAt).length;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 pb-24 md:pb-8 space-y-4 max-w-4xl mx-auto">

        {/* Welcome */}
        <div className="pt-2">
          <p className="text-muted-foreground">{t.admin.dashboard.welcomeBack}</p>
          <h1 className="text-3xl font-bold font-display">{displayName}</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/admin/users">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-md transition-all hover:border-primary/40 cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/20">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{athleteCount}</p>
                    <p className="text-xs text-muted-foreground">{t.admin.dashboard.statAthletes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/teams">
            <Card className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-200/50 hover:shadow-md transition-all hover:border-violet-400/50 cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-violet-500/20">
                    <Shield className="h-5 w-5 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{teams.length}</p>
                    <p className="text-xs text-muted-foreground">{t.admin.dashboard.statTeams}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/workouts">
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-200/50 hover:shadow-md transition-all hover:border-orange-400/50 cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-orange-500/20">
                    <Dumbbell className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{workoutCount}</p>
                    <p className="text-xs text-muted-foreground">{t.admin.dashboard.statWorkouts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/calendar">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-200/50 hover:shadow-md transition-all hover:border-green-400/50 cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-green-500/20">
                    <CalendarCheck className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {todaysCompleted}/{todaysAssignments.length}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.admin.dashboard.statTodayLabel}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Overall Completion */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                {t.admin.dashboard.overallCompletion}
              </CardTitle>
              <span className="text-sm text-muted-foreground">{completionRate}%</span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={completionRate} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {t.admin.dashboard.assignmentsCompleted
                .replace("{{total}}", String(assignments.length))}
            </p>
          </CardContent>
        </Card>

        {/* Teams Overview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t.admin.dashboard.teamsOverview}</CardTitle>
              <Link
                to="/admin/teams"
                className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
              >
                {t.admin.dashboard.seeAll}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {teams.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t.admin.dashboard.noTeams}
              </p>
            ) : (
              teams.map((team) => (
                <Link key={team.id} to={`/admin/teams/${team.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:border-primary/50 transition-all hover:shadow-md mb-2">
                    <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-200/50">
                      <Shield className="h-5 w-5 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{team.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {team.memberIds.length} {t.admin.dashboard.members}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Today's Activity */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {t.admin.dashboard.todaysActivity}
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {format(new Date(), "MMM d")}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {todaysAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t.admin.dashboard.noActivityToday}
              </p>
            ) : (
              todaysAssignments.map((a) => {
                const isCompleted = !!a.completedAt;
                return (
                  <Link key={a.id} to="/admin/calendar">
                    <div
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-md mb-2",
                        isCompleted
                          ? "bg-green-50 border-green-200 dark:bg-green-950/20"
                          : "bg-card hover:border-primary/50"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-medium truncate text-sm", isCompleted && "line-through text-muted-foreground")}>
                          {a.workout.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {a.athlete.displayName}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "shrink-0 text-xs",
                          isCompleted
                            ? "bg-green-100 text-green-700"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {isCompleted ? t.admin.dashboard.completed : t.admin.dashboard.pending}
                      </Badge>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
