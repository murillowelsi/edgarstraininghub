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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { deleteWorkout, getAllWorkouts } from "@/services/workoutsService";
import type { Workout } from "@/types/workout";
import { format } from "date-fns";
import { Edit, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";

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
  const { toast } = useToast();

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
      await deleteWorkout(id);
      setWorkouts(workouts.filter((w) => w.id !== id));
      toast({
        title: "Workout deleted",
        description: "The workout has been permanently deleted.",
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

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold">Workouts</h1>
          <Link to="/admin/workouts/new">
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Workout
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : workouts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No workouts yet.</p>
            <Link to="/admin/workouts/new">
              <Button>Create your first workout</Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Name</TableHead>
                  <TableHead className="min-w-[100px]">Type</TableHead>
                  <TableHead className="min-w-[100px]">Stages</TableHead>
                  <TableHead className="min-w-[120px]">Created</TableHead>
                  <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workouts.map((workout) => (
                  <TableRow key={workout.id}>
                    <TableCell className="font-medium">
                      {workout.name}
                    </TableCell>
                    <TableCell>
                      <Badge className={workoutTypeBadgeColors[workout.type]}>
                        {workoutTypeLabels[workout.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>{workout.stages.length} stages</TableCell>
                    <TableCell>
                      {format(workout.createdAt, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/admin/workouts/${workout.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
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
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(workout.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminWorkouts;
