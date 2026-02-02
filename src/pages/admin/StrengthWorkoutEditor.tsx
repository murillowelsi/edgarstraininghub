import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getAllExercises } from "@/services/exercisesService";
import { createWorkout, getWorkoutById, updateWorkout } from "@/services/workoutsService";
import type { Exercise, WorkoutExercise } from "@/types/exercise";
import { generateExerciseId } from "@/types/exercise";
import {
  ArrowLeft,
  Dumbbell,
  GripVertical,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { useAuth } from "../../contexts/AuthContext";
import ExerciseDbBrowser from "@/components/workout/ExerciseDbBrowser";

// Workout exercise row
const WorkoutExerciseRow = ({
  item,
  exercise,
  onUpdate,
  onRemove,
}: {
  item: WorkoutExercise;
  exercise?: Exercise;
  onUpdate: (updates: Partial<WorkoutExercise>) => void;
  onRemove: () => void;
}) => {
  const exerciseName = exercise?.name || item.exerciseName || "Unknown Exercise";
  const gifUrl = exercise?.gifUrl || item.exerciseGifUrl;

  return (
    <div className="flex items-center gap-3 p-3 bg-card border rounded-lg">
      <div className="cursor-grab text-muted-foreground">
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="w-16 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
        {gifUrl ? (
          <img
            src={gifUrl}
            alt={exerciseName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Dumbbell className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate capitalize">{exerciseName}</p>
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
  const [exercises, setExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      // Load exercises from Firestore (for looking up existing workout exercises)
      const loadedExercises = await getAllExercises();
      setExercises(loadedExercises);

      // Load workout if editing
      if (id) {
        const workout = await getWorkoutById(id);
        if (workout) {
          setName(workout.name);
          setNotes(workout.notes || "");

          // Populate exercise reference on each workout exercise
          const populatedExercises = (workout.exercises || []).map((we) => {
            const exercise = loadedExercises.find((e) => e.id === we.exerciseId);
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

  const addExerciseToWorkout = (exercise: Exercise) => {
    const newItem: WorkoutExercise = {
      id: generateExerciseId(),
      exerciseId: exercise.id,
      exercise,
      sets: 3,
      reps: "10",
      restSeconds: 60,
      order: workoutExercises.length,
      // Store denormalized data for offline access
      exerciseName: exercise.name,
      exerciseGifUrl: exercise.gifUrl,
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
                    <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="mb-2">No exercises added yet</p>
                    <p className="text-sm">
                      Search and add exercises from ExerciseDB on the right
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {workoutExercises.map((item) => {
                      const exercise = exercises.find(
                        (e) => e.id === item.exerciseId
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

          {/* Right Panel - ExerciseDB */}
          <div className="w-96 border-l bg-muted/30 flex flex-col overflow-hidden">
            <ExerciseDbBrowser
              onExerciseImported={(exercise) => {
                // Add to exercises list for lookup
                setExercises((prev) => {
                  if (prev.some((e) => e.id === exercise.id)) {
                    return prev;
                  }
                  return [...prev, exercise];
                });
                addExerciseToWorkout(exercise);
              }}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StrengthWorkoutEditor;
