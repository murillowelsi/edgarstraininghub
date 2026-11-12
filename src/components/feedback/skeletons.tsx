import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { cn } from "@/lib/utils";

/**
 * First-load placeholders with the same layout as the final screen
 * (design system 8.2). Rules:
 * - only for the FIRST load: when data is already on screen, keep it while
 *   reloading (render the skeleton only while there is nothing to show);
 * - hidden for the first 300 ms, but the space is reserved, so fast loads
 *   neither flash nor make the layout jump;
 * - announced to screen readers (role=status + aria-busy + "Loading…").
 */
interface FrameProps {
  children: ReactNode;
  className?: string;
  /** Screen-reader text; defaults to "Loading…" in the app language. */
  label?: string;
}

export const SkeletonFrame = ({ children, className, label }: FrameProps) => {
  const { t } = useLanguage();
  const visible = useDelayedFlag(true, 300);
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label ?? t.common.loading}</span>
      <div aria-hidden="true" className={cn("transition-opacity duration-fast", visible ? "opacity-100" : "opacity-0")}>
        {children}
      </div>
    </div>
  );
};

interface PresetProps {
  className?: string;
  label?: string;
}

const Line = ({ className }: { className?: string }) => <Skeleton className={cn("h-4", className)} />;

/** Rows of [avatar/icon 40 + two lines]. Lists of workouts, athletes, teams, chats. */
export const ListSkeleton = ({
  rows = 6,
  avatar = true,
  className,
  label,
}: PresetProps & { rows?: number; avatar?: boolean }) => (
  <SkeletonFrame className={className} label={label}>
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border bg-card p-3">
          {avatar && <Skeleton className="h-10 w-10 shrink-0 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Line className="w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  </SkeletonFrame>
);

/** Feed posts as cards: header (avatar + 2 lines), 200px media block, action row. */
export const FeedSkeleton = ({ posts = 2, className, label }: PresetProps & { posts?: number }) => (
  <SkeletonFrame className={className} label={label}>
    <div className="mx-auto max-w-[600px] space-y-3 px-2 md:space-y-4 md:px-0">
      {Array.from({ length: posts }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border bg-card pb-3 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2.5 py-3 pl-3.5 pr-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
          <Skeleton className="mx-3 h-[200px] rounded-2xl" />
          <div className="flex gap-3 px-3.5 pt-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  </SkeletonFrame>
);

/** Athlete home: 7-day strip, 160 px highlight card and two cards. */
export const TodaySkeleton = ({ className, label }: PresetProps) => (
  <SkeletonFrame className={className} label={label}>
    <div className="space-y-4">
      <div className="flex justify-between gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-16 flex-1 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  </SkeletonFrame>
);

/** Detail screens: 120 px header block, 3 metric tiles, 4 lines. */
export const DetailSkeleton = ({ className, label }: PresetProps) => (
  <SkeletonFrame className={className} label={label}>
    <div className="space-y-5">
      <Skeleton className="h-[120px] w-full rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        <Line className="w-full" />
        <Line className="w-11/12" />
        <Line className="w-4/5" />
        <Line className="w-2/3" />
      </div>
    </div>
  </SkeletonFrame>
);

/** Dashboards and progress: 4 KPI tiles and a 200 px chart. */
export const StatsSkeleton = ({ className, label }: PresetProps) => (
  <SkeletonFrame className={className} label={label}>
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[200px] w-full rounded-lg" />
    </div>
  </SkeletonFrame>
);

/** Tables (desktop): header + rows. On mobile, falls back to list cards. */
export const TableSkeleton = ({
  rows = 8,
  cols = 4,
  className,
  label,
}: PresetProps & { rows?: number; cols?: number }) => (
  <SkeletonFrame className={className} label={label}>
    <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
      <div className="flex gap-4 border-b bg-muted/50 px-4 py-4">
        {Array.from({ length: cols }, (_, c) => (
          <Skeleton key={c} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4 border-b px-4 py-3 last:border-0">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className={cn("h-4 flex-1", c === 0 && "flex-[2]")} />
          ))}
        </div>
      ))}
    </div>
    <div className="space-y-2 md:hidden">
      {Array.from({ length: Math.min(rows, 6) }, (_, r) => (
        <Skeleton key={r} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  </SkeletonFrame>
);

/** Calendars: month grid (or one week) with a few event blocks. */
export const CalendarSkeleton = ({
  variant = "month",
  className,
  label,
}: PresetProps & { variant?: "month" | "week" }) => {
  const cells = variant === "month" ? 35 : 7;
  return (
    <SkeletonFrame className={className} label={label}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: cells }, (_, i) => (
            <div key={i} className={cn("rounded-md border bg-card p-1.5", variant === "month" ? "h-16 md:h-24" : "h-28")}>
              <Skeleton className="h-3 w-4" />
              {i % 5 === 1 && <Skeleton className="mt-2 h-4 w-full rounded-sm" />}
            </div>
          ))}
        </div>
      </div>
    </SkeletonFrame>
  );
};

/** Editors on open: label + input pairs and the save button. */
export const FormSkeleton = ({ fields = 4, className, label }: PresetProps & { fields?: number }) => (
  <SkeletonFrame className={className} label={label}>
    <div className="space-y-4">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full md:h-10" />
        </div>
      ))}
      <Skeleton className="h-11 w-32 md:h-10" />
    </div>
  </SkeletonFrame>
);
