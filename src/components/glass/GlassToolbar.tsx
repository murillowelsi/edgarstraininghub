import { cn } from "@/lib/utils";
import { MotionConfig, motion, type HTMLMotionProps } from "motion/react";
import { forwardRef } from "react";
import { Link } from "react-router-dom";

const pressSpring = { type: "spring", stiffness: 600, damping: 22 } as const;

const buttonClass = (active?: boolean, className?: string) =>
  cn(
    "relative h-9 w-9 flex items-center justify-center rounded-full transition-colors [-webkit-tap-highlight-color:transparent]",
    active ? "text-primary glass-lens" : "hover:bg-foreground/5",
    className
  );

/** iOS-style glass capsule grouping toolbar buttons. */
export function GlassToolbar({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className={cn("glass flex items-center gap-0.5 p-1 rounded-full", className)}>{children}</div>
    </MotionConfig>
  );
}

interface GlassIconButtonProps extends HTMLMotionProps<"button"> {
  active?: boolean;
}

export const GlassIconButton = forwardRef<HTMLButtonElement, GlassIconButtonProps>(
  ({ active, className, children, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.85 }}
      transition={pressSpring}
      className={buttonClass(active, className)}
      {...props}
    >
      {children}
    </motion.button>
  )
);
GlassIconButton.displayName = "GlassIconButton";

interface GlassIconLinkProps {
  to: string;
  active?: boolean;
  className?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}

export function GlassIconLink({ to, active, className, children, ...rest }: GlassIconLinkProps) {
  return (
    <motion.div whileTap={{ scale: 0.85 }} transition={pressSpring}>
      <Link to={to} className={buttonClass(active, className)} aria-label={rest["aria-label"]}>
        {children}
      </Link>
    </motion.div>
  );
}
