import AdminLayout from "@/components/AdminLayout";
import { ListItemCard } from "@/components/shared/ListItemCard";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  InfiniteDateStrip,
  type InfiniteDateStripHandle,
} from "@/components/shared/InfiniteDateStrip";
import { CalendarAssignDialog } from "@/components/workout/CalendarAssignDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getAllAssignmentsWithDetails } from "@/services/workoutAssignmentsService";
import { getTeamsByCoach } from "@/services/teamsService";
import { getAllUsers, getUserById } from "@/services/usersService";
import { getAllWorkouts } from "@/services/workoutsService";
import { getAllEvents } from "@/services/athleteEventsService";
import type { AssignmentWithDetails } from "@/types/workoutAssignment";
import type { AthleteEvent } from "@/types/athleteEvent";
import type { Team } from "@/types/team";
import type { User } from "@/types/user";
import {
  addDays,
  differenceInCalendarDays,
  endOfWeek,
  format,
  formatDistanceToNowStrict,
  isSameDay,
  isThisWeek,
  isToday,
  startOfDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { enUS, ptBR } from "date-fns/locale";
import { GrSwim, GrBike, GrRun } from "react-icons/gr";
import {
  AlertTriangle,
  CalendarCheck,
  Check,
  ChevronRight,
  Clock,
  Crown,
  Dumbbell,
  Flag,
  Loader2,
  Plus,
  Shield,
  Sunrise,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const { t, language } = useLanguage();
  const dateLocale = language === "pt" ? ptBR : enUS;
  const { toast } = useToast();
  const { setIsMenuOpen } = useTopBarMenu();

  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);

  const [athleteCount, setAthleteCount] = useState(0);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [allAthletes, setAllAthletes] = useState<User[]>([]);
  const [events, setEvents] = useState<AthleteEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [centerDate, setCenterDate] = useState(() => startOfDay(new Date()));
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignDate, setAssignDate] = useState<Date>(new Date());
  const dateStripRef = useRef<InfiniteDateStripHandle>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const [userData, allUsers, allWorkouts, coachTeams, allAssignments, allEvents] =
          await Promise.all([
            getUserById(user.uid),
            getAllUsers(),
            getAllWorkouts(),
            getTeamsByCoach(user.uid),
            getAllAssignmentsWithDetails(),
            getAllEvents(),
          ]);

        if (userData) {
          setDisplayName(userData.displayName || user.email?.split("@")[0] || "Coach");
        }
        const athletes = allUsers.filter((u) => u.role === "athlete");
        setAthleteCount(athletes.length);
        setAllAthletes(athletes);
        setWorkoutCount(allWorkouts.length);
        setTeams(coachTeams);
        setAssignments(allAssignments);
        setEvents(allEvents);
      } catch (error) {
        console.error("Error loading dashboard:", error);
        toast({ title: t.common.error, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    if (user) loadData();
  }, [user, toast]);

  const hasWorkouts = (date: Date) => assignments.some((a) => isSameDay(a.scheduledDate, date));
  const hasIncompleteWorkouts = (date: Date) => assignments.some((a) => isSameDay(a.scheduledDate, date) && !a.completedAt);

  const selectedDateAssignments = assignments.filter((a) => isSameDay(a.scheduledDate, selectedDate));

  const completedCount = assignments.filter((a) => a.completedAt).length;
  const completionRate = assignments.length > 0
    ? Math.round((completedCount / assignments.length) * 100)
    : 0;

  const todaysAssignments = assignments.filter((a) =>
    isSameDay(a.scheduledDate, new Date())
  );
  const todaysCompleted = todaysAssignments.filter((a) => a.completedAt).length;

  const weekRange = {
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  };

  const atRiskAthletes = (() => {
    const byAthlete = new Map<
      string,
      { athlete: AssignmentWithDetails["athlete"]; planned: number; done: number; overdue: number }
    >();
    const now = new Date();
    for (const a of assignments) {
      if (!isThisWeek(a.scheduledDate, { weekStartsOn: 1 })) continue;
      const cur = byAthlete.get(a.athleteId) ?? {
        athlete: a.athlete,
        planned: 0,
        done: 0,
        overdue: 0,
      };
      cur.planned += 1;
      if (a.completedAt) cur.done += 1;
      else if (a.scheduledDate < now && !isSameDay(a.scheduledDate, now)) cur.overdue += 1;
      byAthlete.set(a.athleteId, cur);
    }
    return Array.from(byAthlete.values())
      .map((x) => ({
        ...x,
        compliance: x.planned > 0 ? Math.round((x.done / x.planned) * 100) : 100,
      }))
      .filter((x) => x.overdue > 0 || x.compliance < 60)
      .sort((a, b) => b.overdue - a.overdue || a.compliance - b.compliance)
      .slice(0, 5);
  })();

  const recentActivity = assignments
    .filter((a) => a.completedAt)
    .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())
    .slice(0, 5);

  const topPerformers = (() => {
    const byAthlete = new Map<
      string,
      { athlete: AssignmentWithDetails["athlete"]; planned: number; done: number }
    >();
    for (const a of assignments) {
      if (!isThisWeek(a.scheduledDate, { weekStartsOn: 1 })) continue;
      const cur = byAthlete.get(a.athleteId) ?? {
        athlete: a.athlete,
        planned: 0,
        done: 0,
      };
      cur.planned += 1;
      if (a.completedAt) cur.done += 1;
      byAthlete.set(a.athleteId, cur);
    }
    return Array.from(byAthlete.values())
      .filter((x) => x.planned >= 2)
      .map((x) => ({ ...x, compliance: Math.round((x.done / x.planned) * 100) }))
      .sort((a, b) => b.compliance - a.compliance || b.done - a.done)
      .slice(0, 5);
  })();

  const upcomingEvents = events
    .filter((e) => differenceInCalendarDays(e.eventDate, new Date()) >= 0)
    .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())
    .slice(0, 5)
    .map((e) => ({
      ...e,
      athlete: allAthletes.find((u) => u.id === e.athleteId),
      daysUntil: differenceInCalendarDays(e.eventDate, new Date()),
    }));

  const rosterWeek = (() => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekRange.start, i));
    const now = new Date();
    const rows = allAthletes.map((ath) => {
      const cells = days.map((d) => {
        const dayItems = assignments.filter(
          (a) => a.athleteId === ath.id && isSameDay(a.scheduledDate, d),
        );
        const planned = dayItems.length;
        const done = dayItems.filter((a) => a.completedAt).length;
        const isPast = d < now && !isSameDay(d, now);
        return { planned, done, isPast };
      });
      const planned = cells.reduce((acc, c) => acc + c.planned, 0);
      const done = cells.reduce((acc, c) => acc + c.done, 0);
      return {
        athlete: ath,
        cells,
        planned,
        done,
        compliance: planned > 0 ? Math.round((done / planned) * 100) : 0,
      };
    });
    return rows
      .filter((r) => r.planned > 0)
      .sort((a, b) => b.compliance - a.compliance || b.done - a.done);
  })();

  const tomorrow = addDays(new Date(), 1);
  const tomorrowAssignments = assignments
    .filter((a) => isSameDay(a.scheduledDate, tomorrow))
    .sort((a, b) => a.athlete.displayName.localeCompare(b.athlete.displayName));

  const tomorrowByModality = (() => {
    const result: Record<string, number> = {
      running: 0,
      cycling: 0,
      swimming: 0,
      strength: 0,
    };
    for (const a of tomorrowAssignments) {
      if (a.workout.type in result) result[a.workout.type] += 1;
    }
    return result;
  })();

  const complianceTrend = (() => {
    return Array.from({ length: 8 }, (_, i) => {
      const ws = startOfWeek(subWeeks(new Date(), 7 - i), { weekStartsOn: 1 });
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      const items = assignments.filter(
        (a) => a.scheduledDate >= ws && a.scheduledDate <= we,
      );
      const planned = items.length;
      const done = items.filter((a) => a.completedAt).length;
      return {
        label: format(ws, "d MMM"),
        rangeLabel: `${format(ws, "d MMM")} – ${format(we, "d MMM")}`,
        compliance: planned > 0 ? Math.round((done / planned) * 100) : 0,
        planned,
        done,
        hasData: planned > 0,
      };
    });
  })();


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
      <div className="p-4 md:p-8 pb-24 md:pb-8 space-y-4 max-w-7xl mx-auto">

        {/* Welcome */}
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMenuOpen(true)} className="rounded-full focus:outline-none">
            <CachedAvatar
              src={photoURL}
              alt={displayName}
              fallback={displayName.charAt(0).toUpperCase()}
              className="h-11 w-11 shrink-0 ring-2 ring-[#e1b506]"
              fallbackClassName="bg-primary text-primary-foreground text-base font-semibold"
            />
          </button>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-sm text-muted-foreground font-medium">
              {t.admin.dashboard.role}
              <Crown className="h-3 w-3 fill-yellow-400 text-yellow-500 drop-shadow-sm" strokeWidth={1.5} />
            </p>
            <h1 className="text-2xl font-bold font-display truncate">{displayName}</h1>
          </div>
          <Button
            onClick={() => {
              setAssignDate(new Date());
              setAssignDialogOpen(true);
            }}
            className="hidden md:inline-flex gap-2"
          >
            <Plus className="h-4 w-4" />
            {t.admin.dashboard.quickAssign}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
        {/* Overall Completion */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t.admin.dashboard.overallCompletion}</CardTitle>
              <span className="text-sm text-muted-foreground">{completionRate}%</span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={completionRate} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {t.admin.dashboard.assignmentsCompleted
                .replace("{{completed}}", String(completedCount))
                .replace("{{total}}", String(assignments.length))}
            </p>
          </CardContent>
        </Card>

        {/* Compliance trend (last 8 weeks) */}
        <Card className="hidden lg:block">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-green-600" />
                  <CardTitle className="text-base">
                    {t.admin.dashboard.complianceTrend}
                  </CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.admin.dashboard.complianceTrendDescription}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold tabular-nums leading-none">
                  {complianceTrend[complianceTrend.length - 1]?.compliance ?? 0}%
                </p>
                <p className="text-[10px] uppercase text-muted-foreground tracking-wide mt-0.5">
                  {language === "pt" ? "essa semana" : "this week"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="h-36 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={complianceTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                    className="text-muted-foreground"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10 }}
                    width={32}
                    tickFormatter={(v: number) => `${v}%`}
                    className="text-muted-foreground"
                  />
                  <RTooltip
                    cursor={{ stroke: "hsl(var(--border))" }}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--background))",
                      fontSize: 12,
                    }}
                    labelFormatter={(_, payload) =>
                      (payload?.[0]?.payload as { rangeLabel?: string } | undefined)
                        ?.rangeLabel ?? ""
                    }
                    formatter={(value: number, _name, item) => {
                      const p = item.payload as { planned: number; done: number };
                      return [
                        `${value}% — ${p.done}/${p.planned}`,
                        t.admin.dashboard.complianceLabel,
                      ];
                    }}
                  />
                  <ReferenceLine
                    y={80}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="3 3"
                    label={{
                      value: t.admin.dashboard.complianceTarget,
                      position: "insideTopRight",
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 10,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="compliance"
                    stroke="hsl(142 71% 45%)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(142 71% 45%)" }}
                    activeDot={{ r: 5 }}
                    name={t.admin.dashboard.complianceLabel}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tomorrow preview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sunrise className="h-4 w-4 text-orange-500" />
                <CardTitle className="text-base">
                  {t.admin.dashboard.tomorrowPreview}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  · {format(tomorrow, "EEEE, d MMM")}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setAssignDate(tomorrow);
                  setAssignDialogOpen(true);
                }}
                className="gap-1.5 h-8"
              >
                <Plus className="h-3.5 w-3.5" />
                {t.admin.dashboard.assign}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tomorrowAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t.admin.dashboard.noTomorrow}
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(["running", "cycling", "swimming", "strength"] as const).map((type) => {
                    const count = tomorrowByModality[type];
                    if (!count) return null;
                    const Icon = workoutTypeIcons[type];
                    return (
                      <div
                        key={type}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                          workoutTypeColors[type],
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        <span className="capitalize">{t.athlete.profile.modalities[type]}</span>
                        <span className="tabular-nums">{count}</span>
                      </div>
                    );
                  })}
                  <div className="ml-auto text-xs text-muted-foreground tabular-nums self-center">
                    {tomorrowAssignments.length} {t.admin.dashboard.total}
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {tomorrowAssignments.slice(0, 8).map((a) => {
                    const Icon = workoutTypeIcons[a.workout.type] || Dumbbell;
                    return (
                      <Link
                        key={a.id}
                        to={`/admin/athletes/${a.athleteId}`}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition min-w-0"
                      >
                        <div
                          className={cn(
                            "p-1.5 rounded-md shrink-0",
                            workoutTypeColors[a.workout.type] || "bg-muted",
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {a.athlete.displayName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {a.workout.name}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {tomorrowAssignments.length > 8 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{tomorrowAssignments.length - 8} {t.admin.dashboard.more}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Calendar */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base capitalize">
                {format(centerDate, "MMMM yyyy", { locale: dateLocale })}
              </CardTitle>
              <button
                onClick={() => {
                  const today = startOfDay(new Date());
                  setSelectedDate(today);
                  setCenterDate(today);
                  requestAnimationFrame(() => dateStripRef.current?.scrollToToday(true));
                }}
                className="text-sm text-primary font-medium hover:underline"
              >
                {t.admin.dashboard.today}
              </button>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <InfiniteDateStrip
              ref={dateStripRef}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onCenterDateChange={setCenterDate}
              isReady={!loading}
              hasWorkouts={hasWorkouts}
              hasIncompleteWorkouts={hasIncompleteWorkouts}
            />

            {/* Selected Date Assignments */}
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {isToday(selectedDate) ? t.admin.dashboard.todaysActivity : format(selectedDate, "EEEE, MMM d")}
              </p>

              {selectedDateAssignments.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">{t.admin.dashboard.noActivityToday}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDateAssignments.map((a) => {
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
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Roster weekly heatmap */}
        <Card className="hidden lg:block">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t.admin.dashboard.rosterWeek}</CardTitle>
              <span className="text-xs text-muted-foreground">
                {format(weekRange.start, "d MMM")} – {format(weekRange.end, "d MMM")}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {rosterWeek.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t.admin.dashboard.noActivityToday}
              </p>
            ) : (
              <div className="space-y-1.5">
                <div className="grid grid-cols-[1fr_repeat(7,minmax(0,1fr))_auto] gap-1.5 items-center text-[10px] uppercase text-muted-foreground font-semibold pl-1">
                  <div />
                  {t.admin.calendar.days.map((d, i) => (
                    <div key={i} className="text-center">{d}</div>
                  ))}
                  <div className="w-12 text-right pr-1">%</div>
                </div>
                {rosterWeek.map((row) => (
                  <Link
                    key={row.athlete.id}
                    to={`/admin/athletes/${row.athlete.id}`}
                    className="grid grid-cols-[1fr_repeat(7,minmax(0,1fr))_auto] gap-1.5 items-center p-1 rounded-md hover:bg-muted/50 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CachedAvatar
                        src={row.athlete.photoURL}
                        alt={row.athlete.displayName}
                        fallback={row.athlete.displayName.charAt(0).toUpperCase()}
                        className="h-6 w-6 shrink-0"
                        fallbackClassName="bg-primary/15 text-primary text-[10px] font-semibold"
                      />
                      <span className="text-sm font-medium truncate">
                        {row.athlete.displayName}
                      </span>
                    </div>
                    {row.cells.map((c, i) => {
                      const fully = c.planned > 0 && c.done >= c.planned;
                      const partial = c.planned > 0 && c.done > 0 && c.done < c.planned;
                      const missed = c.planned > 0 && c.done === 0 && c.isPast;
                      const pendingFuture =
                        c.planned > 0 && c.done === 0 && !c.isPast;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "h-6 rounded-md flex items-center justify-center text-[10px] font-bold tabular-nums",
                            fully && "bg-green-500/80 text-white",
                            partial && "bg-amber-500/80 text-white",
                            missed && "bg-rose-500/20 text-rose-700 ring-1 ring-rose-500/50",
                            pendingFuture && "bg-muted/60 text-muted-foreground",
                            c.planned === 0 && "bg-muted/20",
                          )}
                          title={
                            c.planned > 0
                              ? `${c.done}/${c.planned}`
                              : ""
                          }
                        >
                          {c.planned > 0 ? (fully ? "✓" : `${c.done}/${c.planned}`) : ""}
                        </div>
                      );
                    })}
                    <span
                      className={cn(
                        "w-12 text-right pr-1 text-xs font-bold tabular-nums",
                        row.compliance >= 100
                          ? "text-green-600"
                          : row.compliance >= 60
                            ? "text-foreground"
                            : "text-rose-600",
                      )}
                    >
                      {row.compliance}%
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            {/* Athletes needing attention */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-base">
                    {t.admin.dashboard.needsAttention}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {atRiskAthletes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t.admin.dashboard.noAtRisk}
                  </p>
                ) : (
                  atRiskAthletes.map((a) => (
                    <Link
                      key={a.athlete.id}
                      to={`/admin/athletes/${a.athlete.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition"
                    >
                      <CachedAvatar
                        src={a.athlete.photoURL}
                        alt={a.athlete.displayName}
                        fallback={a.athlete.displayName.charAt(0).toUpperCase()}
                        className="h-9 w-9 shrink-0"
                        fallbackClassName="bg-primary/15 text-primary text-sm font-semibold"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {a.athlete.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {a.done}/{a.planned} •{" "}
                          {t.admin.dashboard.compliance.replace(
                            "{{value}}",
                            String(a.compliance),
                          )}
                        </p>
                      </div>
                      {a.overdue > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5">
                          {a.overdue}
                        </Badge>
                      )}
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Top performers this week */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <CardTitle className="text-base">{t.admin.dashboard.topPerformers}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {topPerformers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t.admin.dashboard.noActivityToday}
                  </p>
                ) : (
                  topPerformers.map((p, idx) => (
                    <Link
                      key={p.athlete.id}
                      to={`/admin/athletes/${p.athlete.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition"
                    >
                      <span className="w-5 text-center text-xs font-bold text-muted-foreground tabular-nums">
                        {idx + 1}
                      </span>
                      <CachedAvatar
                        src={p.athlete.photoURL}
                        alt={p.athlete.displayName}
                        fallback={p.athlete.displayName.charAt(0).toUpperCase()}
                        className="h-8 w-8 shrink-0"
                        fallbackClassName="bg-primary/15 text-primary text-xs font-semibold"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {p.athlete.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.done}/{p.planned}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-bold tabular-nums",
                          p.compliance >= 100
                            ? "text-green-600"
                            : p.compliance >= 80
                              ? "text-foreground"
                              : "text-muted-foreground",
                        )}
                      >
                        {p.compliance}%
                      </span>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Upcoming events */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-rose-500" />
                  <CardTitle className="text-base">{t.admin.dashboard.upcomingEvents}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t.admin.dashboard.noUpcomingEvents}
                  </p>
                ) : (
                  upcomingEvents.map((e) => (
                    <Link
                      key={e.id}
                      to={e.athlete ? `/admin/athletes/${e.athlete.id}` : "/admin/users"}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition"
                    >
                      <div className="shrink-0 w-12 text-center">
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                          {format(e.eventDate, "MMM")}
                        </p>
                        <p className="text-lg font-bold leading-none mt-0.5">
                          {format(e.eventDate, "d")}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{e.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {e.athlete?.displayName ?? "—"}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] tabular-nums",
                          e.daysUntil <= 7 && "bg-rose-100 text-rose-700",
                        )}
                      >
                        {e.daysUntil === 0
                          ? t.admin.dashboard.today
                          : `${e.daysUntil}d`}
                      </Badge>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Recent activity */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{t.admin.dashboard.recentActivity}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t.admin.dashboard.noRecentActivity}
                  </p>
                ) : (
                  recentActivity.map((a) => {
                    const Icon = workoutTypeIcons[a.workout.type] || Dumbbell;
                    return (
                      <Link
                        key={a.id}
                        to={`/admin/athletes/${a.athleteId}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition"
                      >
                        <div
                          className={cn(
                            "p-1.5 rounded-lg shrink-0",
                            workoutTypeColors[a.workout.type] || "bg-muted",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {a.workout.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {a.athlete.displayName} •{" "}
                            {formatDistanceToNowStrict(a.completedAt!, {
                              locale: dateLocale,
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                )}
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
          </aside>
        </div>

      </div>

      <CalendarAssignDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        selectedDate={assignDate}
      />
    </AdminLayout>
  );
};

export default AdminDashboard;
