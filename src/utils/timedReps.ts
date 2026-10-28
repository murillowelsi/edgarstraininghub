// Coaches write timed holds in the reps field: "20 seconds", "30s", "45 seg", "1 min"
const TIMED_REPS =
  /^\s*(\d+(?:[.,]\d+)?)\s*(s|sec|secs|second|seconds|seg|segs|segundo|segundos|min|mins|minute|minutes|minuto|minutos)\.?\s*$/i;

/** Seconds per set when the reps text is a duration, else null. */
export const parseTimedReps = (reps?: string | null): number | null => {
  const match = reps?.match(TIMED_REPS);
  if (!match) return null;
  const value = parseFloat(match[1].replace(",", "."));
  const seconds = match[2].toLowerCase().startsWith("m") ? value * 60 : value;
  return seconds > 0 ? Math.round(seconds) : null;
};

/** 20 → "20s", 60 → "1 min", 90 → "1:30" */
export const formatHold = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m}:${String(s).padStart(2, "0")}`;
};
