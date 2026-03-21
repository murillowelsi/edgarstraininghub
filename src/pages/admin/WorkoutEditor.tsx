import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  createWorkout,
  getWorkoutById,
  updateWorkout,
} from "@/services/workoutsService";
import type { WorkoutFormData, WorkoutStage, WorkoutType } from "@/types/workout";
import {
  createDefaultStage,
  createRepeatBlock,
  drillLabels,
  equipmentLabels,
  getDefaultStageType,
  intensityLabels,
  stageColors,
  stageLabels,
  strokeLabels,
  durationLabels,
  workoutTypeLabels,
} from "@/types/workout";
import { ArrowLeft, Bike, ChevronDown, ChevronRight, GripVertical, Loader2, Pencil, Plus, PersonStanding, Repeat, Save, Trash2, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import StageEditor from "../../components/workout/StageEditor";
import { useAuth } from "../../contexts/AuthContext";

// Helper to format duration for display
const formatDuration = (stage: WorkoutStage) => {
  if (stage.duration.type === "lapButton") {
    return "Press Lap Button";
  }
  if (stage.duration.value !== undefined) {
    const unit = stage.duration.unit || "";
    return `${stage.duration.value} ${unit}`;
  }
  return durationLabels[stage.duration.type];
};

// Helper to format intensity for display
const formatIntensity = (stage: WorkoutStage): string | null => {
  const { intensity } = stage;

  if (intensity.type === "none") {
    return null;
  }

  // Zone-based intensity
  if (intensity.type === "heartRateZone" && intensity.value) {
    return `HR Zone ${intensity.value}`;
  }
  if (intensity.type === "powerZone" && intensity.value) {
    return `Power Zone ${intensity.value}`;
  }

  // Range-based intensity (min-max)
  if (intensity.min !== undefined && intensity.max !== undefined) {
    const unit = intensity.unit || "";
    return `${intensity.min}-${intensity.max} ${unit}`;
  }

  // Single value intensity
  if (intensity.value !== undefined) {
    const unit = intensity.unit || "";
    return `${intensity.value} ${unit}`;
  }

  // Just show the type label if no values
  return intensityLabels[intensity.type];
};

// Helper to format swimming details
const formatSwimmingDetails = (stage: WorkoutStage): string[] => {
  const details: string[] = [];
  if (stage.strokeType) {
    details.push(strokeLabels[stage.strokeType]);
  }
  if (stage.drillType && stage.drillType !== "none") {
    details.push(drillLabels[stage.drillType]);
  }
  if (stage.equipment && stage.equipment !== "none") {
    details.push(equipmentLabels[stage.equipment]);
  }
  return details;
};

// Draggable stage item component with collapsible details
const DraggableStage = ({
  stage,
  onEdit,
  onDelete,
  isNested = false,
}: {
  stage: WorkoutStage;
  onEdit: () => void;
  onDelete: () => void;
  isNested?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const color = stageColors[stage.type];
  const intensityDisplay = formatIntensity(stage);
  const swimmingDetails = formatSwimmingDetails(stage);

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`relative overflow-hidden ${isNested ? 'bg-muted/30' : ''}`}>
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: color }}
        />
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className={isNested ? 'p-3 pl-4' : 'p-4 pl-5'}>
            {/* Header row - always visible */}
            <div className="flex items-center gap-3">
              {/* Drag handle */}
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              >
                <GripVertical className={isNested ? "h-4 w-4" : "h-5 w-5"} />
              </div>

              {/* Expand/collapse toggle */}
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </CollapsibleTrigger>

              {/* Stage summary */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <p className={`font-medium ${isNested ? 'text-sm' : ''}`}>
                    {stageLabels[stage.type]}
                  </p>
                  <span className={`text-muted-foreground ${isNested ? 'text-xs' : 'text-sm'}`}>
                    {formatDuration(stage)}
                  </span>
                  {!isExpanded && swimmingDetails.length > 0 && (
                    <span className={`text-muted-foreground ${isNested ? 'text-xs' : 'text-sm'}`}>
                      · {swimmingDetails[0]}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  className="text-primary h-8"
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  className="text-muted-foreground hover:text-destructive h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Expanded details */}
            <CollapsibleContent>
              <div className={`ml-9 mt-3 pt-3 border-t space-y-3 ${isNested ? 'text-xs' : 'text-sm'}`}>
                {/* Duration & Intensity row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Duration
                    </p>
                    <p className="font-medium">{formatDuration(stage)}</p>
                    <p className="text-xs text-muted-foreground">
                      {durationLabels[stage.duration.type]}
                    </p>
                  </div>

                  {intensityDisplay && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Intensity
                      </p>
                      <p className="font-medium">{intensityDisplay}</p>
                      <p className="text-xs text-muted-foreground">
                        {intensityLabels[stage.intensity.type]}
                      </p>
                    </div>
                  )}

                  {stage.strokeType && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Stroke
                      </p>
                      <p className="font-medium">{strokeLabels[stage.strokeType]}</p>
                    </div>
                  )}
                </div>

                {/* Swimming-specific details */}
                {((stage.drillType && stage.drillType !== "none") ||
                  (stage.equipment && stage.equipment !== "none")) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {stage.drillType && stage.drillType !== "none" && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Drill Type
                        </p>
                        <p className="font-medium">{drillLabels[stage.drillType]}</p>
                      </div>
                    )}

                    {stage.equipment && stage.equipment !== "none" && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Equipment
                        </p>
                        <p className="font-medium">{equipmentLabels[stage.equipment]}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {stage.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Notes
                    </p>
                    <p className="text-muted-foreground bg-muted/50 p-2 rounded">
                      {stage.notes}
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </Card>
    </div>
  );
};

// Repeat block container with nested sortable
// Empty drop zone for repeat blocks
const EmptyRepeatDropZone = ({ repeatId }: { repeatId: string }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `empty-${repeatId}`,
    data: {
      type: "empty-repeat",
      repeatId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-md transition-colors ${
        isOver ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950" : ""
      }`}
    >
      {isOver ? "Drop here" : "Drag stages here"}
    </div>
  );
};

const RepeatBlock = ({
  stage,
  onEdit,
  onDelete,
  onNestedStagesChange,
  editingStageId,
  onEditNested,
  onDeleteNested,
  onStageChange,
  onDoneEditing,
  workoutType = "running",
}: {
  stage: WorkoutStage;
  onEdit: () => void;
  onDelete: () => void;
  onNestedStagesChange: (stages: WorkoutStage[]) => void;
  editingStageId: string | null;
  onEditNested: (id: string) => void;
  onDeleteNested: (id: string) => void;
  onStageChange: (stage: WorkoutStage) => void;
  onDoneEditing: () => void;
  workoutType?: WorkoutType;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const color = stageColors[stage.type];
  const nestedStages = stage.stages || [];

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="relative overflow-hidden">
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: color }}
        />
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="p-4 pl-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              >
                <GripVertical className="h-5 w-5" />
              </div>

              {/* Expand/collapse toggle */}
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </CollapsibleTrigger>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-indigo-500" />
                  <p className="font-medium">Repeat {stage.repeatCount || 2}x</p>
                  {!isExpanded && nestedStages.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      ({nestedStages.length} stages)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  className="text-primary h-8"
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  className="text-muted-foreground hover:text-destructive h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Nested stages - collapsible droppable area */}
            <CollapsibleContent>
              <div className="ml-9 mt-3 space-y-2 border-l-2 border-indigo-200 dark:border-indigo-800 pl-4 min-h-[60px] py-2">
                <SortableContext
                  items={nestedStages.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {nestedStages.map((nestedStage) => (
                    editingStageId === nestedStage.id ? (
                      <StageEditor
                        key={nestedStage.id}
                        stage={nestedStage}
                        onChange={(updated) => {
                          const newStages = nestedStages.map((s) =>
                            s.id === updated.id ? updated : s
                          );
                          onNestedStagesChange(newStages);
                        }}
                        onDone={onDoneEditing}
                        workoutType={workoutType}
                      />
                    ) : (
                      <DraggableStage
                        key={nestedStage.id}
                        stage={nestedStage}
                        onEdit={() => onEditNested(nestedStage.id)}
                        onDelete={() => onDeleteNested(nestedStage.id)}
                        isNested
                      />
                    )
                  ))}
                </SortableContext>
                {nestedStages.length === 0 && (
                  <EmptyRepeatDropZone repeatId={stage.id} />
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </Card>
    </div>
  );
};

// Stage overlay for drag preview
const StageOverlay = ({ stage }: { stage: WorkoutStage }) => {
  const color = stageColors[stage.type];
  const intensityDisplay = formatIntensity(stage);

  if (stage.type === "repeat") {
    return (
      <Card className="relative overflow-hidden opacity-90 shadow-lg">
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: color }}
        />
        <div className="p-4 pl-5">
          <div className="flex items-center gap-3">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-indigo-500" />
              <p className="font-medium">Repeat {stage.repeatCount || 2}x</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden opacity-90 shadow-lg">
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-center gap-3 p-4 pl-5">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="font-medium">{stageLabels[stage.type]}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{formatDuration(stage)}</span>
            {intensityDisplay && (
              <span className="text-primary/80">{intensityDisplay}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

const WorkoutEditor = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEditing = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get workout type from URL query param (for new workouts)
  const urlWorkoutType = (searchParams.get("type") as WorkoutType) || "running";
  const fromCalendar = searchParams.get("fromCalendar") === "true";

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<WorkoutStage | null>(null);
  const [formData, setFormData] = useState<WorkoutFormData>({
    name: `${workoutTypeLabels[urlWorkoutType]} Workout`,
    type: urlWorkoutType,
    stages: [],
  });

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

  useEffect(() => {
    if (isEditing && id) {
      loadWorkout(id);
    }
  }, [id, isEditing]);

  const loadWorkout = async (workoutId: string) => {
    try {
      const workout = await getWorkoutById(workoutId);
      if (!workout) {
        toast({
          title: "Workout not found",
          description: "The workout you're trying to edit doesn't exist.",
          variant: "destructive",
        });
        navigate("/admin/workouts");
        return;
      }
      setFormData({
        name: workout.name,
        type: workout.type,
        stages: workout.stages,
        notes: workout.notes,
      });
    } catch (error) {
      console.error("Error loading workout:", error);
      toast({
        title: "Error",
        description: "Failed to load workout.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Workout name is required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      if (isEditing && id) {
        await updateWorkout(id, formData);
        toast({
          title: "Workout updated",
          description: "Your changes have been saved.",
        });
        navigate("/admin/workouts");
      } else {
        const newWorkoutId = await createWorkout(formData, user?.uid || "");
        toast({
          title: "Workout created",
          description: "Your workout has been created successfully.",
        });

        // If we came from the calendar, redirect back with the new workout ID
        if (fromCalendar) {
          navigate(`/admin/calendar?newWorkoutId=${newWorkoutId}`);
        } else {
          navigate("/admin/workouts");
        }
      }
    } catch (error: unknown) {
      console.error("Error saving workout:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save workout.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddStage = () => {
    const newStage = createDefaultStage(getDefaultStageType(formData.type));
    setFormData((prev) => ({
      ...prev,
      stages: [...prev.stages, newStage],
    }));
    setEditingStageId(newStage.id);
  };

  const handleAddRepetition = () => {
    const newRepeat = createRepeatBlock(2, formData.type);
    setFormData((prev) => ({
      ...prev,
      stages: [...prev.stages, newRepeat],
    }));
    setEditingStageId(newRepeat.id);
  };

  const handleDeleteStage = (stageId: string) => {
    setFormData((prev) => ({
      ...prev,
      stages: prev.stages.filter((s) => s.id !== stageId),
    }));
    if (editingStageId === stageId) {
      setEditingStageId(null);
    }
  };

  const handleDeleteNestedStage = (repeatId: string, nestedStageId: string) => {
    setFormData((prev) => ({
      ...prev,
      stages: prev.stages.map((s) => {
        if (s.id === repeatId && s.stages) {
          return {
            ...s,
            stages: s.stages.filter((ns) => ns.id !== nestedStageId),
          };
        }
        return s;
      }),
    }));
    if (editingStageId === nestedStageId) {
      setEditingStageId(null);
    }
  };

  const handleStageChange = (updatedStage: WorkoutStage) => {
    setFormData((prev) => ({
      ...prev,
      stages: prev.stages.map((s) =>
        s.id === updatedStage.id ? updatedStage : s
      ),
    }));
  };

  const handleNestedStagesChange = (repeatId: string, nestedStages: WorkoutStage[]) => {
    setFormData((prev) => ({
      ...prev,
      stages: prev.stages.map((s) =>
        s.id === repeatId ? { ...s, stages: nestedStages } : s
      ),
    }));
  };

  // Find which container a stage belongs to
  const findContainer = (stageId: string): { containerId: string; index: number } | null => {
    // Check top-level stages
    const topIndex = formData.stages.findIndex((s) => s.id === stageId);
    if (topIndex !== -1) {
      return { containerId: "root", index: topIndex };
    }

    // Check nested stages in repeat blocks
    for (const stage of formData.stages) {
      if (stage.type === "repeat" && stage.stages) {
        const nestedIndex = stage.stages.findIndex((s) => s.id === stageId);
        if (nestedIndex !== -1) {
          return { containerId: stage.id, index: nestedIndex };
        }
      }
    }

    return null;
  };

  // Get stage by ID from any container
  const getStageById = (stageId: string): WorkoutStage | null => {
    const topStage = formData.stages.find((s) => s.id === stageId);
    if (topStage) return topStage;

    for (const stage of formData.stages) {
      if (stage.type === "repeat" && stage.stages) {
        const nestedStage = stage.stages.find((s) => s.id === stageId);
        if (nestedStage) return nestedStage;
      }
    }

    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const stage = getStageById(event.active.id as string);
    setActiveStage(stage);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeContainer = findContainer(activeId);

    // Check if dropping on an empty repeat zone
    const isEmptyRepeatDrop = overId.startsWith("empty-");
    const targetRepeatId = isEmptyRepeatDrop ? overId.replace("empty-", "") : null;

    const overContainer = isEmptyRepeatDrop
      ? { containerId: targetRepeatId!, index: 0 }
      : findContainer(overId);

    if (!activeContainer || !overContainer) return;

    // If containers are different, we need to move the item
    if (activeContainer.containerId !== overContainer.containerId) {
      const activeStage = getStageById(activeId);
      if (!activeStage || activeStage.type === "repeat") return; // Don't move repeat blocks into other repeat blocks

      setFormData((prev) => {
        const newStages = [...prev.stages];

        // Remove from source
        if (activeContainer.containerId === "root") {
          const idx = newStages.findIndex((s) => s.id === activeId);
          if (idx !== -1) newStages.splice(idx, 1);
        } else {
          const repeatIdx = newStages.findIndex((s) => s.id === activeContainer.containerId);
          if (repeatIdx !== -1 && newStages[repeatIdx].stages) {
            newStages[repeatIdx] = {
              ...newStages[repeatIdx],
              stages: newStages[repeatIdx].stages!.filter((s) => s.id !== activeId),
            };
          }
        }

        // Add to destination
        if (overContainer.containerId === "root") {
          const overIdx = newStages.findIndex((s) => s.id === overId);
          newStages.splice(overIdx, 0, activeStage);
        } else {
          const repeatIdx = newStages.findIndex((s) => s.id === overContainer.containerId);
          if (repeatIdx !== -1) {
            const nestedStages = [...(newStages[repeatIdx].stages || [])];
            if (isEmptyRepeatDrop) {
              // Dropping into empty repeat - just add to the end
              nestedStages.push(activeStage);
            } else {
              const overNestedIdx = nestedStages.findIndex((s) => s.id === overId);
              nestedStages.splice(overNestedIdx, 0, activeStage);
            }
            newStages[repeatIdx] = {
              ...newStages[repeatIdx],
              stages: nestedStages,
            };
          }
        }

        return { ...prev, stages: newStages };
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveStage(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) return;

    // Same container - just reorder
    if (activeContainer.containerId === overContainer.containerId) {
      if (activeContainer.containerId === "root") {
        setFormData((prev) => {
          const oldIndex = prev.stages.findIndex((s) => s.id === activeId);
          const newIndex = prev.stages.findIndex((s) => s.id === overId);
          return {
            ...prev,
            stages: arrayMove(prev.stages, oldIndex, newIndex),
          };
        });
      } else {
        // Reorder within a repeat block
        setFormData((prev) => {
          const repeatIdx = prev.stages.findIndex((s) => s.id === activeContainer.containerId);
          if (repeatIdx === -1 || !prev.stages[repeatIdx].stages) return prev;

          const nestedStages = prev.stages[repeatIdx].stages!;
          const oldIndex = nestedStages.findIndex((s) => s.id === activeId);
          const newIndex = nestedStages.findIndex((s) => s.id === overId);

          const newStages = [...prev.stages];
          newStages[repeatIdx] = {
            ...newStages[repeatIdx],
            stages: arrayMove(nestedStages, oldIndex, newIndex),
          };

          return { ...prev, stages: newStages };
        });
      }
    }
  };

  // Get all sortable IDs for the root level
  const getAllSortableIds = (): string[] => {
    const ids: string[] = [];
    for (const stage of formData.stages) {
      ids.push(stage.id);
    }
    return ids;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <header className="border-b bg-card px-4 py-3 flex items-center gap-3 shrink-0">
          <Link to="/admin/workouts">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          {/* Type icon — desktop only */}
          <div className="hidden md:flex h-9 w-9 rounded-full bg-muted items-center justify-center shrink-0">
            {formData.type === "cycling" && <Bike className="h-4 w-4" />}
            {formData.type === "running" && <PersonStanding className="h-4 w-4" />}
            {formData.type === "swimming" && <Waves className="h-4 w-4" />}
          </div>

          {/* Editable name */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
                autoFocus
                className="font-semibold h-8 py-1 px-2 text-sm md:text-base"
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="flex items-center gap-1.5 font-semibold hover:text-primary text-sm md:text-base truncate w-full text-left"
              >
                <span className="truncate">{formData.name}</span>
                <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Cancel — desktop only (mobile uses back arrow) */}
            <Link to="/admin/workouts" className="hidden md:block">
              <Button variant="outline" size="sm" disabled={saving}>
                Cancel
              </Button>
            </Link>
            <Button onClick={handleSubmit} disabled={saving} size="sm">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden md:inline ml-2">
                {saving ? "Saving..." : "Save Workout"}
              </span>
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-8 pb-24 lg:pb-8">
            <div className="flex gap-8">
              {/* Stages list */}
              <Card className="flex-1">
                <div className="p-4 md:p-6">
                  <h2 className="font-semibold mb-4">Stages</h2>
                  <div className="space-y-3">
                    {formData.stages.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground mb-4">
                          No stages yet. Add your first stage to get started.
                        </p>
                        <Button onClick={handleAddStage}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Stage
                        </Button>
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={getAllSortableIds()}
                          strategy={verticalListSortingStrategy}
                        >
                          {formData.stages.map((stage) => {
                            if (editingStageId === stage.id) {
                              return (
                                <StageEditor
                                  key={stage.id}
                                  stage={stage}
                                  onChange={handleStageChange}
                                  onDone={() => setEditingStageId(null)}
                                  workoutType={formData.type}
                                />
                              );
                            }

                            if (stage.type === "repeat") {
                              return (
                                <RepeatBlock
                                  key={stage.id}
                                  stage={stage}
                                  onEdit={() => setEditingStageId(stage.id)}
                                  onDelete={() => handleDeleteStage(stage.id)}
                                  onNestedStagesChange={(nestedStages) =>
                                    handleNestedStagesChange(stage.id, nestedStages)
                                  }
                                  editingStageId={editingStageId}
                                  onEditNested={(nestedId) => setEditingStageId(nestedId)}
                                  onDeleteNested={(nestedId) =>
                                    handleDeleteNestedStage(stage.id, nestedId)
                                  }
                                  onStageChange={handleStageChange}
                                  onDoneEditing={() => setEditingStageId(null)}
                                  workoutType={formData.type}
                                />
                              );
                            }

                            return (
                              <DraggableStage
                                key={stage.id}
                                stage={stage}
                                onEdit={() => setEditingStageId(stage.id)}
                                onDelete={() => handleDeleteStage(stage.id)}
                              />
                            );
                          })}
                        </SortableContext>

                        <DragOverlay>
                          {activeStage ? <StageOverlay stage={activeStage} /> : null}
                        </DragOverlay>
                      </DndContext>
                    )}
                  </div>
                </div>
              </Card>

              {/* Sidebar */}
              <div className="w-64 flex-shrink-0 hidden lg:block">
                <div className="sticky top-4 space-y-3">
                  <Button
                    onClick={handleAddStage}
                    className="w-full"
                    variant="default"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stage
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleAddRepetition}
                  >
                    <Repeat className="h-4 w-4 mr-2" />
                    Add Repetition
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile action bar — shown below lg, above BottomNav */}
        <div
          className="lg:hidden fixed left-0 right-0 z-20 bg-background border-t flex gap-2 px-4 py-2"
          style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))" }}
        >
          <Button
            onClick={handleAddStage}
            className="flex-1"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Stage
          </Button>
          <Button
            onClick={handleAddRepetition}
            variant="outline"
            className="flex-1"
            size="sm"
          >
            <Repeat className="h-4 w-4 mr-2" />
            Add Repetition
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default WorkoutEditor;
