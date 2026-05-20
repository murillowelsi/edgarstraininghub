import { cn } from "@/lib/utils";
import { addDays, format, isSameDay, isToday, startOfDay } from "date-fns";
import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export interface InfiniteDateStripHandle {
  scrollToToday: (smooth?: boolean) => void;
  scrollToDate: (date: Date, smooth?: boolean) => void;
}

interface InfiniteDateStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onCenterDateChange?: (date: Date) => void;
  isReady?: boolean;
  hasWorkouts?: (date: Date) => boolean;
  hasIncompleteWorkouts?: (date: Date) => boolean;
  initialRadius?: number;
  pageSize?: number;
  edgeThresholdPx?: number;
  className?: string;
}

export const InfiniteDateStrip = forwardRef<
  InfiniteDateStripHandle,
  InfiniteDateStripProps
>(function InfiniteDateStrip(
  {
    selectedDate,
    onSelectDate,
    onCenterDateChange,
    isReady = true,
    hasWorkouts,
    hasIncompleteWorkouts,
    initialRadius = 30,
    pageSize = 30,
    edgeThresholdPx = 240,
    className,
  },
  ref,
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const prependedCountRef = useRef(0);
  const didInitialScrollRef = useRef(false);
  const centerDateRef = useRef<Date>(startOfDay(new Date()));

  const [days, setDays] = useState<Date[]>(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: initialRadius * 2 + 1 }, (_, i) =>
      addDays(today, i - initialRadius),
    );
  });

  const scrollDayIntoView = (date: Date, smooth: boolean) => {
    const sc = scrollRef.current;
    const key = startOfDay(date).toISOString();
    const btn = btnRefs.current.get(key);
    if (!sc || !btn) return;
    const scRect = sc.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const target = sc.scrollLeft + (btnRect.left - scRect.left);
    sc.scrollTo({ left: target, behavior: smooth ? "smooth" : "auto" });
  };

  useImperativeHandle(ref, () => ({
    scrollToToday: (smooth = true) => scrollDayIntoView(new Date(), smooth),
    scrollToDate: (date: Date, smooth = true) => scrollDayIntoView(date, smooth),
  }));

  useLayoutEffect(() => {
    if (!isReady || didInitialScrollRef.current) return;
    scrollDayIntoView(new Date(), false);
    didInitialScrollRef.current = true;
  }, [isReady]);

  useLayoutEffect(() => {
    if (prependedCountRef.current > 0 && scrollRef.current) {
      const first = days[0];
      const probe = btnRefs.current.get(first.toISOString());
      if (probe) {
        const shift = probe.offsetWidth * prependedCountRef.current;
        const gapWidth = 8;
        scrollRef.current.scrollLeft +=
          shift + gapWidth * prependedCountRef.current;
      }
      prependedCountRef.current = 0;
    }
  }, [days]);

  const handleScroll = () => {
    const sc = scrollRef.current;
    if (!sc) return;

    if (onCenterDateChange) {
      const containerRect = sc.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      let closestDate: Date | null = null;
      let closestDist = Infinity;
      btnRefs.current.forEach((btn, key) => {
        const r = btn.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const d = Math.abs(cx - containerCenter);
        if (d < closestDist) {
          closestDist = d;
          closestDate = new Date(key);
        }
      });
      if (closestDate && !isSameDay(closestDate, centerDateRef.current)) {
        centerDateRef.current = closestDate;
        onCenterDateChange(closestDate);
      }
    }

    if (sc.scrollLeft < edgeThresholdPx) {
      setDays((prev) => {
        const first = prev[0];
        const extra = Array.from({ length: pageSize }, (_, i) =>
          addDays(first, -pageSize + i),
        );
        prependedCountRef.current = pageSize;
        return [...extra, ...prev];
      });
    } else if (
      sc.scrollLeft + sc.clientWidth >
      sc.scrollWidth - edgeThresholdPx
    ) {
      setDays((prev) => {
        const last = prev[prev.length - 1];
        const extra = Array.from({ length: pageSize }, (_, i) =>
          addDays(last, i + 1),
        );
        return [...prev, ...extra];
      });
    }
  };

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={cn(
        "flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide",
        className,
      )}
    >
      {days.map((day) => {
        const key = day.toISOString();
        const isSelected = isSameDay(day, selectedDate);
        const isTodayDate = isToday(day);
        const hasWk = hasWorkouts?.(day) ?? false;
        const hasIncomplete = hasIncompleteWorkouts?.(day) ?? false;

        return (
          <button
            key={key}
            ref={(el) => {
              if (el) btnRefs.current.set(key, el);
              else btnRefs.current.delete(key);
            }}
            onClick={() => onSelectDate(day)}
            className={cn(
              "flex flex-col items-center justify-center min-w-[48px] h-[64px] rounded-xl transition-all border flex-shrink-0",
              isSelected
                ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                : isTodayDate
                  ? "bg-accent border-primary/30"
                  : "bg-card border-border hover:border-primary/50",
            )}
          >
            <span className="text-xs font-medium opacity-70">
              {format(day, "EEE")}
            </span>
            <span className="text-lg font-bold">{format(day, "d")}</span>
            {hasWk && (
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isSelected
                    ? "bg-primary-foreground"
                    : hasIncomplete
                      ? "bg-primary"
                      : "bg-green-500",
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
});
