import AdminLayout from "@/components/AdminLayout";
import { CalendarAssignDialog } from "@/components/workout/CalendarAssignDialog";
import { AttentionList, type AttentionItem, type AttentionReason } from "@/components/admin/dashboard/AttentionList";
import { QuickActions } from "@/components/admin/dashboard/QuickActions";
import { NoticeChips, TodayCard, WeekCard } from "@/components/admin/dashboard/TodayAndWeek";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { getAllAssignmentsWithDetails } from "@/services/workoutAssignmentsService";
import { runScheduledDayBackfillOnce } from "@/services/scheduledDayMigration";
import { getTeamsByCoach } from "@/services/teamsService";
import { getAllUsers, getUserById } from "@/services/usersService";
import { getAllEvents } from "@/services/athleteEventsService";
import { subscribeToAllTestimonials } from "@/services/testimonialsService";
import type { AssignmentWithDetails } from "@/types/workoutAssignment";
import type { AthleteEvent } from "@/types/athleteEvent";
import type { Testimonial } from "@/types/testimonial";
import type { Team } from "@/types/team";
import type { User } from "@/types/user";
import { addDays, endOfDay, startOfDay, subDays } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { formatDate } from "@/lib/dates";
import { StatsSkeleton } from "@/components/feedback/skeletons";
import { groupByWorkout, teamWeekStats, upcomingRaces } from "@/utils/coachDashboard";

/**
 * Coach dashboard, layout A (docs/design/coach-dashboard): three questions in order —
 * who needs me (main column, with actions), what happens today, how the week goes.
 * Inventory numbers, the trend chart, the athletes table, highlights, the date strip,
 * recent activity, teams and the separate "tomorrow" block are gone.
 */
