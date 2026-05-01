import AdminLayout from "@/components/AdminLayout";
import ActivityCard from "@/components/athlete/ActivityCard";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { subscribeToAssignmentsByAthlete } from "@/services/workoutAssignmentsService";
import { subscribeToEventsByAthlete } from "@/services/athleteEventsService";
import { getUserById } from "@/services/usersService";
import { type WorkoutType } from "@/types/workout";
import { modalityAccent } from "@/utils/modalityColors";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import type { AthleteEvent } from "@/types/athleteEvent";
import type { User } from "@/types/user";
import {
  actualDurationSec,
  estimateWorkoutDurationSec,
  formatHours,
} from "@/utils/workoutDuration";
import { differenceInCalendarDays, isThisWeek } from "date-fns";
import { ChevronLeft, Dumbbell, Loader2, Plus } from "lucide-react";
import { CalendarAssignDialog } from "@/components/workout/CalendarAssignDialog";
import { GrBike, GrRun, GrSwim } from "react-icons/gr";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EventCard from "@/components/athlete/EventCard";

const modalityIcons = {
  running: GrRun,
  cycling: GrBike,
  swimming: GrSwim,
  strength: Dumbbell,
} as const;


const AdminAthleteHistory = () => {
  const { athleteId } = useParams<{ athleteId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const tp = t.athlete.profile;
  const te = t.athlete.events;
  const ta = t.admin.athletes;

  const [athlete, setAthlete] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<AssignmentWithWorkout[]>([]);
  const [events, setEvents] = useState<AthleteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);

  useEffect(() => {
    if (!athleteId) return;
    getUserById(athleteId).then((u) => setAthlete(u));
    const unsubA = subscribeToAssignmentsByAthlete(athleteId, (data) => {
      setAssignments(data);
      setLoading(false);
    });
    const unsubE = subscribeToEventsByAthlete(athleteId, setEvents);
    return () => {
      unsubA();
      unsubE();
    };
  }, [athleteId]);

  const completed = useMemo(
    () =>
      assignments
        .filter((a) => a.completedAt)
        .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime()),
    [assignments]
  );

  const upcomingEvents = useMemo(
    () => events.filter((e) => differenceInCalendarDays(e.eventDate, new Date()) >= 0),
    [events]
  );

  const weekStats = useMemo(() => {
    const week = assignments.filter((a) => isThisWeek(a.scheduledDate, { weekStartsOn: 1 }));
    return { planned: week.length, done: week.filter((a) => a.completedAt).length };
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

  if (loading || !athlete) {
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
      <div className="p-4 md:p-6 space-y-5">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/users")} className="-ml-2">
          <ChevronLeft className="h-4 w-4 mr-1" />
          {ta.backToList}
        </Button>

        <div className="flex items-center gap-4">
          <CachedAvatar
            src={athlete.photoURL}
            alt={athlete.displayName}
            fallback={athlete.displayName.charAt(0).toUpperCase()}
            className="h-16 w-16 ring-2 ring-primary/30"
            fallbackClassName="bg-primary text-primary-foreground text-xl font-bold"
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold truncate">{athlete.displayName}</h1>
            <p className="text-sm text-muted-foreground truncate">{athlete.email}</p>
          </div>
        </div>

        <Tabs defaultValue="progress" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-11 bg-muted/40">
            <TabsTrigger value="progress" className="font-semibold">{tp.tabs.progress}</TabsTrigger>
            <TabsTrigger value="activities" className="font-semibold">{tp.tabs.activities}</TabsTrigger>
            <TabsTrigger value="events" className="font-semibold">{tp.tabs.events}</TabsTrigger>
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
                      .map((m) => {
                        const Icon = modalityIcons[m.type];
                        const accent = modalityAccent(m.type);
                        const pct = m.planned > 0 ? Math.min(100, Math.round((m.completed / m.planned) * 100)) : 0;
                        return (
                          <div key={m.type} className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: `${accent}1A` }}
                              >
                                <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
                              </div>
                              <span className="font-semibold text-sm">{tp.modalities[m.type]}</span>
                              <span className="ml-auto text-xs font-mono tabular-nums">
                                <span className="font-bold">{formatHours(m.completed)}</span>
                                <span className="text-muted-foreground"> / {formatHours(m.planned)}</span>
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
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-display font-bold">{tp.lifetimeSummary}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">{tp.workoutsCompleted}</p>
                    <p className="font-display text-xl font-extrabold mt-0.5">{completed.length}</p>
                  </div>
                  <div className="rounded-xl bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">{tp.upcomingEventsCount}</p>
                    <p className="font-display text-xl font-extrabold mt-0.5">{upcomingEvents.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities" className="space-y-3 mt-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg">{tp.tabs.activities}</h2>
              <button
                onClick={() => setAssignOpen(true)}
                className="rounded-full p-1.5 hover:bg-muted transition"
                aria-label="Assign workout"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {completed.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border/60 bg-muted/20">
                <p className="text-sm text-muted-foreground">{tp.noActivities}</p>
              </div>
            ) : (
              completed.map((a) => (
                <ActivityCard
                  key={a.id}
                  assignment={a}
                  athleteName={athlete.displayName}
                  athletePhotoURL={athlete.photoURL}
                  href={`/admin/athletes/${athlete.id}/activity/${a.id}`}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="events" className="space-y-3 mt-5">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border/60 bg-muted/20">
                <p className="text-sm text-muted-foreground">{te.noEvents}</p>
              </div>
            ) : (
              upcomingEvents.map((e) => <EventCard key={e.id} event={e} />)
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CalendarAssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        selectedDate={new Date()}
        preSelectedAthleteId={athlete.id}
      />
    </AdminLayout>
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

export default AdminAthleteHistory;
