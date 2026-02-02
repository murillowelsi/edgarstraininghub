// ExerciseDB API Service
// API Documentation: https://exercisedb.dev/
// Free hobby version with gifUrl support

const API_BASE_URL = "https://exercisedb.dev/api/v1";

// ExerciseDB API raw response structure
interface ExerciseDbRawExercise {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

// Normalized exercise structure (for consistency with existing code)
export interface ExerciseDbExercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[];
  gifUrl: string;
}

// Convert raw API response to normalized structure
const normalizeExercise = (raw: ExerciseDbRawExercise): ExerciseDbExercise => ({
  id: raw.exerciseId,
  name: raw.name,
  gifUrl: raw.gifUrl,
  target: raw.targetMuscles[0] || "",
  bodyPart: raw.bodyParts[0] || "",
  equipment: raw.equipments[0] || "",
  secondaryMuscles: raw.secondaryMuscles,
  instructions: raw.instructions,
});

// Body parts available in the API
export const bodyParts = [
  "back",
  "cardio",
  "chest",
  "lower arms",
  "lower legs",
  "neck",
  "shoulders",
  "upper arms",
  "upper legs",
  "waist",
] as const;

export type BodyPart = (typeof bodyParts)[number];

// Equipment types available in the API
export const equipmentTypes = [
  "assisted",
  "band",
  "barbell",
  "body weight",
  "bosu ball",
  "cable",
  "dumbbell",
  "elliptical machine",
  "ez barbell",
  "hammer",
  "kettlebell",
  "leverage machine",
  "medicine ball",
  "olympic barbell",
  "resistance band",
  "roller",
  "rope",
  "skierg machine",
  "sled machine",
  "smith machine",
  "stability ball",
  "stationary bike",
  "stepmill machine",
  "tire",
  "trap bar",
  "upper body ergometer",
  "weighted",
  "wheel roller",
] as const;

export type EquipmentTypeDb = (typeof equipmentTypes)[number];

// Target muscles available in the API
export const targetMuscles = [
  "abductors",
  "abs",
  "adductors",
  "biceps",
  "calves",
  "cardiovascular system",
  "delts",
  "forearms",
  "glutes",
  "hamstrings",
  "lats",
  "levator scapulae",
  "pectorals",
  "quads",
  "serratus anterior",
  "spine",
  "traps",
  "triceps",
  "upper back",
] as const;

export type TargetMuscle = (typeof targetMuscles)[number];

// Check if API is configured (always true for free API)
export const isExerciseDbConfigured = (): boolean => {
  return true;
};

// API response wrapper type
interface ApiResponse {
  success: boolean;
  data: ExerciseDbRawExercise[];
}

// Fetch all exercises (paginated)
export const getExercises = async (
  limit = 10,
  offset = 0
): Promise<ExerciseDbExercise[]> => {
  const response = await fetch(
    `${API_BASE_URL}/exercises?limit=${limit}&offset=${offset}`
  );

  if (!response.ok) {
    throw new Error(`ExerciseDB API error: ${response.status}`);
  }

  const result: ApiResponse = await response.json();
  return result.data.map(normalizeExercise);
};

// Search exercises by name
export const searchExercisesByName = async (
  name: string,
  limit = 20,
  offset = 0
): Promise<ExerciseDbExercise[]> => {
  const response = await fetch(
    `${API_BASE_URL}/exercises/search?q=${encodeURIComponent(name.toLowerCase())}&limit=${limit}&offset=${offset}`
  );

  if (!response.ok) {
    throw new Error(`ExerciseDB API error: ${response.status}`);
  }

  const result: ApiResponse = await response.json();
  return result.data.map(normalizeExercise);
};

// Get exercises by body part (uses search since body part filter isn't available in free API)
export const getExercisesByBodyPart = async (
  bodyPart: BodyPart,
  limit = 20,
  offset = 0
): Promise<ExerciseDbExercise[]> => {
  // Use search endpoint with body part name
  const response = await fetch(
    `${API_BASE_URL}/exercises/search?q=${encodeURIComponent(bodyPart)}&limit=${limit}&offset=${offset}`
  );

  if (!response.ok) {
    throw new Error(`ExerciseDB API error: ${response.status}`);
  }

  const result: ApiResponse = await response.json();
  // Filter results to ensure they actually match the body part
  const normalized = result.data.map(normalizeExercise);
  return normalized.filter(e => e.bodyPart.toLowerCase().includes(bodyPart.toLowerCase()));
};

