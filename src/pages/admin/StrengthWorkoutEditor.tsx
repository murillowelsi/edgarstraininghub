import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getAllExercises } from "@/services/exercisesService";
import { createWorkout, getWorkoutById, updateWorkout } from "@/services/workoutsService";
import type { Exercise, WorkoutExercise } from "@/types/exercise";
import { generateExerciseId, getYouTubeVideoId, getYouTubeThumbnail } from "@/types/exercise";
import {
  ArrowLeft,
  Database,
  Dumbbell,
  GripVertical,
  Library,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import ExerciseDbBrowser from "@/components/workout/ExerciseDbBrowser";
import MyLibraryBrowser from "@/components/workout/MyLibraryBrowser";

// Workout exercise row
const WorkoutExerciseRow = ({
  item,
  exercise,
  onUpdate,
  onRemove,
  translations,
}: {
  item: WorkoutExercise;
  exercise?: Exercise;
  onUpdate: (updates: Partial<WorkoutExercise>) => void;
  onRemove: () => void;
  translations: ReturnType<typeof useLanguage>["t"];
}) => {
  const exerciseName = exercise?.name || item.exerciseName || "Unknown Exercise";
  const gifUrl = exercise?.gifUrl || item.exerciseGifUrl;
  const videoUrl = exercise?.videoUrl || item.exerciseVideoUrl;

  // Get thumbnail: prefer gifUrl, then YouTube thumbnail
  const getThumbnail = () => {
    if (gifUrl) return gifUrl;
    if (videoUrl) {
      const videoId = getYouTubeVideoId(videoUrl);
      if (videoId) return getYouTubeThumbnail(videoId);
    }
    return null;
  };

  const thumbnailUrl = getThumbnail();

  return (
    <div className="flex items-center gap-3 p-3 bg-card border rounded-lg">
      <div className="cursor-grab text-muted-foreground">
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="w-16 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
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
          <span className="text-sm text-muted-foreground">{translations.workout.common.sets}</span>
          <span className="text-muted-foreground">×</span>
          <Input
            value={item.reps || ""}
            onChange={(e) => onUpdate({ reps: e.target.value })}
            className="w-20 h-8"
            placeholder="8-12"
          />
          <span className="text-sm text-muted-foreground">{translations.workout.common.reps}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-sm">
          <Label className="text-xs text-muted-foreground">{translations.workout.common.rest}</Label>
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
  const { t } = useLanguage();

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
        toast({ title: t.workout.toast.workoutUpdated });
      } else {
        await createWorkout(workoutData, user.uid);
        toast({ title: t.workout.toast.workoutCreated });
      }

      navigate("/admin/workouts");
    } catch (error) {
      console.error("Error saving workout:", error);
      toast({
        title: t.workout.common.error,
        description: t.workout.toast.failedToSaveWorkout,
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
      exerciseVideoUrl: exercise.videoUrl,
      exerciseThumbnailUrl: exercise.thumbnailUrl,
      exerciseMuscleGroups: exercise.muscleGroups,
      exerciseInstructions: exercise.instructions,
    };
    setWorkoutExercises([...workoutExercises, newItem]);
    toast({ title: t.workout.toast.added.replace("{{name}}", exercise.name) });
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

  const handleAddExercise = (exercise: Exercise) => {
    setExercises((prev) =>
      prev.some((e) => e.id === exercise.id) ? prev : [...prev, exercise]
    );
    addExerciseToWorkout(exercise);
  };

  const WorkoutBuilder = () => (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">{t.workout.editor.workoutDetails}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t.workout.editor.workoutName} *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.workout.editor.workoutNamePlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Label>{t.workout.editor.instructionsNotes}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.workout.editor.instructionsPlaceholder}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t.workout.common.exercises} ({workoutExercises.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {workoutExercises.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">{t.workout.editor.noExercisesYet}</p>
              <p className="text-sm">{t.workout.editor.browseExercisesHint}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {workoutExercises.map((item) => {
                const exercise = exercises.find((e) => e.id === item.exerciseId) || item.exercise;
                return (
                  <WorkoutExerciseRow
                    key={item.id}
                    item={item}
                    exercise={exercise}
                    onUpdate={(updates) => updateWorkoutExercise(item.id, updates)}
                    onRemove={() => removeWorkoutExercise(item.id)}
                    translations={t}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  const ExerciseBrowser = () => (
    <Tabs defaultValue="library" className="flex flex-col h-full">
      <div className="border-b px-4 pt-3 shrink-0">
        <TabsList className="w-full">
          <TabsTrigger value="library" className="flex-1 gap-1">
            <Library className="h-3.5 w-3.5" />
            {t.workout.library.myLibrary}
          </TabsTrigger>
          <TabsTrigger value="browse" className="flex-1 gap-1">
            <Database className="h-3.5 w-3.5" />
            {t.workout.library.browse}
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="library" className="flex-1 overflow-hidden m-0">
        <MyLibraryBrowser onExerciseSelected={handleAddExercise} />
      </TabsContent>
      <TabsContent value="browse" className="flex-1 overflow-hidden m-0">
        <ExerciseDbBrowser onExerciseImported={handleAddExercise} />
      </TabsContent>
    </Tabs>
  );

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-73px)] flex flex-col">
        {/* Header */}
        <div className="border-b bg-card px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/workouts")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold">
              {isEditing ? t.workout.editor.editStrengthWorkout : t.workout.editor.newStrengthWorkout}
            </h1>
          </div>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {t.workout.editor.saveWorkout}
          </Button>
        </div>

        {/* Mobile: top-level tabs — Workout | Add Exercises */}
        <div className="flex-1 flex flex-col overflow-hidden md:hidden">
          <Tabs defaultValue="workout" className="flex flex-col h-full">
            <div className="border-b bg-card px-4 pt-2 shrink-0">
              <TabsList className="w-full">
                <TabsTrigger value="workout" className="flex-1">
                  {t.workout.editor.workoutDetails}
                </TabsTrigger>
                <TabsTrigger value="add" className="flex-1 gap-1">
                  <Dumbbell className="h-3.5 w-3.5" />
                  {t.workout.common.exercises}
                  {workoutExercises.length > 0 && (
                    <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
                      {workoutExercises.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="workout" className="flex-1 overflow-auto m-0 p-4">
              <WorkoutBuilder />
            </TabsContent>
            <TabsContent value="add" className="flex-1 overflow-hidden m-0">
              <ExerciseBrowser />
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop: side-by-side panels */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto p-4">
            <WorkoutBuilder />
          </div>
          <div className="w-96 border-l bg-muted/30 flex flex-col overflow-hidden">
            <ExerciseBrowser />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StrengthWorkoutEditor;
