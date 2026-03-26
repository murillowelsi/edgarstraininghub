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
  MoreVertical,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [setsRaw, setSetsRaw] = useState(String(item.sets));
  const [repsRaw, setRepsRaw] = useState(item.reps || "");
  const [restRaw, setRestRaw] = useState(String(item.restSeconds));

  // Sync local state when drawer opens so it reflects latest values
  const handleOpenMenu = () => {
    setSetsRaw(String(item.sets));
    setRepsRaw(item.reps || "");
    setRestRaw(String(item.restSeconds));
    setMenuOpen(true);
  };

  const exerciseName = exercise?.name || item.exerciseName || "Unknown Exercise";
  const gifUrl = exercise?.gifUrl || item.exerciseGifUrl;
  const videoUrl = exercise?.videoUrl || item.exerciseVideoUrl;

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
    <>
      <div className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all">
        <div className="cursor-grab text-muted-foreground shrink-0">
          <GripVertical className="h-4 w-4" />
        </div>
        {thumbnailUrl ? (
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
            <img src={thumbnailUrl} alt={exerciseName} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="p-2.5 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: "#f59e0b1a", color: "#d97706" }}>
            <Dumbbell className="h-4 w-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm capitalize truncate">{exerciseName}</p>
          <p className="text-xs text-muted-foreground">
            {item.sets} sets × {item.reps || "10"} reps
            {item.restSeconds > 0 && ` · ${item.restSeconds}s rest`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground"
          onClick={handleOpenMenu}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="capitalize">{exerciseName}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4">
            {/* Sets */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">Sets</Label>
              <Input
                inputMode="numeric"
                value={setsRaw}
                onChange={(e) => setSetsRaw(e.target.value)}
                onBlur={() => {
                  const val = Math.max(1, parseInt(setsRaw) || 1);
                  setSetsRaw(String(val));
                  onUpdate({ sets: val });
                }}
                className="w-20 text-center"
              />
            </div>
            {/* Reps */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">Reps</Label>
              <Input
                value={repsRaw}
                onChange={(e) => setRepsRaw(e.target.value)}
                onBlur={() => onUpdate({ reps: repsRaw })}
                placeholder="8-12"
                className="w-20 text-center"
              />
            </div>
            {/* Rest */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">Rest</Label>
              <Input
                inputMode="numeric"
                value={restRaw}
                onChange={(e) => setRestRaw(e.target.value)}
                onBlur={() => {
                  const val = Math.max(0, parseInt(restRaw) || 0);
                  setRestRaw(String(val));
                  onUpdate({ restSeconds: val });
                }}
                className="w-20 text-center"
              />
            </div>
            {/* Delete */}
            <button
              className="flex items-center gap-3 w-full p-4 rounded-lg border bg-card hover:bg-muted transition-colors text-sm font-medium text-destructive"
              onClick={() => { setMenuOpen(false); onRemove(); }}
            >
              <Trash2 className="h-5 w-5" />
              {translations.workout.common.delete || "Delete"}
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
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
  const [mobileTab, setMobileTab] = useState("workout");
  const [libraryTab, setLibraryTab] = useState("library");

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

  const workoutBuilder = (
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

  const tabBadgeClass = "gap-1.5 px-3 py-1 rounded-full text-xs font-medium border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=inactive]:bg-background data-[state=inactive]:text-muted-foreground data-[state=inactive]:border-border data-[state=inactive]:shadow-none";

  const exerciseBrowserContent = (
    <Tabs value={libraryTab} onValueChange={setLibraryTab} className="flex flex-col h-full">
      <TabsContent value="library" className="flex-1 overflow-hidden m-0">
        <MyLibraryBrowser onExerciseSelected={handleAddExercise} />
      </TabsContent>
      <TabsContent value="browse" className="flex-1 overflow-hidden m-0">
        <ExerciseDbBrowser onExerciseImported={handleAddExercise} />
      </TabsContent>
    </Tabs>
  );

  const exerciseBrowser = (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 shrink-0 flex gap-2">
        <Tabs value={libraryTab} onValueChange={setLibraryTab} className="contents">
          <TabsList className="bg-transparent p-0 h-auto gap-2">
            <TabsTrigger value="library" className={tabBadgeClass}>
              <Library className="h-3.5 w-3.5" />
              {t.workout.library.myLibrary}
            </TabsTrigger>
            <TabsTrigger value="browse" className={tabBadgeClass}>
              <Database className="h-3.5 w-3.5" />
              {t.workout.library.browse}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {exerciseBrowserContent}
    </div>
  );

  return (
    <AdminLayout fullHeight>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b bg-card px-4 py-3 flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/admin/workouts")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold text-sm flex-1 min-w-0 truncate">
            {isEditing ? t.workout.editor.editStrengthWorkout : t.workout.editor.newStrengthWorkout}
          </h1>
          <Button onClick={handleSave} disabled={!name.trim() || saving} size="sm" variant="ghost" className="shrink-0 text-primary hover:text-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {t.workout.editor.saveWorkout}
          </Button>
        </div>

        {/* Mobile: single tab bar with all tabs */}
        <div className="flex-1 flex flex-col overflow-hidden md:hidden">
          <div className="border-b px-4 py-3 shrink-0 flex items-center gap-2">
            <Tabs value={mobileTab} onValueChange={setMobileTab} className="contents">
              <TabsList className="bg-transparent p-0 h-auto gap-2 flex-1">
                <TabsTrigger value="workout" className={`${tabBadgeClass} flex-1 justify-center`}>
                  Details
                </TabsTrigger>
                <TabsTrigger value="add" className={`${tabBadgeClass} flex-1 justify-center`}>
                  Exercises
                  {workoutExercises.length > 0 && (
                    <span className="ml-0.5 font-semibold">({workoutExercises.length})</span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="w-px h-4 bg-border shrink-0" />
            <Tabs value={libraryTab} onValueChange={(v) => { setLibraryTab(v); setMobileTab("add"); }} className="contents">
              <TabsList className="bg-transparent p-0 h-auto gap-2 flex-1">
                <TabsTrigger value="library" disabled={mobileTab === "workout"} className={`${tabBadgeClass} flex-1 justify-center`}>
                  Library
                </TabsTrigger>
                <TabsTrigger value="browse" disabled={mobileTab === "workout"} className={`${tabBadgeClass} flex-1 justify-center`}>
                  Browse
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex-1 overflow-hidden">
            {mobileTab === "workout" ? (
              <div className="h-full overflow-auto p-4">{workoutBuilder}</div>
            ) : (
              <div className="h-full">{exerciseBrowserContent}</div>
            )}
          </div>
        </div>

        {/* Desktop: side-by-side panels */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto p-4">
            {workoutBuilder}
          </div>
          <div className="w-96 border-l bg-muted/30 flex flex-col overflow-hidden">
            {exerciseBrowser}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StrengthWorkoutEditor;
