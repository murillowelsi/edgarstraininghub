import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import { ListItemCard } from "@/components/shared/ListItemCard";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTopBarMenu } from "@/contexts/TopBarMenuContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { subscribeToAssignmentsByAthlete } from "@/services/workoutAssignmentsService";
import { subscribeToEventsByAthlete } from "@/services/athleteEventsService";
import { getUserById } from "@/services/usersService";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import type { AthleteEvent } from "@/types/athleteEvent";
import EventCard from "@/components/athlete/EventCard";
import AddEventSheet from "@/components/athlete/AddEventSheet";
import { useEventChatReminders } from "@/hooks/useEventChatReminders";
import { differenceInCalendarDays } from "date-fns";
import { addDays, format, isAfter, isBefore, isSameDay, isToday, startOfDay, startOfWeek } from "date-fns";
import { GrSwim, GrBike, GrRun } from "react-icons/gr";
import { CalendarCheck, ChevronRight, Dumbbell, Flame, Loader2, PersonStanding, Plus, Target, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const workoutTypeIcons: Record<string, React.ElementType> = {
  running: GrRun,
  cycling: GrBike,
  swimming: GrSwim,
  strength: Dumbbell,
};

const workoutTypeColors: Record<string, string> = {
  running: "bg-blue-500/10 text-blue-600 border-blue-200",
  cycling: "bg-green-500/10 text-green-600 border-green-200",
  swimming: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
  strength: "bg-amber-500/10 text-amber-600 border-amber-200",
};

const AthleteHome = () => {
  const { user, photoURL } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { setIsMenuOpen } = useTopBarMenu();
  const [displayName, setDisplayName] = useState<string>("");
  const [assignments, setAssignments] = useState<AssignmentWithWorkout[]>([]);
  const [events, setEvents] = useState<AthleteEvent[]>([]);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const weekScrollRef = useRef<HTMLDivElement>(null);

  // Generate 2 weeks of days
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    if (!user) return;

    getUserById(user.uid).then((userData) => {
      if (userData) {
        setDisplayName(userData.displayName || user.email?.split("@")[0] || "Athlete");
      }
    });

    const unsubscribe = subscribeToAssignmentsByAthlete(user.uid, (data) => {
      setAssignments(data);
      setLoading(false);
    });
    const unsubEvents = subscribeToEventsByAthlete(user.uid, setEvents);

    return () => {
      unsubscribe();
      unsubEvents();
    };
  }, [user]);

  const upcomingEvents = events.filter((e) => differenceInCalendarDays(e.eventDate, new Date()) >= 0);
  const nextEvent = upcomingEvents[0];

  useEventChatReminders(user?.uid, upcomingEvents);

  // Calculate stats
  const totalWorkouts = assignments.length;
  const completedWorkouts = assignments.filter((a) => a.completedAt).length;
  const completionRate = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

  // Get upcoming workouts (next 7 days, not completed)
  const upcomingWorkouts = assignments
    .filter((a) => !a.completedAt && isAfter(a.scheduledDate, startOfDay(new Date())) && isBefore(a.scheduledDate, addDays(new Date(), 7)))
    .slice(0, 3);

  // Get today's workouts
  const todaysWorkouts = assignments.filter((a) => isSameDay(a.scheduledDate, new Date()));
  const todaysCompleted = todaysWorkouts.filter((a) => a.completedAt).length;

  // Get workouts for selected date
  const selectedDateAssignments = assignments.filter((a) => isSameDay(a.scheduledDate, selectedDate));

  // Check if a date has workouts
  const hasWorkouts = (date: Date) => assignments.some((a) => isSameDay(a.scheduledDate, date));

  // Check if a date has incomplete workouts
  const hasIncompleteWorkouts = (date: Date) => assignments.some((a) => isSameDay(a.scheduledDate, date) && !a.completedAt);

  const handleTodayClick = () => {
    setSelectedDate(new Date());
  };

  if (loading) {
    return (
      <AthletePortalLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AthletePortalLayout>
    );
  }

  return (
    <AthletePortalLayout title={t.athlete.nav.home}>
      <div className="p-4 space-y-4">
        {/* Welcome Section */}
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
          <div>
            <p className="flex items-center gap-1 text-sm text-muted-foreground font-medium">
              {t.athlete.role}
              <Flame className="h-3 w-3 fill-orange-400 text-orange-500" />
            </p>
            <h1 className="text-2xl font-bold font-display">{displayName}</h1>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/athlete/profile">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-md transition-all hover:border-primary/40 cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/20">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{completionRate}%</p>
                    <p className="text-xs text-muted-foreground">{t.athlete.home.statCompletion}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/athlete/profile">
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-200/50 hover:shadow-md transition-all hover:border-orange-400/50 cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-orange-500/20">
                    <Flame className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{completedWorkouts}</p>
                    <p className="text-xs text-muted-foreground">{t.athlete.home.statCompleted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/athlete/profile">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-200/50 hover:shadow-md transition-all hover:border-blue-400/50 cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/20">
                    <CalendarCheck className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalWorkouts}</p>
                    <p className="text-xs text-muted-foreground">{t.athlete.home.statTotal}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/athlete/calendar">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-200/50 hover:shadow-md transition-all hover:border-green-400/50 cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-green-500/20">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {todaysCompleted}/{todaysWorkouts.length}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.athlete.home.statToday}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Progress Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t.athlete.home.yourProgress}</CardTitle>
              <span className="text-sm text-muted-foreground">
                {completedWorkouts} of {totalWorkouts}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={completionRate} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {t.athlete.home.workoutsRemaining.replace("{{count}}", String(totalWorkouts - completedWorkouts))}
            </p>
          </CardContent>
        </Card>

        {/* Week Calendar */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{format(selectedDate, "MMMM yyyy")}</CardTitle>
              <button onClick={handleTodayClick} className="text-sm text-primary font-medium hover:underline">
                {t.athlete.home.today}
              </button>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            {/* Horizontal Week Calendar */}
            <div ref={weekScrollRef} className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
              {weekDays.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                const hasWorkout = hasWorkouts(day);
                const hasIncomplete = hasIncompleteWorkouts(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "flex flex-col items-center justify-center min-w-[48px] h-[64px] rounded-xl transition-all border",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                        : isTodayDate
                          ? "bg-accent border-primary/30"
                          : "bg-card border-border hover:border-primary/50",
                    )}
                  >
                    <span className="text-xs font-medium opacity-70">{format(day, "EEE")}</span>
                    <span className="text-lg font-bold">{format(day, "d")}</span>
                    {hasWorkout && (
                      <span className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-primary-foreground" : hasIncomplete ? "bg-primary" : "bg-green-500")} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Date Workouts */}
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {isToday(selectedDate) ? t.athlete.home.todaysWorkouts : format(selectedDate, "EEEE, MMM d")}
              </p>

              {selectedDateAssignments.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">{t.athlete.home.noWorkoutsScheduled}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDateAssignments.map((assignment) => {
                    const workout = assignment.workout;
                    const Icon = workoutTypeIcons[workout.type] || PersonStanding;
                    const isCompleted = !!assignment.completedAt;

                    return (
                      <ListItemCard
                        key={assignment.id}
                        to={`/athlete/workout/${assignment.id}`}
                        compact
                        icon={<Icon className="h-5 w-5" />}
                        iconClassName={workoutTypeColors[workout.type] || "bg-muted text-foreground"}
                        title={workout.name}
                        titleClassName={isCompleted ? "line-through text-muted-foreground" : undefined}
                        subtitle={
                          workout.type === "strength"
                            ? `${workout.exercises?.length || 0} ${t.athlete.home.exercises}`
                            : `${workout.stages?.length || 0} ${t.athlete.home.stages}`
                        }
                        right={
                          isCompleted ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              {assignment.completionPercentage !== undefined ? `${assignment.completionPercentage}%` : t.athlete.home.done}
                            </Badge>
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )
                        }
                        className={isCompleted ? "bg-green-50 border-green-200 dark:bg-green-950/20" : undefined}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Workouts */}
        {upcomingWorkouts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t.athlete.home.upcoming}</CardTitle>
                <Link to="/athlete/calendar" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                  {t.athlete.home.seeAll}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingWorkouts.map((assignment) => {
                const workout = assignment.workout;
                const Icon = workoutTypeIcons[workout.type] || PersonStanding;

                return (
                  <ListItemCard
                    key={assignment.id}
                    to={`/athlete/workout/${assignment.id}`}
                    compact
                    icon={<Icon className="h-5 w-5" />}
                    iconClassName={workoutTypeColors[workout.type] || "bg-muted text-foreground"}
                    title={workout.name}
                    subtitle={format(assignment.scheduledDate, "EEE, MMM d")}
                    right={<ChevronRight className="h-5 w-5 text-muted-foreground" />}
                  />
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Events Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">
              {t.athlete.events.title}
            </h2>
            <button
              onClick={() => setEventSheetOpen(true)}
              className="rounded-full p-1.5 hover:bg-muted transition"
              aria-label={t.athlete.events.addAriaLabel}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {nextEvent ? (
            <Link to="/athlete/profile?tab=events" className="block">
              <EventCard event={nextEvent} compact />
            </Link>
          ) : (
            <button
              onClick={() => setEventSheetOpen(true)}
              className="w-full text-left rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/40 transition"
            >
              {t.athlete.events.empty}
            </button>
          )}
          {upcomingEvents.length > 1 && (
            <Link to="/athlete/profile?tab=events" className="block text-xs text-primary font-semibold pt-1">
              {t.athlete.events.seeMore.replace("{{count}}", String(upcomingEvents.length - 1))}
            </Link>
          )}
        </div>
      </div>
      {user && (
        <AddEventSheet
          open={eventSheetOpen}
          onOpenChange={setEventSheetOpen}
          athleteId={user.uid}
        />
      )}
    </AthletePortalLayout>
  );
};

export default AthleteHome;
