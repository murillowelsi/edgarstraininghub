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
import { ActionMenu } from "@/components/ui/action-menu";
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
import { Input } from "@/components/ui/input";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  createWorkout,
  getWorkoutById,
  updateWorkout,
} from "@/services/workoutsService";
import type { StageType, WorkoutFormData, WorkoutStage, WorkoutType } from "@/types/workout";
import {
  createDefaultStage,
  createRepeatBlock,
  getDefaultIntervalType,
  getDefaultStageType,
  intensityTypesByWorkout,
} from "@/types/workout";
import { cn } from "@/lib/utils";
import { ArrowLeft, Copy, GripVertical, LayoutTemplate, MoreVertical, Plus, Repeat, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import StageEditor from "../../components/workout/StageEditor";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { workoutLabels } from "@/utils/workoutLabels";
import { FormSkeleton } from "@/components/feedback/skeletons";
import { SportIcon } from "@/components/icons/sport-icons";
import { sportKey } from "@/components/timeline/sport";
import { planTotals } from "@/components/timeline/workout-viz/planModel";
import { formatTotalTime } from "@/hooks/useAthleteStats";
import { WorkoutPreview } from "@/components/workout/WorkoutPreview";
import { EditorBar, EditorTabs, IssuesBanner, LeaveConfirm } from "@/components/workout/EditorChrome";
import { durationText, targetChip } from "@/components/workout/stageText";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { hasBlockingIssue, validateWorkout } from "@/lib/validateWorkout";

/** New ids for a duplicated step (and its nested steps) */
const cloneStage = (s: WorkoutStage): WorkoutStage => ({
  ...s,
  id: crypto.randomUUID(),
  stages: s.stages?.map(cloneStage),
});

/** Warm-up → main → cool-down, with zones when this sport has them */
const templateStages = (type: WorkoutType): WorkoutStage[] => {
  const zones = intensityTypesByWorkout[type].includes("heartRateZone");
  const make = (stageType: StageType, minutes: number, zone: number) => {
    const s = createDefaultStage(stageType);
    return {
      ...s,
      duration: { type: "time" as const, value: minutes, unit: "min" as const },
      intensity: zones ? { type: "heartRateZone" as const, value: zone } : s.intensity,
    };
  };
  return [make("warmup", 10, 2), make(getDefaultIntervalType(type), 20, 3), make("cooldown", 10, 1)];
};

/** One step in the list: grip, name, target chip, duration, ⋮ — tap to edit (WE-3) */
const StageRow = ({
  stage,
  sport,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
  editor,
  isNested = false,
}: {
  stage: WorkoutStage;
  sport: string;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  /** The inline form, when this step is open (desktop) */
  editor?: React.ReactNode;
  isNested?: boolean;
}) => {
  const { t } = useLanguage();
  const L = workoutLabels(t);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id });
  const chip = targetChip(stage, t);
  const easy = ["warmup", "cooldown", "recovery", "rest"].includes(stage.type);

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      <div className={cn("rounded-xl border bg-card transition-colors", selected && "border-primary/60 ring-1 ring-primary/60", isNested && "bg-background")}>
        <div className="flex items-center gap-2 py-1.5 pl-1.5 pr-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            style={{ touchAction: "none" }}
            aria-label={t.admin.workoutEditor.dragHere}
            className="grid h-10 w-7 shrink-0 cursor-grab place-items-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button type="button" onClick={onSelect} aria-expanded={selected} className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 text-left">
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: `hsl(var(--sport-${sport}) / ${easy ? 0.4 : 1})` }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{L.stage(stage.type)}</span>
              {chip && (
                <span className="mt-0.5 inline-flex items-center gap-1 rounded-md border border-foreground/10 bg-foreground/[0.05] px-1.5 text-xs">
                  <b className="font-semibold">{chip.kind}</b>
                  {chip.value && <span className="tabular-nums text-muted-foreground">{chip.value}</span>}
                </span>
              )}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums">{durationText(stage, t)}</span>
          </button>
          <ActionMenu
            title={L.stage(stage.type)}
            items={[
              { icon: Copy, label: t.admin.workoutEditor.duplicate, onClick: onDuplicate },
              { icon: Trash2, label: t.common.delete, destructive: true, onClick: onDelete },
            ]}
          >
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground" aria-label={t.common.actions}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </ActionMenu>
        </div>
        {editor && <div className="border-t px-3 pb-3 pt-3">{editor}</div>}
      </div>
    </div>
  );
};

