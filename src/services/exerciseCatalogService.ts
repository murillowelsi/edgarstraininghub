// Exercise catalog: free-exercise-db (https://github.com/yuhonas/free-exercise-db),
// ~870 exercises with a start/end photo each, released into the public domain
// (Unlicense). It replaced the ExerciseDB API, whose free tier was shut down.
// The whole dataset is ~1 MB of JSON, so it's fetched once and searched locally.
import type { EquipmentType, MuscleGroup } from "@/types/exercise";

const CDN = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main";
const DATA_URL = `${CDN}/dist/exercises.json`;
const IMAGE_BASE = `${CDN}/exercises/`;

interface RawCatalogExercise {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

export interface CatalogExercise {
  /** Stable catalog id, e.g. "Barbell_Bench_Press_-_Medium_Grip" */
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: EquipmentType;
  level: string;
  category: string;
  instructions: string[];
  /** Absolute URLs of the start and end photos */
  images: string[];
}

// Catalog muscles → the app's muscle groups
const muscleMap: Record<string, MuscleGroup> = {
  abdominals: "core",
  chest: "chest",
  shoulders: "shoulders",
  neck: "shoulders",
  traps: "back",
  lats: "back",
  "middle back": "back",
  "lower back": "back",
  biceps: "biceps",
  triceps: "triceps",
  forearms: "forearms",
  glutes: "glutes",
  abductors: "glutes",
  adductors: "quadriceps",
  quadriceps: "quadriceps",
  hamstrings: "hamstrings",
  calves: "calves",
};

const equipmentMap: Record<string, EquipmentType> = {
  "body only": "bodyweight",
  barbell: "barbell",
  "e-z curl bar": "barbell",
  dumbbell: "dumbbell",
  kettlebells: "kettlebell",
  cable: "cable",
  machine: "machine",
  bands: "resistanceBand",
  "medicine ball": "medicineBall",
  "foam roll": "foamRoller",
};

const normalize = (raw: RawCatalogExercise): CatalogExercise => {
  const groups = Array.from(new Set(raw.primaryMuscles.map((m) => muscleMap[m]).filter(Boolean)));
  return {
    id: raw.id,
    name: raw.name,
    muscleGroups: groups.length ? groups : ["fullBody"],
    primaryMuscles: raw.primaryMuscles,
    secondaryMuscles: raw.secondaryMuscles,
    equipment: (raw.equipment && equipmentMap[raw.equipment]) || "other",
    level: raw.level,
    category: raw.category,
    instructions: raw.instructions,
    images: raw.images.map((path) => IMAGE_BASE + path),
  };
};

let catalog: Promise<CatalogExercise[]> | null = null;

/** The full catalog, sorted by name. Fetched once per session. */
export const loadCatalog = (): Promise<CatalogExercise[]> => {
  if (!catalog) {
    catalog = fetch(DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Exercise catalog error: ${res.status}`);
        return res.json() as Promise<RawCatalogExercise[]>;
      })
      .then((list) =>
        list
          .filter((e) => e.images.length > 0)
          .map(normalize)
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      .catch((error) => {
        catalog = null; // let the next call retry
        throw error;
      });
  }
  return catalog;
};

/** Every word of the query must appear in the name (any order); optional muscle filter */
export const filterCatalog = (
  list: CatalogExercise[],
  { query = "", muscle }: { query?: string; muscle?: MuscleGroup }
): CatalogExercise[] => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter(
    (e) =>
      (!muscle || e.muscleGroups.includes(muscle)) &&
      words.every((w) => e.name.toLowerCase().includes(w))
  );
};

/** Muscle groups offered as filter chips, in body order */
export const catalogMuscleFilters: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "core",
  "glutes",
  "quadriceps",
  "hamstrings",
  "calves",
];
