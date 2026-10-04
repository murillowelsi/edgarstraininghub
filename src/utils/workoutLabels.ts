import type ptTranslations from "@/translations/pt.json";
import type {
  DurationType,
  IntensityType,
  StageType,
  SwimmingDrillType,
  SwimmingEquipmentType,
  SwimmingStrokeType,
  WorkoutType,
} from "@/types/workout";
import type { MuscleGroup } from "@/types/exercise";

type Translations = typeof ptTranslations;

/**
 * Localised lookups for the workout enums. The maps exported from `@/types/workout`
 * stay as English fallbacks for non-UI code; anything user-facing should go through here.
 */
export const workoutLabels = (t: Translations) => ({
  type: (v: WorkoutType) => t.workoutMeta.types[v] ?? v,
  stage: (v: StageType) => t.workoutMeta.stages[v] ?? v,
  duration: (v: DurationType) => t.workoutMeta.durations[v] ?? v,
  intensity: (v: IntensityType) => t.workoutMeta.intensities[v] ?? v,
  stroke: (v: SwimmingStrokeType) => t.workoutMeta.strokes[v] ?? v,
  drill: (v: SwimmingDrillType) => t.workoutMeta.drills[v] ?? v,
  swimEquipment: (v: SwimmingEquipmentType) => t.workoutMeta.swimEquipment[v] ?? v,
  muscleGroup: (v: MuscleGroup) => t.workout.muscleGroups[v] ?? v,
});

export type WorkoutLabels = ReturnType<typeof workoutLabels>;
