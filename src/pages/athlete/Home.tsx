import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import { InfiniteDateStrip, type InfiniteDateStripHandle } from "@/components/shared/InfiniteDateStrip";
import { ListItemCard } from "@/components/shared/ListItemCard";
import { LeaveTestimonialBanner } from "@/components/athlete/LeaveTestimonialBanner";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ptBR } from "date-fns/locale";
import { useTopBarMenu } from "@/contexts/TopBarMenuContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { deleteAssignment, subscribeToAssignmentsByAthlete } from "@/services/workoutAssignmentsService";
import { subscribeToEventsByAthlete } from "@/services/athleteEventsService";
import { getUserById } from "@/services/usersService";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import type { AthleteEvent } from "@/types/athleteEvent";
import EventCard from "@/components/athlete/EventCard";
import AddEventSheet from "@/components/athlete/AddEventSheet";
import LogExtraWorkoutSheet from "@/components/athlete/LogExtraWorkoutSheet";
import { useEventChatReminders } from "@/hooks/useEventChatReminders";
import { differenceInCalendarDays } from "date-fns";
import { addDays, format, isAfter, isBefore, isSameDay, isToday, startOfDay } from "date-fns";
import { GrSwim, GrBike, GrRun } from "react-icons/gr";
import { CalendarCheck, ChevronRight, Dumbbell, Flame, Play, Plus, Target, Trash2, TrendingUp } from "lucide-react";
import { loadSessionDraft } from "@/lib/sessionDraft";
import { NotificationBanner } from "@/components/NotificationBanner";
import { SectionSpinner } from "@/components/ui/spinner";
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
  const dateLocale = language === "pt" ? ptBR : undefined;
  const { toast } = useToast();
  const { setIsMenuOpen } = useTopBarMenu();
  const [displayName, setDisplayName] = useState<string>("");
  const [assignments, setAssignments] = useState<AssignmentWithWorkout[]>([]);
  const [events, setEvents] = useState<AthleteEvent[]>([]);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [logExtraOpen, setLogExtraOpen] = useState(false);
  const [extraToRemove, setExtraToRemove] = useState<AssignmentWithWorkout | null>(null);
  const [removingExtra, setRemovingExtra] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [centerDate, setCenterDate] = useState(() => startOfDay(new Date()));
  const dateStripRef = useRef<InfiniteDateStripHandle>(null);

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

  const handleRemoveExtra = async () => {
    if (!extraToRemove) return;
    setRemovingExtra(true);
    try {
      await deleteAssignment(extraToRemove.id);
      toast({ title: t.athlete.workouts.extraRemoved });
      setExtraToRemove(null);
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      setRemovingExtra(false);
    }
  };

  // A strength session interrupted on this phone (draft autosaved by the session page)
  const inProgress = (() => {
    for (const assignment of assignments) {
      if (assignment.workout.type !== "strength") continue;
      const draft = loadSessionDraft(assignment.id);
      if (!draft) continue;
      if (assignment.completedAt && draft.updatedAt <= assignment.completedAt.getTime()) continue;
      const sets = Object.values(draft.progress).flatMap((p) => p.sets);
      return {
        assignment,
        done: sets.filter((s) => s.completed).length,
        total: sets.length,
        minutes: Math.max(1, Math.round((draft.updatedAt - draft.startedAt) / 60000)),
      };
    }
    return null;
  })();

  // Extra sessions can only be logged for today or past days
  const canLogExtra = !isAfter(selectedDate, startOfDay(new Date()));

  // Check if a date has workouts
  const hasWorkouts = (date: Date) => assignments.some((a) => isSameDay(a.scheduledDate, date));

  // Check if a date has incomplete workouts
  const hasIncompleteWorkouts = (date: Date) => assignments.some((a) => isSameDay(a.scheduledDate, date) && !a.completedAt);

  const handleTodayClick = () => {
    const today = startOfDay(new Date());
    setSelectedDate(today);
    setCenterDate(today);
    requestAnimationFrame(() => dateStripRef.current?.scrollToToday(true));
  };

  if (loading) {
    return (
      <AthletePortalLayout>
        <SectionSpinner />
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

        <LeaveTestimonialBanner mode="home" />

        {/* In-progress session saved on this phone — one tap back into it */}
        {inProgress && (
          <Link
            to={`/athlete/workout/${inProgress.assignment.id}/session`}
            className="flex items-center gap-3 rounded-2xl border-2 border-primary bg-primary/10 p-4 transition-transform active:scale-[0.98]"
          >
            <div className="h-11 w-11 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t.athlete.home.inProgress}</p>
              <p className="font-semibold truncate">{inProgress.assignment.workout.name}</p>
              <p className="text-xs text-muted-foreground">
                {t.athlete.home.inProgressDetail
                  .replace("{{done}}", String(inProgress.done))
                  .replace("{{total}}", String(inProgress.total))
                  .replace("{{minutes}}", String(inProgress.minutes))}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-primary shrink-0" />
          </Link>
        )}

        {/* Ask for notification permission here too, not only inside the chat */}
        <div className="rounded-xl overflow-hidden empty:hidden">
          <NotificationBanner />
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
                  <div className="min-w-0">
                    {/* "0/0" reads like a failure on a rest day */}
                    <p className={cn("font-bold", todaysWorkouts.length > 0 ? "text-2xl" : "text-base leading-tight min-h-8 flex items-center hyphens-auto [overflow-wrap:anywhere]")}>
                      {todaysWorkouts.length > 0 ? `${todaysCompleted}/${todaysWorkouts.length}` : t.athlete.home.restDay}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.athlete.home.statToday}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Progress Card */}
        <Link to="/athlete/profile?tab=progress" className="block">
          <Card className="hover:border-primary/40 hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t.athlete.home.yourProgress}</CardTitle>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span>{t.athlete.home.progressCount.replace("{{done}}", String(completedWorkouts)).replace("{{total}}", String(totalWorkouts))}</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={completionRate} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">
                {t.athlete.home.workoutsRemaining.replace("{{count}}", String(totalWorkouts - completedWorkouts))}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Week Calendar */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base capitalize">{format(centerDate, "MMMM yyyy", { locale: dateLocale })}</CardTitle>
              <button onClick={handleTodayClick} className="-my-2 -mr-2 px-2 py-3 text-sm text-primary font-medium hover:underline">
                {t.athlete.home.today}
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

            {/* Selected Date Workouts */}
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {isToday(selectedDate) ? t.athlete.home.todaysWorkouts : format(selectedDate, language === "pt" ? "EEEE, d MMM" : "EEEE, MMM d", { locale: dateLocale })}
              </p>

              {selectedDateAssignments.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">{t.athlete.home.noWorkoutsScheduled}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDateAssignments.map((assignment) => {
                    const workout = assignment.workout;
                    const Icon = workoutTypeIcons[workout.type] || GrRun;
                    const isCompleted = !!assignment.completedAt;

                    return (
                      <ListItemCard
                        key={assignment.id}
                        to={`/athlete/workout/${assignment.id}`}
                        compact
                        icon={<Icon className="h-5 w-5" />}
                        iconClassName={workoutTypeColors[workout.type] || "bg-muted text-foreground"}
                        title={
                          assignment.selfLogged ? (
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className="truncate">{workout.name}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{t.athlete.home.extra}</Badge>
                            </span>
                          ) : workout.name
                        }
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
                        actions={
                          assignment.selfLogged ? (
                            <button
                              onClick={() => setExtraToRemove(assignment)}
                              className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted shrink-0 ml-1"
                              aria-label={t.athlete.workouts.removeExtra}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : undefined
                        }
                        className={isCompleted ? "bg-green-50 border-green-200 dark:bg-green-950/20" : undefined}
                      />
                    );
                  })}
                </div>
              )}

              {canLogExtra && (
                <button
                  onClick={() => setLogExtraOpen(true)}
                  className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-dashed text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  {t.athlete.home.logExtra}
                </button>
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
                <Link to="/athlete/calendar" className="-my-2 -mr-2 px-2 py-3 text-sm text-primary font-medium hover:underline flex items-center gap-1">
                  {t.athlete.home.seeAll}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingWorkouts.map((assignment) => {
                const workout = assignment.workout;
                const Icon = workoutTypeIcons[workout.type] || GrRun;

                return (
                  <ListItemCard
                    key={assignment.id}
                    to={`/athlete/workout/${assignment.id}`}
                    compact
                    icon={<Icon className="h-5 w-5" />}
                    iconClassName={workoutTypeColors[workout.type] || "bg-muted text-foreground"}
                    title={workout.name}
                    subtitle={format(assignment.scheduledDate, language === "pt" ? "EEE, d MMM" : "EEE, MMM d", { locale: dateLocale })}
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
              className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted transition"
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
      <ResponsiveConfirm
        open={!!extraToRemove}
        onOpenChange={(open) => { if (!open) setExtraToRemove(null); }}
        title={t.athlete.workouts.removeExtra}
        description={t.athlete.workouts.removeExtraDescription.replace("{{name}}", extraToRemove?.workout.name ?? "")}
        confirmLabel={t.common.remove}
        cancelLabel={t.common.cancel}
        destructive
        loading={removingExtra}
        onConfirm={handleRemoveExtra}
      />
      {user && (
        <LogExtraWorkoutSheet
          open={logExtraOpen}
          onOpenChange={setLogExtraOpen}
          athleteId={user.uid}
          date={selectedDate}
          assignments={assignments}
        />
      )}
    </AthletePortalLayout>
  );
};

export default AthleteHome;