// Empty drop zone for repeat blocks
const EmptyRepeatDropZone = ({ repeatId }: { repeatId: string }) => {
  const { t } = useLanguage();
  const { setNodeRef, isOver } = useDroppable({ id: `empty-${repeatId}`, data: { type: "empty-repeat", repeatId } });
  return (
    <div
      ref={setNodeRef}
      className={cn("rounded-md border-2 border-dashed py-4 text-center text-sm text-muted-foreground transition-colors", isOver && "border-primary bg-primary/10")}
    >
      {isOver ? t.admin.workoutEditor.dropHere : t.admin.workoutEditor.dragHere}
    </div>
  );
};

/** Repeat block: dashed, "5×" and its total, nested steps inside */
const RepeatBlock = ({
  stage,
  sport,
  selectedId,
  onSelect,
  onDuplicate,
  onDelete,
  onDuplicateNested,
  onDeleteNested,
  renderEditor,
}: {
  stage: WorkoutStage;
  sport: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDuplicateNested: (id: string) => void;
  onDeleteNested: (id: string) => void;
  renderEditor: (id: string) => React.ReactNode;
}) => {
  const { t } = useLanguage();
  const te = t.admin.workoutEditor;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id });
  const nested = stage.stages || [];
  const block = { name: "x", type: "running", stages: [stage] } as unknown as Parameters<typeof planTotals>[0];
  const secs = planTotals(block).seconds;

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      <div className={cn("rounded-2xl border border-dashed border-foreground/25 p-1.5", selectedId === stage.id && "border-primary/60")}>
        <div className="flex items-center gap-2 pr-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            style={{ touchAction: "none" }}
            aria-label={te.dragHere}
            className="grid h-10 w-7 shrink-0 cursor-grab place-items-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onSelect(stage.id)} className="flex min-h-11 flex-1 items-center gap-2 text-left">
            <span className="text-sm font-bold">{te.repeatTitle.replace("{{n}}", String(stage.repeatCount || 2))}</span>
            {secs ? <span className="text-xs text-muted-foreground tabular-nums">{formatTotalTime(secs)}</span> : null}
          </button>
          <ActionMenu
            title={te.repeatTitle.replace("{{n}}", String(stage.repeatCount || 2))}
            items={[
              { icon: Copy, label: te.duplicate, onClick: onDuplicate },
              { icon: Trash2, label: t.common.delete, destructive: true, onClick: onDelete },
            ]}
          >
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground" aria-label={t.common.actions}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </ActionMenu>
        </div>
        {renderEditor(stage.id) && <div className="mb-2 rounded-xl border bg-card p-3">{renderEditor(stage.id)}</div>}
        <div className="space-y-1.5">
          <SortableContext items={nested.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {nested.map((ns) => (
              <StageRow
                key={ns.id}
                stage={ns}
                sport={sport}
                isNested
                selected={selectedId === ns.id}
                onSelect={() => onSelect(ns.id)}
                onDuplicate={() => onDuplicateNested(ns.id)}
                onDelete={() => onDeleteNested(ns.id)}
                editor={renderEditor(ns.id)}
              />
            ))}
          </SortableContext>
          {nested.length === 0 && <EmptyRepeatDropZone repeatId={stage.id} />}
        </div>
      </div>
    </div>
  );
};

const StageOverlay = ({ stage }: { stage: WorkoutStage }) => {
  const { t } = useLanguage();
  const L = workoutLabels(t);
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 opacity-90 shadow-lg">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-semibold">
        {stage.type === "repeat" ? t.admin.workoutEditor.repeatTitle.replace("{{n}}", String(stage.repeatCount || 2)) : L.stage(stage.type)}
      </span>
      {stage.type !== "repeat" && <span className="ml-auto text-sm tabular-nums">{durationText(stage, t)}</span>}
    </div>
  );
};

