import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type {
  Exercise,
  ExerciseDocument,
  ExerciseFormData,
} from "../types/exercise";

const EXERCISES_COLLECTION = "exercises";

// Convert Firestore document to Exercise
const docToExercise = (id: string, data: ExerciseDocument): Exercise => ({
  id,
  name: data.name,
  description: data.description,
  instructions: data.instructions,
  videoUrl: data.videoUrl,
  thumbnailUrl: data.thumbnailUrl,
  muscleGroups: data.muscleGroups || [],
  equipment: data.equipment || [],
  isCustom: data.isCustom,
  createdBy: data.createdBy,
  createdAt: data.createdAt?.toDate() || new Date(),
  updatedAt: data.updatedAt?.toDate() || new Date(),
});

// Get all exercises (predefined + custom)
export const getAllExercises = async (): Promise<Exercise[]> => {
  const q = query(
    collection(db, EXERCISES_COLLECTION),
    orderBy("name", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) =>
    docToExercise(doc.id, doc.data() as ExerciseDocument)
  );
};

// Get custom exercises only (created by users)
export const getCustomExercises = async (): Promise<Exercise[]> => {
  const q = query(
    collection(db, EXERCISES_COLLECTION),
    where("isCustom", "==", true),
    orderBy("name", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) =>
    docToExercise(doc.id, doc.data() as ExerciseDocument)
  );
};

