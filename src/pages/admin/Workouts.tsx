import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { deleteAssignmentsByWorkout } from "@/services/workoutAssignmentsService";
import { deleteWorkout, getAllWorkouts } from "@/services/workoutsService";
import type { Workout } from "@/types/workout";
import { format } from "date-fns";
import { GrSwim, GrBike, GrRun } from "react-icons/gr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Dumbbell, Edit, Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { AdminEmptyState } from "../../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../../components/admin/AdminPageHeader";
import { ResponsiveTable } from "../../components/admin/ResponsiveTable";
import { AssignWorkoutDialog } from "../../components/workout/AssignWorkoutDialog";
import { useLanguage } from "../../contexts/LanguageContext";

const workoutTypeLabels: Record<string, string> = {
  running: "Running",
  cycling: "Cycling",
  swimming: "Swimming",
  strength: "Strength",
};

const workoutTypeBadgeColors: Record<string, string> = {
  running: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20",
  cycling: "bg-green-500/10 text-green-600 hover:bg-green-500/20",
  swimming: "bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20",
  strength: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20",
};

const AdminWorkouts = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [confirmWorkout, setConfirmWorkout] = useState<Workout | null>(null);
  const [newWorkoutDrawerOpen, setNewWorkoutDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "running" | "cycling" | "swimming" | "strength">("all");
  const filteredWorkouts = useMemo(
    () => (activeTab === "all" ? workouts : workouts.filter((w) => w.type === activeTab)),
    [workouts, activeTab]
  );

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
          actions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  {t.admin.workouts.newWorkout}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/admin/workouts/new?type=running" className="flex items-center">
                    <GrRun className="h-4 w-4 mr-2" />
                    {t.admin.workouts.runningWorkout}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/workouts/new?type=cycling" className="flex items-center">
                    <GrBike className="h-4 w-4 mr-2" />
                    {t.admin.workouts.cyclingWorkout}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/workouts/new?type=swimming" className="flex items-center">
                    <GrSwim className="h-4 w-4 mr-2" />
                    {t.admin.workouts.swimmingWorkout}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/workouts/strength/new" className="flex items-center">
                    <Dumbbell className="h-4 w-4 mr-2" />
                    {t.admin.workouts.strengthWorkout}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
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

        <ResponsiveTable
          loading={loading}
          rowKey="_id"
          columns={[
            { key: "name", label: t.common.name },
            { key: "type", label: t.common.type },
            { key: "stages", label: "Stages" },
            { key: "created", label: t.common.created },
          ]}
          rows={workouts.map((workout) => ({
            _id: workout.id,
            name: <span className="font-medium">{workout.name}</span>,
            type: (
              <Badge className={`${workoutTypeBadgeColors[workout.type]} flex items-center gap-1.5 w-fit`}>
                {workout.type === "cycling" && <GrBike className="h-3 w-3" />}
                {workout.type === "running" && <GrRun className="h-3 w-3" />}
                {workout.type === "swimming" && <GrSwim className="h-3 w-3" />}
                {workout.type === "strength" && <Dumbbell className="h-3 w-3" />}
                {workoutTypeLabels[workout.type]}
              </Badge>
            ),
            stages:
              workout.type === "strength"
                ? `${workout.exercises?.length || 0} exercises`
                : `${workout.stages.length} stages`,
            created: format(workout.createdAt, "MMM d, yyyy"),
            _workout: workout,
          }))}
          actions={(row) => {
            const workout = row._workout as Workout;
            return (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAssignClick(workout)}
                  title="Assign to athletes"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    navigate(
                      workout.type === "strength"
                        ? `/admin/workouts/strength/${workout.id}/edit`
                        : `/admin/workouts/${workout.id}/edit`
                    )
                  }
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmWorkout(workout)}
                >
                  {deleting === workout.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </>
            );
          }}
          emptyState={
            <AdminEmptyState
              icon={Dumbbell}
              title={t.admin.workouts.empty.title}
              description={t.admin.workouts.empty.description}
              action={{ label: t.admin.workouts.newWorkout, onClick: () => navigate("/admin/workouts/new") }}
            />
          }
        />
      </div>

      {/* Mobile: New Workout type drawer */}
      <Drawer open={newWorkoutDrawerOpen} onOpenChange={setNewWorkoutDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t.admin.workouts.newWorkout}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-2">
            {[
              { label: t.admin.workouts.runningWorkout, icon: <GrRun className="h-5 w-5" />, to: "/admin/workouts/new?type=running" },
              { label: t.admin.workouts.cyclingWorkout, icon: <GrBike className="h-5 w-5" />, to: "/admin/workouts/new?type=cycling" },
              { label: t.admin.workouts.swimmingWorkout, icon: <GrSwim className="h-5 w-5" />, to: "/admin/workouts/new?type=swimming" },
              { label: t.admin.workouts.strengthWorkout, icon: <Dumbbell className="h-5 w-5" />, to: "/admin/workouts/strength/new" },
            ].map(({ label, icon, to }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setNewWorkoutDrawerOpen(false)}
                className="flex items-center gap-3 w-full p-4 rounded-lg border bg-card hover:bg-muted transition-colors text-sm font-medium"
              >
                {icon}
                {label}
              </Link>
            ))}
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
