import { cn } from "@/lib/utils";
import { Loader2, Plus } from "lucide-react";

/**
 * "+" on a library row. Once the exercise is in the workout it turns into a
 * filled badge with how many times it was added; tapping adds it again.
 */
export function AddExerciseButton({
  count = 0,
  loading,
  onClick,
  label,
}: {
  count?: number;
  loading?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={loading}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "shrink-0 h-9 min-w-9 px-2 rounded-full flex items-center justify-center gap-0.5 text-sm font-semibold transition-colors active:scale-95",
        count > 0
          ? "bg-primary text-primary-foreground"
          : "border border-border text-muted-foreground hover:text-primary hover:border-primary/50"
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          {count > 0 && <span className="tabular-nums pr-0.5">{count}</span>}
        </>
      )}
    </button>
  );
}
