import type { WorkoutSummary } from "@/types/timeline";
import { swimDistanceMeters } from "@/utils/activityFormat";

export interface SummaryStat {
  key: string;
  label: string;
  value: string;
}

export const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

interface StatLabels {
  time: string;
  distance: string;
  avgHeartRate: string;
  avgPace: string;
  avgSpeed: string;
  completed: string;
  volume: string;
  sets: string;
  records: string;
}

/**
 * The headline numbers of a workout, in display order. Shared by the feed
 * card, the photo overlay and the Stories image so they always agree.
 */
export const summaryStats = (summary: WorkoutSummary, labels: StatLabels, locale: string): SummaryStat[] => {
  const stats: SummaryStat[] = [];
  const isSwimming = summary.workoutType === "swimming";

  if (summary.elapsedTime !== undefined && summary.elapsedTime > 0)
    stats.push({ key: "time", label: labels.time, value: formatDuration(summary.elapsedTime) });

  if (summary.workoutType === "strength") {
    if (summary.volumeKg !== undefined && summary.volumeKg > 0)
      stats.push({ key: "volume", label: labels.volume, value: `${Math.round(summary.volumeKg).toLocaleString(locale)} kg` });
    if (summary.workingSets !== undefined)
      stats.push({
        key: "sets",
        label: labels.sets,
        value: summary.totalSets ? `${summary.workingSets}/${summary.totalSets}` : String(summary.workingSets),
      });
    if (summary.records)
      stats.push({ key: "records", label: labels.records, value: `${summary.records} 🏆` });
    // Older strength posts only stored the completion percentage
    if (stats.length <= 1 && summary.completionPercentage !== undefined)
      stats.push({ key: "completed", label: labels.completed, value: `${summary.completionPercentage}%` });
    return stats;
  }

  if (summary.distance !== undefined)
    stats.push({ key: "distance", label: labels.distance, value: isSwimming ? `${swimDistanceMeters(summary.distance)} m` : `${summary.distance.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km` });
  if (summary.avgPace !== undefined)
    stats.push({ key: "pace", label: labels.avgPace, value: `${formatDuration(summary.avgPace)} ${isSwimming ? "/100m" : "/km"}` });
  if (summary.avgSpeed !== undefined)
    stats.push({ key: "speed", label: labels.avgSpeed, value: `${summary.avgSpeed.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km/h` });
  if (summary.avgHeartRate !== undefined)
    stats.push({ key: "hr", label: labels.avgHeartRate, value: `${summary.avgHeartRate} bpm` });
  if (summary.completionPercentage !== undefined && stats.length === 0)
    stats.push({ key: "completed", label: labels.completed, value: `${summary.completionPercentage}%` });
  return stats;
};

/** One number on the workout card, split so the unit can be styled apart. */
export interface CardMetric {
  key: string;
  label: string;
  value: string;
  unit?: string;
}

export interface WorkoutCardModel {
  /** The number that tells the story (distance; time for strength, since summed load reads like a single lift; time as fallback) */
  hero?: CardMetric;
  /** Up to 3 supporting numbers; missing values are left out, never "—" */
  secondary: CardMetric[];
}

/**
 * Numbers for the redesigned feed card (docs/design/feed): one hero number and
 * up to three secondaries per sport. Blocks without data disappear.
 */
export const workoutCardModel = (summary: WorkoutSummary, labels: StatLabels, locale: string): WorkoutCardModel => {
  const isSwim = summary.workoutType === "swimming";
  const num = (n: number, digits = 0) =>
    n.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const m: Record<string, CardMetric | undefined> = {};

  if (summary.elapsedTime && summary.elapsedTime > 0)
    m.time = { key: "time", label: labels.time, value: formatDuration(summary.elapsedTime) };
  if (summary.distance !== undefined && summary.distance > 0)
    m.distance = isSwim
      ? { key: "distance", label: labels.distance, value: num(swimDistanceMeters(summary.distance) ?? 0), unit: "m" }
      : { key: "distance", label: labels.distance, value: num(summary.distance, 2), unit: "km" };
  if (summary.avgPace !== undefined && summary.avgPace > 0)
    m.pace = { key: "pace", label: labels.avgPace, value: formatDuration(Math.round(summary.avgPace)), unit: isSwim ? "/100m" : "/km" };
  if (summary.avgSpeed !== undefined && summary.avgSpeed > 0)
    m.speed = { key: "speed", label: labels.avgSpeed, value: num(summary.avgSpeed, 1), unit: "km/h" };
  if (summary.avgHeartRate !== undefined && summary.avgHeartRate > 0)
    m.hr = { key: "hr", label: labels.avgHeartRate, value: String(Math.round(summary.avgHeartRate)), unit: "bpm" };
  if (summary.volumeKg !== undefined && summary.volumeKg > 0)
    m.volume = { key: "volume", label: labels.volume, value: num(Math.round(summary.volumeKg)), unit: "kg" };
  if (summary.workingSets !== undefined)
    m.sets = {
      key: "sets",
      label: labels.sets,
      value: summary.totalSets ? `${summary.workingSets}/${summary.totalSets}` : String(summary.workingSets),
    };

  const order: Record<string, { hero: string[]; secondary: string[] }> = {
    running: { hero: ["distance", "time"], secondary: ["time", "pace", "hr"] },
    cycling: { hero: ["distance", "time"], secondary: ["time", "speed", "hr"] },
    swimming: { hero: ["distance", "time"], secondary: ["time", "pace", "hr"] },
    strength: { hero: ["time", "sets", "volume"], secondary: ["sets", "volume"] },
  };
  const o = order[summary.workoutType] ?? order.running;
  const heroKey = o.hero.find((k) => m[k]);
  const hero = heroKey ? m[heroKey] : undefined;
  const secondary = o.secondary.filter((k) => k !== heroKey && m[k]).map((k) => m[k]!) .slice(0, 3);
  return { hero, secondary };
};
