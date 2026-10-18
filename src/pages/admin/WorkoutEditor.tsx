import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Textarea } from "@/components/ui/textarea";
import { GrBike, GrRun, GrSwim } from "react-icons/gr";
import { ActionMenu } from "@/components/ui/action-menu";
import { GlassFab } from "@/components/glass/GlassFab";
import { WorkoutLoadError } from "@/components/admin/WorkoutLoadError";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
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
  getDefaultStageType,
  stageColors,
} from "@/types/workout";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChevronDown, Clock, Flame, GripVertical, Heart, Loader2, MoreVertical, Pencil, Plus, Repeat, Trash2, Wind, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import StageEditor from "../../components/workout/StageEditor";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { workoutLabels, type WorkoutLabels } from "@/utils/workoutLabels";

// Helper to format duration for display
const formatDuration = (stage: WorkoutStage, L: WorkoutLabels, pressLapButtonLabel: string) => {
  if (stage.duration.type === "lapButton") {
    return pressLapButtonLabel;
  }
  if (stage.duration.value !== undefined) {
    const unit = stage.duration.unit || "";
    return `${stage.duration.value} ${unit}`;
  }
  return L.duration(stage.duration.type);
};

// Helper to format intensity for display
const formatIntensity = (stage: WorkoutStage, L: WorkoutLabels, t: any): string | null => {
  const { intensity } = stage;

  if (intensity.type === "none") {
    return null;
  }

  // Zone-based intensity
  if (intensity.type === "heartRateZone" && intensity.value) {
    return `${t.workoutMeta.hrZone} ${intensity.value}`;
  }
  if (intensity.type === "powerZone" && intensity.value) {
    return `${t.workoutMeta.powerZoneShort} ${intensity.value}`;
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
  return L.intensity(intensity.type);
};

// Helper to format swimming details
const formatSwimmingDetails = (stage: WorkoutStage, L: WorkoutLabels): string[] => {
  const details: string[] = [];
  if (stage.strokeType) {
    details.push(L.stroke(stage.strokeType));
  }
  if (stage.drillType && stage.drillType !== "none") {
    details.push(L.drill(stage.drillType));
  }
  if (stage.equipment && stage.equipment !== "none") {
    details.push(L.swimEquipment(stage.equipment));
  }
  return details;
};

const stageIcons: Record<string, React.ElementType> = {
  warmup: Flame,
  run: GrRun,
  cooldown: Wind,
  recovery: Heart,
  interval: Zap,
  repeat: Repeat,
  bike: GrBike,
  rest: Clock,
  swim: GrSwim,
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
  const { t } = useLanguage();
  const L = workoutLabels(t);
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
  const intensityDisplay = formatIntensity(stage, L, t);
  const swimmingDetails = formatSwimmingDetails(stage, L);
  const StageIcon = stageIcons[stage.type] || GrRun;

  return (
    <div ref={setNodeRef} style={style}>
      <div className={cn("rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all overflow-hidden", isNested && "bg-muted/30")}>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className={cn("flex items-center gap-3", isNested ? "p-3" : "p-4")}>
            <div
              {...attributes}
              {...listeners}
              style={{ touchAction: 'none' }}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
            >
              <GripVertical className="h-4 w-4" />
            </div>

            <div
              className="p-2 rounded-xl shrink-0 flex items-center justify-center"
              style={{ backgroundColor: `${color}1a`, color }}
            >
              <StageIcon className="h-4 w-4" />
            </div>

            <CollapsibleTrigger asChild>
              <button className="flex flex-1 items-center gap-2 min-w-0 text-left">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{L.stage(stage.type)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(stage, L, t.admin.workoutEditor.pressLapButton)}
                    {swimmingDetails.length > 0 && ` · ${swimmingDetails[0]}`}
                    {!isExpanded && intensityDisplay && ` · ${intensityDisplay}`}
                  </p>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200", isExpanded && "rotate-180")} />
              </button>
            </CollapsibleTrigger>

            <ActionMenu
              title={L.stage(stage.type)}
              items={[
                { icon: Pencil, label: t.common.edit, onClick: onEdit },
                { icon: Trash2, label: t.common.delete, destructive: true, onClick: onDelete },
              ]}
            >
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0" aria-label={t.common.actions}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </ActionMenu>
          </div>

          <CollapsibleContent>
            <div className="px-4 pb-4 pt-3 border-t border-border/50 space-y-3 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Duration</p>
                  <p className="font-medium">{formatDuration(stage, L, t.admin.workoutEditor.pressLapButton)}</p>
                  <p className="text-xs text-muted-foreground">{L.duration(stage.duration.type)}</p>
                </div>
                {intensityDisplay && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Intensity</p>
                    <p className="font-medium">{intensityDisplay}</p>
                    <p className="text-xs text-muted-foreground">{L.intensity(stage.intensity.type)}</p>
                  </div>
                )}
                {stage.strokeType && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Stroke</p>
                    <p className="font-medium">{L.stroke(stage.strokeType)}</p>
                  </div>
                )}
              </div>
              {((stage.drillType && stage.drillType !== "none") || (stage.equipment && stage.equipment !== "none")) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stage.drillType && stage.drillType !== "none" && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Drill Type</p>
                      <p className="font-medium">{L.drill(stage.drillType)}</p>
                    </div>
                  )}
                  {stage.equipment && stage.equipment !== "none" && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Equipment</p>
                      <p className="font-medium">{L.swimEquipment(stage.equipment)}</p>
                    </div>
                  )}
                </div>
              )}
              {stage.notes && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-muted-foreground bg-muted/50 p-2 rounded">{stage.notes}</p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

// Repeat block container with nested sortable
// Empty drop zone for repeat blocks
const EmptyRepeatDropZone = ({ repeatId }: { repeatId: string }) => {
  const { t } = useLanguage();
  const L = workoutLabels(t);
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
      {isOver ? t.admin.workoutEditor.dropHere : t.admin.workoutEditor.dragHere}
    </div>
  );
};

