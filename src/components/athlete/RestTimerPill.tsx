import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Timer } from "lucide-react";

interface Props {
  remainingSec: number;
  durationSec: number;
  nextLabel?: string;
  labels: { rest: string; skip: string };
  onAdjust: (deltaSec: number) => void;
  onSkip: () => void;
}

const formatClock = (seconds: number) => {
  const s = Math.max(0, seconds);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
};

const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const pressSpring = { type: "spring", stiffness: 600, damping: 22 } as const;

/** Floating glass rest countdown shown above the session bar after a set is ticked. */
const RestTimerPill = ({ remainingSec, durationSec, nextLabel, labels, onAdjust, onSkip }: Props) => {
  const fraction = durationSec > 0 ? Math.min(1, Math.max(0, remainingSec / durationSec)) : 0;
  const almostDone = remainingSec <= 5;

  return (
    <motion.div
      initial={{ y: 24, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 24, opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className="glass rounded-[28px] p-2 pl-2.5 flex items-center gap-2"
      role="timer"
      aria-live="off"
    >
      {/* Countdown ring */}
      <div className="relative h-12 w-12 shrink-0">
        <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90">
          <circle cx="24" cy="24" r={RING_RADIUS} className="fill-none stroke-foreground/10" strokeWidth="4" />
          <circle
            cx="24"
            cy="24"
            r={RING_RADIUS}
            className={cn("fill-none transition-[stroke-dashoffset] duration-1000 ease-linear", almostDone ? "stroke-red-500" : "stroke-primary")}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - fraction)}
          />
        </svg>
        <Timer className="absolute inset-0 m-auto h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground leading-none">{labels.rest}</p>
        <p className={cn("text-2xl font-mono font-bold tabular-nums leading-tight", almostDone ? "text-red-500" : "text-foreground")}>
          {formatClock(remainingSec)}
        </p>
        {nextLabel && <p className="text-[11px] text-muted-foreground truncate leading-tight">{nextLabel}</p>}
      </div>

      <motion.button
        whileTap={{ scale: 0.88 }}
        transition={pressSpring}
        onClick={() => onAdjust(-15)}
        className="glass-lens h-11 w-11 shrink-0 rounded-full text-sm font-semibold tabular-nums"
      >
        −15
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.88 }}
        transition={pressSpring}
        onClick={() => onAdjust(15)}
        className="glass-lens h-11 w-11 shrink-0 rounded-full text-sm font-semibold tabular-nums"
      >
        +15
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.92 }}
        transition={pressSpring}
        onClick={onSkip}
        className="h-11 shrink-0 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
      >
        {labels.skip}
      </motion.button>
    </motion.div>
  );
};

export default RestTimerPill;
