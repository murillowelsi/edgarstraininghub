import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import { Link } from "react-router-dom";

// Compact next to the "EZ" logo (32px tall). The ::after extends the hit area to 40px.
// The press is plain CSS: a motion whileTap gets cut off when the tap opens a
// drawer or navigates (the toolbar remounts per page) and can stick on touch.
const buttonClass = (active?: boolean, className?: string) =>
  cn(
    "relative h-7 w-7 flex items-center justify-center rounded-full [-webkit-tap-highlight-color:transparent]",
    "after:absolute after:-inset-1.5 after:content-['']",
    "[&_svg]:h-4 [&_svg]:w-4",
    "transition-[transform,background-color,color] duration-150 ease-out active:scale-90 motion-reduce:active:scale-100",
    // No default focus outline (it stays after a drawer closes); a soft ring for keyboard users only
    "outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
    // Touch screens keep :hover after a tap, so only hover-capable pointers get the tint
    active ? "text-primary glass-lens" : "[@media(hover:hover)]:hover:bg-foreground/5 active:bg-foreground/10",
    className
  );

/** iOS-style glass capsule grouping toolbar buttons. */
export function GlassToolbar({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("glass flex items-center gap-1 p-[3px] rounded-full", className)}>{children}</div>;
}

interface GlassIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const GlassIconButton = forwardRef<HTMLButtonElement, GlassIconButtonProps>(
  ({ active, className, children, ...props }, ref) => (
    <button ref={ref} type="button" className={buttonClass(active, className)} {...props}>
      {children}
    </button>
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
    <Link to={to} className={buttonClass(active, className)} aria-label={rest["aria-label"]}>
      {children}
    </Link>
  );
}

// Stand-alone glass circle (Strava-style top bar): one button per circle, 40px.
// The ::after (::before is the glass highlight) extends the hit area to 44px.
const circleClass = (active?: boolean, className?: string) =>
  cn(
    "after:absolute after:-inset-0.5 after:rounded-full after:content-['']",
    "glass h-10 w-10 shrink-0 flex items-center justify-center rounded-full [-webkit-tap-highlight-color:transparent]",
    "[&_svg]:h-5 [&_svg]:w-5",
    "transition-[transform,color] duration-150 ease-out active:scale-90 motion-reduce:active:scale-100",
    "outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
    active ? "text-primary" : "text-foreground",
    className
  );

export const GlassCircleButton = forwardRef<HTMLButtonElement, GlassIconButtonProps>(
  ({ active, className, children, ...props }, ref) => (
    <button ref={ref} type="button" className={circleClass(active, className)} {...props}>
      {children}
    </button>
  )
);
GlassCircleButton.displayName = "GlassCircleButton";

export function GlassCircleLink({ to, active, className, children, ...rest }: GlassIconLinkProps) {
  return (
    <Link to={to} className={circleClass(active, className)} aria-label={rest["aria-label"]}>
      {children}
    </Link>
  );
}
