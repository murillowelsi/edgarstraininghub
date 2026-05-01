import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import ActivityCard from "@/components/athlete/ActivityCard";
import EventCard from "@/components/athlete/EventCard";
import AddEventSheet from "@/components/athlete/AddEventSheet";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, Loader2, Plus } from "lucide-react";
import { GrBike, GrRun, GrSwim } from "react-icons/gr";
import { type WorkoutType } from "@/types/workout";
import { modalityAccent } from "@/utils/modalityColors";
import { estimateWorkoutDurationSec, actualDurationSec, formatHours } from "@/utils/workoutDuration";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { subscribeToAssignmentsByAthlete } from "@/services/workoutAssignmentsService";
import { subscribeToEventsByAthlete } from "@/services/athleteEventsService";
import { getUserById } from "@/services/usersService";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import type { AthleteEvent } from "@/types/athleteEvent";
import { differenceInCalendarDays, isThisWeek } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const AthleteProfile = () => {
  const { user, photoURL } = useAuth();
  const { t, language } = useLanguage();
  const lang = (language === "pt" ? "pt" : "en") as "pt" | "en";
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const validTabs = ["activities", "events", "progress"];
  const activeTab = tabParam && validTabs.includes(tabParam) ? tabParam : "activities";

  const [displayName, setDisplayName] = useState("");
  const [assignments, setAssignments] = useState<AssignmentWithWorkout[]>([]);
  const [events, setEvents] = useState<AthleteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AthleteEvent | null>(null);

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

  if (loading) {
    return (
      <AthletePortalLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AthletePortalLayout>
    );
  }

  const tp = t.athlete.profile;
  const te = t.athlete.events;

  return (
    <AthletePortalLayout title={tp.title}>
      <div className="p-4 space-y-5">
        <div className="flex items-center gap-4">
          <CachedAvatar
            src={photoURL}
            alt={displayName}
            fallback={displayName.charAt(0).toUpperCase()}
            className="h-16 w-16 ring-2 ring-primary/30"
            fallbackClassName="bg-primary text-primary-foreground text-xl font-bold"
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold leading-tight truncate">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{t.athlete.role}</p>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setSearchParams(v === "activities" ? {} : { tab: v }, { replace: true })}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 h-11 bg-muted/40">
            <TabsTrigger value="activities" className="font-semibold">{tp.tabs.activities}</TabsTrigger>
            <TabsTrigger value="events" className="font-semibold">{tp.tabs.events}</TabsTrigger>
            <TabsTrigger value="progress" className="font-semibold">{tp.tabs.progress}</TabsTrigger>
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
                className="rounded-full p-1.5 hover:bg-muted transition"
                aria-label={te.addAriaLabel}
              >
                <Plus className="h-4 w-4" />
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
                    onClick={() => navigate(`/athlete/events/${e.id}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activities" className="space-y-3 mt-5">
            {completed.length === 0 ? (
              <EmptyState text={tp.noActivities} />
            ) : (
              completed.map((a) => (
                <ActivityCard
                  key={a.id}
                  assignment={a}
                  athleteName={displayName}
                  athletePhotoURL={photoURL}
                />
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
