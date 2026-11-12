import { useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarSkeleton,
  DetailSkeleton,
  FeedSkeleton,
  FormSkeleton,
  ListSkeleton,
  StatsSkeleton,
  TodaySkeleton,
} from "@/components/feedback/skeletons";

/**
 * App start (auth + role still loading): the shell of the area the URL points
 * to, with the screen's skeleton inside, instead of a full-screen spinner.
 * Coach = top bar + sidebar (desktop) / tab bar (mobile); athlete = top bar + tab bar.
 */
const screenFor = (path: string) => {
  if (path.startsWith("/admin")) {
    if (path === "/admin") return <StatsSkeleton />;
    if (path.startsWith("/admin/calendar")) return <CalendarSkeleton />;
    if (/\/(new|edit)\b/.test(path)) return <FormSkeleton />;
    if (/^\/admin\/(athletes|teams)\/[^/]+/.test(path)) return <DetailSkeleton />;
    return <ListSkeleton />;
  }
  if (path === "/athlete" || path === "/app") return <TodaySkeleton />;
  if (path.startsWith("/athlete/calendar")) return <CalendarSkeleton />;
  if (path.startsWith("/athlete/timeline")) return <FeedSkeleton />;
  if (/^\/athlete\/(workout|activity|events|teams)\/[^/]+/.test(path)) return <DetailSkeleton />;
  return <ListSkeleton />;
};

const TabBar = ({ className }: { className?: string }) => (
  <div
    aria-hidden="true"
    className={`fixed inset-x-5 z-chrome mx-auto max-w-lg ${className ?? ""}`}
    style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
  >
    <div className="flex h-[60px] items-center justify-around rounded-full border bg-card/80 px-4">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-7 w-7 rounded-full" />
      ))}
    </div>
  </div>
);

const Logo = () => (
  <span className="text-primary font-display font-extrabold text-3xl tracking-tighter leading-none">EZ</span>
);

export const AppShellSkeleton = () => {
  const { pathname } = useLocation();
  const screen = screenFor(pathname);

  if (pathname.startsWith("/admin")) {
    return (
      <div data-app-shell-skeleton="coach" className="min-h-screen bg-background">
        <header aria-hidden="true" className="fixed z-chrome w-full bg-background px-4 py-4 md:pl-7 md:pr-8">
          <div className="flex h-10 items-center justify-between">
            <Logo />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </header>
        <div className="flex pt-[73px]">
          <aside aria-hidden="true" className="fixed left-0 top-[73px] hidden h-[calc(100vh-73px)] w-64 flex-col gap-2 border-r bg-card p-3 pt-4 md:flex">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </aside>
          <main className="flex-1 p-4 pb-28 md:ml-64 md:p-8">{screen}</main>
        </div>
        <TabBar className="md:hidden" />
      </div>
    );
  }

  return (
    <div data-app-shell-skeleton="athlete" className="min-h-screen bg-background">
      <header aria-hidden="true" className="sticky top-0 z-chrome bg-background pt-[env(safe-area-inset-top)]">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <Logo />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl p-4 pb-28">{screen}</main>
      <TabBar />
    </div>
  );
};
