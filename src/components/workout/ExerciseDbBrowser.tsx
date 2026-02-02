import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  bodyPartLabels,
  bodyParts,
  type ExerciseDbExercise,
  getExercisesByBodyPart,
  isExerciseDbConfigured,
  searchExercisesByName,
  targetLabels,
  equipmentLabelsDb,
} from "@/services/exerciseDbService";
import { importExerciseFromDb } from "@/services/exercisesService";
import type { Exercise } from "@/types/exercise";
import {
  AlertCircle,
  Database,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface ExerciseDbBrowserProps {
  onExerciseImported: (exercise: Exercise) => void;
}

// Exercise card for ExerciseDB results
const ExerciseDbCard = ({
  exercise,
  onPreview,
  onImport,
  importing,
  translations,
}: {
  exercise: ExerciseDbExercise;
  onPreview: () => void;
  onImport: () => void;
  importing: boolean;
  translations: ReturnType<typeof useLanguage>["t"];
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group overflow-hidden"
      onClick={onPreview}
    >
      <div className="aspect-square bg-muted relative overflow-hidden flex items-center justify-center">
        {exercise.gifUrl && !imageError ? (
          <img
            src={exercise.gifUrl}
            alt={exercise.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="text-center text-muted-foreground p-4">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">{translations.workout.library.noImage}</p>
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <p className="font-medium text-sm line-clamp-2 capitalize">
          {exercise.name}
        </p>
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge variant="secondary" className="text-xs capitalize">
            {exercise.target}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs w-full mt-2"
          onClick={(e) => {
            e.stopPropagation();
            onImport();
          }}
          disabled={importing}
        >
          {importing ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Plus className="h-3 w-3 mr-1" />
          )}
          {translations.workout.common.add}
        </Button>
      </CardContent>
    </Card>
  );
};

// Exercise preview dialog for ExerciseDB
const ExerciseDbPreviewDialog = ({
  exercise,
  open,
  onOpenChange,
  onImport,
  importing,
  translations,
}: {
  exercise: ExerciseDbExercise | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: () => void;
  importing: boolean;
  translations: ReturnType<typeof useLanguage>["t"];
}) => {
  if (!exercise) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="capitalize">{exercise.name}</DialogTitle>
          <DialogDescription>
            {translations.workout.library.fromExerciseLibrary} - {translations.workout.bodyParts[exercise.bodyPart as keyof typeof translations.workout.bodyParts] || exercise.bodyPart}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* GIF Animation */}
          <div className="aspect-square bg-muted rounded-lg overflow-hidden">
            <img
              src={exercise.gifUrl}
              alt={exercise.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {translations.workout.exerciseForm.muscleGroups}
              </p>
              <Badge variant="default" className="capitalize">
                {targetLabels[exercise.target] || exercise.target}
              </Badge>
            </div>

            {exercise.secondaryMuscles.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {translations.workout.exerciseForm.muscleGroups}
                </p>
                <div className="flex flex-wrap gap-1">
                  {exercise.secondaryMuscles.map((muscle) => (
                    <Badge key={muscle} variant="secondary" className="capitalize">
                      {targetLabels[muscle] || muscle}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {translations.workout.library.filterByBodyPart}
              </p>
              <Badge variant="outline" className="capitalize">
                {translations.workout.bodyParts[exercise.bodyPart as keyof typeof translations.workout.bodyParts] || bodyPartLabels[exercise.bodyPart] || exercise.bodyPart}
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {translations.workout.exerciseForm.equipment}
              </p>
              <Badge variant="outline" className="capitalize">
                {equipmentLabelsDb[exercise.equipment] || exercise.equipment}
              </Badge>
            </div>

            {exercise.instructions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {translations.workout.exerciseForm.instructions}
                </p>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  {exercise.instructions.map((instruction, idx) => (
                    <li key={idx} className="text-muted-foreground">
                      {instruction}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {translations.workout.common.close}
          </Button>
          <Button onClick={onImport} disabled={importing}>
            {importing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {translations.workout.library.addToWorkout}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ExerciseDbBrowser = ({ onExerciseImported }: ExerciseDbBrowserProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>("all");
  const [exercises, setExercises] = useState<ExerciseDbExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [previewExercise, setPreviewExercise] = useState<ExerciseDbExercise | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const isConfigured = isExerciseDbConfigured();

  // Search or filter exercises
  const loadExercises = useCallback(async () => {
    if (!isConfigured) return;

    setLoading(true);
    setHasSearched(true);
    try {
      let results: ExerciseDbExercise[];

      if (searchQuery.trim()) {
        results = await searchExercisesByName(searchQuery.trim(), 30);
      } else if (selectedBodyPart !== "all") {
        results = await getExercisesByBodyPart(
          selectedBodyPart as (typeof bodyParts)[number],
          30
        );
      } else {
        // Don't load all exercises by default (too many)
        results = [];
      }

      setExercises(results);
    } catch (error) {
      console.error("Error loading exercises:", error);
      toast({
        title: t.workout.common.error,
        description: t.workout.toast.failedToLoadFromApi,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedBodyPart, isConfigured, toast]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() && selectedBodyPart === "all") {
      setExercises([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(() => {
      loadExercises();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedBodyPart, loadExercises]);

  const handleImport = async (exercise: ExerciseDbExercise) => {
    if (!user) return;

    setImporting(exercise.id);
    try {
      const firestoreId = await importExerciseFromDb(exercise, user.uid);

      // Create the exercise object to return
      const importedExercise: Exercise = {
        id: firestoreId,
        name: exercise.name,
        description: `Target: ${exercise.target}`,
        instructions: exercise.instructions?.join("\n") || "",
        gifUrl: exercise.gifUrl || undefined,
        muscleGroups: [],
        equipment: [],
        targetMuscle: exercise.target,
        secondaryMuscles: exercise.secondaryMuscles || [],
        bodyPart: exercise.bodyPart,
        isCustom: false,
        exerciseDbId: exercise.id,
        createdBy: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      onExerciseImported(importedExercise);
      toast({ title: t.workout.toast.added.replace("{{name}}", exercise.name) });

      // Close preview if open
      if (previewExercise?.id === exercise.id) {
        setPreviewExercise(null);
      }
    } catch (error) {
      console.error("Error importing exercise:", error);
      toast({
        title: t.workout.common.error,
        description: t.workout.toast.failedToImport,
        variant: "destructive",
      });
    } finally {
      setImporting(null);
    }
  };

  if (!isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">ExerciseDB Not Configured</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Add your API key to the environment variable VITE_EXERCISEDB_API_KEY
          to browse exercises from ExerciseDB.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search and Filters */}
      <div className="p-4 border-b bg-background space-y-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t.workout.library.exerciseLibrary}</span>
          <span className="text-xs text-muted-foreground">{t.workout.library.exerciseCount}</span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.workout.library.searchExercises}
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select value={selectedBodyPart} onValueChange={setSelectedBodyPart}>
          <SelectTrigger>
            <SelectValue placeholder={t.workout.library.filterByBodyPart} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.workout.library.allBodyParts}</SelectItem>
            {bodyParts.map((part) => (
              <SelectItem key={part} value={part}>
                {t.workout.bodyParts[part as keyof typeof t.workout.bodyParts] || bodyPartLabels[part] || part}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : exercises.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {exercises.map((exercise) => (
                <ExerciseDbCard
                  key={exercise.id}
                  exercise={exercise}
                  onPreview={() => setPreviewExercise(exercise)}
                  onImport={() => handleImport(exercise)}
                  importing={importing === exercise.id}
                  translations={t}
                />
              ))}
            </div>
          ) : hasSearched ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>{t.workout.library.noExercisesFound}</p>
              <p className="text-sm mt-1">{t.workout.library.tryDifferentSearch}</p>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t.workout.library.searchOrFilter}</p>
              <p className="text-sm mt-1">{t.workout.library.orFilterByBodyPart}</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      <ExerciseDbPreviewDialog
        exercise={previewExercise}
        open={!!previewExercise}
        onOpenChange={(open) => !open && setPreviewExercise(null)}
        onImport={() => previewExercise && handleImport(previewExercise)}
        importing={importing === previewExercise?.id}
        translations={t}
      />
    </div>
  );
};

export default ExerciseDbBrowser;
