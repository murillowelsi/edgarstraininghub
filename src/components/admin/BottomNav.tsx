import { cn } from "@/lib/utils";
import { Calendar, Dumbbell, Home, LayoutGrid, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToMentionCount } from "@/services/timelineService";

export function BottomNav() {
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [feedUnreadCount, setFeedUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    return subscribeToMentionCount(user.uid, setFeedUnreadCount);
  }, [user]);

  const navItems = [
    { href: "/admin", label: t.admin.nav.home, icon: Home, exact: true, featured: false },
    { href: "/admin/users", label: t.admin.nav.users, icon: Users, featured: false },
    { href: "/admin/timeline", label: "Feed", icon: LayoutGrid, featured: true },
    { href: "/admin/calendar", label: t.admin.nav.calendar, icon: Calendar, featured: false },
    { href: "/admin/workouts", label: t.admin.nav.workouts, icon: Dumbbell, featured: false },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card border-t"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const active = item.exact
            ? location.pathname === item.href
            : location.pathname.startsWith(item.href);
          const badgeCount = item.href === "/admin/timeline" ? feedUnreadCount : 0;
          return (
            <Link
              key={item.href}
              to={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 text-xs transition-colors"
            >
              <div className="relative">
                <div className={cn(
                  "flex items-center justify-center transition-all",
                  active ? "text-primary" : "text-muted-foreground"
                )}>
                  <item.icon className="h-5 w-5" />
                </div>
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </div>
              <span className={cn(active ? "text-primary font-semibold" : "text-muted-foreground")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
