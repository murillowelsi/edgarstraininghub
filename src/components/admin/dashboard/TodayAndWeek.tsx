import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Bell, ChevronRight, Flag, MessageSquareQuote } from "lucide-react";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dates";
import { ChatService } from "@/services/chat";
import { SportIcon } from "@/components/icons/sport-icons";
import { sportKey } from "@/components/timeline/sport";
import type { AssignmentWithDetails } from "@/types/workoutAssignment";
import { reminderText, type RaceNotice, type TeamWeek, type WorkoutGroup } from "@/utils/coachDashboard";

const CARD = "rounded-[20px] border bg-card p-4";

/**
 * "What happens today?" (CD-5/6): one row per workout with who did it and who is
 * missing inline; "Remind" opens the athlete's chat with a ready text in the
 * field — nothing is sent until the coach does. Tomorrow is one line.
 */
export function TodayCard({ groups, tomorrow }: { groups: WorkoutGroup[]; tomorrow: WorkoutGroup[] }) {
  const { t, language } = useLanguage();
  const tv = t.admin.dashboard.v2;
  const { user } = useAuth();
  const navigate = useNavigate();
  const total = groups.reduce((s, g) => s + g.done.length + g.missing.length, 0);
  const done = groups.reduce((s, g) => s + g.done.length, 0);

  const remind = async (a: AssignmentWithDetails) => {
    if (!user) return;
    const chat = await ChatService.createOrGetChat(a.athleteId, a.athlete.displayName, user.uid);
    try {
      // The chat window reads this draft; the coach reviews and sends it
      sessionStorage.setItem(
        `ez-chat-draft-v1:${chat.id}`,
        reminderText(tv.reminderText, a.athlete.displayName.split(" ")[0], a.workout.name)
      );
    } catch {
      /* private mode: the chat opens empty */
    }
    navigate("/admin/chat", { state: { openChatId: chat.id } });
  };

  const person = (a: AssignmentWithDetails, missing: boolean) => (
    <li key={a.id} className="flex min-h-10 items-center gap-2">
      <CachedAvatar src={a.athlete.photoURL} alt={a.athlete.displayName} fallback={a.athlete.displayName.charAt(0).toUpperCase()} className="h-7 w-7 shrink-0" />
      <Link
        to={missing ? `/admin/athletes/${a.athleteId}` : `/admin/athletes/${a.athleteId}/activity/${a.id}`}
        className="min-w-0 flex-1 truncate text-sm hover:underline"
      >
        {a.athlete.displayName}
      </Link>
      {missing ? (
        <button
          type="button"
          onClick={() => void remind(a)}
          aria-label={tv.remindLabel.replace("{{name}}", a.athlete.displayName)}
          className="flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-primary-ink hover:bg-primary/15"
        >
          <Bell className="h-3.5 w-3.5" aria-hidden />
          {tv.remind}
        </button>
      ) : (
        <span className="shrink-0 text-xs font-semibold text-success-ink">{tv.didIt}</span>
      )}
    </li>
  );

  return (
    <section aria-labelledby="dash-today" className={CARD}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="dash-today" className="text-base font-bold">{tv.today}</h2>
        {total > 0 && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {tv.todayDone.replace("{{done}}", String(done)).replace("{{total}}", String(total))}
          </span>
        )}
      </div>
      {groups.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{tv.noWorkoutToday}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {groups.map((g) => {
            const sport = sportKey(g.type);
            return (
              <div key={g.workoutId} className="rounded-2xl border bg-background/40 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                    style={{ backgroundColor: `hsl(var(--sport-${sport}) / 0.15)`, color: `hsl(var(--sport-${sport}))` }}
                  >
                    <SportIcon type={g.type} className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{g.name}</span>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
                    {g.done.length}/{g.done.length + g.missing.length}
                  </span>
                </p>
                <ul className="mt-1.5">
                  {g.missing.map((a) => person(a, true))}
                  {g.done.map((a) => person(a, false))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
      {tomorrow.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 border-t pt-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{tv.tomorrow}:</span>
          <span className="min-w-0 flex-1 truncate">
            {tomorrow
              .map((g) => tv.tomorrowLine.replace("{{name}}", g.name).replace("{{n}}", String(g.done.length + g.missing.length)))
              .join(" · ")}
          </span>
          <Link
            to={`/admin/calendar?date=${format(new Date(Date.now() + 864e5), "yyyy-MM-dd")}`}
            className="shrink-0 font-semibold text-primary-ink"
            aria-label={`${tv.view} · ${formatDate(new Date(Date.now() + 864e5), "weekdayShort", language)}`}
          >
            {tv.view}
          </Link>
        </p>
      )}
    </section>
  );
}

/**
 * "How is the week going?" (CD-2): "8 of 14 workouts done · 57%" and 7 compact
 * days (ring + done/planned). Tapping a day opens the coach calendar on it.
 */
export function WeekCard({ week }: { week: TeamWeek }) {
  const { t, language } = useLanguage();
  const tv = t.admin.dashboard.v2;
  return (
    <section aria-labelledby="dash-week" className={CARD}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="dash-week" className="text-base font-bold">{tv.thisWeek}</h2>
        <Link to="/admin/calendar" className="flex items-center text-sm font-semibold text-primary-ink">
          {tv.calendar}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <p className="mt-1 text-sm font-semibold tabular-nums">
        {tv.weekLine.replace("{{done}}", String(week.done)).replace("{{planned}}", String(week.planned)).replace("{{pct}}", String(week.pct))}
      </p>
      <ol className="mt-3 grid grid-cols-7 gap-1">
        {week.days.map((d) => {
          const pct = d.planned ? d.done / d.planned : 0;
          const complete = d.planned > 0 && d.done === d.planned;
          const label = tv.openDay.replace("{{day}}", formatDate(d.date, "weekdayShort", language));
          return (
            <li key={d.date.toISOString()}>
              <Link
                to={`/admin/calendar?date=${format(d.date, "yyyy-MM-dd")}`}
                title={label}
                aria-label={`${label}: ${d.planned ? `${d.done}/${d.planned}` : "—"}`}
                aria-current={d.isToday ? "date" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] text-muted-foreground transition-colors hover:bg-accent/60",
                  d.isToday && "outline outline-2 -outline-offset-2 outline-primary"
                )}
              >
                <span aria-hidden>{formatDate(d.date, "dayNameShort", language).replace(".", "")}</span>
                <span aria-hidden className="relative grid h-7 w-7 place-items-center">
                  <svg viewBox="0 0 28 28" className="h-7 w-7 -rotate-90">
                    <circle cx="14" cy="14" r="11" fill="none" strokeWidth="3" className={cn("stroke-muted", d.isFuture && d.planned > 0 && "[stroke-dasharray:3_3]")} />
                    {d.planned > 0 && pct > 0 && (
                      <circle
                        cx="14"
                        cy="14"
                        r="11"
                        fill="none"
                        strokeWidth="3"
                        strokeLinecap="round"
                        className={complete ? "stroke-success-ink" : "stroke-primary"}
                        strokeDasharray={2 * Math.PI * 11}
                        strokeDashoffset={2 * Math.PI * 11 * (1 - pct)}
                      />
                    )}
                  </svg>
                </span>
                <span aria-hidden className="font-semibold tabular-nums text-foreground">{d.planned ? `${d.done}/${d.planned}` : "—"}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Notices as chips on one line, only when there are any (CD-6) */
export function NoticeChips({ races, pendingTestimonials, athleteName }: { races: RaceNotice[]; pendingTestimonials: number; athleteName: (id: string) => string }) {
  const { t } = useLanguage();
  const tv = t.admin.dashboard.v2;
  if (!races.length && !pendingTestimonials) return null;
  const chip = "flex h-9 shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 text-sm";
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
      {races.map((r) => (
        <Link key={r.eventId} to={`/admin/athletes/${r.athleteId}?tab=events`} className={cn(chip, "hover:bg-accent")}>
          <Flag className="h-4 w-4 text-sport-strength" aria-hidden />
          <span className="whitespace-nowrap">
            {(r.days === 0 ? tv.raceToday : tv.raceNotice)
              .replace("{{name}}", athleteName(r.athleteId))
              .replace("{{race}}", r.title)
              .replace("{{n}}", String(r.days))}
          </span>
        </Link>
      ))}
      {pendingTestimonials > 0 && (
        <Link to="/admin/testimonials" className={cn(chip, "hover:bg-accent")}>
          <MessageSquareQuote className="h-4 w-4 text-primary-ink" aria-hidden />
          <span className="whitespace-nowrap">{tv.testimonialNotice.replace("{{n}}", String(pendingTestimonials))}</span>
          <span className="font-semibold text-primary-ink">{tv.review}</span>
        </Link>
      )}
    </div>
  );
}
