import type { WorkoutSummary } from "@/types/timeline";

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
    stats.push({ key: "distance", label: labels.distance, value: `${summary.distance}${isSwimming ? "m" : "km"}` });
  if (summary.avgPace !== undefined)
    stats.push({ key: "pace", label: labels.avgPace, value: `${formatDuration(summary.avgPace)}${isSwimming ? "/100m" : "/km"}` });
  if (summary.avgSpeed !== undefined)
    stats.push({ key: "speed", label: labels.avgSpeed, value: `${summary.avgSpeed} km/h` });
  if (summary.avgHeartRate !== undefined)
    stats.push({ key: "hr", label: labels.avgHeartRate, value: `${summary.avgHeartRate} bpm` });
  if (summary.completionPercentage !== undefined && stats.length === 0)
    stats.push({ key: "completed", label: labels.completed, value: `${summary.completionPercentage}%` });
  return stats;
};

/** Accent per modality (matches the app's modality colors). */
export const modalityGradient: Record<string, { from: string; to: string; accent: string }> = {
  running: { from: "#1d4ed8", to: "#3b82f6", accent: "#60a5fa" },
  cycling: { from: "#b45309", to: "#f59e0b", accent: "#fbbf24" },
  swimming: { from: "#0e7490", to: "#06b6d4", accent: "#22d3ee" },
  strength: { from: "#6d28d9", to: "#a855f7", accent: "#c084fc" },
};
