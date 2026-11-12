import type { Workout } from "@/types/workout";
import { cn } from "@/lib/utils";
import { sportKey } from "../sport";
import { vizModelFromWorkout } from "./planModel";

/**
 * Shape of a planned endurance workout: one bar per step, width = time,
 * height = intensity, sport colour, easy steps lighter. Decorative for screen
 * readers apart from one label (the steps are listed below it anyway).
 */
export function PlanViz({ workout, label, className }: { workout: Workout; label: string; className?: string }) {
  const bars = vizModelFromWorkout(workout);
  if (!bars) return null;
  const sport = sportKey(workout.type);
  return (
    <div role="img" aria-label={label} className={cn("flex h-12 items-end gap-[2px]", className)}>
      {bars.map((b, i) => (
        <i
          key={i}
          aria-hidden
          className="min-w-[3px] rounded-t-[4px] rounded-b-[2px]"
          style={{
            flexGrow: b.weight,
            flexBasis: 0,
            height: `${Math.round(b.level * 100)}%`,
            backgroundColor: `hsl(var(--sport-${sport}) / ${b.easy ? 0.35 : 1})`,
          }}
        />
      ))}
    </div>
  );
}