const RepeatBlock = ({
  stage,
  onEdit,
  onDelete,
  onNestedStagesChange,
  onEditNested,
  onDeleteNested,
}: {
  stage: WorkoutStage;
  onEdit: () => void;
  onDelete: () => void;
  onNestedStagesChange: (stages: WorkoutStage[]) => void;
  onEditNested: (id: string) => void;
  onDeleteNested: (id: string) => void;
}) => {
  const { t } = useLanguage();
  const L = workoutLabels(t);
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
      <div className="rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all overflow-hidden">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="p-4 flex items-center gap-3">
            <div
              {...attributes}
              {...listeners}
              style={{ touchAction: 'none' }}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
            >
              <GripVertical className="h-4 w-4" />
            </div>

            <div className="p-2 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: "#6366f11a", color: "#6366f1" }}>
              <Repeat className="h-4 w-4" />
            </div>

            <CollapsibleTrigger asChild>
              <button className="flex flex-1 items-center gap-2 min-w-0 text-left">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{t.admin.workoutEditor.repeatTitle.replace("{{n}}", String(stage.repeatCount || 2))}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.admin.workoutEditor.blockStages.replace("{{n}}", String(nestedStages.length))}
                  </p>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200", isExpanded && "rotate-180")} />
              </button>
            </CollapsibleTrigger>

            <ActionMenu
              title={L.stage(stage.type)}
              items={[
                { icon: Pencil, label: t.common.edit, onClick: onEdit },
                { icon: Trash2, label: t.common.delete, destructive: true, onClick: onDelete },
              ]}
            >
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0" aria-label={t.common.actions}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </ActionMenu>
          </div>

          <CollapsibleContent>
            <div className="px-4 pb-4 pt-3 border-t border-border/50 space-y-2 min-h-[60px]">
              <SortableContext
                items={nestedStages.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {nestedStages.map((nestedStage) => (
                  <DraggableStage
                    key={nestedStage.id}
                    stage={nestedStage}
                    onEdit={() => onEditNested(nestedStage.id)}
                    onDelete={() => onDeleteNested(nestedStage.id)}
                    isNested
                  />
                ))}
              </SortableContext>
              {nestedStages.length === 0 && (
                <EmptyRepeatDropZone repeatId={stage.id} />
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

// Stage overlay for drag preview
const StageOverlay = ({ stage }: { stage: WorkoutStage }) => {
  const { t } = useLanguage();
  const L = workoutLabels(t);
  const color = stageColors[stage.type];
  const intensityDisplay = formatIntensity(stage, L, t);

  const StageIcon = stageIcons[stage.type] || GrRun;

  if (stage.type === "repeat") {
    return (
      <div className="rounded-xl border bg-card opacity-90 shadow-lg overflow-hidden">
        <div className="p-4 flex items-center gap-3">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <div className="p-2 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#6366f11a", color: "#6366f1" }}>
            <Repeat className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-sm">{t.admin.workoutEditor.repeatTitle.replace("{{n}}", String(stage.repeatCount || 2))}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card opacity-90 shadow-lg overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <div className="p-2 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}1a`, color }}>
          <StageIcon className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold text-sm">{L.stage(stage.type)}</p>
          <p className="text-xs text-muted-foreground">
            {formatDuration(stage, L, t.admin.workoutEditor.pressLapButton)}
            {intensityDisplay && ` · ${intensityDisplay}`}
          </p>
        </div>
      </div>
    </div>
  );
};

const WorkoutEditor = () => {
  const { t } = useLanguage();
  const L = workoutLabels(t);
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
  // Editing and the workout couldn't be loaded — never show a saveable empty form
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<WorkoutStage | null>(null);
  const [formData, setFormData] = useState<WorkoutFormData>({
    name: t.admin.workoutEditor.defaultName.replace("{{type}}", t.workoutMeta.types[urlWorkoutType]),
    type: urlWorkoutType,
    stages: [],
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
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
    setLoading(true);
    setLoadFailed(false);
    try {
      const workout = await getWorkoutById(workoutId);
      if (!workout) {
        toast({
          title: t.admin.workoutEditor.toast.notFound,
          description: t.admin.workoutEditor.toast.notFoundDescription,
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
      setLoadFailed(true);
      toast({
        title: t.common.error,
        description: t.admin.workoutEditor.toast.loadError,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (loadFailed) return;
    if (!formData.name.trim()) {
      toast({
        title: t.common.error,
        description: t.admin.workoutEditor.toast.nameRequired,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      if (isEditing && id) {
        await updateWorkout(id, formData);
        toast({
          title: t.admin.workoutEditor.toast.updated,
          description: t.admin.workoutEditor.toast.updatedDescription,
        });
        navigate("/admin/workouts");
      } else {
        const newWorkoutId = await createWorkout(formData, user?.uid || "");
        toast({
          title: t.admin.workoutEditor.toast.created,
          description: t.admin.workoutEditor.toast.createdDescription,
        });

        // Back to the calendar with the new workout, else offer to assign it right away
        if (fromCalendar) {
          navigate(`/admin/calendar?newWorkoutId=${newWorkoutId}`);
        } else {
          navigate(`/admin/workouts?assign=${newWorkoutId}`);
        }
      }
    } catch (error: unknown) {
      console.error("Error saving workout:", error);
      const errorMessage =
        error instanceof Error ? error.message : t.admin.workoutEditor.toast.saveError;
      toast({
        title: t.common.error,
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
    const block = formData.stages.find((s) => s.id === repeatId);
    if ((block?.stages?.length ?? 0) <= 1) {
      toast({ title: t.admin.workoutEditor.blockNeedsStage });
      return;
    }
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

  // Resolve which stage is being edited and its onChange handler
  const getEditingInfo = (): { stage: WorkoutStage; onChange: (s: WorkoutStage) => void; parent?: WorkoutStage } | null => {
    if (!editingStageId) return null;

    const topLevel = formData.stages.find((s) => s.id === editingStageId);
    if (topLevel) {
      return { stage: topLevel, onChange: handleStageChange };
    }

    for (const repeatStage of formData.stages) {
      if (repeatStage.type === "repeat" && repeatStage.stages) {
        const nested = repeatStage.stages.find((s) => s.id === editingStageId);
        if (nested) {
          return {
            stage: nested,
            parent: repeatStage,
            onChange: (updated: WorkoutStage) => {
              handleNestedStagesChange(
                repeatStage.id,
                repeatStage.stages!.map((s) => (s.id === updated.id ? updated : s))
              );
            },
          };
        }
      }
    }

    return null;
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
      // Never drag the last stage out of a block — an empty repeat reaches the athlete as "2× nothing"
      if (activeContainer.containerId !== "root") {
        const source = formData.stages.find((s) => s.id === activeContainer.containerId);
        if ((source?.stages?.length ?? 0) <= 1) return;
      }

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

  if (loadFailed && id) {
    return (
      <AdminLayout>
        <WorkoutLoadError onRetry={() => loadWorkout(id)} onBack={() => navigate("/admin/workouts")} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      fullHeight
      pageTitle={(isEditing ? t.admin.workoutEditor.editTitle : t.admin.workoutEditor.newTitle).replace(
        "{{type}}",
        t.workoutMeta.types[formData.type]
      )}
    >
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-2xl px-4 md:px-8 pb-40 md:pb-12 space-y-6">
            {/* Back + save: part of the page column, pinned while scrolling */}
            <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 pt-3 pb-2 flex items-center justify-between gap-2 bg-background/85 backdrop-blur-md">
              <Button variant="ghost" size="sm" className="-ml-2 rounded-full text-muted-foreground" asChild>
                <Link to="/admin/workouts">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  {t.admin.nav.workouts}
                </Link>
              </Button>
              <Button onClick={handleSubmit} disabled={saving} size="sm" className="rounded-full px-4">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                {t.workout.editor.saveWorkout}
              </Button>
            </div>

            {/* Name + instructions */}
            <div className="space-y-3">
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t.workout.editor.workoutNamePlaceholder}
                aria-label={t.workout.editor.workoutName}
                className="h-auto border-0 bg-transparent px-0 text-2xl md:text-3xl font-display font-extrabold shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/40"
              />
              <Textarea
                value={formData.notes ?? ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder={t.workout.editor.instructionsPlaceholder}
                aria-label={t.workout.editor.instructionsForAthlete}
                rows={2}
                className="resize-none rounded-2xl bg-muted/40"
              />
            </div>

            {/* Stages */}
            <section className="space-y-3">
              <h2 className="font-display text-lg font-bold">{t.admin.workoutEditor.stagesTitle}</h2>
              {formData.stages.length === 0 ? (
                <button
                  type="button"
                  onClick={handleAddStage}
                  className="lg:hidden w-full rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors py-12 px-6 text-center"
                >
                  <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Plus className="h-6 w-6" />
                  </div>
                  <p className="font-semibold">{t.admin.workoutEditor.addStage}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t.admin.workoutEditor.noStages}</p>
                </button>
              ) : (
                <div className="space-y-3">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={getAllSortableIds()} strategy={verticalListSortingStrategy}>
                      {formData.stages.map((stage) =>
                        stage.type === "repeat" ? (
                          <RepeatBlock
                            key={stage.id}
                            stage={stage}
                            onEdit={() => setEditingStageId(stage.id)}
                            onDelete={() => handleDeleteStage(stage.id)}
                            onNestedStagesChange={(nestedStages) => handleNestedStagesChange(stage.id, nestedStages)}
                            onEditNested={(nestedId) => setEditingStageId(nestedId)}
                            onDeleteNested={(nestedId) => handleDeleteNestedStage(stage.id, nestedId)}
                          />
                        ) : (
                          <DraggableStage
                            key={stage.id}
                            stage={stage}
                            onEdit={() => setEditingStageId(stage.id)}
                            onDelete={() => handleDeleteStage(stage.id)}
                          />
                        )
                      )}
                    </SortableContext>
                    <DragOverlay>{activeStage ? <StageOverlay stage={activeStage} /> : null}</DragOverlay>
                  </DndContext>
                </div>
              )}

              {/* Add buttons — the FAB covers this on mobile */}
              <div className="hidden lg:grid grid-cols-2 gap-2">
                {[
                  { icon: Plus, label: t.admin.workoutEditor.addStage, onClick: handleAddStage },
                  { icon: Repeat, label: t.admin.workoutEditor.addRepetition, onClick: handleAddRepetition },
                ].map((b) => (
                  <button
                    key={b.label}
                    type="button"
                    onClick={b.onClick}
                    className="rounded-2xl border border-dashed border-border hover:border-primary/50 hover:text-primary transition-colors py-3 text-sm font-medium text-muted-foreground flex items-center justify-center gap-1.5"
                  >
                    <b.icon className="h-4 w-4" />
                    {b.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Speed dial FAB — mobile only */}
        <GlassFab
          label={t.admin.workoutEditor.addStage}
          hideFrom="lg"
          actions={[
            { icon: Plus, label: t.admin.workoutEditor.addStage, onClick: handleAddStage },
            { icon: Repeat, label: t.admin.workoutEditor.addRepetition, onClick: handleAddRepetition },
          ]}
        />

        {/* Stage editor drawer — renders outside DndContext so drag-and-drop is never disrupted */}
        {(() => {
          const editingInfo = getEditingInfo();
          const te = t.admin.workoutEditor;
          const repeatTitle = (block: WorkoutStage) => te.repeatTitle.replace("{{n}}", String(block.repeatCount || 2));
          const title = !editingInfo
            ? ""
            : editingInfo.stage.type === "repeat"
            ? repeatTitle(editingInfo.stage)
            : editingInfo.parent
            ? `${repeatTitle(editingInfo.parent)} › ${L.stage(editingInfo.stage.type)}`
            : te.editStage;
          return (
            <ResponsiveModal
              open={!!editingStageId}
              onOpenChange={(open) => !open && setEditingStageId(null)}
              title={title}
              className="max-w-md"
            >
              {editingInfo && (
                <>
                  {editingInfo.parent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 mb-2 rounded-full text-muted-foreground"
                      onClick={() => setEditingStageId(editingInfo.parent!.id)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      {te.backToBlock}
                    </Button>
                  )}
                  <StageEditor
                    key={editingInfo.stage.id}
                    stage={editingInfo.stage}
                    onChange={editingInfo.onChange}
                    onDone={() => (editingInfo.parent ? setEditingStageId(editingInfo.parent.id) : setEditingStageId(null))}
                    workoutType={formData.type}
                    onEditNested={setEditingStageId}
                    describe={(st) =>
                      [formatDuration(st, L, te.pressLapButton), formatIntensity(st, L, t)].filter(Boolean).join(" · ")
                    }
                  />
                </>
              )}
            </ResponsiveModal>
          );
        })()}
      </div>
    </AdminLayout>
  );
};

export default WorkoutEditor;
