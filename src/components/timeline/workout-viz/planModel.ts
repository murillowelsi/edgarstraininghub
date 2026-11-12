import type { Workout, WorkoutStage } from "@/types/workout";

/** One bar of the planned-workout chart */
export interface PlanBar {
  /** Relative width: the estimated seconds of the step */
  weight: number;
  /** 0..1 height: zone or pace relative to the other steps; 1 when no target */
  level: number;
  /** Warm-up, cool-down, recovery, rest: drawn lighter */
  easy: boolean;
}

export interface PlanTotals {
  /** Only when every step is by time (else it would count just the rests) */
  seconds?: number;
  km?: number;
  /** Lowest and highest zone (HR or power) among the steps */
  zones?: [number, number];
}

const EASY = new Set(["warmup", "cooldown", "recovery", "rest"]);
/** Seconds per metre when a distance step has no pace: only to size the bar */
const SEC_PER_M: Record<string, number> = { running: 0.33, cycling: 0.12, swimming: 1.2 };
const MAX_BARS = 40;

const leafSteps = (stages: WorkoutStage[]): WorkoutStage[] =>
  stages.flatMap((s) =>
    s.type === "repeat" && s.stages
      ? Array.from({ length: Math.max(1, s.repeatCount ?? 1) }, () => leafSteps(s.stages ?? [])).flat()
      : [s]
  );

const isPace = (type: string) => type === "pace" || type === "targetPace" || type === "cssBasedPace";

const stepMeters = (s: WorkoutStage): number | undefined => {
  if (s.duration?.type !== "distance" || typeof s.duration.value !== "number") return undefined;
  const v = s.duration.value;
  const unit: string = s.duration.unit ?? "";
  return unit === "km" ? v * 1000 : unit === "mi" ? v * 1609.34 : v;
};

export const stepSeconds = (s: WorkoutStage, sport: string): number | undefined => {
  if (s.duration?.type === "time" && typeof s.duration.value === "number") {
    const unit: string = s.duration.unit ?? "min";
    return unit === "sec" ? s.duration.value : unit === "h" || unit === "hours" ? s.duration.value * 3600 : s.duration.value * 60;
  }
  const m = stepMeters(s);
  if (m === undefined) return undefined;
  const pace = s.intensity && isPace(s.intensity.type) ? s.intensity.min ?? s.intensity.value : undefined;
  if (pace) {
    // decimal min/km (5.3 = 5:30) or min/100m for swimming
    const secPerUnit = Math.floor(pace) * 60 + Math.round((pace % 1) * 100);
    return sport === "swimming" ? (m / 100) * secPerUnit : (m / 1000) * secPerUnit;
  }
  return m * (SEC_PER_M[sport] ?? 0.33);
};

type RankKind = "zone" | "pace" | "value";

/** Intensity rank of a step and its kind: zone number, faster pace = higher, or the raw value */
const rank = (s: WorkoutStage): { kind: RankKind; value: number } | undefined => {
  const i = s.intensity;
  if (!i || i.type === "none") return undefined;
  if ((i.type === "heartRateZone" || i.type === "powerZone") && typeof i.value === "number") return { kind: "zone", value: i.value };
  if (isPace(i.type)) {
    const p = i.min ?? i.value;
    return typeof p === "number" && p > 0 ? { kind: "pace", value: 1 / p } : undefined;
  }
  const v = i.max ?? i.value;
  return typeof v === "number" ? { kind: "value", value: v } : undefined;
};

/**
 * Mini chart for a planned endurance workout (WS-1 / HA-4): one bar per step,
 * repeats expanded, width = estimated time, height = intensity when the coach set one.
 * null for strength or fewer than 2 steps.
 */
export const vizModelFromWorkout = (workout: Workout): PlanBar[] | null => {
  if (workout.type === "strength") return null;
  const steps = leafSteps(workout.stages ?? []).slice(0, MAX_BARS);
  if (steps.length < 2) return null;
  const ranks = steps.map(rank);
  const known = ranks.filter((r): r is { kind: RankKind; value: number } => r !== undefined);
  // Zones and paces can't share one scale: with mixed kinds, fall back to easy vs work
  const oneKind = known.length >= 2 && known.every((r) => r.kind === known[0].kind);
  const lo = oneKind ? Math.min(...known.map((r) => r.value)) : 0;
  const hi = oneKind ? Math.max(...known.map((r) => r.value)) : 0;
  return steps.map((s, i) => {
    const r = ranks[i];
    const easy = EASY.has(s.type);
    const level = !oneKind || hi === lo ? (easy ? 0.45 : 1) : r === undefined ? 0.45 : 0.3 + 0.7 * ((r.value - lo) / (hi - lo));
    return { weight: Math.max(1, stepSeconds(s, workout.type) ?? 60), level, easy };
  });
};

/** Totals for the card: only what can really be summed */
export const planTotals = (workout: Workout): PlanTotals => {
  if (workout.type === "strength") return {};
  const steps = leafSteps(workout.stages ?? []);
  const totals: PlanTotals = {};
  if (steps.length && steps.every((s) => s.duration?.type === "time")) {
    totals.seconds = steps.reduce((sum, s) => sum + (stepSeconds(s, workout.type) ?? 0), 0);
  }
  const meters = steps.reduce((sum, s) => sum + (stepMeters(s) ?? 0), 0);
  if (meters > 0) totals.km = meters / 1000;
  const zones = steps
    .filter((s) => (s.intensity?.type === "heartRateZone" || s.intensity?.type === "powerZone") && typeof s.intensity.value === "number")
    .map((s) => s.intensity.value as number);
  if (zones.length) totals.zones = [Math.min(...zones), Math.max(...zones)];
  return totals;
};
