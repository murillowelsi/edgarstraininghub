import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { useToast } from "@/hooks/use-toast";
import { deleteAssignmentsByWorkout } from "@/services/workoutAssignmentsService";
import { deleteWorkout, getAllWorkouts } from "@/services/workoutsService";
import type { Workout } from "@/types/workout";
import { GrSwim, GrBike, GrRun } from "react-icons/gr";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Dumbbell, Edit, EllipsisVertical, Loader2, Plus, Search, Trash2, UserPlus } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { AdminEmptyState } from "../../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../../components/admin/AdminPageHeader";
import { ListItemCard } from "../../components/shared/ListItemCard";
import { AssignWorkoutDialog } from "../../components/workout/AssignWorkoutDialog";
import { useLanguage } from "../../contexts/LanguageContext";
import { Input } from "@/components/ui/input";

const workoutTypeColors: Record<string, string> = {
  running: "#3b82f6",
  cycling: "#22c55e",
  swimming: "#06b6d4",
  strength: "#f97316",
};

function WorkoutIcon({ type }: { type: string }) {
  const cls = "h-5 w-5";
  if (type === "running") return <GrRun className={cls} />;
  if (type === "cycling") return <GrBike className={cls} />;
  if (type === "swimming") return <GrSwim className={cls} />;
  return <Dumbbell className={cls} />;
}