const AdminDashboard = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const tv = t.admin.dashboard.v2;
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [allAthletes, setAllAthletes] = useState<User[]>([]);
  const [events, setEvents] = useState<AthleteEvent[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignAthleteId, setAssignAthleteId] = useState<string | undefined>();
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const [userData, allUsers, coachTeams, allAssignments, allEvents] = await Promise.all([
          getUserById(user.uid),
          getAllUsers(),
          getTeamsByCoach(user.uid),
          getAllAssignmentsWithDetails(),
          getAllEvents(),
        ]);
        if (userData) setDisplayName(userData.displayName || user.email?.split("@")[0] || "Coach");
        setAllAthletes(allUsers.filter((u) => u.role === "athlete"));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, toast, reloadKey]);

  // One-time backfill of the timezone-safe scheduledDay field on legacy documents
  useEffect(() => {
    if (user) runScheduledDayBackfillOnce(user.uid);
  }, [user]);

  useEffect(() => subscribeToAllTestimonials(setTestimonials), []);

  // Who needs the coach (last 7 days + next 7 days), each with the reasons why
  const attention: AttentionItem[] = useMemo(() => {
    const isPlanned = (a: AssignmentWithDetails) => !a.selfLogged;
    const todayStart = startOfDay(new Date());
    const weekAgo = subDays(todayStart, 7);
    const nextWeekEnd = endOfDay(addDays(todayStart, 6));
    const reasonWeight: Record<AttentionReason["kind"], number> = { overdue: 3, skipped: 2, highEffort: 2, noPlan: 2, note: 1 };
    return allAthletes
      .map((athlete) => {
        // Subscription status isn't kept up to date, so it only mutes the "nothing planned" nudge
        const lapsed = athlete.subscriptionStatus === "inactive" || athlete.subscriptionStatus === "expired";
        const mine = assignments.filter((a) => a.athleteId === athlete.id);
        const recent = mine.filter((a) => a.scheduledDate >= weekAgo && a.scheduledDate < todayStart);
        const recentlyDone = mine
          .filter((a) => a.completedAt && a.completedAt >= weekAgo)
          .sort((x, y) => y.completedAt!.getTime() - x.completedAt!.getTime());
        const reasons: AttentionReason[] = [];
        const overdue = recent.filter((a) => isPlanned(a) && !a.completedAt && !a.skipped).length;
        if (overdue) reasons.push({ kind: "overdue", count: overdue });
        const skipped = recent.filter((a) => a.skipped).length;
        if (skipped) reasons.push({ kind: "skipped", count: skipped });
        const hard = recentlyDone.find((a) => (a.rpe ?? 0) >= 9);
        if (hard) reasons.push({ kind: "highEffort", rpe: hard.rpe!, assignmentId: hard.id });
        const noted = recentlyDone.find((a) => a.athleteNotes?.trim());
        if (noted) reasons.push({ kind: "note", text: noted.athleteNotes!.trim(), assignmentId: noted.id });
        const planned = mine.some((a) => isPlanned(a) && a.scheduledDate >= todayStart && a.scheduledDate <= nextWeekEnd);
        if (!planned && !lapsed) reasons.push({ kind: "noPlan" });
        return { athlete, reasons, score: reasons.reduce((sum, r) => sum + reasonWeight[r.kind], 0) };
      })
      .filter((x) => x.reasons.length > 0)
      .sort((x, y) => y.score - x.score || x.athlete.displayName.localeCompare(y.athlete.displayName));
  }, [allAthletes, assignments]);

  const week = useMemo(() => teamWeekStats(assignments), [assignments]);
  const today = useMemo(() => groupByWorkout(assignments, new Date()), [assignments]);
  const tomorrow = useMemo(() => groupByWorkout(assignments, addDays(new Date(), 1)), [assignments]);
  const races = useMemo(() => upcomingRaces(events), [events]);
  const pendingTestimonials = useMemo(
    () => testimonials.filter((x) => x.source === "athlete" && !x.approved).length,
    [testimonials]
  );
  const athleteName = (id: string) => allAthletes.find((a) => a.id === id)?.displayName ?? "";

  const openAssign = (athleteId?: string) => {
    setAssignAthleteId(athleteId);
    setAssignDialogOpen(true);
  };

  if (loading) {
    return (
      <AdminLayout>
        <StatsSkeleton className="p-4 md:p-8 max-w-7xl mx-auto" />
      </AdminLayout>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? tv.greetMorning : hour < 18 ? tv.greetAfternoon : tv.greetEvening;
  const firstName = displayName.split(" ")[0];

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-3.5 p-4 pb-28 md:p-6 md:pb-8">
        {/* Greeting · Actions ▾ · Assign workout */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground first-letter:uppercase">{formatDate(new Date(), "weekdayLong", language)}</p>
            <h1 className="truncate font-display text-2xl font-extrabold">
              {greeting}
              {firstName && `, ${firstName}`}
            </h1>
          </div>
          <QuickActions teams={teams} onAssign={() => openAssign()} />
        </div>

        {/* Notices only when there are any */}
        <NoticeChips races={races} pendingTestimonials={pendingTestimonials} athleteName={athleteName} />

        {/* Two columns of the same height: attention 60% | today + this week 40% */}
        <div className="grid gap-3.5 lg:grid-cols-[3fr_2fr] lg:items-stretch">
          <AttentionList items={attention} onAssign={openAssign} />
          <div className="flex min-w-0 flex-col gap-3.5 [&>section:last-child]:flex-1">
            <TodayCard groups={today} tomorrow={tomorrow} />
            <WeekCard week={week} />
          </div>
        </div>
      </div>

      <CalendarAssignDialog
        open={assignDialogOpen}
        onOpenChange={(open) => {
          setAssignDialogOpen(open);
          if (!open) setAssignAthleteId(undefined);
        }}
        selectedDate={new Date()}
        preSelectedAthleteId={assignAthleteId}
        onSuccess={() => setReloadKey((k) => k + 1)}
      />
    </AdminLayout>
  );
};

export default AdminDashboard;
