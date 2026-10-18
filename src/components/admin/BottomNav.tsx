import { Calendar, Dumbbell, Home, LayoutGrid, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToMentionCount } from "@/services/timelineService";
import { GlassTabBar } from "@/components/glass/GlassTabBar";

export function BottomNav() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [feedUnreadCount, setFeedUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    return subscribeToMentionCount(user.uid, setFeedUnreadCount);
  }, [user]);

  const navItems = [
    { href: "/admin", label: t.admin.nav.home, icon: Home, exact: true },
    { href: "/admin/users", label: t.admin.nav.users, icon: Users },
    { href: "/admin/timeline", label: t.admin.nav.timeline, icon: LayoutGrid, badge: feedUnreadCount },
    { href: "/admin/calendar", label: t.admin.nav.calendar, icon: Calendar },
    { href: "/admin/workouts", label: t.admin.nav.workouts, icon: Dumbbell },
  ];

  return <GlassTabBar id="admin" items={navItems} className="z-40 md:hidden" />;
}
