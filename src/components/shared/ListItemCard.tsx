import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface ListItemCardProps {
  icon?: React.ReactNode;
  iconClassName?: string;
  title: React.ReactNode;
  titleClassName?: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  /** Renders outside the clickable area (e.g. a delete button) */
  actions?: React.ReactNode;
  onClick?: () => void;
  to?: string;
  className?: string;
  /** p-3 icon p-2/rounded-lg variant for use inside card sections */
  compact?: boolean;
}

export function ListItemCard({
  icon,
  iconClassName,
  title,
  titleClassName,
  subtitle,
  right,
  actions,
  onClick,
  to,
  className,
  compact = false,
}: ListItemCardProps) {
  const iconEl = icon ? (
    <div
      className={cn(
        "shrink-0 flex items-center justify-center",
        compact ? "p-2 rounded-lg" : "p-2.5 rounded-xl",
        iconClassName
      )}
    >
      {icon}
    </div>
  ) : null;

  const textEl = (
    <div className="flex-1 min-w-0">
      <p className={cn("font-semibold truncate text-sm", titleClassName)}>{title}</p>
      {subtitle != null && (
        <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
      )}
    </div>
  );

  const rightEl = right ? <div className="shrink-0">{right}</div> : null;

  // Variant with separate actions outside the click target (e.g. delete button)
  if (actions) {
    const innerContent = (
      <>
        {iconEl}
        {textEl}
        {rightEl}
      </>
    );
    const inner = to ? (
      <Link to={to} className="flex flex-1 items-center gap-3 min-w-0">
        {innerContent}
      </Link>
    ) : (
      <button onClick={onClick} className="flex flex-1 items-center gap-3 min-w-0 text-left">
        {innerContent}
      </button>
    );
    return (
      <div
        className={cn(
          "flex items-center rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all",
          compact ? "p-3 pr-2" : "p-4 pr-2",
          className
        )}
      >
        {inner}
        {actions}
      </div>
    );
  }

  const shellClass = cn(
    "flex items-center gap-3 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all",
    compact ? "p-3" : "p-4",
    className
  );

  if (to) {
    return (
      <Link to={to} className={shellClass}>
        {iconEl}
        {textEl}
        {rightEl}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={cn(shellClass, "w-full text-left")}>
        {iconEl}
        {textEl}
        {rightEl}
      </button>
    );
  }

  return (
    <div className={shellClass}>
      {iconEl}
      {textEl}
      {rightEl}
    </div>
  );
}
