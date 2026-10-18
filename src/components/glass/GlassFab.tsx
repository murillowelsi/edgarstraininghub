import { cn } from "@/lib/utils";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Plus } from "lucide-react";
import { useState } from "react";

export interface GlassFabAction {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}

interface GlassFabProps {
  label: string;
  /** Single action; ignored when `actions` is given */
  onClick?: () => void;
  /** Speed dial: the button opens a stack of labelled actions */
  actions?: GlassFabAction[];
  icon?: React.ElementType;
  /** Breakpoint from which the FAB is hidden (desktop shows inline buttons instead) */
  hideFrom?: "sm" | "md" | "lg";
  className?: string;
}

const spring = { type: "spring", stiffness: 500, damping: 28 } as const;

/**
 * Floating action button in the app's liquid-glass style, sitting above the
 * floating tab bar. With `actions` it becomes a speed dial.
 */
export function GlassFab({ label, onClick, actions, icon: Icon = Plus, hideFrom = "sm", className }: GlassFabProps) {
  const [open, setOpen] = useState(false);
  const isDial = !!actions?.length;
  const hidden = hideFrom === "sm" ? "sm:hidden" : hideFrom === "md" ? "md:hidden" : "lg:hidden";

  return (
    <MotionConfig reducedMotion="user">
      {/* Backdrop while the dial is open */}
      <AnimatePresence>
        {isDial && open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn("fixed inset-0 z-20 bg-black/25 backdrop-blur-[2px]", hidden)}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <div
        className={cn("fixed right-4 z-30 flex flex-col items-end gap-3", hidden, className)}
        // Clears the floating glass tab bar (h-16 + 0.75rem gap)
        style={{ bottom: "calc(5.75rem + env(safe-area-inset-bottom))" }}
      >
        <AnimatePresence>
          {isDial && open && (
            <motion.div key="dial" className="flex flex-col items-end gap-2">
              {actions!.map((action, i) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 12, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { ...spring, delay: (actions!.length - 1 - i) * 0.04 } }}
                  exit={{ opacity: 0, y: 8, scale: 0.9, transition: { duration: 0.12 } }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    setOpen(false);
                    action.onClick();
                  }}
                  className="glass flex items-center gap-2.5 rounded-full pl-3.5 pr-4 h-11 text-sm font-medium"
                >
                  <action.icon className="h-4 w-4 shrink-0 text-primary" />
                  <span>{action.label}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.88 }}
          transition={spring}
          onClick={() => (isDial ? setOpen((v) => !v) : onClick?.())}
          aria-label={label}
          aria-expanded={isDial ? open : undefined}
          className="glass h-14 w-14 rounded-full flex items-center justify-center text-primary [-webkit-tap-highlight-color:transparent]"
        >
          <motion.span animate={{ rotate: isDial && open ? 45 : 0 }} transition={spring} className="flex">
            <Icon className="h-6 w-6" strokeWidth={2.4} />
          </motion.span>
        </motion.button>
      </div>
    </MotionConfig>
  );
}
