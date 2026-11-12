import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import ActivityCard from "@/components/athlete/ActivityCard";
import EventCard from "@/components/athlete/EventCard";
import AddEventSheet from "@/components/athlete/AddEventSheet";
import { ProgressSummaryChart } from "@/components/athlete/ProgressSummaryChart";
import { StrengthProgressChart } from "@/components/athlete/StrengthProgressChart";
import { TrainingLogCalendar } from "@/components/athlete/TrainingLogCalendar";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, Flame, Plus, Settings, Shield } from "lucide-react";
import { LeaveTestimonialBanner } from "@/components/athlete/LeaveTestimonialBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { GrBike, GrRun, GrSwim } from "react-icons/gr";
import { type WorkoutType } from "@/types/workout";
import { modalityAccent } from "@/utils/modalityColors";
import { estimateWorkoutDurationSec, actualDurationSec, formatHours } from "@/utils/workoutDuration";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTopBarMenu } from "@/contexts/TopBarMenuContext";
import { subscribeToAssignmentsByAthlete } from "@/services/workoutAssignmentsService";
import { subscribeToEventsByAthlete } from "@/services/athleteEventsService";
import { getUserById } from "@/services/usersService";
import { getTeamsByMember } from "@/services/teamsService";
import { formatTotalTime, groupByMonth, useAthleteStats, type AthleteStats } from "@/hooks/useAthleteStats";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import type { AthleteEvent } from "@/types/athleteEvent";
import { differenceInCalendarDays, isSameYear, isThisWeek } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const AthleteProfile = () => {
  const { user, photoURL } = useAuth();
  const { t, language } = useLanguage();
  const { setIsMenuOpen } = useTopBarMenu();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const validTabs = ["activities", "progress", "events"];
  const activeTab = tabParam && validTabs.includes(tabParam) ? tabParam : "activities";

  const [displayName, setDisplayName] = useState("");
  const [assignments, setAssignments] = useState<AssignmentWithWorkout[]>([]);
  const [events, setEvents] = useState<AthleteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AthleteEvent | null>(null);
  const [teamNames, setTeamNames] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    getUserById(user.uid).then((u) => {
      if (u) setDisplayName(u.displayName || user.email?.split("@")[0] || "Athlete");
    });
    const unsubA = subscribeToAssignmentsByAthlete(user.uid, (data) => {
      setAssignments(data);
      setLoading(false);
    });
    const unsubE = subscribeToEventsByAthlete(user.uid, setEvents);
    getTeamsByMember(user.uid)
      .then((teams) => setTeamNames(teams.map((team) => team.name).sort((a, b) => a.localeCompare(b))))
      .catch(() => setTeamNames([]));
    return () => {
      unsubA();
      unsubE();
    };
  }, [user]);

  const completed = useMemo(
    () =>
      assignments
        .filter((a) => a.completedAt)
        .sort((a, b) => (b.completedAt!.getTime() - a.completedAt!.getTime())),
    [assignments]
  );

  const stats = useAthleteStats(assignments);
  const monthGroups = useMemo(() => groupByMonth(completed), [completed]);

  const upcomingEvents = useMemo(
    () => events.filter((e) => differenceInCalendarDays(e.eventDate, new Date()) >= 0),
    [events]
  );
  const pastEvents = useMemo(
    () => events.filter((e) => differenceInCalendarDays(e.eventDate, new Date()) < 0),
    [events]
  );

  const weekStats = useMemo(() => {
    const week = assignments.filter((a) => isThisWeek(a.scheduledDate, { weekStartsOn: 1 }));
    return {
      planned: week.length,
      done: week.filter((a) => a.completedAt).length,
    };
  }, [assignments]);

  const compliance = weekStats.planned > 0 ? Math.round((weekStats.done / weekStats.planned) * 100) : 0;

  const modalityStats = useMemo(() => {
    const types: WorkoutType[] = ["running", "cycling", "swimming", "strength"];
    const weekly = assignments.filter((a) => isThisWeek(a.scheduledDate, { weekStartsOn: 1 }));
    return types.map((type) => {
      const items = weekly.filter((a) => a.workout.type === type);
      const planned = items.reduce((acc, a) => acc + estimateWorkoutDurationSec(a.workout), 0);
      const completedSec = items
        .filter((a) => a.completedAt)
        .reduce((acc, a) => acc + (actualDurationSec(a) || estimateWorkoutDurationSec(a.workout)), 0);
      return { type, planned, completed: completedSec };
    });
  }, [assignments]);

  const tp = t.athlete.profile;
  const te = t.athlete.events;

  if (loading) {
    // Skeleton in the page's own shape keeps the top bar and tab bar on screen
    return (
      <AthletePortalLayout title={tp.title}>
        <div className="mx-auto max-w-2xl p-4 space-y-4" aria-busy="true" aria-label={t.common.loading}>
          {/* Athlete card */}
          <div className="rounded-3xl border bg-card p-4">
            <div className="flex items-center gap-3.5">
              <Skeleton className="h-[72px] w-[72px] rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-40" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </div>
            </div>
            <div className="mt-3.5 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[58px] rounded-[14px]" />)}
            </div>
            <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
          </div>
          {/* Tabs */}
          <div className="grid grid-cols-3 border-b pb-3 pt-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="mx-auto h-4 w-20" />)}
          </div>
          {/* Compact activity cards */}
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-[18px]" />)}
        </div>
      </AthletePortalLayout>
    );
  }

  return (
    <AthletePortalLayout title={tp.title}>
      <div className="mx-auto max-w-2xl p-4 space-y-4">
        <AthleteCard
          name={displayName}
          photoURL={photoURL}
          teamNames={teamNames}
          stats={stats}
          onSettings={() => setIsMenuOpen(true)}
        />

        <LeaveTestimonialBanner mode="nudge" />

        <Tabs
          value={activeTab}
          onValueChange={(v) => setSearchParams(v === "activities" ? {} : { tab: v }, { replace: true })}
          className="w-full"
        >
          {/* Text tabs with a yellow underline on the active one (feed pattern) */}
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-none border-b bg-transparent p-0">
            {(["activities", "progress", "events"] as const).map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className={cn(
                  "relative h-12 rounded-none bg-transparent text-sm font-semibold text-muted-foreground shadow-none",
                  "data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none",
                  "after:absolute after:inset-x-[28%] after:-bottom-px after:h-[3px] after:rounded-full after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100"
                )}
              >
                {tp.tabs[tab]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="progress" className="space-y-4 mt-5">
            <div className="grid grid-cols-3 gap-3">
              <StatCard label={tp.stats.planned} value={String(weekStats.planned)} sub={tp.stats.thisWeek} />
              <StatCard label={tp.stats.done} value={String(weekStats.done)} sub={tp.stats.thisWeek} />
              <StatCard label={tp.stats.compliance} value={`${compliance}%`} sub={tp.stats.thisWeek} />
            </div>

            <Card className="border-border/50">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold">{tp.hoursByModality}</h3>
                  <span className="text-xs text-muted-foreground ml-auto">{tp.stats.thisWeek}</span>
                </div>
                {modalityStats.filter((m) => m.planned > 0 || m.completed > 0).length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">{tp.noModalityActivity}</p>
                ) : (
                  <div className="space-y-3">
                    {modalityStats
                      .filter((m) => m.planned > 0 || m.completed > 0)
                      .map((m) => (
                        <ModalityBar
                          key={m.type}
                          type={m.type}
                          planned={m.planned}
                          completed={m.completed}
                          label={tp.modalities[m.type]}
                        />
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <ProgressSummaryChart assignments={assignments} />
            <StrengthProgressChart assignments={assignments} />

            <TrainingLogCalendar assignments={assignments} />

            <Card className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-display font-bold">{tp.lifetimeSummary}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <SummaryStat label={tp.workoutsCompleted} value={String(completed.length)} />
                  <SummaryStat label={tp.upcomingEventsCount} value={String(upcomingEvents.length)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4 mt-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg">{te.upcoming}</h2>
              <button
                onClick={() => {
                  setEditingEvent(null);
                  setEventSheetOpen(true);
                }}
                className="h-10 w-10 -mr-2 flex items-center justify-center rounded-full hover:bg-muted transition"
                aria-label={te.addAriaLabel}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {upcomingEvents.length === 0 ? (
              <EmptyState text={te.noEvents} />
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((e) => (
                  <EventCard
                    key={e.id}
                    event={e}
                    onClick={() => navigate(`/athlete/events/${e.id}`)}
                  />
                ))}
              </div>
            )}

            {pastEvents.length > 0 && (
              <div className="pt-4 space-y-3">
                <h3 className="font-display font-bold text-base text-muted-foreground">{te.past}</h3>
                {pastEvents.map((e) => (
                  <EventCard
                    key={e.id}
                    event={e}
                    hidePastLabel
                    onClick={() => navigate(`/athlete/events/${e.id}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activities" className="mt-4 space-y-5">
            {completed.length === 0 ? (
              <EmptyState text={tp.noActivities} />
            ) : (
              monthGroups.map((g) => (
                <section key={g.key} aria-label={formatDate(g.month, "monthYear", language)} className="space-y-2">
                  <div className="flex justify-between gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    <span>{formatDate(g.month, isSameYear(g.month, new Date()) ? "monthLong" : "monthYear", language)}</span>
                    <span className="tabular-nums">
                      {(g.count === 1 ? tp.card.monthOne : tp.card.monthOther)
                        .replace("{{n}}", String(g.count))
                        .replace("{{time}}", formatTotalTime(g.seconds))}
                    </span>
                  </div>
                  {g.items.map((a) => (
                    <ActivityCard
                      key={a.id}
                      variant="compact"
                      assignment={a}
                      allAssignments={assignments}
                      athleteName={displayName}
                      athletePhotoURL={photoURL}
                    />
                  ))}
                </section>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {user && (
        <AddEventSheet
          open={eventSheetOpen}
          onOpenChange={setEventSheetOpen}
          athleteId={user.uid}
          event={editingEvent}
        />
      )}

    </AthletePortalLayout>
  );
};

const AthleteCard = ({
  name,
  photoURL,
  teamNames,
  stats,
  onSettings,
}: {
  name: string;
  photoURL?: string | null;
  teamNames: string[];
  stats: AthleteStats;
  onSettings: () => void;
}) => {
  const { t, language } = useLanguage();
  const tc = t.athlete.profile.card;
  const month = formatDate(new Date(), "month", language).replace(".", "");
  const extraTeams = teamNames.length - 1;

  return (
    <section
      className="relative overflow-hidden rounded-3xl border bg-card p-4"
      style={{ backgroundImage: "radial-gradient(120% 90% at 100% 0%, hsl(var(--primary) / 0.16), transparent 55%)" }}
    >
      <button
        onClick={onSettings}
        className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={t.settings.title}
      >
        <Settings className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-3.5 pr-10">
        <CachedAvatar
          src={photoURL}
          alt={name}
          fallback={name.charAt(0).toUpperCase()}
          className="h-[72px] w-[72px] shrink-0 ring-2 ring-primary/50 ring-offset-[3px] ring-offset-card"
          fallbackClassName="bg-primary text-primary-foreground font-display text-[28px] font-extrabold"
        />
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-extrabold leading-tight">{name}</h1>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Chip>{t.athlete.role}</Chip>
            {teamNames.length > 0 && (
              <Chip>
                <Shield className="h-[13px] w-[13px] shrink-0" aria-hidden />
                <span className="truncate">{teamNames[0]}</span>
                {extraTeams > 0 && <span className="shrink-0">+{extraTeams}</span>}
              </Chip>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-2">
        <Kpi value={String(stats.monthWorkouts)} label={tc.workoutsIn.replace("{{month}}", month)} />
        <Kpi value={formatTotalTime(stats.monthSeconds)} label={tc.timeInMonth} />
        <Kpi
          value={
            <>
              {stats.streakWeeks > 0 && <Flame className="mr-1 inline h-4 w-4 -translate-y-0.5 text-sport-strength" aria-hidden />}
              {stats.streakWeeks}
            </>
          }
          label={tc.streak}
        />
      </div>

      <div className="mt-3 flex items-center gap-1" role="img" aria-label={`${tc.weekAria}: ${weekText(stats, tc)}`}>
        {stats.week.map((day, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              day === "done" ? "bg-primary" : day === "partial" ? "bg-[linear-gradient(90deg,hsl(var(--primary))_60%,hsl(var(--muted))_60%)]" : "bg-muted"
            )}
          />
        ))}
        <span className="ml-1.5 whitespace-nowrap text-[11px] text-muted-foreground">{weekText(stats, tc)}</span>
      </div>
    </section>
  );
};

const weekText = (s: AthleteStats, tc: { weekProgress: string; weekNone: string }) =>
  s.weekPlanned === 0
    ? tc.weekNone
    : tc.weekProgress.replace("{{done}}", String(s.weekDone)).replace("{{planned}}", String(s.weekPlanned));

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="flex min-w-0 max-w-full items-center gap-1 rounded-full border border-foreground/10 bg-foreground/[0.06] px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
    {children}
  </span>
);

const Kpi = ({ value, label }: { value: React.ReactNode; label: string }) => (
  <div className="min-w-0 rounded-[14px] border border-foreground/[0.07] bg-foreground/[0.04] px-3 py-2.5">
    <p className="whitespace-nowrap font-display text-[22px] font-extrabold leading-tight tabular-nums">{value}</p>
    <p className="text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] text-muted-foreground">{label}</p>
  </div>
);

const StatCard = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <Card className="border-border/50">
    <CardContent className="p-3 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
      <p className="font-display text-2xl font-extrabold leading-none mt-1">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
    </CardContent>
  </Card>
);

const SummaryStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-muted/30 p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-display text-xl font-extrabold mt-0.5">{value}</p>
  </div>
);

const modalityIcons = {
  running: GrRun,
  cycling: GrBike,
  swimming: GrSwim,
  strength: Dumbbell,
} as const;


const ModalityBar = ({
  type,
  planned,
  completed,
  label,
}: {
  type: WorkoutType;
  planned: number;
  completed: number;
  label: string;
}) => {
  const Icon = modalityIcons[type];
  const accent = modalityAccent(type);
  const pct = planned > 0 ? Math.min(100, Math.round((completed / planned) * 100)) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div
          className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${accent}1A` }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
        </div>
        <span className="font-semibold text-sm">{label}</span>
        <span className="ml-auto text-xs font-mono tabular-nums">
          <span className="font-bold">{formatHours(completed)}</span>
          <span className="text-muted-foreground"> / {formatHours(planned)}</span>
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ width: `${pct}%`, background: accent }}
        />
      </div>
    </div>
  );
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border/60 bg-muted/20">
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>
);

export default AthleteProfile;
