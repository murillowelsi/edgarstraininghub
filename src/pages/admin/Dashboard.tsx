import AdminLayout from "@/components/AdminLayout";
import { ListItemCard } from "@/components/shared/ListItemCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { GrSwim, GrBike, GrRun } from "react-icons/gr";
import {
  Award,
  CalendarCheck,
  Check,
  ChevronRight,
  Dumbbell,
  Loader2,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTopBarMenu } from "@/contexts/TopBarMenuContext";

const workoutTypeIcons: Record<string, React.ElementType> = {
  running: GrRun,
  cycling: GrBike,
  swimming: GrSwim,
  strength: Dumbbell,
};

const workoutTypeColors: Record<string, string> = {
  running: "bg-blue-500/10 text-blue-600",
  cycling: "bg-green-500/10 text-green-600",
  swimming: "bg-cyan-500/10 text-cyan-600",
  strength: "bg-amber-500/10 text-amber-600",
};

const AdminDashboard = () => {
  const { user, photoURL } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { setIsMenuOpen } = useTopBarMenu();

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
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMenuOpen(true)} className="rounded-full focus:outline-none">
            <Avatar className="h-14 w-14 shrink-0 ring-2 ring-[#e1b506]">
              {photoURL && <AvatarImage src={photoURL} alt={displayName} className="object-cover" />}
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
          <div>
            <p className="text-muted-foreground">{t.admin.dashboard.welcomeBack}</p>
            <h1 className="text-3xl font-bold font-display">{displayName}</h1>
          </div>
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
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-200/50 hover:shadow-md transition-all hover:border-amber-400/50 cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20">
                    <Dumbbell className="h-5 w-5 text-amber-500" />
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
                <ListItemCard
                  key={team.id}
                  to={`/admin/teams/${team.id}`}
                  compact
                  icon={team.photoURL
                    ? <img src={team.photoURL} alt={team.name} className="h-8 w-8 object-cover rounded-full" />
                    : <Shield className="h-4 w-4 text-violet-500" />}
                  iconClassName={team.photoURL ? "!p-0" : "bg-violet-500/10"}
                  title={team.name}
                  subtitle={`${team.memberIds.length} ${t.admin.dashboard.members}`}
                  right={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
                />
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
                const WorkoutIcon = workoutTypeIcons[a.workout.type] || Dumbbell;
                return (
                  <ListItemCard
                    key={a.id}
                    to="/admin/calendar"
                    compact
                    icon={
                      isCompleted ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <WorkoutIcon className="h-4 w-4" />
                      )
                    }
                    iconClassName={
                      isCompleted
                        ? "bg-green-100 dark:bg-green-900/30"
                        : workoutTypeColors[a.workout.type] || "bg-muted"
                    }
                    title={a.workout.name}
                    titleClassName={isCompleted ? "line-through text-muted-foreground" : undefined}
                    subtitle={a.athlete.displayName}
                    right={
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          isCompleted
                            ? "bg-green-100 text-green-700"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {isCompleted ? t.admin.dashboard.completed : t.admin.dashboard.pending}
                      </Badge>
                    }
                    className={
                      isCompleted
                        ? "bg-green-50 border-green-200 dark:bg-green-950/20"
                        : undefined
                    }
                  />
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
