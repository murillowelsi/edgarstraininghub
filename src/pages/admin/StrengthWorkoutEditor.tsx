import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
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
import { WorkoutLoadError } from "@/components/admin/WorkoutLoadError";
import { GlassFab } from "@/components/glass/GlassFab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Textarea } from "@/components/ui/textarea";
import { ToastAction } from "@/components/ui/toast";
import ExerciseCatalogBrowser from "@/components/workout/ExerciseCatalogBrowser";
import MyLibraryBrowser from "@/components/workout/MyLibraryBrowser";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getAllExercises } from "@/services/exercisesService";
import { createWorkout, getWorkoutById, updateWorkout } from "@/services/workoutsService";
import type { Exercise, WorkoutExercise } from "@/types/exercise";
import { generateExerciseId, getYouTubeThumbnail, getYouTubeVideoId } from "@/types/exercise";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  Copy,
  Database,
  Dumbbell,
  GripVertical,
  Library,
  Loader2,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { useAuth } from "../../contexts/AuthContext";

type T = ReturnType<typeof useLanguage>["t"];

const REP_PRESETS = ["6", "8", "10", "12", "15", "8-12", "AMRAP"];
const REST_PRESETS = [30, 45, 60, 90, 120, 180];

const thumbnailOf = (item: WorkoutExercise, exercise?: Exercise) => {
  const gif = exercise?.gifUrl || item.exerciseGifUrl;
  if (gif) return gif;
  const video = exercise?.videoUrl || item.exerciseVideoUrl;
  const videoId = video ? getYouTubeVideoId(video) : null;
  return videoId ? getYouTubeThumbnail(videoId) : null;
};

