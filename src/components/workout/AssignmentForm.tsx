import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { addTeamWorkoutAssignment, getTeamsByCoach } from "@/services/teamsService";
import { getUsersByRole } from "@/services/usersService";
import { assignWorkoutToMany, type AssignResult } from "@/services/workoutAssignmentsService";
import type { Team } from "@/types/team";
import type { User } from "@/types/user";
import type { Workout } from "@/types/workout";
import { toDayString } from "@/utils/scheduledDay";
import { addDays, format, isBefore, startOfDay } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import { Loader2, Search, Users2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface Props {
  workout: Workout;
  initialDates?: Date[];
  /** Pre-ticked athletes (e.g. assigning from an athlete's page) */
  preSelectedAthleteIds?: string[];
  onDone: (result: AssignResult) => void;
  onCancel: () => void;
  /** Shown as the secondary action instead of Cancel (wizard steps) */
  onBack?: () => void;
}

/**
 * The single "who and when" step of assigning a workout: athletes (with
 * search) or a team, one or more days, optional weekly repeat. Used by every
 * assign entry point so they all behave the same.
 */
export function AssignmentForm({ workout, initialDates, preSelectedAthleteIds, onDone, onCancel, onBack }: Props) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const ta = t.admin.assign;
  const { toast } = useToast();
  const locale = language === "pt" ? ptBR : enUS;

  const [tab, setTab] = useState<"athletes" | "team">("athletes");
  const [athletes, setAthletes] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>(preSelectedAthleteIds ?? []);
  const [teamId, setTeamId] = useState("");
  const [dates, setDates] = useState<Date[]>(initialDates ?? []);
  const [repeat, setRepeat] = useState(false);
  const [weeks, setWeeks] = useState(4);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getUsersByRole("athlete"), user ? getTeamsByCoach(user.uid) : Promise.resolve([])])
      .then(([athleteList, teamList]) => {
        if (cancelled) return;
        setAthletes([...athleteList].sort((a, b) => a.displayName.localeCompare(b.displayName)));
        setTeams(teamList);
      })
      .catch(() => toast({ title: t.common.error, description: ta.loadError, variant: "destructive" }))
      .finally(() => !cancelled && setLoadingLists(false));
    return () => {
      cancelled = true;
    };
  }, [user, toast, t, ta.loadError]);

  const visibleAthletes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? athletes.filter((a) => a.displayName.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q))
      : athletes;
  }, [athletes, search]);

  // Every day that will get the workout (picked days, plus weekly repeats)
  const allDays = useMemo(() => {
    const byDay = new Map<string, Date>();
    dates.forEach((d) => {
      for (let w = 0; w < (repeat ? weeks : 1); w++) {
        const day = addDays(d, w * 7);
        byDay.set(toDayString(day), day);
      }
    });
    return [...byDay.values()].sort((a, b) => a.getTime() - b.getTime());
  }, [dates, repeat, weeks]);

  const team = teams.find((tm) => tm.id === teamId);
  const athleteIds = tab === "team" ? team?.memberIds ?? [] : selected;
  const hasPastDay = allDays.some((d) => isBefore(d, startOfDay(new Date())));
  const canSubmit = !submitting && athleteIds.length > 0 && allDays.length > 0;

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const allVisibleSelected = visibleAthletes.length > 0 && visibleAthletes.every((a) => selected.includes(a.id));
  const toggleAllVisible = () =>
    setSelected((prev) =>
      allVisibleSelected
        ? prev.filter((id) => !visibleAthletes.some((a) => a.id === id))
        : [...new Set([...prev, ...visibleAthletes.map((a) => a.id)])]
    );

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;
    if (tab === "team" && team && team.memberIds.length === 0) {
      toast({ title: t.common.error, description: ta.teamEmpty, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const result = await assignWorkoutToMany({ workoutId: workout.id, athleteIds, dates: allDays }, user.uid);
      // Team-level record so athletes who join later get these days too
      if (tab === "team" && team && result.created > 0) {
        await Promise.all(allDays.map((d) => addTeamWorkoutAssignment(team.id, workout.id, d)));
      }
      if (result.created === 0) {
        toast({ title: ta.resultTitle, description: ta.resultNothing, variant: "destructive" });
      } else {
        toast({
          title: ta.resultTitle,
          description: [
            ta.resultCreated.replace("{{n}}", String(result.created)),
            result.skipped ? ta.resultSkipped.replace("{{n}}", String(result.skipped)) : "",
          ]
            .filter(Boolean)
            .join(" "),
        });
      }
      onDone(result);
    } catch (error) {
      console.error("Error assigning workout:", error);
      toast({ title: t.common.error, description: ta.error, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Who */}
      <div className="flex rounded-full bg-muted p-1 self-start">
        {(["athletes", "team"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              "px-4 h-8 rounded-full text-sm font-medium transition-colors",
              tab === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            {value === "athletes" ? ta.tabAthletes : ta.tabTeam}
          </button>
        ))}
      </div>

      {loadingLists ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : tab === "athletes" ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={ta.searchAthletes}
                className="pl-9 h-10"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={toggleAllVisible} className="shrink-0">
              {allVisibleSelected ? ta.clearAll : ta.selectAll}
            </Button>
          </div>
          <div className="max-h-56 overflow-y-auto rounded-xl border divide-y divide-border/60">
            {visibleAthletes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{ta.noAthletes}</p>
            ) : (
              visibleAthletes.map((athlete) => {
                const checked = selected.includes(athlete.id);
                return (
                  <label
                    key={athlete.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                      checked ? "bg-primary/5" : "hover:bg-muted/60"
                    )}
                  >
                    <CachedAvatar
                      src={athlete.photoURL}
                      alt={athlete.displayName}
                      fallback={athlete.displayName.charAt(0).toUpperCase()}
                      className="h-8 w-8 shrink-0"
                      fallbackClassName="bg-primary/15 text-primary text-xs font-semibold"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium truncate">{athlete.displayName}</span>
                      <span className="block text-xs text-muted-foreground truncate">{athlete.email}</span>
                    </span>
                    <Checkbox checked={checked} onCheckedChange={() => toggle(athlete.id)} />
                  </label>
                );
              })
            )}
          </div>
          {selected.length > 0 && (
            <p className="text-xs text-muted-foreground">{ta.selectedCount.replace("{{n}}", String(selected.length))}</p>
          )}
        </div>
      ) : teams.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">{ta.noTeams}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {teams.map((tm) => (
            <button
              key={tm.id}
              onClick={() => setTeamId(tm.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                teamId === tm.id ? "border-primary bg-primary/5" : "hover:bg-muted/60"
              )}
            >
              <Users2 className="h-5 w-5 text-primary shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate">{tm.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {ta.teamMembers.replace("{{n}}", String(tm.memberIds.length))}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* When */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold">{ta.dates}</p>
          <p className="text-xs text-muted-foreground">{ta.datesHint}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Calendar
            mode="multiple"
            selected={dates}
            onSelect={(value) => setDates(value ?? [])}
            locale={locale}
            weekStartsOn={1}
            defaultMonth={dates[0]}
            className="rounded-xl border self-start"
          />
          <div className="flex-1 min-w-0 space-y-3">
            <label className="flex items-center justify-between gap-3 rounded-xl border p-3">
              <span className="text-sm font-medium">{ta.repeat}</span>
              <Switch checked={repeat} onCheckedChange={setRepeat} />
            </label>
            {repeat && (
              <div className="flex items-center gap-2 text-sm">
                <span>{ta.repeatFor}</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={2}
                  max={12}
                  value={weeks}
                  onChange={(e) => setWeeks(Math.min(12, Math.max(2, parseInt(e.target.value, 10) || 2)))}
                  className="w-16 h-9 text-center"
                />
                <span>{ta.weeks}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {allDays.length === 0 ? (
                <span className="text-xs text-muted-foreground">{ta.noDates}</span>
              ) : (
                allDays.slice(0, 24).map((d) => (
                  <span
                    key={toDayString(d)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary pl-2.5 pr-1 h-7 text-xs font-medium"
                  >
                    {format(d, language === "pt" ? "EEE d MMM" : "EEE MMM d", { locale })}
                    {dates.some((x) => toDayString(x) === toDayString(d)) && (
                      <button
                        onClick={() => setDates((prev) => prev.filter((x) => toDayString(x) !== toDayString(d)))}
                        className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-primary/15"
                        aria-label={ta.cancel}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))
              )}
              {allDays.length > 24 && <span className="text-xs text-muted-foreground">+{allDays.length - 24}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Summary + actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 border-t pt-4">
        <p className="text-xs text-muted-foreground sm:mr-auto">
          {athleteIds.length > 0 && allDays.length > 0
            ? ta.summary
                .replace("{{workouts}}", String(athleteIds.length * allDays.length))
                .replace("{{athletes}}", String(athleteIds.length))
                .replace("{{days}}", String(allDays.length))
            : ""}
          {hasPastDay && <span className="text-amber-500"> · {ta.pastDate}</span>}
        </p>
        <Button variant="outline" onClick={onBack ?? onCancel} disabled={submitting}>
          {onBack ? ta.back : ta.cancel}
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {ta.submit}
        </Button>
      </div>
    </div>
  );
}
