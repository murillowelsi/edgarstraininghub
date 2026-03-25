import { cn } from "@/lib/utils";
import { CalendarDays, Dumbbell, Shield, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

export function BottomNav() {
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { href: "/admin/users", label: t.admin.nav.users, icon: Users },
    { href: "/admin/teams", label: t.admin.nav.teams, icon: Shield },
    { href: "/admin/calendar", label: t.admin.nav.calendar, icon: CalendarDays },
    { href: "/admin/workouts", label: t.admin.nav.workouts, icon: Dumbbell },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card border-t"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
