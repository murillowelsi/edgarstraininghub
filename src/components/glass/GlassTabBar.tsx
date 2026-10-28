import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { MotionConfig, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

export interface GlassTabItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: number;
}

interface GlassTabBarProps {
  items: GlassTabItem[];
  /** Distinguishes bars so each remembers its own last active tab */
  id: string;
  /** Accessible name of the <nav>; defaults to "Main" */
  label?: string;
  className?: string;
}

// Pages mount their own layout, so the bar remounts on every route change.
// Remember the last active tab per bar so the lens slides from it
// horizontally (a layoutId shared animation measures page coordinates and
// jumps vertically when the previous page was scrolled).
const lastActiveIndex = new Map<string, number>();

/** Floating liquid-glass tab bar with a sliding selection lens. */
export function GlassTabBar({ items, id, label, className }: GlassTabBarProps) {
  const location = useLocation();
  const { t } = useLanguage();

  const isActive = (item: GlassTabItem) =>
    item.exact ? location.pathname === item.href : location.pathname.startsWith(item.href);

  const activeIndex = items.findIndex(isActive);
  const [fromIndex] = useState(() => lastActiveIndex.get(id) ?? activeIndex);
  useEffect(() => {
    if (activeIndex >= 0) lastActiveIndex.set(id, activeIndex);
  }, [id, activeIndex]);

  const startIndex = fromIndex >= 0 ? fromIndex : activeIndex;

  return (
    <MotionConfig reducedMotion="user">
      <nav
        aria-label={label ?? t.common.mainNavigation}
        className={cn("fixed inset-x-5 z-50 mx-auto max-w-lg", className)}
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {/* Proportions follow the Strava tab bar: 20px side margins, 60px tall, 22px icons, 11px labels */}
        <div className="glass flex items-center h-[60px] p-[5px] rounded-full">
          <div className="absolute inset-[5px] pointer-events-none">
            {activeIndex >= 0 && (
              <motion.span
                className="glass-lens absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${100 / items.length}%` }}
                initial={{ x: `${startIndex * 100}%` }}
                animate={{
                  x: `${activeIndex * 100}%`,
                  // Brief stretch while travelling, like the iOS tab bar
                  scaleX: startIndex !== activeIndex ? [1, 1.18, 1] : 1,
                }}
                transition={{
                  x: { type: "spring", stiffness: 420, damping: 32, mass: 0.9 },
                  scaleX: { duration: 0.35, ease: "easeOut" },
                }}
              />
            )}
          </div>
          {items.map((item, index) => {
            const active = index === activeIndex;
            const badge = item.badge ?? 0;
            return (
              <Link
                key={item.href}
                to={item.href}
                aria-current={active ? "page" : undefined}
                className="relative flex-1 h-full rounded-full [-webkit-tap-highlight-color:transparent]"
              >
                <motion.div
                  whileTap={{ scale: 0.86 }}
                  transition={{ type: "spring", stiffness: 600, damping: 22 }}
                  className="relative z-10 flex flex-col items-center justify-center h-full"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ scale: active ? 1.12 : 1, y: active ? -1 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 18 }}
                      className={cn(
                        "flex items-center justify-center transition-colors duration-200",
                        active ? "text-primary" : "text-foreground/60"
                      )}
                    >
                      <item.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
                    </motion.div>
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[11px] mt-0.5 transition-colors duration-200",
                      active ? "text-primary font-semibold" : "text-foreground/60 font-medium"
                    )}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>
    </MotionConfig>
  );
}
