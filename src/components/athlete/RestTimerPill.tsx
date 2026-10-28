import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Timer } from "lucide-react";

interface Props {
  remainingSec: number;
  durationSec: number;
  nextLabel?: string;
  labels: { rest: string; skip: string; subtract: string; add: string };
  onAdjust: (deltaSec: number) => void;
  onSkip: () => void;
}

const formatClock = (seconds: number) => {
  const s = Math.max(0, seconds);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
};

const RING_RADIUS = 15;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const pressSpring = { type: "spring", stiffness: 600, damping: 22 } as const;

/**
 * Compact rest countdown strip that sits inside the floating session bar, on top
 * of the cancel / time / save row, so both stay reachable without two tall pills.
 */
const RestTimerPill = ({ remainingSec, durationSec, nextLabel, labels, onAdjust, onSkip }: Props) => {
  const fraction = durationSec > 0 ? Math.min(1, Math.max(0, remainingSec / durationSec)) : 0;
  const almostDone = remainingSec <= 5;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className="overflow-hidden"
    >
      <div
        className="flex items-center gap-1.5 px-1 pt-0.5 pb-1.5 border-b border-foreground/10 mb-1.5"
        role="timer"
        aria-live="off"
        aria-label={`${labels.rest} ${formatClock(remainingSec)}`}
      >
        {/* Countdown ring */}
        <div className="relative h-10 w-10 shrink-0">
          <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
            <circle cx="18" cy="18" r={RING_RADIUS} className="fill-none stroke-foreground/10" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r={RING_RADIUS}
              className={cn("fill-none transition-[stroke-dashoffset] duration-1000 ease-linear", almostDone ? "stroke-red-500" : "stroke-primary")}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - fraction)}
            />
          </svg>
          <Timer className="absolute inset-0 m-auto h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn("text-lg font-mono font-bold tabular-nums leading-none", almostDone ? "text-red-500" : "text-foreground")}>
            {formatClock(remainingSec)}
          </p>
          {/* Set number comes first and the line may wrap, so it's never cut off */}
          {nextLabel && <p className="mt-0.5 text-[11px] text-muted-foreground leading-tight line-clamp-2 break-words">{nextLabel}</p>}
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          transition={pressSpring}
          onClick={() => onAdjust(-15)}
          aria-label={labels.subtract}
          className="glass-lens h-10 w-10 shrink-0 rounded-full text-xs font-semibold tabular-nums"
        >
          −15
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          transition={pressSpring}
          onClick={() => onAdjust(15)}
          aria-label={labels.add}
          className="glass-lens h-10 w-10 shrink-0 rounded-full text-xs font-semibold tabular-nums"
        >
          +15
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          transition={pressSpring}
          onClick={onSkip}
          className="h-10 shrink-0 px-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
        >
          {labels.skip}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default RestTimerPill;
