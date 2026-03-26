import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
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
import { useToast } from "@/hooks/use-toast";
import {
  createExercise,
  deleteExercise,
  getAllExercises,
  updateExercise,
} from "@/services/exercisesService";
import type { Exercise, MuscleGroup, EquipmentType } from "@/types/exercise";
import {
  muscleGroupLabels,
  equipmentTypeLabels,
  getYouTubeVideoId,
  getYouTubeThumbnail,
} from "@/types/exercise";
import {
  Dumbbell,
  Edit,
  Library,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  X,
  Youtube,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface MyLibraryBrowserProps {
  onExerciseSelected: (exercise: Exercise) => void;
}

// Exercise card for library
const LibraryExerciseCard = ({
  exercise,
  onPreview,
  onAdd,
  translations,
}: {
  exercise: Exercise;
  onPreview: () => void;
  onAdd: () => void;
  translations: ReturnType<typeof useLanguage>["t"];
}) => {
  const thumbnailUrl = exercise.gifUrl ||
    (exercise.videoUrl ? getYouTubeThumbnail(getYouTubeVideoId(exercise.videoUrl) || "") : null);

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
      onClick={onPreview}
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center relative">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={exercise.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <Dumbbell className="h-5 w-5 text-muted-foreground opacity-50" />
        )}
        {exercise.videoUrl && (
          <div className="absolute bottom-0.5 right-0.5">
            <Youtube className="h-3 w-3 text-red-500" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm capitalize truncate">{exercise.name}</p>
        <div className="flex gap-1 mt-0.5 flex-wrap">
          {exercise.muscleGroups.slice(0, 2).map((mg) => (
            <Badge key={mg} variant="secondary" className="text-xs">
              {translations.workout.muscleGroups[mg] || muscleGroupLabels[mg]}
            </Badge>
          ))}
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="shrink-0 h-8 w-8 text-muted-foreground hover:text-primary"
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

// Exercise preview dialog
const ExercisePreviewDialog = ({
  exercise,
  open,
  onOpenChange,
  onAdd,
  onEdit,
  onDelete,
  translations,
}: {
  exercise: Exercise | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  translations: ReturnType<typeof useLanguage>["t"];
}) => {
  if (!exercise) return null;

  const videoId = exercise.videoUrl ? getYouTubeVideoId(exercise.videoUrl) : null;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={exercise.name}
      description={exercise.isCustom ? translations.workout.library.customExercise : translations.workout.library.fromExerciseLibrary}
      className="max-w-3xl max-h-[90vh] overflow-auto"
    >
        <div className="grid md:grid-cols-2 gap-6">
          {/* Video/Image */}
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            {videoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            ) : exercise.gifUrl ? (
              <img
                src={exercise.gifUrl}
                alt={exercise.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Dumbbell className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            {exercise.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {translations.workout.exerciseForm.description}
                </p>
                <p className="text-sm">{exercise.description}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {translations.workout.exerciseForm.muscleGroups}
              </p>
              <div className="flex flex-wrap gap-1">
                {exercise.muscleGroups.map((mg) => (
                  <Badge key={mg} variant="default">
                    {translations.workout.muscleGroups[mg] || muscleGroupLabels[mg]}
                  </Badge>
                ))}
              </div>
            </div>

            {exercise.equipment.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {translations.workout.exerciseForm.equipment}
                </p>
                <div className="flex flex-wrap gap-1">
                  {exercise.equipment.map((eq) => (
                    <Badge key={eq} variant="outline">
                      {translations.workout.equipmentTypes[eq] || equipmentTypeLabels[eq]}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {exercise.instructions && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {translations.workout.exerciseForm.instructions}
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {exercise.instructions}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <Button onClick={onAdd} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            {translations.workout.library.addToWorkout}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              {translations.workout.common.edit}
            </Button>
            <Button variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              {translations.workout.common.delete}
            </Button>
          </div>
        </div>
    </ResponsiveModal>
  );
};

// Exercise form dialog (create or edit)
const ExerciseFormDialog = ({
  open,
  onOpenChange,
  onSaved,
  exerciseToEdit,
  translations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (exercise: Exercise) => void;
  exerciseToEdit?: Exercise | null;
  translations: ReturnType<typeof useLanguage>["t"];
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<MuscleGroup | "">("");
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType | "">("");
  const [equipment, setEquipment] = useState<EquipmentType[]>([]);

  const isEditing = !!exerciseToEdit;

  // Populate form when editing
  useEffect(() => {
    if (exerciseToEdit) {
      setName(exerciseToEdit.name);
      setDescription(exerciseToEdit.description || "");
      setInstructions(exerciseToEdit.instructions || "");
      setVideoUrl(exerciseToEdit.videoUrl || "");
      setMuscleGroups(exerciseToEdit.muscleGroups);
      setEquipment(exerciseToEdit.equipment);
    } else {
      resetForm();
    }
  }, [exerciseToEdit, open]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setInstructions("");
    setVideoUrl("");
    setMuscleGroups([]);
    setEquipment([]);
    setSelectedMuscleGroup("");
    setSelectedEquipment("");
  };

  const handleAddMuscleGroup = () => {
    if (selectedMuscleGroup && !muscleGroups.includes(selectedMuscleGroup)) {
      setMuscleGroups([...muscleGroups, selectedMuscleGroup]);
      setSelectedMuscleGroup("");
    }
  };

  const handleRemoveMuscleGroup = (mg: MuscleGroup) => {
    setMuscleGroups(muscleGroups.filter((m) => m !== mg));
  };

  const handleAddEquipment = () => {
    if (selectedEquipment && !equipment.includes(selectedEquipment)) {
      setEquipment([...equipment, selectedEquipment]);
      setSelectedEquipment("");
    }
  };

  const handleRemoveEquipment = (eq: EquipmentType) => {
    setEquipment(equipment.filter((e) => e !== eq));
  };

  const handleSave = async () => {
    if (!name.trim() || !user || muscleGroups.length === 0) return;

    setSaving(true);
    try {
      const videoId = videoUrl ? getYouTubeVideoId(videoUrl) : null;
      const thumbnailUrl = videoId ? getYouTubeThumbnail(videoId) : undefined;

      const exerciseData = {
        name: name.trim(),
        description: description.trim() || undefined,
        instructions: instructions.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        thumbnailUrl,
        muscleGroups,
        equipment,
      };

      if (isEditing && exerciseToEdit) {
        await updateExercise(exerciseToEdit.id, exerciseData);

        const updatedExercise: Exercise = {
          ...exerciseToEdit,
          ...exerciseData,
          updatedAt: new Date(),
        };

        toast({ title: translations.workout.toast.exerciseUpdated });
        onSaved(updatedExercise);
      } else {
        const exerciseId = await createExercise(exerciseData, user.uid);

        const newExercise: Exercise = {
          id: exerciseId,
          ...exerciseData,
          isCustom: true,
          createdBy: user.uid,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        toast({ title: translations.workout.toast.exerciseCreated });
        onSaved(newExercise);
      }

      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving exercise:", error);
      toast({
        title: translations.workout.common.error,
        description: isEditing ? translations.workout.toast.failedToUpdate : translations.workout.toast.failedToCreate,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? translations.workout.exerciseForm.editExercise : translations.workout.exerciseForm.createCustomExercise}
      description={isEditing ? translations.workout.exerciseForm.updateExerciseDetails : translations.workout.exerciseForm.addNewExercise}
      className="max-w-lg max-h-[90vh] overflow-auto"
    >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{translations.workout.exerciseForm.exerciseName} *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={translations.workout.exerciseForm.exerciseNamePlaceholder}
            />
          </div>

          <div className="space-y-2">
            <Label>{translations.workout.exerciseForm.description}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={translations.workout.exerciseForm.descriptionPlaceholder}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>{translations.workout.exerciseForm.instructions}</Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={translations.workout.exerciseForm.instructionsPlaceholder}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Youtube className="h-4 w-4 text-red-500" />
              {translations.workout.exerciseForm.youtubeUrl}
            </Label>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder={translations.workout.exerciseForm.youtubeUrlPlaceholder}
            />
            {videoUrl && getYouTubeVideoId(videoUrl) && (
              <div className="mt-2 aspect-video rounded overflow-hidden">
                <img
                  src={getYouTubeThumbnail(getYouTubeVideoId(videoUrl)!)}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>{translations.workout.exerciseForm.muscleGroups} *</Label>
            <div className="flex gap-2">
              <Select
                value={selectedMuscleGroup}
                onValueChange={(v) => setSelectedMuscleGroup(v as MuscleGroup)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={translations.workout.exerciseForm.selectMuscleGroup} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(muscleGroupLabels).map(([value, label]) => (
                    <SelectItem
                      key={value}
                      value={value}
                      disabled={muscleGroups.includes(value as MuscleGroup)}
                    >
                      {translations.workout.muscleGroups[value as MuscleGroup] || label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddMuscleGroup}
                disabled={!selectedMuscleGroup}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {muscleGroups.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {muscleGroups.map((mg) => (
                  <Badge
                    key={mg}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleRemoveMuscleGroup(mg)}
                  >
                    {translations.workout.muscleGroups[mg] || muscleGroupLabels[mg]}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>{translations.workout.exerciseForm.equipment}</Label>
            <div className="flex gap-2">
              <Select
                value={selectedEquipment}
                onValueChange={(v) => setSelectedEquipment(v as EquipmentType)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={translations.workout.exerciseForm.selectEquipment} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(equipmentTypeLabels).map(([value, label]) => (
                    <SelectItem
                      key={value}
                      value={value}
                      disabled={equipment.includes(value as EquipmentType)}
                    >
                      {translations.workout.equipmentTypes[value as EquipmentType] || label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddEquipment}
                disabled={!selectedEquipment}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {equipment.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {equipment.map((eq) => (
                  <Badge
                    key={eq}
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => handleRemoveEquipment(eq)}
                  >
                    {translations.workout.equipmentTypes[eq] || equipmentTypeLabels[eq]}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!name.trim() || muscleGroups.length === 0 || saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : isEditing ? (
              <Save className="h-4 w-4 mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {isEditing ? translations.workout.exerciseForm.saveChanges : translations.workout.library.createExercise}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            {translations.workout.common.cancel}
          </Button>
        </div>
    </ResponsiveModal>
  );
};

// Delete confirmation dialog
const DeleteExerciseDialog = ({
  exercise,
  open,
  onOpenChange,
  onConfirm,
  translations,
}: {
  exercise: Exercise | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  translations: ReturnType<typeof useLanguage>["t"];
}) => {
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!exercise) return;

    setDeleting(true);
    try {
      await deleteExercise(exercise.id);
      toast({ title: translations.workout.toast.exerciseDeleted });
      onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting exercise:", error);
      toast({
        title: translations.workout.common.error,
        description: translations.workout.toast.failedToDelete,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!exercise) return null;

  return (
    <ResponsiveConfirm
      open={open}
      onOpenChange={onOpenChange}
      title={translations.workout.deleteDialog.deleteExercise}
      description={translations.workout.deleteDialog.confirmDelete.replace("{{name}}", exercise.name)}
      confirmLabel={translations.workout.common.delete}
      cancelLabel={translations.workout.common.cancel}
      destructive
      loading={deleting}
      onConfirm={handleDelete}
    />
  );
};

const MyLibraryBrowser = ({ onExerciseSelected }: MyLibraryBrowserProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<Exercise | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    try {
      const allExercises = await getAllExercises();
      setExercises(allExercises);
      setFilteredExercises(allExercises);
    } catch (error) {
      console.error("Error loading exercises:", error);
      toast({
        title: t.workout.common.error,
        description: t.workout.toast.failedToLoad,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  // Filter exercises based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredExercises(exercises);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = exercises.filter(
      (ex) =>
        ex.name.toLowerCase().includes(query) ||
        ex.muscleGroups.some((mg) =>
          muscleGroupLabels[mg].toLowerCase().includes(query)
        )
    );
    setFilteredExercises(filtered);
  }, [searchQuery, exercises]);

  const handleAddExercise = (exercise: Exercise) => {
    onExerciseSelected(exercise);
    toast({ title: t.workout.toast.added.replace("{{name}}", exercise.name) });
    if (previewExercise?.id === exercise.id) {
      setPreviewExercise(null);
    }
  };

  const handleOpenCreateDialog = () => {
    setExerciseToEdit(null);
    setShowFormDialog(true);
  };

  const handleOpenEditDialog = (exercise: Exercise) => {
    setExerciseToEdit(exercise);
    setShowFormDialog(true);
    setPreviewExercise(null);
  };

  const handleOpenDeleteDialog = (exercise: Exercise) => {
    setExerciseToDelete(exercise);
    setShowDeleteDialog(true);
    setPreviewExercise(null);
  };

  const handleExerciseSaved = (exercise: Exercise) => {
    if (exerciseToEdit) {
      // Update existing
      setExercises((prev) =>
        prev.map((e) => (e.id === exercise.id ? exercise : e))
      );
    } else {
      // Add new
      setExercises((prev) => [exercise, ...prev]);
    }
    setExerciseToEdit(null);
  };

  const handleExerciseDeleted = () => {
    if (exerciseToDelete) {
      setExercises((prev) => prev.filter((e) => e.id !== exerciseToDelete.id));
      setExerciseToDelete(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-background space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t.workout.library.myLibrary}</span>
          </div>
          <Button size="sm" onClick={handleOpenCreateDialog}>
            <Plus className="h-4 w-4 mr-1" />
            {t.workout.common.new}
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.workout.library.searchExercises}
            className="pl-8 h-8 text-sm rounded-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredExercises.length > 0 ? (
            <div className="space-y-2">
              {filteredExercises.map((exercise) => (
                <LibraryExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onPreview={() => setPreviewExercise(exercise)}
                  onAdd={() => handleAddExercise(exercise)}
                  translations={t}
                />
              ))}
            </div>
          ) : exercises.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Library className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t.workout.library.noExercisesInLibrary}</p>
              <p className="text-sm mt-1">{t.workout.library.createFirstExercise}</p>
              <Button
                className="mt-4"
                onClick={handleOpenCreateDialog}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t.workout.library.createExercise}
              </Button>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>{t.workout.library.noExercisesFound}</p>
              <p className="text-sm mt-1">{t.workout.library.tryDifferentSearch}</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      <ExercisePreviewDialog
        exercise={previewExercise}
        open={!!previewExercise}
        onOpenChange={(open) => !open && setPreviewExercise(null)}
        onAdd={() => previewExercise && handleAddExercise(previewExercise)}
        onEdit={() => previewExercise && handleOpenEditDialog(previewExercise)}
        onDelete={() => previewExercise && handleOpenDeleteDialog(previewExercise)}
        translations={t}
      />

      {/* Create/Edit Dialog */}
      <ExerciseFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        onSaved={handleExerciseSaved}
        exerciseToEdit={exerciseToEdit}
        translations={t}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteExerciseDialog
        exercise={exerciseToDelete}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleExerciseDeleted}
        translations={t}
      />
    </div>
  );
};

export default MyLibraryBrowser;
