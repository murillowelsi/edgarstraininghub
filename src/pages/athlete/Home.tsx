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
import { endOfDay, endOfWeek, format, isAfter, isSameDay, isToday, isWithinInterval, startOfDay, startOfWeek } from "date-fns";
import { GrSwim, GrBike, GrRun } from "react-icons/gr";
import { CalendarCheck, CheckCircle2, ChevronRight, Dumbbell, Flame, Moon, Play, Plus, Trash2 } from "lucide-react";
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

interface StatCardProps {
  to: string;
  icon: React.ElementType;
  /** Tailwind classes: card gradient/border, icon chip, icon colour */
  tone: { card: string; chip: string; icon: string };
  label: string;
  value: string;
  sub?: string;
  className?: string;
}

// Label row on top so the value gets the card's full width (long values wrap
// instead of leaking out at 320px)
const StatCard = ({ to, icon: Icon, tone, label, value, sub, className }: StatCardProps) => (
  <Link to={to} className={cn("block min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/50", className)}>
    <Card className={cn("h-full bg-gradient-to-br hover:shadow-md transition-all cursor-pointer", tone.card)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("p-1.5 rounded-lg shrink-0", tone.chip)}>
            <Icon className={cn("h-4 w-4", tone.icon)} />
          </div>
          <p className="text-xs font-medium leading-tight text-muted-foreground line-clamp-2 [overflow-wrap:anywhere]">{label}</p>
        </div>
        <p className="mt-2 text-lg font-bold leading-tight line-clamp-2 hyphens-auto [overflow-wrap:anywhere]">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 [overflow-wrap:anywhere] first-letter:uppercase">{sub}</p>}
      </CardContent>
    </Card>
  </Link>
);

const tones = {
  primary: { card: "from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40", chip: "bg-primary/20", icon: "text-primary" },
  rest: { card: "from-indigo-500/10 to-indigo-500/5 border-indigo-200/50 hover:border-indigo-400/50", chip: "bg-indigo-500/20", icon: "text-indigo-500" },
  done: { card: "from-green-500/10 to-green-500/5 border-green-200/50 hover:border-green-400/50", chip: "bg-green-500/20", icon: "text-green-500" },
  week: { card: "from-orange-500/10 to-orange-500/5 border-orange-200/50 hover:border-orange-400/50", chip: "bg-orange-500/20", icon: "text-orange-500" },
  next: { card: "from-blue-500/10 to-blue-500/5 border-blue-200/50 hover:border-blue-400/50", chip: "bg-blue-500/20", icon: "text-blue-500" },
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

  // Get today's workouts
  const todaysWorkouts = assignments.filter((a) => isSameDay(a.scheduledDate, new Date()));
  const todaysPending = todaysWorkouts.filter((a) => !a.completedAt);

  // This calendar week (Mon–Sun), coach-planned sessions only — extras would inflate "planned"
  const weekPlanned = assignments.filter(
    (a) => !a.selfLogged && isWithinInterval(a.scheduledDate, { start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) })
  );
  const weekDone = weekPlanned.filter((a) => a.completedAt).length;

  // First open workout after today (today's are on the Today card)
  const nextWorkout = assignments
    .filter((a) => !a.completedAt && isAfter(a.scheduledDate, endOfDay(new Date())))
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())[0];

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

  // Extra sessions can only be logged for today or past days. Today has the
  // top-bar button, so the in-card one is for logging a past day.
  const canLogExtra = !isAfter(selectedDate, startOfDay(new Date())) && !isToday(selectedDate);

  const th = t.athlete.home;
  const workoutCountLabel = (count: number) =>
    count === 1 ? t.common.workoutCountOne : t.common.workoutCountOther.replace("{{count}}", String(count));

  const todayCard: Omit<StatCardProps, "label"> = inProgress
    ? { to: `/athlete/workout/${inProgress.assignment.id}/session`, icon: Play, tone: tones.primary, value: th.todayInProgress, sub: inProgress.assignment.workout.name }
    : todaysWorkouts.length === 0
      ? { to: "/athlete/calendar", icon: Moon, tone: tones.rest, value: th.restDay, sub: th.restHint }
      : todaysPending.length === 0
        ? {
            to: `/athlete/workout/${todaysWorkouts[0].id}`,
            icon: CheckCircle2,
            tone: tones.done,
            value: th.todayDone,
            sub: todaysWorkouts.length === 1 ? todaysWorkouts[0].workout.name : workoutCountLabel(todaysWorkouts.length),
          }
        : {
            to: `/athlete/workout/${todaysPending[0].id}`,
            icon: Dumbbell,
            tone: tones.primary,
            value: th.todayToDo.replace("{{count}}", String(todaysPending.length)),
            sub: todaysPending[0].workout.name,
          };

  // Check if a date has workouts
  const hasWorkouts = (date: Date) => assignments.some((a) => isSameDay(a.scheduledDate, date));

  const workoutCount = (date: Date) => assignments.filter((a) => isSameDay(a.scheduledDate, date)).length;

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
          <button
            onClick={() => setIsMenuOpen(true)}
            aria-label={th.openMenu}
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
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

        {/* Stats Cards — what to do now; overall progress lives in the card below */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label={th.statToday} {...todayCard} />
          <StatCard
            to="/athlete/calendar"
            icon={CalendarCheck}
            tone={tones.week}
            label={th.statWeek}
            value={weekPlanned.length > 0 ? `${weekDone}/${weekPlanned.length}` : "0"}
            sub={weekPlanned.length > 0 ? th.weekDone : th.weekNothing}
          />
          <StatCard
            className="col-span-2"
            to={nextWorkout ? `/athlete/workout/${nextWorkout.id}` : "/athlete/calendar"}
            icon={nextWorkout ? workoutTypeIcons[nextWorkout.workout.type] || GrRun : CalendarCheck}
            tone={tones.next}
            label={th.statNext}
            value={nextWorkout ? nextWorkout.workout.name : th.nextNone}
            sub={nextWorkout ? format(nextWorkout.scheduledDate, language === "pt" ? "EEEE, d MMM" : "EEEE, MMM d", { locale: dateLocale }) : undefined}
          />
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
              workoutCount={workoutCount}
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

        {/* Events — same card pattern as the sections above; "+" is the one add action */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t.athlete.events.title}</CardTitle>
              <button
                onClick={() => setEventSheetOpen(true)}
                className="-my-2 -mr-2 flex h-10 w-10 items-center justify-center rounded-full text-primary hover:bg-muted transition"
                aria-label={t.athlete.events.addAriaLabel}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {nextEvent ? (
              <Link to="/athlete/profile?tab=events" className="block">
                <EventCard event={nextEvent} compact />
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">{t.athlete.events.empty}</p>
            )}
            {upcomingEvents.length > 1 && (
              <Link to="/athlete/profile?tab=events" className="block text-xs text-primary font-semibold pt-1">
                {t.athlete.events.seeMore.replace("{{count}}", String(upcomingEvents.length - 1))}
              </Link>
            )}
          </CardContent>
        </Card>
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