// Create new exercise
export const createExercise = async (
  data: ExerciseFormData,
  createdBy: string
): Promise<string> => {
  const docRef = await addDoc(collection(db, EXERCISES_COLLECTION), {
    name: data.name,
    description: data.description || "",
    instructions: data.instructions || "",
    videoUrl: data.videoUrl || "",
    thumbnailUrl: data.thumbnailUrl || "",
    muscleGroups: data.muscleGroups,
    equipment: data.equipment,
    isCustom: true,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

// Update existing exercise
export const updateExercise = async (
  id: string,
  data: Partial<ExerciseFormData>
): Promise<void> => {
  const docRef = doc(db, EXERCISES_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// Delete exercise
export const deleteExercise = async (id: string): Promise<void> => {
  const docRef = doc(db, EXERCISES_COLLECTION, id);
  await deleteDoc(docRef);
};

// Predefined exercises data (these will be seeded or used as default library)
export const predefinedExercises: Omit<Exercise, "id" | "createdAt" | "updatedAt">[] = [
  // Chest
  {
    name: "Push-ups",
    description: "Classic bodyweight chest exercise",
    instructions: "Start in plank position with hands shoulder-width apart. Lower your chest to the ground, then push back up.",
    videoUrl: "https://www.youtube.com/watch?v=IODxDxX7oi4",
    muscleGroups: ["chest", "triceps", "shoulders"],
    equipment: ["bodyweight"],
    isCustom: false,
  },
  {
    name: "Dumbbell Bench Press",
    description: "Chest press with dumbbells on a flat bench",
    instructions: "Lie on a flat bench, press dumbbells up from chest level until arms are extended.",
    videoUrl: "https://www.youtube.com/watch?v=VmB1G1K7v94",
    muscleGroups: ["chest", "triceps", "shoulders"],
    equipment: ["dumbbell", "bench"],
    isCustom: false,
  },
  {
    name: "Incline Dumbbell Press",
    description: "Upper chest focused press on an incline bench",
    instructions: "Set bench to 30-45 degrees, press dumbbells up from upper chest.",
    videoUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8",
    muscleGroups: ["chest", "shoulders", "triceps"],
    equipment: ["dumbbell", "bench"],
    isCustom: false,
  },
  {
    name: "Cable Chest Fly",
    description: "Isolation exercise for chest using cables",
    instructions: "Stand between cables, bring handles together in front of chest with slight bend in elbows.",
    videoUrl: "https://www.youtube.com/watch?v=Iwe6AmxVf7o",
    muscleGroups: ["chest"],
    equipment: ["cable"],
    isCustom: false,
  },
  // Back
  {
    name: "Pull-ups",
    description: "Bodyweight back exercise using a bar",
    instructions: "Hang from bar with overhand grip, pull yourself up until chin is over the bar.",
    videoUrl: "https://www.youtube.com/watch?v=eGo4IYlbE5g",
    muscleGroups: ["back", "biceps"],
    equipment: ["pullupBar"],
    isCustom: false,
  },
  {
    name: "Bent Over Barbell Row",
    description: "Compound back exercise with barbell",
    instructions: "Bend at hips with flat back, pull barbell to lower chest.",
    videoUrl: "https://www.youtube.com/watch?v=FWJR5Ve8bnQ",
    muscleGroups: ["back", "biceps"],
    equipment: ["barbell"],
    isCustom: false,
  },
  {
    name: "Lat Pulldown",
    description: "Cable machine exercise targeting lats",
    instructions: "Sit at lat pulldown machine, pull bar down to upper chest.",
    videoUrl: "https://www.youtube.com/watch?v=CAwf7n6Luuc",
    muscleGroups: ["back", "biceps"],
    equipment: ["cable", "machine"],
    isCustom: false,
  },
  {
    name: "Dumbbell Single Arm Row",
    description: "Unilateral back exercise with dumbbell",
    instructions: "Support yourself on bench, row dumbbell to hip keeping elbow close to body.",
    videoUrl: "https://www.youtube.com/watch?v=pYcpY20QaE8",
    muscleGroups: ["back", "biceps"],
    equipment: ["dumbbell", "bench"],
    isCustom: false,
  },
  // Shoulders
  {
    name: "Overhead Press",
    description: "Compound shoulder exercise with barbell or dumbbells",
    instructions: "Press weight overhead from shoulder level until arms are fully extended.",
    videoUrl: "https://www.youtube.com/watch?v=2yjwXTZQDDI",
    muscleGroups: ["shoulders", "triceps"],
    equipment: ["barbell", "dumbbell"],
    isCustom: false,
  },
  {
    name: "Lateral Raises",
    description: "Isolation exercise for side delts",
    instructions: "Raise dumbbells to the sides until arms are parallel to ground.",
    videoUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo",
    muscleGroups: ["shoulders"],
    equipment: ["dumbbell"],
    isCustom: false,
  },
  {
    name: "Face Pulls",
    description: "Rear delt and upper back exercise",
    instructions: "Pull cable rope to face level, separating hands at the end.",
    videoUrl: "https://www.youtube.com/watch?v=rep-qVOkqgk",
    muscleGroups: ["shoulders", "back"],
    equipment: ["cable"],
    isCustom: false,
  },
  // Legs
  {
    name: "Barbell Squat",
    description: "King of leg exercises",
    instructions: "Bar on upper back, squat down until thighs are parallel to ground.",
    videoUrl: "https://www.youtube.com/watch?v=ultWZbUMPL8",
    muscleGroups: ["quadriceps", "glutes", "hamstrings"],
    equipment: ["barbell"],
    isCustom: false,
  },
  {
    name: "Romanian Deadlift",
    description: "Hip hinge movement targeting hamstrings",
    instructions: "Hinge at hips with slight knee bend, lower weight along legs.",
    videoUrl: "https://www.youtube.com/watch?v=7j-2w4-P14I",
    muscleGroups: ["hamstrings", "glutes", "back"],
    equipment: ["barbell", "dumbbell"],
    isCustom: false,
  },
  {
    name: "Leg Press",
    description: "Machine-based quad dominant exercise",
    instructions: "Push platform away by extending knees, don't lock out completely.",
    videoUrl: "https://www.youtube.com/watch?v=IZxyjW7MPJQ",
    muscleGroups: ["quadriceps", "glutes"],
    equipment: ["machine"],
    isCustom: false,
  },
  {
    name: "Walking Lunges",
    description: "Dynamic lower body exercise",
    instructions: "Step forward into lunge, push off and repeat with other leg.",
    videoUrl: "https://www.youtube.com/watch?v=L8fvypPrzzs",
    muscleGroups: ["quadriceps", "glutes", "hamstrings"],
    equipment: ["bodyweight", "dumbbell"],
    isCustom: false,
  },
  {
    name: "Calf Raises",
    description: "Isolation exercise for calves",
    instructions: "Rise up on toes, squeeze at top, lower with control.",
    videoUrl: "https://www.youtube.com/watch?v=gwLzBJYoWlI",
    muscleGroups: ["calves"],
    equipment: ["bodyweight", "machine"],
    isCustom: false,
  },
  // Arms
  {
    name: "Barbell Curl",
    description: "Classic bicep exercise",
    instructions: "Curl barbell up keeping elbows stationary.",
    videoUrl: "https://www.youtube.com/watch?v=kwG2ipFRgfo",
    muscleGroups: ["biceps"],
    equipment: ["barbell"],
    isCustom: false,
  },
  {
    name: "Hammer Curls",
    description: "Bicep curl with neutral grip",
    instructions: "Curl dumbbells with palms facing each other.",
    videoUrl: "https://www.youtube.com/watch?v=zC3nLlEvin4",
    muscleGroups: ["biceps", "forearms"],
    equipment: ["dumbbell"],
    isCustom: false,
  },
  {
    name: "Tricep Pushdown",
    description: "Cable exercise for triceps",
    instructions: "Push cable down by extending elbows, keep upper arms stationary.",
    videoUrl: "https://www.youtube.com/watch?v=2-LAMcpzODU",
    muscleGroups: ["triceps"],
    equipment: ["cable"],
    isCustom: false,
  },
  {
    name: "Skull Crushers",
    description: "Lying tricep extension",
    instructions: "Lower weight to forehead by bending elbows, extend back up.",
    videoUrl: "https://www.youtube.com/watch?v=d_KZxkY_0cM",
    muscleGroups: ["triceps"],
    equipment: ["barbell", "dumbbell", "bench"],
    isCustom: false,
  },
  // Core
  {
    name: "Plank",
    description: "Isometric core exercise",
    instructions: "Hold body in straight line from head to heels, engage core.",
    videoUrl: "https://www.youtube.com/watch?v=ASdvN_XEl_c",
    muscleGroups: ["core"],
    equipment: ["bodyweight"],
    isCustom: false,
  },
  {
    name: "Russian Twists",
    description: "Rotational core exercise",
    instructions: "Sit with feet elevated, rotate torso side to side.",
    videoUrl: "https://www.youtube.com/watch?v=wkD8rjkodUI",
    muscleGroups: ["core"],
    equipment: ["bodyweight", "medicineBall"],
    isCustom: false,
  },
  {
    name: "Hanging Leg Raises",
    description: "Advanced core exercise",
    instructions: "Hang from bar, raise legs to parallel or higher.",
    videoUrl: "https://www.youtube.com/watch?v=hdng3Nm1x_E",
    muscleGroups: ["core"],
    equipment: ["pullupBar"],
    isCustom: false,
  },
  {
    name: "Cable Woodchops",
    description: "Rotational cable exercise",
    instructions: "Pull cable diagonally across body with rotation.",
    videoUrl: "https://www.youtube.com/watch?v=pAplQXk3dkU",
    muscleGroups: ["core"],
    equipment: ["cable"],
    isCustom: false,
  },
  // Full Body / Compound
  {
    name: "Deadlift",
    description: "The ultimate compound exercise",
    instructions: "Lift barbell from ground to hip level with flat back.",
    videoUrl: "https://www.youtube.com/watch?v=op9kVnSso6Q",
    muscleGroups: ["back", "glutes", "hamstrings", "quadriceps"],
    equipment: ["barbell"],
    isCustom: false,
  },
  {
    name: "Kettlebell Swing",
    description: "Explosive hip hinge movement",
    instructions: "Swing kettlebell between legs and up to chest height using hip drive.",
    videoUrl: "https://www.youtube.com/watch?v=YSxHifyI6s8",
    muscleGroups: ["glutes", "hamstrings", "core", "shoulders"],
    equipment: ["kettlebell"],
    isCustom: false,
  },
  {
    name: "Burpees",
    description: "Full body conditioning exercise",
    instructions: "Squat, jump back to plank, push-up, jump forward, jump up.",
    videoUrl: "https://www.youtube.com/watch?v=dZgVxmf6jkA",
    muscleGroups: ["fullBody"],
    equipment: ["bodyweight"],
    isCustom: false,
  },
  {
    name: "Mountain Climbers",
    description: "Dynamic core and cardio exercise",
    instructions: "In plank position, alternate driving knees to chest quickly.",
    videoUrl: "https://www.youtube.com/watch?v=nmwgirgXLYM",
    muscleGroups: ["core", "quadriceps"],
    equipment: ["bodyweight"],
    isCustom: false,
  },
];

// Seed predefined exercises to Firestore (run once)
export const seedPredefinedExercises = async (): Promise<void> => {
  const existing = await getAllExercises();
  const existingNames = new Set(existing.map((e) => e.name));

  for (const exercise of predefinedExercises) {
    if (!existingNames.has(exercise.name)) {
      await addDoc(collection(db, EXERCISES_COLLECTION), {
        ...exercise,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }
};
