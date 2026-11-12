import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dates";
import { sportKey } from "@/components/timeline/sport";
import type { WeekDay, WeekSummary } from "@/utils/homePlan";
import { formatTotalTime } from "@/hooks/useAthleteStats";

/**
 * "This week": Mon–Sun with one status per day in the sport colour
 * (✓ done, ring planned, half ring partial, dashed red missed, dot free).
 * Tapping a day opens the calendar on it. Replaces the date strip and the
 * Today/Week/Progress cards (docs/design/home-athlete §2.4).
 */
interface Props {
  week: WeekSummary;
  /** Calendar: the chosen day gets the outline and tapping selects instead of navigating */
  selected?: Date;
  onSelectDay?: (date: Date) => void;
  /** Home shows "This week · Calendar" above the strip; the calendar has its own header */
  showHeader?: boolean;
  /** Replaces the default summary line; null hides it */
  summary?: React.ReactNode;
}

export function WeekStrip({ week, selected, onSelectDay, showHeader = true, summary }: Props) {
  const { t } = useLanguage();
  const tw = t.athlete.home.week;

  return (
    <section aria-labelledby={showHeader ? "home-week-title" : undefined} aria-label={showHeader ? undefined : tw.title}>
      {showHeader && (
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h2 id="home-week-title" className="text-base font-bold">{tw.title}</h2>
          <Link to="/athlete/calendar" className="-my-2 py-2 text-[13px] font-semibold text-primary-ink">
            {tw.calendar}
          </Link>
        </div>
      )}
      <div className="rounded-[18px] border bg-card p-3">
        <ol className="grid grid-cols-7 gap-1">
          {week.days.map((day) => (
            <li key={day.date.toISOString()}>
              <DayCell
                day={day}
                highlighted={selected ? isSameDay(day.date, selected) : day.isToday}
                onSelect={onSelectDay}
              />
            </li>
          ))}
        </ol>
        {summary !== undefined ? summary : <div className="mt-2.5 flex justify-between gap-2 px-1 text-[13px] text-muted-foreground">
          {week.planned === 0 ? (
            <span>{tw.nothing}</span>
          ) : (
            <span>
              <b className="font-semibold text-foreground">
                {tw.summary.replace("{{done}}", String(week.done)).replace("{{planned}}", String(week.planned))}
              </b>
              {week.missed > 0 && ` · ${(week.missed === 1 ? tw.missed : tw.missedOther).replace("{{n}}", String(week.missed))}`}
            </span>
          )}
          {week.seconds > 0 && <span className="shrink-0">{tw.minutesDone.replace("{{time}}", formatTotalTime(week.seconds))}</span>}
        </div>}
      </div>
    </section>
  );
}

function DayCell({ day, highlighted, onSelect }: { day: WeekDay; highlighted: boolean; onSelect?: (date: Date) => void }) {
  const { t, language } = useLanguage();
  const tw = t.athlete.home.week;
  const color = `hsl(var(--sport-${sportKey(day.type)}))`;
  const label = tw.dayAria
    .replace("{{day}}", formatDate(day.date, "weekdayLong", language))
    .replace("{{status}}", tw.status[day.status]);

  const cls = cn(
    "flex w-full flex-col items-center rounded-xl pb-2 pt-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent/60",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    highlighted && "bg-surface-2 outline outline-2 -outline-offset-2 outline-primary",
    day.isToday && !highlighted && "text-foreground"
  );
  const body = (
    <>
      <span aria-hidden>{formatDate(day.date, "dayNameShort", language).replace(".", "")}</span>
      <b aria-hidden className="mb-1 mt-0.5 text-[15px] font-bold text-foreground tabular-nums">{format(day.date, "d")}</b>
      <span aria-hidden className="grid h-[22px] place-items-center">
        {day.status === "done" && (
          <span className="grid h-[22px] w-[22px] place-items-center rounded-full" style={{ backgroundColor: color }}>
            <Check className="h-3 w-3 text-background" strokeWidth={3} />
          </span>
        )}
        {day.status === "planned" && <span className="h-[22px] w-[22px] rounded-full border-2" style={{ borderColor: color }} />}
        {day.status === "partial" && (
          <span
            className="h-[22px] w-[22px] rounded-full border-2"
            style={{ borderColor: color, background: `conic-gradient(${color} 0 216deg, transparent 216deg)` }}
          />
        )}
        {day.status === "missed" && <span className="h-[22px] w-[22px] rounded-full border-2 border-dashed border-destructive-ink" />}
        {day.status === "none" && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />}
      </span>
    </>
  );

  return onSelect ? (
    <button
      type="button"
      onClick={() => onSelect(day.date)}
      aria-label={label.split(".")[0]}
      aria-pressed={highlighted}
      aria-current={day.isToday ? "date" : undefined}
      className={cls}
    >
      {body}
    </button>
  ) : (
    <Link
      to={`/athlete/calendar?d=${format(day.date, "yyyy-MM-dd")}`}
      aria-label={label}
      aria-current={day.isToday ? "date" : undefined}
      className={cls}
    >
      {body}
    </Link>
  );
}
