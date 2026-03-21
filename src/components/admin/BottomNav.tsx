import { cn } from "@/lib/utils";
import { CalendarDays, Dumbbell, FileText, MessageSquare, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface BottomNavProps {
  chatUnreadCount: number;
}

export function BottomNav({ chatUnreadCount }: BottomNavProps) {
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { href: "/admin/posts", label: t.admin.nav.posts, icon: FileText },
    { href: "/admin/users", label: t.admin.nav.users, icon: Users },
    { href: "/admin/workouts", label: t.admin.nav.workouts, icon: Dumbbell },
    { href: "/admin/calendar", label: t.admin.nav.calendar, icon: CalendarDays },
    { href: "/admin/chat", label: t.admin.nav.chat, icon: MessageSquare },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card border-t"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          const showBadge = item.href === "/admin/chat" && chatUnreadCount > 0;

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
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
