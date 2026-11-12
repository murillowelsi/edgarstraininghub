import type { ActivityData } from "@/types/workoutAssignment";
import type { WorkoutType } from "@/types/workout";

export const formatTime = (seconds?: number | null): string => {
  if (!seconds && seconds !== 0) return "—";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}h ${mins}min`;
  return `${mins}min ${secs.toString().padStart(2, "0")}s`;
};

export const formatTimeShort = (seconds?: number | null): string => {
  if (!seconds && seconds !== 0) return "—";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/** Decimal number in the app language (LanguageContext keeps <html lang> in sync). */
export const formatDecimal = (value: number, digits: number): string =>
  value.toLocaleString(document.documentElement.lang === "pt" ? "pt-BR" : "en", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/**
 * ActivityData.distance is km for running/cycling and METRES for swimming.
 * Until Nov 2026 EditActivitySheet saved swims in km (e.g. 1.5 for 1500 m).
 * Defensive read: a swim value under 25 can't be metres (one pool length is
 * 25 m) and is read as km. Every swim read goes through this helper.
 */
export const LEGACY_SWIM_KM_THRESHOLD = 25;

export const swimDistanceMeters = (value?: number | null): number | undefined => {
  if (value == null || Number.isNaN(value)) return undefined;
  return value < LEGACY_SWIM_KM_THRESHOLD ? Math.round(value * 1000) : value;
};

/** Stored distance converted to km for any sport (charts, totals). */
export const distanceInKm = (value: number | null | undefined, type?: WorkoutType): number => {
  if (value == null || Number.isNaN(value)) return 0;
  return type === "swimming" ? (swimDistanceMeters(value) ?? 0) / 1000 : value;
};

/** Seconds per km (running) from total seconds and km. */
export const pacePerKm = (elapsedSec: number, km: number): number | undefined =>
  elapsedSec > 0 && km > 0 ? elapsedSec / km : undefined;

/** Seconds per 100 m (swimming) from total seconds and metres. */
export const pacePer100m = (elapsedSec: number, meters: number): number | undefined =>
  elapsedSec > 0 && meters > 0 ? elapsedSec / (meters / 100) : undefined;

/** `value` is the stored distance: km, or metres for swimming. */
export const formatDistance = (value?: number | null, type?: WorkoutType): string => {
  if (value == null) return "—";
  if (type === "swimming") return `${Math.round(swimDistanceMeters(value) ?? 0)} m`;
  return `${formatDecimal(value, 2)} km`;
};

export const formatPace = (secondsPerKm?: number | null, type?: WorkoutType): string => {
  if (!secondsPerKm) return "—";
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.floor(secondsPerKm % 60);
  const unit = type === "swimming" ? "/100m" : "/km";
  return `${mins}:${secs.toString().padStart(2, "0")} ${unit}`;
};

export const formatSpeed = (kmh?: number | null): string => {
  if (kmh == null) return "—";
  return `${formatDecimal(kmh, 1)} km/h`;
};

export const formatHeartRate = (bpm?: number | null): string => {
  if (!bpm) return "—";
  return `${Math.round(bpm)} bpm`;
};

export const getActivityHeadline = (
  type: WorkoutType,
  data?: ActivityData
): { primary: string; secondary: string; tertiary: string } => {
  if (type === "swimming") {
    return {
      primary: formatDistance(data?.distance, type),
      secondary: formatTimeShort(data?.elapsedTime),
      tertiary: formatPace(data?.avgPace, type),
    };
  }
  if (type === "cycling") {
    return {
      primary: formatDistance(data?.distance, type),
      secondary: formatTimeShort(data?.elapsedTime),
      tertiary: formatSpeed(data?.avgSpeed),
    };
  }
  return {
    primary: formatDistance(data?.distance, type),
    secondary: formatPace(data?.avgPace, type),
    tertiary: formatTimeShort(data?.elapsedTime),
  };
};
