import type { WorkoutStage } from "@/types/workout";
import {
  drillLabels,
  durationLabels,
  equipmentLabels,
  heartRateZoneLabels,
  intensityLabels,
  powerZoneLabels,
  strokeLabels,
} from "@/types/workout";

export const formatDuration = (stage: WorkoutStage, lapButtonLabel = "Press Lap Button"): string => {
  if (stage.duration.type === "lapButton") return lapButtonLabel;
  if (stage.duration.value !== undefined) {
    return `${stage.duration.value} ${stage.duration.unit || ""}`;
  }
  return durationLabels[stage.duration.type];
};

export const formatIntensity = (stage: WorkoutStage): string | null => {
  if (stage.intensity.type === "none") return null;
  if (stage.intensity.type === "pace" && stage.intensity.value) {
    return `${stage.intensity.value} ${stage.intensity.unit || "min/km"}`;
  }
  if (stage.intensity.type === "heartRateZone" && stage.intensity.value !== undefined) {
    return heartRateZoneLabels[stage.intensity.value] ?? `Zone ${stage.intensity.value}`;
  }
  if (stage.intensity.type === "powerZone" && stage.intensity.value !== undefined) {
    return powerZoneLabels[stage.intensity.value] ?? `Zone ${stage.intensity.value}`;
  }
  if (stage.intensity.min !== undefined && stage.intensity.max !== undefined) {
    return `${stage.intensity.min}-${stage.intensity.max} ${stage.intensity.unit || ""}`;
  }
  return intensityLabels[stage.intensity.type];
};

export const formatSwimmingDetails = (stage: WorkoutStage): string[] => {
  const details: string[] = [];
  if (stage.strokeType) details.push(strokeLabels[stage.strokeType]);
  if (stage.drillType && stage.drillType !== "none") details.push(drillLabels[stage.drillType]);
  if (stage.equipment && stage.equipment !== "none") details.push(equipmentLabels[stage.equipment]);
  return details;
};