const AdminWorkouts = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [confirmWorkout, setConfirmWorkout] = useState<Workout | null>(null);
  const [newWorkoutDrawerOpen, setNewWorkoutDrawerOpen] = useState(false);
  const [actionWorkout, setActionWorkout] = useState<Workout | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "running" | "cycling" | "swimming" | "strength">("all");
  const filteredWorkouts = useMemo(() => {
    let list = activeTab === "all" ? workouts : workouts.filter((w) => w.type === activeTab);
    if (search.trim()) list = list.filter((w) => w.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [workouts, activeTab, search]);

  const tabCounts = useMemo(
    () => ({
      all: workouts.length,
      running: workouts.filter((w) => w.type === "running").length,
      cycling: workouts.filter((w) => w.type === "cycling").length,
      swimming: workouts.filter((w) => w.type === "swimming").length,
      strength: workouts.filter((w) => w.type === "strength").length,
    }),
    [workouts]
  );
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      const allWorkouts = await getAllWorkouts();
      setWorkouts(allWorkouts);
    } catch (error) {
      console.error("Error loading workouts:", error);
      toast({
        title: t.common.error,
        description: t.admin.workouts.toast.loadError,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      // Delete associated assignments first (cascade delete)
      await deleteAssignmentsByWorkout(id);
      await deleteWorkout(id);
      setWorkouts(workouts.filter((w) => w.id !== id));
      toast({
        title: t.admin.workouts.toast.deleted,
        description: t.admin.workouts.toast.deletedDescription,
      });
    } catch (error) {
      console.error("Error deleting workout:", error);
      toast({
        title: t.common.error,
        description: t.admin.workouts.toast.deleteError,
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleAssignClick = (workout: Workout) => {
    setSelectedWorkout(workout);
    setAssignDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 pb-24 md:pb-8">
        <AdminPageHeader
          title={t.admin.workouts.title}
          action={{ label: t.admin.workouts.newWorkout, onClick: () => setNewWorkoutDrawerOpen(true) }}
          mobileFab={
            <button
              onClick={() => setNewWorkoutDrawerOpen(true)}
              className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
              aria-label={t.admin.workouts.newWorkout}
            >
              <Plus className="h-6 w-6" />
            </button>
          }
        />

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t.admin.workouts.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm rounded-full"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-3 mb-1 scrollbar-hide">
          {([
            { key: "all", label: "All", icon: null, color: null },
            { key: "running", label: "Running", icon: <GrRun className="h-3.5 w-3.5" />, color: workoutTypeColors.running },
            { key: "cycling", label: "Cycling", icon: <GrBike className="h-3.5 w-3.5" />, color: workoutTypeColors.cycling },
            { key: "swimming", label: "Swimming", icon: <GrSwim className="h-3.5 w-3.5" />, color: workoutTypeColors.swimming },
            { key: "strength", label: "Strength", icon: <Dumbbell className="h-3.5 w-3.5" />, color: workoutTypeColors.strength },
          ] as const).map(({ key, label, icon, color }) => {
            const isActive = activeTab === key;
            const count = tabCounts[key];
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all border"
                style={isActive
                  ? { backgroundColor: color ?? "hsl(var(--primary))", color: "#fff", borderColor: "transparent" }
                  : { backgroundColor: "transparent", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
                }
              >
                {icon}
                {label}
                <span
                  className="ml-0.5 text-[10px] opacity-75"
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredWorkouts.length === 0 ? (
            <AdminEmptyState
              icon={Dumbbell}
              title={t.admin.workouts.empty.title}
              description={t.admin.workouts.empty.description}
            />
          ) : (
            <div className="space-y-2">
              {filteredWorkouts.map((workout) => {
                const color = workoutTypeColors[workout.type] ?? "#8b5cf6";
                const stagesLabel = workout.type === "strength"
                  ? t.admin.workouts.exercisesCount.replace("{{count}}", String(workout.exercises?.length || 0))
                  : t.admin.workouts.stagesCount.replace("{{count}}", String(workout.stages.length));
                return (
                  <ListItemCard
                    key={workout.id}
                    to={workout.type === "strength"
                      ? `/admin/workouts/strength/${workout.id}/edit`
                      : `/admin/workouts/${workout.id}/edit`}
                    icon={<WorkoutIcon type={workout.type} />}
                    iconStyle={{ backgroundColor: `${color}1a`, color }}
                    title={workout.name}
                    subtitle={stagesLabel}
                    right={
                      <Badge
                        variant="outline"
                        className="text-xs font-normal border-transparent"
                        style={{ backgroundColor: `${color}18`, color }}
                      >
                        {workout.type}
                      </Badge>
                    }
                    actions={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                        onClick={(e) => { e.preventDefault(); setActionWorkout(workout); }}
                      >
                        {deleting === workout.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <EllipsisVertical className="h-4 w-4" />}
                      </Button>
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Workout type picker */}
      <ResponsiveModal
        open={newWorkoutDrawerOpen}
        onOpenChange={setNewWorkoutDrawerOpen}
        title={t.admin.workouts.newWorkout}
      >
        <div className="space-y-2 p-2">
          {[
            { label: t.admin.workouts.runningWorkout,  icon: GrRun,    hex: workoutTypeColors.running,  to: "/admin/workouts/new?type=running",  type: "running" },
            { label: t.admin.workouts.cyclingWorkout,  icon: GrBike,   hex: workoutTypeColors.cycling,  to: "/admin/workouts/new?type=cycling",  type: "cycling" },
            { label: t.admin.workouts.swimmingWorkout, icon: GrSwim,   hex: workoutTypeColors.swimming, to: "/admin/workouts/new?type=swimming", type: "swimming" },
            { label: t.admin.workouts.strengthWorkout, icon: Dumbbell, hex: workoutTypeColors.strength, to: "/admin/workouts/strength/new",      type: "strength" },
          ].map(({ label, icon: Icon, hex, to, type }) => {
            const count = workouts.filter((w) => w.type === type).length;
            return (
              <button
                key={to}
                onClick={() => { navigate(to); setNewWorkoutDrawerOpen(false); }}
                className="flex items-center gap-3 w-full p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-sm transition-all text-left"
              >
                <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: `${hex}1a`, color: hex }}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{count} workout{count !== 1 ? "s" : ""}</p>
                </div>
              </button>
            );
          })}
        </div>
      </ResponsiveModal>

      {/* Action drawer */}
      <Drawer open={!!actionWorkout} onOpenChange={(open) => { if (!open) setActionWorkout(null); }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="truncate">{actionWorkout?.name}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-2">
            <button
              className="flex items-center gap-3 w-full p-4 rounded-lg border bg-card hover:bg-muted transition-colors text-sm font-medium"
              onClick={() => { handleAssignClick(actionWorkout!); setActionWorkout(null); }}
            >
              <UserPlus className="h-5 w-5" />
              {t.admin.workouts.assignToAthletes}
            </button>
            <button
              className="flex items-center gap-3 w-full p-4 rounded-lg border bg-card hover:bg-muted transition-colors text-sm font-medium"
              onClick={() => {
                navigate(actionWorkout!.type === "strength"
                  ? `/admin/workouts/strength/${actionWorkout!.id}/edit`
                  : `/admin/workouts/${actionWorkout!.id}/edit`);
                setActionWorkout(null);
              }}
            >
              <Edit className="h-5 w-5" />
              {t.common.edit}
            </button>
            <button
              className="flex items-center gap-3 w-full p-4 rounded-lg border bg-card hover:bg-muted transition-colors text-sm font-medium"
              onClick={() => { setConfirmWorkout(actionWorkout); setActionWorkout(null); }}
            >
              <Trash2 className="h-5 w-5" />
              {t.common.delete}
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <AssignWorkoutDialog
        workout={selectedWorkout}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
      />

      <ResponsiveConfirm
        open={!!confirmWorkout}
        onOpenChange={(open) => { if (!open) setConfirmWorkout(null); }}
        title={t.admin.workouts.delete.title}
        description={t.admin.workouts.delete.description.replace("{{name}}", confirmWorkout?.name || "")}
        confirmLabel={t.common.delete}
        destructive
        loading={deleting === confirmWorkout?.id}
        onConfirm={() => {
          if (confirmWorkout) {
            handleDelete(confirmWorkout.id).then(() => setConfirmWorkout(null));
          }
        }}
      />
    </AdminLayout>
  );
};

export default AdminWorkouts;
