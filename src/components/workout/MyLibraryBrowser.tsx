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
import { createExercise, getAllExercises } from "@/services/exercisesService";
import type { Exercise, MuscleGroup, EquipmentType } from "@/types/exercise";
import {
  muscleGroupLabels,
  equipmentTypeLabels,
  getYouTubeVideoId,
  getYouTubeThumbnail,
} from "@/types/exercise";
import {
  Dumbbell,
  Library,
  Loader2,
  Plus,
  Search,
  X,
  Youtube,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface MyLibraryBrowserProps {
  onExerciseSelected: (exercise: Exercise) => void;
}

// Exercise card for library
const LibraryExerciseCard = ({
  exercise,
  onPreview,
  onAdd,
}: {
  exercise: Exercise;
  onPreview: () => void;
  onAdd: () => void;
}) => {
  const thumbnailUrl = exercise.gifUrl ||
    (exercise.videoUrl ? getYouTubeThumbnail(getYouTubeVideoId(exercise.videoUrl) || "") : null);

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group overflow-hidden"
      onClick={onPreview}
    >
      <div className="aspect-square bg-muted relative overflow-hidden flex items-center justify-center">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={exercise.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="text-center text-muted-foreground p-4">
            <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No image</p>
          </div>
        )}
        {exercise.videoUrl && (
          <div className="absolute top-2 right-2">
            <Youtube className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <p className="font-medium text-sm line-clamp-2 capitalize">
          {exercise.name}
        </p>
        <div className="flex flex-wrap gap-1 mt-1">
          {exercise.muscleGroups.slice(0, 2).map((mg) => (
            <Badge key={mg} variant="secondary" className="text-xs">
              {muscleGroupLabels[mg]}
            </Badge>
          ))}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs w-full mt-2"
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
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
  exercise: Exercise | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: () => void;
}) => {
  if (!exercise) return null;

  const videoId = exercise.videoUrl ? getYouTubeVideoId(exercise.videoUrl) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="capitalize">{exercise.name}</DialogTitle>
          <DialogDescription>
            {exercise.isCustom ? "Custom Exercise" : "From Library"}
          </DialogDescription>
        </DialogHeader>

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
                  Description
                </p>
                <p className="text-sm">{exercise.description}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Muscle Groups
              </p>
              <div className="flex flex-wrap gap-1">
                {exercise.muscleGroups.map((mg) => (
                  <Badge key={mg} variant="default">
                    {muscleGroupLabels[mg]}
                  </Badge>
                ))}
              </div>
            </div>

            {exercise.equipment.length > 0 && (
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
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {exercise.instructions}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onAdd}>
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
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<MuscleGroup | "">("");
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType | "">("");
  const [equipment, setEquipment] = useState<EquipmentType[]>([]);

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

      const exerciseId = await createExercise(
        {
          name: name.trim(),
          description: description.trim() || undefined,
          instructions: instructions.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
          thumbnailUrl,
          muscleGroups,
          equipment,
        },
        user.uid
      );

      const newExercise: Exercise = {
        id: exerciseId,
        name: name.trim(),
        description: description.trim() || undefined,
        instructions: instructions.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        thumbnailUrl,
        muscleGroups,
        equipment,
        isCustom: true,
        createdBy: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      toast({ title: "Exercise created" });
      onCreated(newExercise);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating exercise:", error);
      toast({
        title: "Error",
        description: "Failed to create exercise",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Exercise</DialogTitle>
          <DialogDescription>
            Add a new exercise to your library
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Exercise Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Bulgarian Split Squat"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the exercise..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Instructions</Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Step-by-step instructions..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Youtube className="h-4 w-4 text-red-500" />
              YouTube Video URL
            </Label>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
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
            <Label>Muscle Groups *</Label>
            <div className="flex gap-2">
              <Select
                value={selectedMuscleGroup}
                onValueChange={(v) => setSelectedMuscleGroup(v as MuscleGroup)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select muscle group" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(muscleGroupLabels).map(([value, label]) => (
                    <SelectItem
                      key={value}
                      value={value}
                      disabled={muscleGroups.includes(value as MuscleGroup)}
                    >
                      {label}
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
                    {muscleGroupLabels[mg]}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Equipment</Label>
            <div className="flex gap-2">
              <Select
                value={selectedEquipment}
                onValueChange={(v) => setSelectedEquipment(v as EquipmentType)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(equipmentTypeLabels).map(([value, label]) => (
                    <SelectItem
                      key={value}
                      value={value}
                      disabled={equipment.includes(value as EquipmentType)}
                    >
                      {label}
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
                    {equipmentTypeLabels[eq]}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || muscleGroups.length === 0 || saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Create Exercise
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MyLibraryBrowser = ({ onExerciseSelected }: MyLibraryBrowserProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    try {
      const allExercises = await getAllExercises();
      setExercises(allExercises);
      setFilteredExercises(allExercises);
    } catch (error) {
      console.error("Error loading exercises:", error);
      toast({
        title: "Error",
        description: "Failed to load exercises",
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
    toast({ title: `Added: ${exercise.name}` });
    if (previewExercise?.id === exercise.id) {
      setPreviewExercise(null);
    }
  };

  const handleExerciseCreated = (exercise: Exercise) => {
    setExercises((prev) => [exercise, ...prev]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-background space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">My Library</span>
          </div>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exercises..."
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
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredExercises.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredExercises.map((exercise) => (
                <LibraryExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onPreview={() => setPreviewExercise(exercise)}
                  onAdd={() => handleAddExercise(exercise)}
                />
              ))}
            </div>
          ) : exercises.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Library className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No exercises in your library</p>
              <p className="text-sm mt-1">Create your first custom exercise</p>
              <Button
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Exercise
              </Button>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No exercises found</p>
              <p className="text-sm mt-1">Try a different search term</p>
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
      />

      {/* Create Dialog */}
      <CreateExerciseDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={handleExerciseCreated}
      />
    </div>
  );
};

export default MyLibraryBrowser;