// Get exercises by equipment (uses search since equipment filter isn't available in free API)
export const getExercisesByEquipment = async (
  equipment: string,
  limit = 20,
  offset = 0
): Promise<ExerciseDbExercise[]> => {
  const response = await fetch(
    `${API_BASE_URL}/exercises/search?q=${encodeURIComponent(equipment)}&limit=${limit}&offset=${offset}`
  );

  if (!response.ok) {
    throw new Error(`ExerciseDB API error: ${response.status}`);
  }

  const result: ApiResponse = await response.json();
  const normalized = result.data.map(normalizeExercise);
  return normalized.filter(e => e.equipment.toLowerCase().includes(equipment.toLowerCase()));
};

// Get exercises by target muscle (uses search since target filter isn't available in free API)
export const getExercisesByTarget = async (
  target: string,
  limit = 20,
  offset = 0
): Promise<ExerciseDbExercise[]> => {
  const response = await fetch(
    `${API_BASE_URL}/exercises/search?q=${encodeURIComponent(target)}&limit=${limit}&offset=${offset}`
  );

  if (!response.ok) {
    throw new Error(`ExerciseDB API error: ${response.status}`);
  }

  const result: ApiResponse = await response.json();
  const normalized = result.data.map(normalizeExercise);
  return normalized.filter(e => e.target.toLowerCase().includes(target.toLowerCase()));
};

// Single exercise API response
interface SingleExerciseResponse {
  success: boolean;
  data: ExerciseDbRawExercise;
}

// Get single exercise by ID
export const getExerciseById = async (
  id: string
): Promise<ExerciseDbExercise | null> => {
  const response = await fetch(`${API_BASE_URL}/exercises/${id}`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`ExerciseDB API error: ${response.status}`);
  }

  const result: SingleExerciseResponse = await response.json();
  return normalizeExercise(result.data);
};

// Get list of body parts (using predefined array - API doesn't have this endpoint)
export const getBodyPartList = async (): Promise<string[]> => {
  return [...bodyParts];
};

// Get list of equipment types (using predefined array - API doesn't have this endpoint)
export const getEquipmentList = async (): Promise<string[]> => {
  return [...equipmentTypes];
};

// Get list of target muscles (using predefined array - API doesn't have this endpoint)
export const getTargetList = async (): Promise<string[]> => {
  return [...targetMuscles];
};

// Body part label mapping for display
export const bodyPartLabels: Record<string, string> = {
  back: "Back",
  cardio: "Cardio",
  chest: "Chest",
  "lower arms": "Lower Arms",
  "lower legs": "Lower Legs",
  neck: "Neck",
  shoulders: "Shoulders",
  "upper arms": "Upper Arms",
  "upper legs": "Upper Legs",
  waist: "Waist/Core",
};

// Equipment label mapping for display
export const equipmentLabelsDb: Record<string, string> = {
  assisted: "Assisted",
  band: "Band",
  barbell: "Barbell",
  "body weight": "Body Weight",
  "bosu ball": "Bosu Ball",
  cable: "Cable",
  dumbbell: "Dumbbell",
  "elliptical machine": "Elliptical",
  "ez barbell": "EZ Barbell",
  hammer: "Hammer",
  kettlebell: "Kettlebell",
  "leverage machine": "Leverage Machine",
  "medicine ball": "Medicine Ball",
  "olympic barbell": "Olympic Barbell",
  "resistance band": "Resistance Band",
  roller: "Roller",
  rope: "Rope",
  "skierg machine": "SkiErg",
  "sled machine": "Sled",
  "smith machine": "Smith Machine",
  "stability ball": "Stability Ball",
  "stationary bike": "Stationary Bike",
  "stepmill machine": "Stepmill",
  tire: "Tire",
  "trap bar": "Trap Bar",
  "upper body ergometer": "Upper Body Ergometer",
  weighted: "Weighted",
  "wheel roller": "Ab Wheel",
};

// Target muscle label mapping for display
export const targetLabels: Record<string, string> = {
  abductors: "Abductors",
  abs: "Abs",
  adductors: "Adductors",
  biceps: "Biceps",
  calves: "Calves",
  "cardiovascular system": "Cardiovascular",
  delts: "Deltoids",
  forearms: "Forearms",
  glutes: "Glutes",
  hamstrings: "Hamstrings",
  lats: "Lats",
  "levator scapulae": "Levator Scapulae",
  pectorals: "Pectorals",
  quads: "Quadriceps",
  "serratus anterior": "Serratus",
  spine: "Spine",
  traps: "Traps",
  triceps: "Triceps",
  "upper back": "Upper Back",
};
