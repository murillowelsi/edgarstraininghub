import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { AdminEmptyState } from "../../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../../components/admin/AdminPageHeader";
import { ResponsiveTable } from "../../components/admin/ResponsiveTable";
import { AssignWorkoutDialog } from "../../components/workout/AssignWorkoutDialog";

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
  const { toast } = useToast();
  const navigate = useNavigate();

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
        title: "Error",
        description: "Failed to load workouts.",
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
        title: "Workout deleted",
        description: "The workout and its assignments have been permanently deleted.",
      });
    } catch (error) {
      console.error("Error deleting workout:", error);
      toast({
        title: "Error",
        description: "Failed to delete workout.",
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
      <div className="p-4 md:p-8">
        <AdminPageHeader
          title="Workouts"
          actions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Workout
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/admin/workouts/new?type=running" className="flex items-center">
                    <GrRun className="h-4 w-4 mr-2" />
                    Running Workout
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/workouts/new?type=cycling" className="flex items-center">
                    <GrBike className="h-4 w-4 mr-2" />
                    Cycling Workout
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/workouts/new?type=swimming" className="flex items-center">
                    <GrSwim className="h-4 w-4 mr-2" />
                    Swimming Workout
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/workouts/strength/new" className="flex items-center">
                    <Dumbbell className="h-4 w-4 mr-2" />
                    Strength Workout
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />

        <ResponsiveTable
          loading={loading}
          rowKey="_id"
          columns={[
            { key: "name", label: "Name" },
            { key: "type", label: "Type" },
            { key: "stages", label: "Stages" },
            { key: "created", label: "Created" },
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
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      {deleting === workout.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Workout</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{workout.name}"?
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(workout.id)}
                        className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            );
          }}
          emptyState={
            <AdminEmptyState
              icon={Dumbbell}
              title="No workouts yet"
              description="Create your first workout to get started."
              action={{ label: "New Workout", onClick: () => navigate("/admin/workouts/new") }}
            />
          }
        />
      </div>

      <AssignWorkoutDialog
        workout={selectedWorkout}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
      />
    </AdminLayout>
  );
};

export default AdminWorkouts;