const WorkoutEditor = () => {
  const { t } = useLanguage();
  const L = workoutLabels(t);
  const isMobile = useIsMobile();
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
  // What is saved in Firestore; differs from the form = unsaved changes. A new workout starts dirty.
  const [saved, setSaved] = useState<string | null>(null);
  const dirty = saved === null ? !loading : JSON.stringify(formData) !== saved;
  const guard = useUnsavedChangesGuard(dirty && !loadFailed);
  const issues = useMemo(() => validateWorkout(formData), [formData]);
  const blocked = hasBlockingIssue(issues);
  const [tab, setTab] = useState<"edit" | "preview">("edit");

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
      const loaded: WorkoutFormData = {
        name: workout.name,
        type: workout.type,
        stages: workout.stages,
        notes: workout.notes,
      };
      setFormData(loaded);
      setSaved(JSON.stringify(loaded));
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
    if (blocked) return;

    setSaving(true);

    try {
      if (isEditing && id) {
        await updateWorkout(id, formData);
        // Stay on the page: the bar now says "Saved" and Assign is one tap away
        setSaved(JSON.stringify(formData));
        toast({
          title: t.admin.workoutEditor.toast.updated,
          description: t.admin.workoutEditor.toast.updatedDescription,
        });
      } else {
        const newWorkoutId = await createWorkout(formData, user?.uid || "");
        toast({
          title: t.admin.workoutEditor.toast.created,
          description: t.admin.workoutEditor.toast.createdDescription,
        });

        setSaved(JSON.stringify(formData));
        // Back to the calendar with the new workout; else keep editing the saved one (Assign in the bar)
        if (fromCalendar) {
          navigate(`/admin/calendar?newWorkoutId=${newWorkoutId}`);
        } else {
          navigate(`/admin/workouts/${newWorkoutId}/edit`, { replace: true });
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

  // Delete with "Undo" in the toast (WE-5)
  const withUndo = (before: WorkoutStage[]) =>
    toast({
      title: t.admin.workoutEditor.stageDeleted,
      duration: 6000,
      action: (
        <ToastAction altText={t.admin.workoutEditor.undo} onClick={() => setFormData((prev) => ({ ...prev, stages: before }))}>
          {t.admin.workoutEditor.undo}
        </ToastAction>
      ),
    });

  const handleDeleteStage = (stageId: string) => {
    const before = formData.stages;
    setFormData((prev) => ({
      ...prev,
      stages: prev.stages.filter((s) => s.id !== stageId),
    }));
    if (editingStageId === stageId) {
      setEditingStageId(null);
    }
    withUndo(before);
  };

  const handleDuplicateStage = (stageId: string) => {
    setFormData((prev) => {
      const idx = prev.stages.findIndex((s) => s.id === stageId);
      if (idx !== -1) {
        const copy = cloneStage(prev.stages[idx]);
        return { ...prev, stages: [...prev.stages.slice(0, idx + 1), copy, ...prev.stages.slice(idx + 1)] };
      }
      return {
        ...prev,
        stages: prev.stages.map((s) => {
          const j = s.stages?.findIndex((n) => n.id === stageId) ?? -1;
          if (j === -1 || !s.stages) return s;
          return { ...s, stages: [...s.stages.slice(0, j + 1), cloneStage(s.stages[j]), ...s.stages.slice(j + 1)] };
        }),
      };
    });
  };

  const handleAddTemplate = () => {
    setFormData((prev) => ({ ...prev, stages: [...prev.stages, ...templateStages(prev.type)] }));
  };

  const handleDeleteNestedStage = (repeatId: string, nestedStageId: string) => {
    const block = formData.stages.find((s) => s.id === repeatId);
    if ((block?.stages?.length ?? 0) <= 1) {
      toast({ title: t.admin.workoutEditor.blockNeedsStage });
      return;
    }
    const before = formData.stages;
    withUndo(before);
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
        <FormSkeleton className="p-4 md:p-8 max-w-3xl" fields={3} />
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

  const te = t.admin.workoutEditor;
  const sport = sportKey(formData.type);
  const editingInfo = getEditingInfo();
  const repeatTitle = (block: WorkoutStage) => te.repeatTitle.replace("{{n}}", String(block.repeatCount || 2));

  const stageEditor = editingInfo ? (
    <>
      {editingInfo.parent && (
        <Button variant="ghost" size="sm" className="-ml-2 mb-2 rounded-full text-muted-foreground" onClick={() => setEditingStageId(editingInfo.parent!.id)}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {te.backToBlock}
        </Button>
      )}
      <StageEditor
        key={editingInfo.stage.id}
        stage={editingInfo.stage}
        onChange={editingInfo.onChange}
        onDone={() => setEditingStageId(null)}
        workoutType={formData.type}
        onEditNested={setEditingStageId}
        describe={(st) => [targetChip(st, t)?.kind, durationText(st, t)].filter(Boolean).join(" · ")}
      />
    </>
  ) : null;
  // Desktop: the form opens right under the step; phones: in a drawer
  const renderEditor = (stageId: string) => (!isMobile && editingStageId === stageId ? stageEditor : null);

  const totals = planTotals({ ...formData, id: "x" } as unknown as Parameters<typeof planTotals>[0]);
  const totalsLine = [
    totals.seconds ? `~${formatTotalTime(totals.seconds)}` : "",
    totals.km ? (formData.type === "swimming" ? `${Math.round(totals.km * 1000)} m` : `${totals.km.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <AdminLayout fullHeight>
      <div className="h-full overflow-auto">
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 md:px-6">
          <EditorBar
            dirty={dirty}
            isNew={!isEditing}
            saving={saving}
            blocked={blocked}
            onBack={() => guard.leave("/admin/workouts")}
            onAssign={isEditing && id ? () => navigate(`/admin/workouts?assign=${id}`) : undefined}
            onSave={handleSubmit}
          />

          <div className="mt-4 lg:hidden">
            <EditorTabs tab={tab} onTab={setTab} />
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            {/* Edit */}
            <div className={cn("min-w-0 space-y-5", tab === "preview" && "max-lg:hidden")}>
              <div className="space-y-2">
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={t.workout.editor.workoutNamePlaceholder}
                  aria-label={t.workout.editor.workoutName}
                  className="h-auto border-0 bg-transparent px-0 font-display text-2xl font-extrabold shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-0 md:text-3xl"
                />
                <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: `hsl(var(--sport-${sport}) / 0.15)`, color: `hsl(var(--sport-${sport}))` }}
                  >
                    <SportIcon type={formData.type} className="h-3.5 w-3.5" aria-hidden />
                    {t.workoutMeta.types[formData.type]}
                  </span>
                  {totalsLine && <span className="tabular-nums">{totalsLine}</span>}
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="workout-notes" className="text-sm font-medium">{t.workout.editor.instructionsForAthlete}</label>
                <Textarea
                  id="workout-notes"
                  value={formData.notes ?? ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder={t.workout.editor.instructionsPlaceholder}
                  rows={2}
                  className="resize-none rounded-2xl"
                />
              </div>

              <IssuesBanner issues={issues} onOpen={(sid) => setEditingStageId(sid)} />

              <section className="space-y-2" aria-labelledby="stages-title">
                <h2 id="stages-title" className="text-base font-bold">{te.stagesTitle}</h2>
                <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
                  <SortableContext items={getAllSortableIds()} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1.5">
                      {formData.stages.map((stage) =>
                        stage.type === "repeat" ? (
                          <RepeatBlock
                            key={stage.id}
                            stage={stage}
                            sport={sport}
                            selectedId={editingStageId}
                            onSelect={(sid) => setEditingStageId((cur) => (cur === sid ? null : sid))}
                            onDuplicate={() => handleDuplicateStage(stage.id)}
                            onDelete={() => handleDeleteStage(stage.id)}
                            onDuplicateNested={handleDuplicateStage}
                            onDeleteNested={(nid) => handleDeleteNestedStage(stage.id, nid)}
                            renderEditor={renderEditor}
                          />
                        ) : (
                          <StageRow
                            key={stage.id}
                            stage={stage}
                            sport={sport}
                            selected={editingStageId === stage.id}
                            onSelect={() => setEditingStageId((cur) => (cur === stage.id ? null : stage.id))}
                            onDuplicate={() => handleDuplicateStage(stage.id)}
                            onDelete={() => handleDeleteStage(stage.id)}
                            editor={renderEditor(stage.id)}
                          />
                        )
                      )}
                    </div>
                  </SortableContext>
                  <DragOverlay>{activeStage ? <StageOverlay stage={activeStage} /> : null}</DragOverlay>
                </DndContext>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { icon: Plus, label: te.addStage, onClick: handleAddStage },
                    { icon: Repeat, label: te.addRepetition, onClick: handleAddRepetition },
                    { icon: LayoutTemplate, label: te.addTemplate, onClick: handleAddTemplate },
                  ].map((b) => (
                    <button
                      key={b.label}
                      type="button"
                      onClick={b.onClick}
                      className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed px-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                    >
                      <b.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{b.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Live preview */}
            <aside className={cn("min-w-0 lg:sticky lg:top-16 lg:self-start", tab === "edit" && "max-lg:hidden")}>
              <WorkoutPreview form={formData} highlightId={editingStageId} />
            </aside>
          </div>
        </div>

        {/* Phones: the step form in a drawer (outside DndContext so drag-and-drop is never disrupted) */}
        <ResponsiveModal
          open={isMobile && !!editingStageId && !!editingInfo}
          onOpenChange={(open) => !open && setEditingStageId(null)}
          title={
            !editingInfo
              ? ""
              : editingInfo.stage.type === "repeat"
              ? repeatTitle(editingInfo.stage)
              : editingInfo.parent
              ? `${repeatTitle(editingInfo.parent)} › ${L.stage(editingInfo.stage.type)}`
              : te.editStage
          }
          className="max-w-md"
        >
          {isMobile && stageEditor}
        </ResponsiveModal>

        <LeaveConfirm open={guard.confirmOpen} onLeave={guard.confirmLeave} onStay={guard.cancelLeave} />
      </div>
    </AdminLayout>
  );
};

export default WorkoutEditor;
