import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import { LeaveTestimonialBanner } from "@/components/athlete/LeaveTestimonialBanner";
import { PushInvite } from "@/components/push/PushInvite";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTopBarMenu } from "@/contexts/TopBarMenuContext";
import { subscribeToAssignmentsByAthlete } from "@/services/workoutAssignmentsService";
import { subscribeToEventsByAthlete } from "@/services/athleteEventsService";
import { getUserById } from "@/services/usersService";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import type { AthleteEvent } from "@/types/athleteEvent";
import EventCard from "@/components/athlete/EventCard";
import AddEventSheet from "@/components/athlete/AddEventSheet";
import LogExtraWorkoutSheet from "@/components/athlete/LogExtraWorkoutSheet";
import { TodayCard } from "@/components/athlete/TodayCard";
import { WeekStrip } from "@/components/athlete/WeekStrip";
import { SportIcon } from "@/components/icons/sport-icons";
import { sportKey } from "@/components/timeline/sport";
import { useEventChatReminders } from "@/hooks/useEventChatReminders";
import { differenceInCalendarDays, endOfDay, isAfter, isTomorrow, startOfDay } from "date-fns";
import { ChevronRight, Flame, Plus } from "lucide-react";
import { clearSessionDraft, loadSessionDraft } from "@/lib/sessionDraft";
import { useMemo, useState } from "react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { formatDate } from "@/lib/dates";
import { TodaySkeleton } from "@/components/feedback/skeletons";
import { todayState, weekSummary } from "@/utils/homePlan";

const AthleteHome = () => {
  const { user, photoURL } = useAuth();
  const { t, language } = useLanguage();
  const { setIsMenuOpen } = useTopBarMenu();
  const [displayName, setDisplayName] = useState<string>("");
  const [assignments, setAssignments] = useState<AssignmentWithWorkout[]>([]);
  const [events, setEvents] = useState<AthleteEvent[]>([]);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [logExtraOpen, setLogExtraOpen] = useState(false);
  const [toDiscard, setToDiscard] = useState<AssignmentWithWorkout | null>(null);
  // Bumped after discarding a draft, so the Today card re-reads localStorage
  const [draftVersion, setDraftVersion] = useState(0);
  const [loading, setLoading] = useState(true);

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const today = useMemo(() => todayState(assignments, loadSessionDraft), [assignments, draftVersion]);
  const week = useMemo(() => weekSummary(assignments), [assignments]);

  // First open workout after today (today's are on the Today card)
  const nextAfterToday = assignments
    .filter((a) => !a.completedAt && isAfter(a.scheduledDate, endOfDay(new Date())) && (today.kind !== "inProgress" || a.id !== today.assignment.id))
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())[0];

  const th = t.athlete.home;

  const discardDraft = () => {
    if (!toDiscard) return;
    clearSessionDraft(toDiscard.id);
    setToDiscard(null);
    setDraftVersion((v) => v + 1);
  };

  if (loading) {
    return (
      <AthletePortalLayout>
        <TodaySkeleton className="p-4" />
      </AthletePortalLayout>
    );
  }

  return (
    <AthletePortalLayout title={t.athlete.nav.home}>
      <div className="mx-auto max-w-2xl p-4 space-y-4">
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

        {/* Today's workout is the hero */}
        <TodayCard state={today} assignments={assignments} onDiscard={setToDiscard} onLogExtra={() => setLogExtraOpen(true)} />

        {/* One-line reminder, below the workout so it never pushes it down */}
        <PushInvite
          compact
          place="home-athlete"
          title={t.push.invite.homeTitle}
          description={t.push.invite.homeDescription}
        />

        <WeekStrip week={week} />

        {nextAfterToday && (
          <section aria-labelledby="home-next-title">
            <h2 id="home-next-title" className="mb-2 px-1 text-base font-bold">{th.nextTitle}</h2>
            <Link
              to={`/athlete/workout/${nextAfterToday.id}`}
              className="flex items-center gap-3 rounded-[18px] border bg-card p-3 transition-colors hover:bg-accent/40"
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                style={{
                  backgroundColor: `hsl(var(--sport-${sportKey(nextAfterToday.workout.type)}) / 0.14)`,
                  color: `hsl(var(--sport-${sportKey(nextAfterToday.workout.type)}))`,
                }}
              >
                <SportIcon type={nextAfterToday.workout.type} className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{nextAfterToday.workout.name}</span>
                <span className="block text-[13px] text-muted-foreground first-letter:uppercase">
                  {isTomorrow(nextAfterToday.scheduledDate) ? th.todayCard.tomorrow : formatDate(nextAfterToday.scheduledDate, "weekdayShort", language)}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </section>
        )}

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

        {/* Testimonial: one dismissible line at the very end */}
        <LeaveTestimonialBanner mode="nudge" />
      </div>
      {user && (
        <AddEventSheet
          open={eventSheetOpen}
          onOpenChange={setEventSheetOpen}
          athleteId={user.uid}
        />
      )}
      <ResponsiveConfirm
        open={!!toDiscard}
        onOpenChange={(open) => { if (!open) setToDiscard(null); }}
        title={th.todayCard.discardTitle}
        description={th.todayCard.discardDescription}
        confirmLabel={th.todayCard.discard}
        cancelLabel={t.common.cancel}
        destructive
        onConfirm={discardDraft}
      />
      {user && (
        <LogExtraWorkoutSheet
          open={logExtraOpen}
          onOpenChange={setLogExtraOpen}
          athleteId={user.uid}
          date={startOfDay(new Date())}
          assignments={assignments}
        />
      )}
    </AthletePortalLayout>
  );
};

export default AthleteHome;
