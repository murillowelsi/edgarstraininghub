import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import {
  ArrowLeft,
  CalendarIcon,
  ChevronDown,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { db } from "../../lib/firebase";

// Helper function to get default stage name based on type
function getDefaultStageName(type: string): string {
  const stageNames: Record<string, string> = {
    warmup: "Warmup",
    work: "Work",
    cardio: "Cardio",
    recovery: "Recovery",
    rest: "Rest",
    cooldown: "Cooldown",
    other: "Other",
  };
  return stageNames[type] || "Stage";
}

// Componente para itens ordenáveis (stages principais)
function SortableStageItem({
  id,
  children,
  onRemove,
}: {
  id: string;
  children: React.ReactNode;
  onRemove?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 left-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground z-10"
        title="Drag to reorder"
      >
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Delete Button */}
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 text-yellow-500 hover:text-red-500 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      {/* Content with left padding for drag handle */}
      <div className="pl-10 pr-12">{children}</div>
    </div>
  );
}

// Componente para itens ordenáveis dentro de repetition blocks
function SortableChildStageItem({
  id,
  children,
  onRemove,
}: {
  id: string;
  children: React.ReactNode;
  onRemove?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted rounded z-10"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Delete Button */}
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 text-yellow-500 hover:text-red-500 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}

      {/* Content with left padding for drag handle */}
      <div className="pl-10 pr-12">{children}</div>
    </div>
  );
}

interface Exercise {
  name: string;
  reps: string;
  details: string;
}

interface WorkoutStage {
  name: string;
  type: string;
  duration?: string;
  distance?: string;
  distanceUnit?: string;
  intensity?: string;
  notes?: string;
  // For strength training
  exerciseName?: string;
  sets?: string;
  reps?: string;
  weight?: string;
  // Repeat functionality
  repeat?: number;
  // Swimming specific
  stroke?: string;
  // Equipment type - now array for multiple selections
  equipment?: string[];
  // Library exercise ID for tracking selected exercises
  libraryExerciseId?: string;
  // YouTube URL for demonstration
  youtubeUrl?: string;
  // Nested stages for repetition blocks
  childStages?: WorkoutStage[];
}

interface LibraryExercise {
  id: string;
  name: string;
  defaultReps: string;
  description: string;
  youtubeUrl?: string;
}

interface Workout {
  id: string;
  date: string;
  type: "strength" | "swimming" | "cycling" | "running";
  name?: string;
  exercises?: Exercise[];
  stages?: WorkoutStage[];
  // Legacy fields (kept for backwards compatibility)
  distance?: string;
  duration?: string;
  stroke?: string;
  route?: string;
  elevation?: string;
  avgSpeed?: string;
  pace?: string;
  terrain?: string;
  notes?: string;
  // Swimming type for the entire workout
  swimmingType?: string;
  // Cycling type for the entire workout
  cyclingType?: string;
  // Running type for the entire workout
  runningType?: string;
}