const formatRest = (seconds: number) =>
  seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60}min` : seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : `${seconds}s`;

const prescription = (item: WorkoutExercise) => {
  const parts = [`${item.sets} × ${item.reps || "10"}`];
  const load = item.weight?.trim();
  if (load) parts.push(/^\d+([.,]\d+)?$/.test(load) ? `${load} kg` : load);
  if (item.restSeconds > 0) parts.push(formatRest(item.restSeconds));
  return parts.join(" · ");
};

/** What gets saved — used both for saving and for the unsaved-changes check */
const snapshot = (name: string, notes: string, items: WorkoutExercise[]) =>
  JSON.stringify({
    name: name.trim(),
    notes: notes.trim(),
    items: items.map(({ exercise: _exercise, ...rest }) => rest),
  });

// ── List row ────────────────────────────────────────────────────────────────

const ExerciseRow = ({
  item,
  index,
  exercise,
  onOpen,
  dragLabel,
}: {
  item: WorkoutExercise;
  index: number;
  exercise?: Exercise;
  onOpen: () => void;
  dragLabel: string;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const name = exercise?.name || item.exerciseName || "—";
  const thumb = thumbnailOf(item, exercise);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-2xl border bg-card pr-2 transition-shadow",
        isDragging && "relative z-10 shadow-xl ring-2 ring-primary/40"
      )}
    >
      <button
        type="button"
        aria-label={dragLabel}
        className="self-stretch pl-2 pr-1 flex items-center text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button type="button" onClick={onOpen} className="flex flex-1 min-w-0 items-center gap-3 py-3 text-left">
        <span className="w-5 text-center text-xs font-semibold text-muted-foreground tabular-nums shrink-0">{index + 1}</span>
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted flex items-center justify-center">
          {thumb ? (
            <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <Dumbbell className="h-5 w-5 text-muted-foreground/60" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold capitalize">{name}</p>
          <p className="truncate text-xs text-muted-foreground tabular-nums">{prescription(item)}</p>
          {item.notes?.trim() && <p className="truncate text-xs text-primary mt-0.5">{item.notes}</p>}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    </div>
  );
};

// ── Exercise editor (drawer body) ───────────────────────────────────────────

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "h-9 px-3.5 rounded-full border text-sm font-medium tabular-nums transition-colors",
      active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:border-primary/50"
    )}
  >
    {children}
  </button>
);

const ExercisePanel = ({
  item,
  index,
  total,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
  t,
}: {
  item: WorkoutExercise;
  index: number;
  total: number;
  onChange: (updates: Partial<WorkoutExercise>) => void;
  onMove: (delta: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  t: T;
}) => {
  const te = t.workout.editor;
  const [customRest, setCustomRest] = useState(
    REST_PRESETS.includes(item.restSeconds) ? "" : String(item.restSeconds)
  );

  return (
    <div className="space-y-6">
      {/* Sets */}
      <div className="flex items-center justify-between">
        <Label className="text-base">{te.sets}</Label>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-full"
            disabled={item.sets <= 1}
            onClick={() => onChange({ sets: Math.max(1, item.sets - 1) })}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-2xl font-bold tabular-nums">{item.sets}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-full"
            disabled={item.sets >= 20}
            onClick={() => onChange({ sets: Math.min(20, item.sets + 1) })}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Reps */}
      <div className="space-y-2">
        <Label className="text-base">{te.reps}</Label>
        <div className="flex flex-wrap gap-2">
          {REP_PRESETS.map((r) => (
            <Chip key={r} active={(item.reps || "10") === r} onClick={() => onChange({ reps: r })}>
              {r}
            </Chip>
          ))}
        </div>
        <Input value={item.reps ?? ""} onChange={(e) => onChange({ reps: e.target.value })} placeholder="10" />
        <p className="text-xs text-muted-foreground">{te.repsHint}</p>
      </div>

      {/* Rest */}
      <div className="space-y-2">
        <Label className="text-base">{te.rest}</Label>
        <div className="flex flex-wrap gap-2">
          {REST_PRESETS.map((s) => (
            <Chip
              key={s}
              active={item.restSeconds === s && !customRest}
              onClick={() => {
                setCustomRest("");
                onChange({ restSeconds: s });
              }}
            >
              {formatRest(s)}
            </Chip>
          ))}
          <Input
            inputMode="numeric"
            value={customRest}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              setCustomRest(v);
              if (v) onChange({ restSeconds: parseInt(v, 10) });
            }}
            placeholder={te.restCustom}
            className="h-9 w-28 rounded-full text-center"
          />
        </div>
      </div>

      {/* Load */}
      <div className="space-y-2">
        <Label className="text-base">{te.load}</Label>
        <Input value={item.weight ?? ""} onChange={(e) => onChange({ weight: e.target.value })} placeholder={te.loadPlaceholder} />
        <p className="text-xs text-muted-foreground">{te.loadHint}</p>
      </div>

      {/* Cue */}
      <div className="space-y-2">
        <Label className="text-base">{te.cue}</Label>
        <Textarea
          value={item.notes ?? ""}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder={te.cuePlaceholder}
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Button variant="outline" disabled={index === 0} onClick={() => onMove(-1)}>
          <ArrowUp className="h-4 w-4 mr-1.5" />
          {te.moveUp}
        </Button>
        <Button variant="outline" disabled={index === total - 1} onClick={() => onMove(1)}>
          <ArrowDown className="h-4 w-4 mr-1.5" />
          {te.moveDown}
        </Button>
        <Button variant="outline" onClick={onDuplicate}>
          <Copy className="h-4 w-4 mr-1.5" />
          {te.duplicate}
        </Button>
        <Button variant="outline" className="text-destructive hover:text-destructive" onClick={onRemove}>
          <Trash2 className="h-4 w-4 mr-1.5" />
          {te.remove}
        </Button>
      </div>
    </div>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────

const StrengthWorkoutEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const te = t.workout.editor;
  const [searchParams] = useSearchParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(true);
  // Editing and the workout couldn't be loaded — never show a saveable empty form
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<WorkoutExercise[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryTab, setLibraryTab] = useState<"library" | "browse">("library");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const savedSnapshot = useRef(snapshot("", "", []));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadData = async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const loadedExercises = await getAllExercises();
      setExercises(loadedExercises);
      if (id) {
        const workout = await getWorkoutById(id);
        if (!workout) {
          setLoadFailed(true);
        } else {
          const loadedItems = (workout.exercises || []).map((we) => ({
            ...we,
            exercise: loadedExercises.find((e) => e.id === we.exerciseId),
          }));
          setName(workout.name);
          setNotes(workout.notes || "");
          setItems(loadedItems);
          savedSnapshot.current = snapshot(workout.name, workout.notes || "", loadedItems);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      if (id) setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const dirty = !loading && !loadFailed && snapshot(name, notes, items) !== savedSnapshot.current;

  // Closing the tab / reloading with unsaved edits
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  // Badges in the library drawer: times each exercise is already in the workout
  const { addedCounts, addedDbCounts } = useMemo(() => {
    const byId: Record<string, number> = {};
    const byDbId: Record<string, number> = {};
    for (const item of items) {
      byId[item.exerciseId] = (byId[item.exerciseId] ?? 0) + 1;
      const dbId = exerciseById.get(item.exerciseId)?.exerciseDbId;
      if (dbId) byDbId[dbId] = (byDbId[dbId] ?? 0) + 1;
    }
    return { addedCounts: byId, addedDbCounts: byDbId };
  }, [items, exerciseById]);

  const totalSets = items.reduce((sum, i) => sum + i.sets, 0);
  // Rough session length: ~45s per set of work plus the prescribed rest
  const estimatedMin = Math.round(items.reduce((sum, i) => sum + i.sets * (45 + i.restSeconds), 0) / 60);

  const addExercise = (exercise: Exercise) => {
    setExercises((prev) => (prev.some((e) => e.id === exercise.id) ? prev : [...prev, exercise]));
    setItems((prev) => [
      ...prev,
      {
        id: generateExerciseId(),
        exerciseId: exercise.id,
        exercise,
        sets: 3,
        reps: "10",
        restSeconds: 60,
        order: prev.length,
        // Denormalized for offline access
        exerciseName: exercise.name,
        exerciseGifUrl: exercise.gifUrl,
        exerciseImageUrls: exercise.imageUrls,
        exerciseVideoUrl: exercise.videoUrl,
        exerciseThumbnailUrl: exercise.thumbnailUrl,
        exerciseMuscleGroups: exercise.muscleGroups,
        exerciseInstructions: exercise.instructions,
      },
    ]);
  };

  const updateItem = (itemId: string, updates: Partial<WorkoutExercise>) =>
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...updates } : i)));

  const moveItem = (itemId: string, delta: -1 | 1) =>
    setItems((prev) => {
      const from = prev.findIndex((i) => i.id === itemId);
      const to = from + delta;
      return to < 0 || to >= prev.length ? prev : arrayMove(prev, from, to);
    });

  const duplicateItem = (itemId: string) =>
    setItems((prev) => {
      const index = prev.findIndex((i) => i.id === itemId);
      const copy = { ...prev[index], id: generateExerciseId() };
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });

  const removeItem = (itemId: string) => {
    const index = items.findIndex((i) => i.id === itemId);
    const removed = items[index];
    if (!removed) return;
    setEditingId(null);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    const label = exerciseById.get(removed.exerciseId)?.name || removed.exerciseName || "";
    toast({
      title: te.removed.replace("{{name}}", label),
      action: (
        <ToastAction
          altText={te.undo}
          onClick={() =>
            setItems((prev) => (prev.some((i) => i.id === removed.id) ? prev : [...prev.slice(0, index), removed, ...prev.slice(index)]))
          }
        >
          {te.undo}
        </ToastAction>
      ),
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setItems((prev) =>
      arrayMove(
        prev,
        prev.findIndex((i) => i.id === active.id),
        prev.findIndex((i) => i.id === over.id)
      )
    );
  };

  const handleSave = async () => {
    if (!user || loadFailed || saving) return;
    if (!name.trim()) {
      toast({ title: te.needName, variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: te.needExercise, variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const workoutData = {
        name: name.trim(),
        type: "strength" as const,
        stages: [],
        // Order follows the list; the populated exercise object isn't stored
        exercises: items.map(({ exercise: _exercise, ...rest }, order) => ({ ...rest, order })),
        notes: notes.trim(),
      };

      if (isEditing && id) {
        await updateWorkout(id, workoutData);
        savedSnapshot.current = snapshot(name, notes, items);
        toast({ title: t.workout.toast.workoutUpdated });
        navigate("/admin/workouts");
      } else {
        const newWorkoutId = await createWorkout(workoutData, user.uid);
        savedSnapshot.current = snapshot(name, notes, items);
        toast({ title: t.workout.toast.workoutCreated });
        // Back to the calendar with the new workout, else offer to assign it right away
        navigate(
          searchParams.get("fromCalendar") === "true"
            ? `/admin/calendar?newWorkoutId=${newWorkoutId}`
            : `/admin/workouts?assign=${newWorkoutId}`
        );
      }
    } catch (error) {
      console.error("Error saving workout:", error);
      toast({ title: t.workout.common.error, description: t.workout.toast.failedToSaveWorkout, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const leave = () => navigate("/admin/workouts");

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (loadFailed) {
    return (
      <AdminLayout>
        <WorkoutLoadError onRetry={loadData} onBack={leave} />
      </AdminLayout>
    );
  }

  const editingIndex = items.findIndex((i) => i.id === editingId);
  const editingItem = editingIndex >= 0 ? items[editingIndex] : null;
  const editingExercise = editingItem ? exerciseById.get(editingItem.exerciseId) : undefined;

  const openLibrary = () => setLibraryOpen(true);

  return (
    <AdminLayout fullHeight pageTitle={isEditing ? te.editStrengthWorkout : te.newStrengthWorkout}>
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-2xl px-4 md:px-8 pb-40 md:pb-12 space-y-6">
            {/* Back + save: part of the page column, pinned while scrolling */}
            <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 pt-3 pb-2 flex items-center justify-between gap-2 bg-background/85 backdrop-blur-md">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 rounded-full text-muted-foreground"
                onClick={() => (dirty ? setLeaveOpen(true) : leave())}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t.admin.nav.workouts}
              </Button>
              <Button onClick={handleSave} disabled={saving} size="sm" className="rounded-full px-4">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                {te.saveWorkout}
              </Button>
            </div>

            {/* Name + instructions */}
            <div className="space-y-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={te.workoutNamePlaceholder}
                aria-label={te.workoutName}
                className="h-auto border-0 bg-transparent px-0 text-2xl md:text-3xl font-display font-extrabold shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/40"
              />
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={te.instructionsPlaceholder}
                aria-label={te.instructionsForAthlete}
                rows={2}
                className="resize-none rounded-2xl bg-muted/40"
              />
            </div>

            {/* Exercises */}
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold">{te.exercisesTitle}</h2>
                  {items.length > 0 && (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {te.summary
                        .replace("{{n}}", String(items.length))
                        .replace("{{sets}}", String(totalSets))
                        .replace("{{min}}", String(estimatedMin))}
                    </p>
                  )}
                </div>
              </div>

              {items.length === 0 ? (
                <button
                  type="button"
                  onClick={openLibrary}
                  className="w-full rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors py-12 px-6 text-center"
                >
                  <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Plus className="h-6 w-6" />
                  </div>
                  <p className="font-semibold">{te.emptyTitle}</p>
                  <p className="text-sm text-muted-foreground mt-1">{te.emptyHint}</p>
                </button>
              ) : (
                <>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {items.map((item, index) => (
                          <ExerciseRow
                            key={item.id}
                            item={item}
                            index={index}
                            exercise={exerciseById.get(item.exerciseId) ?? item.exercise}
                            onOpen={() => setEditingId(item.id)}
                            dragLabel={te.dragHint}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  <button
                    type="button"
                    onClick={openLibrary}
                    className="w-full rounded-2xl border border-dashed border-border hover:border-primary/50 hover:text-primary transition-colors py-3 text-sm font-medium text-muted-foreground flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    {te.addExercises}
                  </button>
                </>
              )}
            </section>
          </div>
        </div>

        {items.length > 0 && <GlassFab label={te.addExercises} onClick={openLibrary} hideFrom="md" />}

        {/* Library drawer: add as many as needed, badges show what's already in */}
        <ResponsiveModal
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          title={te.addExercises}
          description={te.libraryCount.replace("{{n}}", String(items.length))}
          className="sm:w-[520px]"
          bodyClassName="flex-1 flex flex-col overflow-hidden"
          fullHeight
          footer={
            <Button className="w-full rounded-full h-11" onClick={() => setLibraryOpen(false)}>
              {te.done}
            </Button>
          }
        >
          <div className="px-4 pb-3 shrink-0">
            <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
              {(
                [
                  { key: "library", icon: Library, label: t.workout.library.myLibrary },
                  { key: "browse", icon: Database, label: t.workout.library.catalog },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setLibraryTab(tab.key)}
                  className={cn(
                    "h-9 rounded-full text-sm font-medium flex items-center justify-center gap-1.5 transition-colors",
                    libraryTab === tab.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {libraryTab === "library" ? (
              <MyLibraryBrowser onExerciseSelected={addExercise} addedCounts={addedCounts} />
            ) : (
              <ExerciseCatalogBrowser onExerciseImported={addExercise} addedCounts={addedDbCounts} />
            )}
          </div>
        </ResponsiveModal>

        {/* Exercise drawer: everything about one exercise */}
        <ResponsiveModal
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingId(null)}
          title={editingExercise?.name || editingItem?.exerciseName || te.editExercise}
          description={editingItem ? `${editingIndex + 1}/${items.length} · ${prescription(editingItem)}` : undefined}
          className="sm:w-[480px]"
          footer={
            <Button className="w-full rounded-full h-11" onClick={() => setEditingId(null)}>
              {te.done}
            </Button>
          }
        >
          {editingItem && (
            <ExercisePanel
              key={editingItem.id}
              item={editingItem}
              index={editingIndex}
              total={items.length}
              onChange={(updates) => updateItem(editingItem.id, updates)}
              onMove={(delta) => moveItem(editingItem.id, delta)}
              onDuplicate={() => duplicateItem(editingItem.id)}
              onRemove={() => removeItem(editingItem.id)}
              t={t}
            />
          )}
        </ResponsiveModal>

        <ResponsiveConfirm
          open={leaveOpen}
          onOpenChange={setLeaveOpen}
          title={te.unsavedTitle}
          description={te.unsavedDescription}
          confirmLabel={te.discard}
          cancelLabel={te.keepEditing}
          destructive
          onConfirm={leave}
        />
      </div>
    </AdminLayout>
  );
};

export default StrengthWorkoutEditor;
