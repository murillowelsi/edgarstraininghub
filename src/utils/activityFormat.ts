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

export const formatDistance = (km?: number | null, type?: WorkoutType): string => {
  if (km == null) return "—";
  if (type === "swimming") return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(2).replace(".", ",")} km`;
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
  return `${kmh.toFixed(1).replace(".", ",")} km/h`;
};

export const formatHeartRate = (bpm?: number | null): string => {
  if (!bpm) return "—";
  return `${Math.round(bpm)} bpm`;
};

export const formatElevation = (meters?: number | null): string => {
  if (meters == null) return "—";
  return `${Math.round(meters)} m`;
};

export const formatCalories = (kcal?: number | null): string => {
  if (kcal == null) return "—";
  return `${Math.round(kcal)} kcal`;
};

export const formatCadence = (value?: number | null, type?: WorkoutType): string => {
  if (value == null) return "—";
  const unit = type === "cycling" ? "rpm" : "spm";
  return `${Math.round(value)} ${unit}`;
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