const WorkoutEditor = () => {
  const { userId, workoutId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [athleteName, setAthleteName] = useState("");
  const [loading, setLoading] = useState(true);
  const [libraryExercises, setLibraryExercises] = useState<LibraryExercise[]>(
    []
  );

  // Workout form state
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [workoutType, setWorkoutType] = useState<
    "strength" | "swimming" | "cycling" | "running"
  >((searchParams.get("type") as any) || "strength");
  const [workoutName, setWorkoutName] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: "", reps: "", details: "" },
  ]);
  // Stages for swimming, cycling, running
  const [stages, setStages] = useState<WorkoutStage[]>([]);
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [expandedStageIndex, setExpandedStageIndex] = useState<number>(-1);
  const [expandedChildStages, setExpandedChildStages] = useState<{
    [key: string]: boolean;
  }>({});
  const [saving, setSaving] = useState(false);
  // Swimming type for the entire workout
  const [swimmingType, setSwimmingType] = useState<string>("");
  // Cycling type for the entire workout
  const [cyclingType, setCyclingType] = useState<string>("");
  // Running type for the entire workout
  const [runningType, setRunningType] = useState<string>("");

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Droppable hook for main stages
  const { isOver: isMainOver, setNodeRef: setMainNodeRef } = useDroppable({
    id: "main-stages",
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      try {
        // Fetch user details
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          setAthleteName(userDoc.data().name);
        }

        // Fetch library exercises
        const exercisesSnapshot = await getDocs(collection(db, "exercises"));
        const fetchedLibraryExercises = exercisesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LibraryExercise[];
        fetchedLibraryExercises.sort((a, b) => a.name.localeCompare(b.name));
        setLibraryExercises(fetchedLibraryExercises);

        if (workoutId) {
          // Editing existing workout
          const workoutDoc = await getDoc(doc(db, "workouts", workoutId));
          if (workoutDoc.exists()) {
            const workout = {
              id: workoutDoc.id,
              ...workoutDoc.data(),
            } as Workout;
            loadWorkoutData(workout);
          }
        } else {
          // New workout - set default name
          setWorkoutName(getDefaultWorkoutName(workoutType));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, workoutId, workoutType]);

  const loadWorkoutData = (workout: Workout) => {
    setDate(workout.date);
    setSelectedDate(new Date(workout.date));
    setWorkoutType(workout.type);
    setWorkoutName(workout.name || getDefaultWorkoutName(workout.type));
    setSwimmingType(workout.swimmingType || "");
    setCyclingType(workout.cyclingType || "");
    setRunningType(workout.runningType || "");
    setExercises(workout.exercises || [{ name: "", reps: "", details: "" }]);
    setStages(
      (
        workout.stages || [
          {
            name: "",
            type: "warmup",
            duration: "",
            distance: "",
            distanceUnit: "km",
            intensity: "",
            notes: "",
            stroke: "",
            equipment: [],
            libraryExerciseId: "",
          },
        ]
      ).map((stage) => {
        const found = libraryExercises.find(
          (ex) => ex.name === stage.exerciseName
        );
        return {
          ...stage,
          equipment: stage.equipment || [], // Ensure equipment is always an array
          libraryExerciseId: found ? found.id : stage.libraryExerciseId || "",
          youtubeUrl: stage.youtubeUrl || (found ? found.youtubeUrl : "") || "",
        };
      })
    );
    setWorkoutNotes(workout.notes || "");
  };

  const handleAddExercise = () => {
    setExercises([...exercises, { name: "", reps: "", details: "" }]);
  };

  const handleRemoveExercise = (index: number) => {
    const newExercises = exercises.filter((_, i) => i !== index);
    setExercises(newExercises);
  };

  const handleExerciseChange = (
    index: number,
    field: keyof Exercise,
    value: string
  ) => {
    const newExercises = [...exercises];
    newExercises[index][field] = value;
    setExercises(newExercises);
  };

  const handleLibraryExerciseSelect = (index: number, exerciseId: string) => {
    const selectedExercise = libraryExercises.find(
      (ex) => ex.id === exerciseId
    );
    if (selectedExercise) {
      const newExercises = [...exercises];
      newExercises[index] = {
        name: selectedExercise.name,
        reps: selectedExercise.defaultReps || "",
        details: selectedExercise.description || "",
      };
      setExercises(newExercises);
    }
  };

  // Stage management functions
  const handleAddStage = () => {
    const newStage: WorkoutStage = {
      name: getDefaultStageName("work"),
      type: "work",
      duration: "",
      distance: "",
      intensity: "",
      notes: "",
      youtubeUrl: "",
      childStages: [],
    };
    setStages([...stages, newStage]);
  };

  const handleAddRepetitionBlock = () => {
    const newBlock: WorkoutStage = {
      name: "Repetition Block",
      type: "repetition",
      repeat: 2,
      childStages: [],
    };
    setStages([...stages, newBlock]);
  };

  const handleRemoveStage = (index: number) => {
    const newStages = stages.filter((_, i) => i !== index);
    setStages(newStages);
  };

  const handleStageChange = (
    index: number,
    field: keyof WorkoutStage,
    value: any
  ) => {
    const newStages = [...stages];
    const currentStage = newStages[index];
    
    // If changing the type, also update the name if it's still a default name
    if (field === "type") {
      const defaultNames = ["Warmup", "Work", "Cardio", "Recovery", "Rest", "Cooldown", "Other"];
      const isDefaultName = defaultNames.includes(currentStage.name || "");
      
      if (isDefaultName || !currentStage.name) {
        newStages[index] = { 
          ...currentStage, 
          type: value,
          name: getDefaultStageName(value)
        };
      } else {
        newStages[index] = { ...currentStage, [field]: value };
      }
    } else {
      newStages[index] = { ...newStages[index], [field]: value };
    }
    
    setStages(newStages);
  };

  const handleChildStageChange = (
    parentIndex: number,
    childIndex: number,
    field: keyof WorkoutStage,
    value: any
  ) => {
    const newStages = [...stages];
    const parentStage = newStages[parentIndex];
    if (parentStage.childStages) {
      const newChildStages = [...parentStage.childStages];
      const currentChild = newChildStages[childIndex];
      
      // If changing the type, also update the name if it's still a default name
      if (field === "type") {
        const defaultNames = ["Warmup", "Work", "Cardio", "Recovery", "Rest", "Cooldown", "Other"];
        const isDefaultName = defaultNames.includes(currentChild.name || "");
        
        if (isDefaultName || !currentChild.name) {
          newChildStages[childIndex] = {
            ...currentChild,
            type: value,
            name: getDefaultStageName(value)
          };
        } else {
          newChildStages[childIndex] = {
            ...currentChild,
            [field]: value,
          };
        }
      } else {
        newChildStages[childIndex] = {
          ...currentChild,
          [field]: value,
        };
      }
      
      newStages[parentIndex] = { ...parentStage, childStages: newChildStages };
      setStages(newStages);
    }
  };

  const handleAddChildStage = (parentIndex: number) => {
    const newStages = [...stages];
    const parentStage = newStages[parentIndex];
    if (parentStage.childStages) {
      const newChildStage: WorkoutStage = {
        name: getDefaultStageName("work"),
        type: "work",
        duration: "",
        distance: "",
        intensity: "",
        notes: "",
        youtubeUrl: "",
      };
      newStages[parentIndex] = {
        ...parentStage,
        childStages: [...parentStage.childStages, newChildStage],
      };
      setStages(newStages);
    }
  };

  const handleRemoveChildStage = (parentIndex: number, childIndex: number) => {
    const newStages = [...stages];
    const parentStage = newStages[parentIndex];
    if (parentStage.childStages) {
      const newChildStages = parentStage.childStages.filter(
        (_, i) => i !== childIndex
      );
      newStages[parentIndex] = { ...parentStage, childStages: newChildStages };
      setStages(newStages);
    }
  };

  const toggleChildExpanded = (parentIndex: number, childIndex: number) => {
    const key = `${parentIndex}-${childIndex}`;
    setExpandedChildStages((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Handle equipment selection/deselection
  const handleEquipmentChange = (
    stageIndex: number,
    equipmentValue: string,
    checked: boolean
  ) => {
    const newStages = [...stages];
    const currentEquipment = newStages[stageIndex].equipment || [];

    if (checked) {
      // Add equipment if not already present
      if (!currentEquipment.includes(equipmentValue)) {
        newStages[stageIndex].equipment = [...currentEquipment, equipmentValue];
      }
    } else {
      // Remove equipment
      newStages[stageIndex].equipment = currentEquipment.filter(
        (eq) => eq !== equipmentValue
      );
    }

    setStages(newStages);
  };

  // Get available equipment options based on workout type
  const getEquipmentOptions = (workoutType: string) => {
    switch (workoutType) {
      case "strength":
        return [
          { value: "dumbbells", label: "Dumbbells" },
          { value: "barbell", label: "Barbell" },
          { value: "machines", label: "Machines" },
          { value: "bodyweight", label: "Bodyweight" },
          { value: "kettlebells", label: "Kettlebells" },
          { value: "resistance-bands", label: "Resistance Bands" },
          { value: "cables", label: "Cable Machines" },
        ];
      case "swimming":
        return [
          { value: "fins", label: "Fins" },
          { value: "paddles", label: "Paddles" },
          { value: "pull-buoy", label: "Pull Buoy" },
          { value: "kickboard", label: "Kickboard" },
          { value: "snorkel", label: "Snorkel" },
        ];
      case "cycling":
        return [
          { value: "road-bike", label: "Road Bike" },
          { value: "mountain-bike", label: "Mountain Bike" },
          { value: "timetrial-bike", label: "TT Bike" },
          { value: "indoor-trainer", label: "Indoor Trainer" },
        ];
      case "running":
        return [
          { value: "treadmill", label: "Treadmill" },
          { value: "road", label: "Road" },
          { value: "track", label: "Track" },
          { value: "trail", label: "Trail" },
          { value: "grass", label: "Grass" },
          { value: "beach", label: "Beach" },
        ];
      default:
        return [];
    }
  };

  // Drag and drop handlers using @dnd-kit
  const handleReorderChildStages = (
    activeParentIndex: number,
    activeChildIndex: number,
    overParentIndex: number,
    overChildIndex: number
  ) => {
    if (activeParentIndex === overParentIndex) {
      // Same repetition block
      const newStages = [...stages];
      const parentStage = newStages[activeParentIndex];
      if (parentStage.childStages) {
        const newChildStages = arrayMove(
          parentStage.childStages,
          activeChildIndex,
          overChildIndex
        );
        newStages[activeParentIndex] = {
          ...parentStage,
          childStages: newChildStages,
        };
        setStages(newStages);
      }
    } else {
      // Moving to different repetition block
      const draggedStage =
        stages[activeParentIndex].childStages![activeChildIndex];
      const newStages = [...stages];
      // Remove from source
      newStages[activeParentIndex].childStages!.splice(activeChildIndex, 1);
      // Add to destination
      if (!newStages[overParentIndex].childStages) {
        newStages[overParentIndex].childStages = [];
      }
      newStages[overParentIndex].childStages!.splice(
        overChildIndex,
        0,
        draggedStage
      );
      setStages(newStages);
    }
  };

  const handleMoveChildToRepetition = (
    parentIndex: number,
    childIndex: number,
    targetRepetitionIndex: number
  ) => {
    if (targetRepetitionIndex !== parentIndex) {
      const newStages = [...stages];
      const draggedStage = stages[parentIndex].childStages![childIndex];
      // Remove from source
      newStages[parentIndex].childStages!.splice(childIndex, 1);
      // Add to destination
      if (!newStages[targetRepetitionIndex].childStages) {
        newStages[targetRepetitionIndex].childStages = [];
      }
      newStages[targetRepetitionIndex].childStages!.push(draggedStage);
      setStages(newStages);
    }
  };

  const handleMoveChildToMain = (
    parentIndex: number,
    childIndex: number,
    targetIndex: number
  ) => {
    const newStages = [...stages];
    const draggedStage = stages[parentIndex].childStages![childIndex];
    // Remove from child stages
    newStages[parentIndex].childStages!.splice(childIndex, 1);
    // Insert into main stages
    newStages.splice(targetIndex, 0, draggedStage);
    setStages(newStages);
  };

  const handleMoveMainToRepetition = (
    activeIndex: number,
    targetRepetitionIndex: number
  ) => {
    const newStages = [...stages];
    const draggedStage = newStages[activeIndex];
    newStages.splice(activeIndex, 1);

    if (!newStages[targetRepetitionIndex].childStages) {
      newStages[targetRepetitionIndex].childStages = [];
    }
    newStages[targetRepetitionIndex].childStages!.push(draggedStage);
    setStages(newStages);

    // Update expanded index
    if (expandedStageIndex === activeIndex) {
      setExpandedStageIndex(-1);
    } else if (activeIndex < expandedStageIndex) {
      setExpandedStageIndex(expandedStageIndex - 1);
    }
  };

  const handleReorderMainStages = (activeIndex: number, overIndex: number) => {
    if (activeIndex !== overIndex) {
      const newStages = arrayMove(stages, activeIndex, overIndex);
      setStages(newStages);

      // Update expanded index
      if (expandedStageIndex === activeIndex) {
        setExpandedStageIndex(overIndex);
      } else if (
        activeIndex < expandedStageIndex &&
        overIndex >= expandedStageIndex
      ) {
        setExpandedStageIndex(expandedStageIndex - 1);
      } else if (
        activeIndex > expandedStageIndex &&
        overIndex <= expandedStageIndex
      ) {
        setExpandedStageIndex(expandedStageIndex + 1);
      }
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    // Optional: Add any drag start logic here
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over logic for moving between containers
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dragging from child to main or vice versa
    const isActiveChild = activeId.startsWith("child-");
    const isOverChild = overId.startsWith("child-");
    const isOverRepetition =
      overId.startsWith("stage-") &&
      stages[parseInt(overId.split("-")[1])]?.type === "repetition";

    // Note: @dnd-kit handles drop permissions automatically based on collision detection
    // No need to call preventDefault here
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle different drag scenarios
    if (activeId.startsWith("child-") && overId.startsWith("child-")) {
      // Reordering within the same repetition block
      const [, activeParentIndex, activeChildIndex] = activeId
        .split("-")
        .map(Number);
      const [, overParentIndex, overChildIndex] = overId.split("-").map(Number);
      handleReorderChildStages(
        activeParentIndex,
        activeChildIndex,
        overParentIndex,
        overChildIndex
      );
    } else if (activeId.startsWith("child-") && !overId.startsWith("child-")) {
      // Moving from child stage to main stage or different repetition
      const [, parentIndex, childIndex] = activeId.split("-").map(Number);
      const draggedStage = stages[parentIndex].childStages![childIndex];

      if (
        overId.startsWith("stage-") &&
        stages[parseInt(overId.split("-")[1])]?.type === "repetition"
      ) {
        // Moving to a different repetition block
        const targetRepetitionIndex = parseInt(overId.split("-")[1]);
        handleMoveChildToRepetition(
          parentIndex,
          childIndex,
          targetRepetitionIndex
        );
      } else {
        // Moving to main stages
        const targetIndex = stages.findIndex(
          (stage) => `stage-${stages.indexOf(stage)}` === overId
        );
        handleMoveChildToMain(parentIndex, childIndex, targetIndex);
      }
    } else if (!activeId.startsWith("child-") && overId.startsWith("stage-")) {
      // Moving from main stage to repetition block or reordering main stages
      const activeIndex = parseInt(activeId.split("-")[1]);
      const overIndex = parseInt(overId.split("-")[1]);

      if (stages[overIndex].type === "repetition") {
        handleMoveMainToRepetition(activeIndex, overIndex);
      } else {
        handleReorderMainStages(activeIndex, overIndex);
      }
    }
  };

  // Helper function to get stage type color
  const getStageTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      warmup:
        "border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/20",
      work: "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
      cardio: "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20",
      recovery:
        "border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20",
      rest: "border-l-4 border-l-gray-500 bg-gray-50 dark:bg-gray-950/20",
      cooldown:
        "border-l-4 border-l-purple-500 bg-purple-50 dark:bg-purple-950/20",
      other:
        "border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
    };
    return colors[type] || "border-l-4 border-l-gray-300 bg-muted/20";
  };

  const getDefaultWorkoutName = (type: string) => {
    switch (type) {
      case "strength":
        return "Strength Training Workout";
      case "swimming":
        return "Swimming Workout";
      case "cycling":
        return "Cycling Workout";
      case "running":
        return "Running Workout";
      default:
        return "Workout";
    }
  };

  const handleSaveWorkout = async () => {
    if (!userId) return;

    // Validate - at least one stage required only for new workouts
    if (!workoutId && stages.length === 0) {
      toast.error("Please add at least one stage/exercise");
      return;
    }

    // Check if all stages have either a name or exerciseName (only if there are stages)
    if (stages.length > 0) {
      const hasEmptyStages = stages.some((s) => {
        if (workoutType === "strength") {
          // For strength training, work stages don't require exerciseName, others do
          return s.type !== "work" && s.type !== "rest" && !s.exerciseName;
        } else {
          // For other workout types, all stages need a name
          return !s.name;
        }
      });
      if (hasEmptyStages) {
        toast.error("Please provide a name for all stages/exercises");
        return;
      }
    }

    setSaving(true);
    try {
      const workoutData: any = {
        athleteId: userId,
        date,
        type: workoutType,
        name: workoutName,
        stages: stages,
        notes: workoutNotes,
        updatedAt: new Date().toISOString(),
      };

      // Only include type-specific fields if they have values
      if (workoutType === "swimming" && swimmingType) {
        workoutData.swimmingType = swimmingType;
      }
      if (workoutType === "cycling" && cyclingType) {
        workoutData.cyclingType = cyclingType;
      }
      if (workoutType === "running" && runningType) {
        workoutData.runningType = runningType;
      }

      if (workoutId) {
        await setDoc(doc(db, "workouts", workoutId), workoutData, {
          merge: true,
        });
        toast.success("Workout updated successfully");
      } else {
        await addDoc(collection(db, "workouts"), {
          ...workoutData,
          createdAt: new Date().toISOString(),
        });
        toast.success("Workout created successfully");
      }

      navigate(`/admin/users/${userId}/workouts`);
    } catch (error) {
      console.error("Error saving workout:", error);
      toast.error("Failed to save workout");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setWorkoutType("strength");
    setWorkoutName(getDefaultWorkoutName("strength"));
    setSwimmingType("");
    setCyclingType("");
    setRunningType("");
    setExercises([{ name: "", reps: "", details: "" }]);
    setDate(new Date().toISOString().split("T")[0]);
    setSelectedDate(new Date());
    setStages([]);
    setWorkoutNotes("");
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/admin/users/${userId}/workouts`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">
                {workoutId ? "Edit Workout" : "Create New Workout"}
              </h1>
              {!loading && athleteName && (
                <p className="text-sm text-muted-foreground mt-1">
                  {athleteName}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border shadow-sm p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Button
                  variant="outline"
                  onClick={() => setCalendarOpen(true)}
                  className="w-full justify-start text-left font-normal bg-background hover:bg-accent"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date
                    ? new Date(date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Select date"}
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Workout Type</Label>
                <Select
                  value={workoutType}
                  onValueChange={(value: any) => {
                    setWorkoutType(value);
                    // Reset types when changing workout type
                    if (value !== "swimming") {
                      setSwimmingType("");
                    }
                    if (value !== "cycling") {
                      setCyclingType("");
                    }
                    if (value !== "running") {
                      setRunningType("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength">Strength Training</SelectItem>
                    <SelectItem value="swimming">Swimming</SelectItem>
                    <SelectItem value="cycling">Cycling</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Workout Name</Label>
              <Input
                placeholder="Enter workout name"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
              />
            </div>

            {/* Swimming Type Selection - only for swimming workouts */}
            {workoutType === "swimming" && (
              <div className="space-y-2">
                <Label>Swimming Type</Label>
                <Select value={swimmingType} onValueChange={setSwimmingType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select swimming type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pool">Pool Swimming</SelectItem>
                    <SelectItem value="open-water">
                      Open Water Swimming
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Cycling Type Selection - only for cycling workouts */}
            {workoutType === "cycling" && (
              <div className="space-y-2">
                <Label>Cycling Type</Label>
                <Select value={cyclingType} onValueChange={setCyclingType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cycling type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indoor">Indoor Cycling</SelectItem>
                    <SelectItem value="outdoor">Outdoor Cycling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Running Type Selection - only for running workouts */}
            {workoutType === "running" && (
              <div className="space-y-2">
                <Label>Running Type</Label>
                <Select value={runningType} onValueChange={setRunningType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select running type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indoor">Indoor Running</SelectItem>
                    <SelectItem value="outdoor">Outdoor Running</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* All Workout Types - Unified Stage-based Fields */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    {workoutType === "strength" ? "Exercises" : "Stages"}
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddStage}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add{" "}
                      {workoutType === "strength" ? "Exercise" : "Stage"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddRepetitionBlock}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Loop
                    </Button>
                  </div>
                </div>

                <div
                  ref={setMainNodeRef}
                  className={`space-y-2 ${isMainOver ? "bg-muted/50 p-2 rounded" : ""}`}
                >
                  <SortableContext
                    items={stages.map((_, index) => `stage-${index}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {stages.map((stage, index) => {
                      const isExpanded = expandedStageIndex === index;
                      const stageName =
                        stage.exerciseName ||
                        stage.name ||
                        `Stage ${index + 1}`;

                      if (stage.type === "repetition") {
                        return (
                          <div
                            key={index}
                            className="border rounded-lg relative transition-all bg-muted/10"
                          >
                            <SortableStageItem
                              id={`stage-${index}`}
                              onRemove={() => handleRemoveStage(index)}
                            >
                              {/* Repetition Header */}
                              <div className="p-3 border-b bg-muted/20 rounded-t-lg flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">
                                    Repetir
                                  </span>
                                  <Input
                                    type="number"
                                    min="1"
                                    className="w-16 h-8 bg-background"
                                    value={stage.repeat || 1}
                                    onChange={(e) =>
                                      handleStageChange(
                                        index,
                                        "repeat",
                                        parseInt(e.target.value) || 1
                                      )
                                    }
                                  />
                                  <span className="font-semibold text-sm">
                                    Vezes
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  (Exercise Loop)
                                </div>
                              </div>
                            </SortableStageItem>

                            {/* Child Stages */}
                            <div className="p-4 space-y-3">
                              <SortableContext
                                items={(stage.childStages || []).map(
                                  (_, childIndex) =>
                                    `child-${index}-${childIndex}`
                                )}
                                strategy={verticalListSortingStrategy}
                              >
                                {stage.childStages?.map((child, childIndex) => (
                                  <SortableChildStageItem
                                    key={childIndex}
                                    id={`child-${index}-${childIndex}`}
                                    onRemove={() =>
                                      handleRemoveChildStage(index, childIndex)
                                    }
                                  >
                                    <div
                                      className={`border rounded-lg transition-all ${getStageTypeColor(
                                        child.type
                                      )}`}
                                    >
                                      {/* Collapsible Header */}
                                      <div
                                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-t-lg"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleChildExpanded(
                                            index,
                                            childIndex
                                          );
                                        }}
                                      >
                                        <div className="flex items-center gap-3 flex-1">
                                          <ChevronDown
                                            className={`h-4 w-4 transition-transform ${
                                              expandedChildStages[
                                                `${index}-${childIndex}`
                                              ] || false
                                                ? "transform rotate-180"
                                                : ""
                                            }`}
                                          />
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">
                                              {child.exerciseName ||
                                                child.name ||
                                                `Stage ${childIndex + 1}`}
                                            </span>
                                          </div>
                                          <span className="text-xs text-muted-foreground capitalize">
                                            ({child.type})
                                          </span>
                                        </div>
                                      </div>

                                      {/* Expandable Content */}
                                      {(expandedChildStages[
                                        `${index}-${childIndex}`
                                      ] ||
                                        false) && (
                                        <div className="p-4 pt-2 space-y-3">
                                          <div className="grid gap-3 pr-8 ml-8">
                                            <div className="grid grid-cols-2 gap-3">
                                              <div className="space-y-1">
                                                <Label className="text-xs">
                                                  Tipo
                                                </Label>
                                                <Select
                                                  value={child.type}
                                                  onValueChange={(value) =>
                                                    handleChildStageChange(
                                                      index,
                                                      childIndex,
                                                      "type",
                                                      value
                                                    )
                                                  }
                                                >
                                                  <SelectTrigger className="h-8">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="warmup">
                                                      Warmup
                                                    </SelectItem>
                                                    <SelectItem value="work">
                                                      Exercise
                                                    </SelectItem>
                                                    <SelectItem value="cardio">
                                                      Cardio
                                                    </SelectItem>
                                                    <SelectItem value="recovery">
                                                      Recovery
                                                    </SelectItem>
                                                    <SelectItem value="rest">
                                                      Rest
                                                    </SelectItem>
                                                    <SelectItem value="cooldown">
                                                      Cooldown
                                                    </SelectItem>
                                                    <SelectItem value="other">
                                                      Other
                                                    </SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              <div className="space-y-1">
                                                <Label className="text-xs">
                                                  Nome
                                                </Label>
                                                <Input
                                                  className="h-8"
                                                  placeholder="Stage name"
                                                  value={
                                                    child.name ||
                                                    child.exerciseName ||
                                                    ""
                                                  }
                                                  onChange={(e) =>
                                                    handleChildStageChange(
                                                      index,
                                                      childIndex,
                                                      "name",
                                                      e.target.value
                                                    )
                                                  }
                                                />
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-3">
                                              <div className="space-y-1">
                                                <Label className="text-xs">
                                                  Distância
                                                </Label>
                                                <div className="flex gap-1">
                                                  <Input
                                                    className="h-8"
                                                    placeholder="0"
                                                    value={child.distance || ""}
                                                    onChange={(e) =>
                                                      handleChildStageChange(
                                                        index,
                                                        childIndex,
                                                        "distance",
                                                        e.target.value
                                                      )
                                                    }
                                                  />
                                                  <Select
                                                    value={
                                                      child.distanceUnit || "km"
                                                    }
                                                    onValueChange={(value) =>
                                                      handleChildStageChange(
                                                        index,
                                                        childIndex,
                                                        "distanceUnit",
                                                        value
                                                      )
                                                    }
                                                  >
                                                    <SelectTrigger className="h-8 w-16 px-1">
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="km">
                                                        km
                                                      </SelectItem>
                                                      <SelectItem value="m">
                                                        m
                                                      </SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                              </div>
                                              <div className="space-y-1">
                                                <Label className="text-xs">
                                                  Duração
                                                </Label>
                                                <Input
                                                  className="h-8"
                                                  placeholder="Tempo"
                                                  value={child.duration || ""}
                                                  onChange={(e) =>
                                                    handleChildStageChange(
                                                      index,
                                                      childIndex,
                                                      "duration",
                                                      e.target.value
                                                    )
                                                  }
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label className="text-xs">
                                                  Intensidade
                                                </Label>
                                                <Input
                                                  className="h-8"
                                                  placeholder="Zona/Ritmo"
                                                  value={child.intensity || ""}
                                                  onChange={(e) =>
                                                    handleChildStageChange(
                                                      index,
                                                      childIndex,
                                                      "intensity",
                                                      e.target.value
                                                    )
                                                  }
                                                />
                                              </div>
                                            </div>

                                            <div className="space-y-1">
                                              <Label className="text-xs">
                                                YouTube URL
                                              </Label>
                                              <Input
                                                className="h-8"
                                                placeholder="https://youtube.com/..."
                                                value={child.youtubeUrl || ""}
                                                onChange={(e) =>
                                                  handleChildStageChange(
                                                    index,
                                                    childIndex,
                                                    "youtubeUrl",
                                                    e.target.value
                                                  )
                                                }
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </SortableChildStageItem>
                                ))}
                              </SortableContext>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full border-dashed"
                                onClick={() => handleAddChildStage(index)}
                              >
                                <Plus className="mr-2 h-4 w-4" /> Add Stage to
                                Loop
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <SortableStageItem
                          key={index}
                          id={`stage-${index}`}
                          onRemove={() => handleRemoveStage(index)}
                        >
                          <div
                            className={`border rounded-lg transition-all ${getStageTypeColor(
                              stage.type
                            )}`}
                          >
                            {/* Collapsible Header */}
                            <div
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-t-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedStageIndex(isExpanded ? -1 : index);
                              }}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform ${
                                    isExpanded ? "transform rotate-180" : ""
                                  }`}
                                />
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {stageName}
                                  </span>
                                  {stage.repeat && stage.repeat > 1 && (
                                    <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                                      {stage.repeat}x
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground capitalize">
                                  ({stage.type})
                                </span>
                              </div>
                            </div>

                            {/* Expandable Content */}
                            {isExpanded && (
                              <div className="p-4 pt-2 space-y-3">
                                {/* Repeat Count */}
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs">Repeat:</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    placeholder="1"
                                    value={stage.repeat || 1}
                                    onChange={(e) =>
                                      handleStageChange(
                                        index,
                                        "repeat",
                                        parseInt(e.target.value) || 1
                                      )
                                    }
                                    className="w-20"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    x
                                  </span>
                                </div>

                                {/* Stage Type Selection */}
                                <div className="space-y-1">
                                  <Label className="text-xs">Stage Type</Label>
                                  <Select
                                    value={stage.type}
                                    onValueChange={(value) =>
                                      handleStageChange(index, "type", value)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="warmup">
                                        Warmup
                                      </SelectItem>
                                      <SelectItem value="work">Work</SelectItem>
                                      <SelectItem value="cardio">
                                        Cardio
                                      </SelectItem>
                                      <SelectItem value="recovery">
                                        Recovery
                                      </SelectItem>
                                      <SelectItem value="rest">Rest</SelectItem>
                                      <SelectItem value="cooldown">
                                        Cooldown
                                      </SelectItem>
                                      <SelectItem value="other">
                                        Other
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Conditional Fields based on stage type */}
                                {stage.type === "rest" ? (
                                  // Simplified Rest Stage
                                  <div className="ml-8 space-y-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs">
                                        Duração - Tipo
                                      </Label>
                                      <Select
                                        value={stage.duration || "lap"}
                                        onValueChange={(value) =>
                                          handleStageChange(
                                            index,
                                            "duration",
                                            value
                                          )
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="lap">
                                            Pressionar botão Lap
                                          </SelectItem>
                                          <SelectItem value="time">
                                            Tempo
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">
                                        Meta de intensidade
                                      </Label>
                                      <Select
                                        value={stage.intensity || "none"}
                                        onValueChange={(value) =>
                                          handleStageChange(
                                            index,
                                            "intensity",
                                            value
                                          )
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">
                                            Sem objetivo
                                          </SelectItem>
                                          <SelectItem value="zone1">
                                            Zona 1
                                          </SelectItem>
                                          <SelectItem value="zone2">
                                            Zona 2
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                ) : (
                                  // Regular Stage Fields
                                  <div className="ml-8 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <Label className="text-xs">
                                          {workoutType === "strength"
                                            ? "Exercise Name"
                                            : "Stage Name"}
                                        </Label>
                                        {workoutType === "strength" ? (
                                          <div className="space-y-2">
                                            <Select
                                              value={
                                                stage.libraryExerciseId
                                                  ? stage.libraryExerciseId
                                                  : undefined
                                              }
                                              onValueChange={(value) => {
                                                const selectedEx =
                                                  libraryExercises.find(
                                                    (ex) => ex.id === value
                                                  );
                                                if (selectedEx) {
                                                  handleStageChange(
                                                    index,
                                                    "libraryExerciseId",
                                                    value
                                                  );
                                                  handleStageChange(
                                                    index,
                                                    "exerciseName",
                                                    selectedEx.name
                                                  );
                                                  handleStageChange(
                                                    index,
                                                    "reps",
                                                    selectedEx.defaultReps || ""
                                                  );
                                                }
                                              }}
                                            >
                                              <SelectTrigger>
                                                <SelectValue placeholder="Select from library (optional)" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {libraryExercises.length ===
                                                0 ? (
                                                  <div className="p-2 text-xs text-muted-foreground text-center">
                                                    No exercises in library
                                                  </div>
                                                ) : (
                                                  libraryExercises.map((ex) => (
                                                    <SelectItem
                                                      key={ex.id}
                                                      value={ex.id}
                                                    >
                                                      {ex.name}
                                                    </SelectItem>
                                                  ))
                                                )}
                                              </SelectContent>
                                            </Select>
                                            <Input
                                              placeholder="Or type exercise name"
                                              value={stage.exerciseName || ""}
                                              onChange={(e) => {
                                                const newValue = e.target.value;
                                                if (
                                                  newValue === "" &&
                                                  stage.libraryExerciseId
                                                ) {
                                                  // If trying to clear and it's from library, set back to library name
                                                  const selectedEx =
                                                    libraryExercises.find(
                                                      (ex) =>
                                                        ex.id ===
                                                        stage.libraryExerciseId
                                                    );
                                                  handleStageChange(
                                                    index,
                                                    "exerciseName",
                                                    selectedEx
                                                      ? selectedEx.name
                                                      : ""
                                                  );
                                                } else {
                                                  handleStageChange(
                                                    index,
                                                    "exerciseName",
                                                    newValue
                                                  );
                                                }
                                              }}
                                            />
                                          </div>
                                        ) : (
                                          <Input
                                            placeholder="e.g. Warmup, Main Set"
                                            value={stage.name}
                                            onChange={(e) =>
                                              handleStageChange(
                                                index,
                                                "name",
                                                e.target.value
                                              )
                                            }
                                          />
                                        )}
                                      </div>
                                    </div>

                                    {workoutType === "strength" ? (
                                      <>
                                        <div className="grid grid-cols-3 gap-3">
                                          <div className="space-y-1">
                                            <Label className="text-xs">
                                              Sets
                                            </Label>
                                            <Input
                                              placeholder="e.g. 3"
                                              value={stage.sets}
                                              onChange={(e) =>
                                                handleStageChange(
                                                  index,
                                                  "sets",
                                                  e.target.value
                                                )
                                              }
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-xs">
                                              Reps
                                            </Label>
                                            <Input
                                              placeholder="e.g. 10"
                                              value={stage.reps}
                                              onChange={(e) =>
                                                handleStageChange(
                                                  index,
                                                  "reps",
                                                  e.target.value
                                                )
                                              }
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-xs">
                                              Weight
                                            </Label>
                                            <Input
                                              placeholder="e.g. 20kg"
                                              value={stage.weight}
                                              onChange={(e) =>
                                                handleStageChange(
                                                  index,
                                                  "weight",
                                                  e.target.value
                                                )
                                              }
                                            />
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                          <Label className="text-xs">
                                            Duration
                                          </Label>
                                          <Input
                                            placeholder="e.g. 30 min"
                                            value={stage.duration}
                                            onChange={(e) =>
                                              handleStageChange(
                                                index,
                                                "duration",
                                                e.target.value
                                              )
                                            }
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs">
                                            Distance
                                          </Label>
                                          <Input
                                            placeholder="e.g. 5"
                                            value={stage.distance}
                                            onChange={(e) =>
                                              handleStageChange(
                                                index,
                                                "distance",
                                                e.target.value
                                              )
                                            }
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs">
                                            Unit
                                          </Label>
                                          <Select
                                            value={stage.distanceUnit}
                                            onValueChange={(value) =>
                                              handleStageChange(
                                                index,
                                                "distanceUnit",
                                                value
                                              )
                                            }
                                          >
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="km">
                                                km
                                              </SelectItem>
                                              <SelectItem value="m">
                                                m
                                              </SelectItem>
                                              <SelectItem value="mi">
                                                mi
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                    )}

                                    {/* Swimming-specific fields */}
                                    {workoutType === "swimming" && (
                                      <div className="space-y-1">
                                        <Label className="text-xs">
                                          Stroke Type
                                        </Label>
                                        <Select
                                          value={stage.stroke || ""}
                                          onValueChange={(value) =>
                                            handleStageChange(
                                              index,
                                              "stroke",
                                              value
                                            )
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select stroke type" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="freestyle">
                                              Freestyle (Crawl)
                                            </SelectItem>
                                            <SelectItem value="backstroke">
                                              Backstroke
                                            </SelectItem>
                                            <SelectItem value="breaststroke">
                                              Breaststroke
                                            </SelectItem>
                                            <SelectItem value="butterfly">
                                              Butterfly
                                            </SelectItem>
                                            <SelectItem value="mixed">
                                              Mixed Strokes
                                            </SelectItem>
                                            <SelectItem value="im">
                                              Individual Medley
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}

                                    {/* Equipment Type */}
                                    <div className="space-y-2">
                                      <Label className="text-xs">
                                        Equipment
                                      </Label>
                                      <div className="grid grid-cols-2 gap-2">
                                        {getEquipmentOptions(workoutType).map(
                                          (option) => (
                                            <div
                                              key={option.value}
                                              className="flex items-center space-x-2"
                                            >
                                              <Checkbox
                                                id={`equipment-${index}-${option.value}`}
                                                checked={(
                                                  stage.equipment || []
                                                ).includes(option.value)}
                                                onCheckedChange={(checked) =>
                                                  handleEquipmentChange(
                                                    index,
                                                    option.value,
                                                    checked as boolean
                                                  )
                                                }
                                              />
                                              <Label
                                                htmlFor={`equipment-${index}-${option.value}`}
                                                className="text-xs font-normal cursor-pointer"
                                              >
                                                {option.label}
                                              </Label>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-xs">
                                        {workoutType === "strength"
                                          ? "Notes"
                                          : "Intensity/Notes"}
                                      </Label>
                                      <Input
                                        placeholder={
                                          workoutType === "strength"
                                            ? "Additional notes..."
                                            : "e.g. Easy pace, Zone 2"
                                        }
                                        value={stage.intensity || stage.notes}
                                        onChange={(e) =>
                                          handleStageChange(
                                            index,
                                            workoutType === "strength"
                                              ? "notes"
                                              : "intensity",
                                            e.target.value
                                          )
                                        }
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-xs">
                                        YouTube URL
                                      </Label>
                                      <Input
                                        placeholder="https://youtube.com/watch?v=..."
                                        value={stage.youtubeUrl || ""}
                                        onChange={(e) =>
                                          handleStageChange(
                                            index,
                                            "youtubeUrl",
                                            e.target.value
                                          )
                                        }
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </SortableStageItem>
                      );
                    })}
                  </SortableContext>
                </div>

                <div className="space-y-2">
                  <Label>Workout Notes</Label>
                  <Textarea
                    placeholder="General notes about this workout..."
                    value={workoutNotes}
                    onChange={(e) => setWorkoutNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </DndContext>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate(`/admin/users/${userId}/workouts`)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveWorkout} disabled={saving}>
                {saving ? "Saving..." : "Save Workout"}
              </Button>
            </div>
          </div>
        </div>

        {/* Date Picker Dialog */}
        <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Select Workout Date
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4 py-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setDate(date.toISOString().split("T")[0]);
                  }
                }}
                onDayClick={() => {
                  // Close dialog when any day is clicked (including already selected)
                  setCalendarOpen(false);
                }}
                className="rounded-md border"
                fromDate={new Date(1900, 0, 1)}
                toDate={new Date(2100, 11, 31)}
              />
              <p className="text-xs text-muted-foreground text-center">
                Choose the date for this workout
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default WorkoutEditor;
