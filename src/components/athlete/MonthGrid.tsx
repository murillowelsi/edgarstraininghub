import { format, isSameDay } from "date-fns";
import { Flag } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dates";
import { sportKey } from "@/components/timeline/sport";
import type { MonthDay } from "@/utils/homePlan";

interface Props {
  days: MonthDay[];
  selected: Date;
  onSelect: (date: Date) => void;
  /** Days with a race get a small flag */
  raceDays: Date[];
}

/**
 * Month grid (docs/design/athlete-calendar §2.2): Mon–Sun, up to 3 dots per day
 * in the sport colour — full = done, ring = planned, red ring = missed,
 * faded = partial. Tapping a day selects it; the list below shows it.
 */
export function MonthGrid({ days, selected, onSelect, raceDays }: Props) {
  const { t, language } = useLanguage();
  const tc = t.athlete.calendar;
  const weekdays = days.slice(0, 7).map((d) => formatDate(d.date, "dayNameShort", language).replace(".", ""));

  return (
    <div>
      <div aria-hidden className="grid grid-cols-7 pb-1 text-center text-[11px] font-medium text-muted-foreground">
        {weekdays.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div role="grid" className="grid grid-cols-7 gap-0.5">
        {days.map((d) => {
          const isSelected = isSameDay(d.date, selected);
          const race = raceDays.some((r) => isSameDay(r, d.date));
          const statuses = d.dots.map((x) => tc.status[x.status].toLowerCase()).join(", ");
          return (
            <button
              key={d.date.toISOString()}
              type="button"
              role="gridcell"
              onClick={() => onSelect(d.date)}
              aria-pressed={isSelected}
              aria-current={d.isToday ? "date" : undefined}
              aria-label={[formatDate(d.date, "weekdayLong", language), statuses, race ? tc.race : ""].filter(Boolean).join(" · ")}
              className={cn(
                "relative flex h-12 flex-col items-center justify-start rounded-lg pt-1 transition-colors hover:bg-accent/60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !d.inMonth && "opacity-40",
                isSelected && "bg-surface-2 outline outline-2 -outline-offset-2 outline-primary"
              )}
            >
              <span className={cn("text-sm tabular-nums", d.isToday ? "font-extrabold text-primary-ink" : "font-medium")}>
                {format(d.date, "d")}
              </span>
              <span aria-hidden className="mt-1 flex items-center gap-[3px]">
                {d.dots.map((dot, i) => {
                  const c = `hsl(var(--sport-${sportKey(dot.type)}))`;
                  return (
                    <i
                      key={i}
                      className={cn(
                        "h-[7px] w-[7px] rounded-full",
                        dot.status === "planned" && "border-[1.5px]",
                        dot.status === "missed" && "border-[1.5px] border-destructive-ink"
                      )}
                      style={
                        dot.status === "done" || dot.status === "extra"
                          ? { backgroundColor: c }
                          : dot.status === "partial"
                          ? { backgroundColor: c, opacity: 0.55 }
                          : dot.status === "planned"
                          ? { borderColor: c }
                          : undefined
                      }
                    />
                  );
                })}
              </span>
              {race && <Flag aria-hidden className="absolute right-1 top-1 h-3 w-3 text-sport-strength" />}
            </button>
          );
        })}
      </div>
      <p className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <Legend dot="bg-foreground/70">{tc.legend.done}</Legend>
        <Legend dot="border-[1.5px] border-foreground/70">{tc.legend.planned}</Legend>
        <Legend dot="bg-foreground/70 opacity-55">{tc.legend.partial}</Legend>
        <Legend dot="border-[1.5px] border-destructive-ink">{tc.legend.missed}</Legend>
        <span className="inline-flex items-center gap-1">
          <Flag className="h-3 w-3 text-sport-strength" aria-hidden />
          {tc.legend.race}
        </span>
      </p>
    </div>
  );
}

const Legend = ({ dot, children }: { dot: string; children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1">
    <i aria-hidden className={cn("h-[7px] w-[7px] rounded-full", dot)} />
    {children}
  </span>
);
