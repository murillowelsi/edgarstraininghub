import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  createExercise,
  getAllExercises,
  predefinedExercises,
  seedPredefinedExercises,
} from "@/services/exercisesService";
import { createWorkout, getWorkoutById, updateWorkout } from "@/services/workoutsService";
import type {
  Exercise,
  ExerciseFormData,
  MuscleGroup,
  WorkoutExercise,
} from "@/types/exercise";
import {
  equipmentTypeLabels,
  generateExerciseId,
  getYouTubeThumbnail,
  getYouTubeVideoId,
  muscleGroupLabels,
} from "@/types/exercise";
import {
  ArrowLeft,
  GripVertical,
  Loader2,
  Play,
  Plus,
  Save,
  Search,
  Trash2,
  X,
  Youtube,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { useAuth } from "../../contexts/AuthContext";

// Exercise card for the library
const ExerciseLibraryCard = ({
  exercise,
  onAdd,
  onPreview,
}: {
  exercise: Exercise | Omit<Exercise, "id" | "createdAt" | "updatedAt">;
  onAdd: () => void;
  onPreview: () => void;
}) => {
  const videoId = exercise.videoUrl ? getYouTubeVideoId(exercise.videoUrl) : null;
  const thumbnail = videoId
    ? getYouTubeThumbnail(videoId)
    : exercise.thumbnailUrl || null;

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group"
      onClick={onPreview}
    >
      <div className="aspect-video bg-muted relative overflow-hidden rounded-t-lg">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={exercise.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No preview
          </div>
        )}
        {videoId && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="h-10 w-10 text-white" />
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <p className="font-medium text-sm line-clamp-2">{exercise.name}</p>
        <div className="flex items-center gap-1 mt-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Exercise preview dialog
const ExercisePreviewDialog = ({
  exercise,
  open,
  onOpenChange,
  onAdd,
}: {
  exercise: Exercise | Omit<Exercise, "id" | "createdAt" | "updatedAt"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: () => void;
}) => {
  if (!exercise) return null;

  const videoId = exercise.videoUrl ? getYouTubeVideoId(exercise.videoUrl) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{exercise.name}</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Video */}
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            {videoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title={exercise.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No video available
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            {exercise.muscleGroups.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Muscle Groups
                </p>
                <div className="flex flex-wrap gap-1">
                  {exercise.muscleGroups.map((mg) => (
                    <Badge key={mg} variant="secondary">
                      {muscleGroupLabels[mg]}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {exercise.equipment && exercise.equipment.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Equipment
                </p>
                <div className="flex flex-wrap gap-1">
                  {exercise.equipment.map((eq) => (
                    <Badge key={eq} variant="outline">
                      {equipmentTypeLabels[eq]}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {exercise.instructions && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Instructions
                </p>
                <p className="text-sm">{exercise.instructions}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={() => {
              onAdd();
              onOpenChange(false);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add to Workout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Create exercise dialog
const CreateExerciseDialog = ({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (exercise: Exercise) => void;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ExerciseFormData>({
    name: "",
    description: "",
    instructions: "",
    videoUrl: "",
    muscleGroups: [],
    equipment: [],
  });

  const videoId = formData.videoUrl ? getYouTubeVideoId(formData.videoUrl) : null;

  const handleSubmit = async () => {
    if (!formData.name || !user) return;

    setLoading(true);
    try {
      const id = await createExercise(formData, user.uid);
      const newExercise: Exercise = {
        id,
        ...formData,
        isCustom: true,
        createdBy: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      onCreated(newExercise);
      toast({ title: "Exercise created" });
      onOpenChange(false);
      setFormData({
        name: "",
        description: "",
        instructions: "",
        videoUrl: "",
        muscleGroups: [],
        equipment: [],
      });
    } catch (error) {
      console.error("Error creating exercise:", error);
      toast({
        title: "Error",
        description: "Failed to create exercise",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMuscleGroup = (mg: MuscleGroup) => {
    setFormData((prev) => ({
      ...prev,
      muscleGroups: prev.muscleGroups.includes(mg)
        ? prev.muscleGroups.filter((m) => m !== mg)
        : [...prev.muscleGroups, mg],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Custom Exercise</DialogTitle>
          <DialogDescription>
            Add a new exercise to your library with a YouTube video link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Exercise Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Goblet Squat"
            />
          </div>

          <div className="space-y-2">
            <Label>YouTube Video URL</Label>
            <div className="flex gap-2">
              <Input
                value={formData.videoUrl}
                onChange={(e) =>
                  setFormData({ ...formData, videoUrl: e.target.value })
                }
                placeholder="https://youtube.com/watch?v=..."
              />
              {videoId && (
                <div className="w-20 h-12 rounded overflow-hidden flex-shrink-0">
                  <img
                    src={getYouTubeThumbnail(videoId)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Instructions</Label>
            <Textarea
              value={formData.instructions}
              onChange={(e) =>
                setFormData({ ...formData, instructions: e.target.value })
              }
              placeholder="Describe how to perform the exercise..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Muscle Groups</Label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(muscleGroupLabels).map(([key, label]) => (
                <Badge
                  key={key}
                  variant={
                    formData.muscleGroups.includes(key as MuscleGroup)
                      ? "default"
                      : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => toggleMuscleGroup(key as MuscleGroup)}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.name || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Exercise
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Workout exercise row
const WorkoutExerciseRow = ({
  item,
  exercise,
  onUpdate,
  onRemove,
}: {
  item: WorkoutExercise;
  exercise?: Exercise | Omit<Exercise, "id" | "createdAt" | "updatedAt">;
  onUpdate: (updates: Partial<WorkoutExercise>) => void;
  onRemove: () => void;
}) => {
  // Use exercise from lookup, or fall back to denormalized data stored with workout item
  const exerciseName = exercise?.name || item.exerciseName || "Unknown Exercise";
  const videoUrl = exercise?.videoUrl || item.exerciseVideoUrl;
  const thumbnailUrl = exercise?.thumbnailUrl || item.exerciseThumbnailUrl;

  const videoId = videoUrl ? getYouTubeVideoId(videoUrl) : null;
  const thumbnail = videoId
    ? getYouTubeThumbnail(videoId)
    : thumbnailUrl || null;

  return (
    <div className="flex items-center gap-3 p-3 bg-card border rounded-lg">
      <div className="cursor-grab text-muted-foreground">
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="w-16 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={exerciseName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Youtube className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{exerciseName}</p>
        <div className="flex items-center gap-2 mt-1">
          <Input
            type="number"
            value={item.sets}
            onChange={(e) => onUpdate({ sets: parseInt(e.target.value) || 1 })}
            className="w-16 h-8 text-center"
            min={1}
          />
          <span className="text-sm text-muted-foreground">sets</span>
          <span className="text-muted-foreground">×</span>
          <Input
            value={item.reps || ""}
            onChange={(e) => onUpdate({ reps: e.target.value })}
            className="w-20 h-8"
            placeholder="8-12"
          />
          <span className="text-sm text-muted-foreground">reps</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-sm">
          <Label className="text-xs text-muted-foreground">Rest</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={item.restSeconds}
              onChange={(e) =>
                onUpdate({ restSeconds: parseInt(e.target.value) || 0 })
              }
              className="w-16 h-8 text-center"
              min={0}
            />
            <span className="text-xs text-muted-foreground">s</span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const StrengthWorkoutEditor = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const isEditing = !!id;

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [exercises, setExercises] = useState<
    (Exercise | Omit<Exercise, "id" | "createdAt" | "updatedAt">)[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>("all");

  // Dialogs
  const [previewExercise, setPreviewExercise] = useState<
    Exercise | Omit<Exercise, "id" | "createdAt" | "updatedAt"> | null
  >(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      // Load exercises from Firestore
      let loadedExercises = await getAllExercises();

      // If no exercises in DB, use predefined ones
      if (loadedExercises.length === 0) {
        // Seed predefined exercises
        await seedPredefinedExercises();
        loadedExercises = await getAllExercises();
      }

      // If still empty, use local predefined
      if (loadedExercises.length === 0) {
        setExercises(predefinedExercises);
      } else {
        setExercises(loadedExercises);
      }

      // Load workout if editing
      if (id) {
        const workout = await getWorkoutById(id);
        if (workout) {
          setName(workout.name);
          setNotes(workout.notes || "");

          // Populate exercise reference on each workout exercise for proper display and re-saving
          const populatedExercises = (workout.exercises || []).map((we) => {
            // Try to find exercise by ID first
            let exercise = loadedExercises.find((e) => e.id === we.exerciseId);

            // If not found by ID, try to find by name (for workouts created before seeding)
            if (!exercise && we.exerciseName) {
              exercise = loadedExercises.find((e) => e.name === we.exerciseName);
            }

            // Return workout exercise with populated exercise reference
            return {
              ...we,
              exercise: exercise || undefined,
            };
          });

          setWorkoutExercises(populatedExercises);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      // Use predefined exercises as fallback
      setExercises(predefinedExercises);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !user) return;

    setSaving(true);
    try {
      const workoutData = {
        name: name.trim(),
        type: "strength" as const,
        stages: [],
        exercises: workoutExercises,
        notes: notes.trim(),
      };

      if (isEditing && id) {
        await updateWorkout(id, workoutData);
        toast({ title: "Workout updated" });
      } else {
        await createWorkout(workoutData, user.uid);
        toast({ title: "Workout created" });
      }

      navigate("/admin/workouts");
    } catch (error) {
      console.error("Error saving workout:", error);
      toast({
        title: "Error",
        description: "Failed to save workout",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addExerciseToWorkout = (
    exercise: Exercise | Omit<Exercise, "id" | "createdAt" | "updatedAt">
  ) => {
    const exerciseId = "id" in exercise ? exercise.id : generateExerciseId();
    const newItem: WorkoutExercise = {
      id: generateExerciseId(),
      exerciseId,
      exercise: exercise as Exercise,
      sets: 3,
      reps: "10",
      restSeconds: 60,
      order: workoutExercises.length,
      // Store denormalized data directly for reliable saving
      exerciseName: exercise.name,
      exerciseVideoUrl: exercise.videoUrl,
      exerciseThumbnailUrl: exercise.thumbnailUrl,
      exerciseMuscleGroups: exercise.muscleGroups,
      exerciseInstructions: exercise.instructions,
    };
    setWorkoutExercises([...workoutExercises, newItem]);
    toast({ title: `Added: ${exercise.name}` });
  };

  const updateWorkoutExercise = (id: string, updates: Partial<WorkoutExercise>) => {
    setWorkoutExercises((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const removeWorkoutExercise = (id: string) => {
    setWorkoutExercises((prev) => prev.filter((item) => item.id !== id));
  };

  const handleExerciseCreated = (exercise: Exercise) => {
    setExercises((prev) => [...prev, exercise]);
    addExerciseToWorkout(exercise);
  };

  // Filter exercises
  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscle =
      selectedMuscleGroup === "all" ||
      ex.muscleGroups.includes(selectedMuscleGroup as MuscleGroup);
    return matchesSearch && matchesMuscle;
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-73px)] flex flex-col">
        {/* Header */}
        <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/workouts")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">
                {isEditing ? "Edit Strength Workout" : "New Strength Workout"}
              </h1>
            </div>
          </div>

          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Workout
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Workout Builder */}
          <div className="flex-1 overflow-auto p-4">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-base">Workout Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Workout Name *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Full Body Workout A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instructions / Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any instructions or notes for this workout..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Exercises ({workoutExercises.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {workoutExercises.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="mb-2">No exercises added yet</p>
                    <p className="text-sm">
                      Select exercises from the library on the right
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {workoutExercises.map((item) => {
                      const exercise = exercises.find(
                        (e) => "id" in e && e.id === item.exerciseId
                      ) || item.exercise;
                      return (
                        <WorkoutExerciseRow
                          key={item.id}
                          item={item}
                          exercise={exercise}
                          onUpdate={(updates) =>
                            updateWorkoutExercise(item.id, updates)
                          }
                          onRemove={() => removeWorkoutExercise(item.id)}
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Exercise Library */}
          <div className="w-96 border-l bg-muted/30 flex flex-col">
            <div className="p-4 border-b bg-background space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search exercises..."
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Select
                  value={selectedMuscleGroup}
                  onValueChange={setSelectedMuscleGroup}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Muscles</SelectItem>
                    {Object.entries(muscleGroupLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Custom
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 grid grid-cols-2 gap-3">
                {filteredExercises.map((exercise, index) => (
                  <ExerciseLibraryCard
                    key={"id" in exercise ? exercise.id : index}
                    exercise={exercise}
                    onAdd={() => addExerciseToWorkout(exercise)}
                    onPreview={() => setPreviewExercise(exercise)}
                  />
                ))}
                {filteredExercises.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">
                    No exercises found
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <ExercisePreviewDialog
        exercise={previewExercise}
        open={!!previewExercise}
        onOpenChange={(open) => !open && setPreviewExercise(null)}
        onAdd={() => previewExercise && addExerciseToWorkout(previewExercise)}
      />

      {/* Create Exercise Dialog */}
      <CreateExerciseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleExerciseCreated}
      />
    </AdminLayout>
  );
};

export default StrengthWorkoutEditor;
