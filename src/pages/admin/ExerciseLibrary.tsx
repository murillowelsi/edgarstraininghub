import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { db } from "../../lib/firebase";

interface Exercise {
  id: string;
  name: string;
  description: string;
  defaultReps: string;
  youtubeUrl?: string;
}

import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";

// ...

const ExerciseLibrary = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    defaultReps: "",
    youtubeUrl: "",
  });
  // ...

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/admin/dashboard");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "exercises"));
      const fetchedExercises = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Exercise[];

      // Sort alphabetically
      fetchedExercises.sort((a, b) => a.name.localeCompare(b.name));
      setExercises(fetchedExercises);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      toast.error("Failed to load exercises");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingExercise) {
        await setDoc(
          doc(db, "exercises", editingExercise.id),
          {
            ...formData,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        toast.success("Exercise updated");
      } else {
        await addDoc(collection(db, "exercises"), {
          ...formData,
          createdAt: new Date().toISOString(),
        });
        toast.success("Exercise created");
      }

      setShowDialog(false);
      setEditingExercise(null);
      setFormData({
        name: "",
        description: "",
        defaultReps: "",
        youtubeUrl: "",
      });
      fetchExercises();
    } catch (error) {
      console.error("Error saving exercise:", error);
      toast.error(
        `Failed to save exercise: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setFormData({
      name: exercise.name,
      description: exercise.description,
      defaultReps: exercise.defaultReps,
      youtubeUrl: exercise.youtubeUrl || "",
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this exercise?")) return;

    try {
      await deleteDoc(doc(db, "exercises", id));
      toast.success("Exercise deleted");
      fetchExercises();
    } catch (error) {
      console.error("Error deleting exercise:", error);
      toast.error("Failed to delete exercise");
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Exercise Library</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage exercises and add YouTube tutorial videos. Click "New
              Exercise" or edit an existing exercise to add videos.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingExercise(null);
              setFormData({
                name: "",
                description: "",
                defaultReps: "",
                youtubeUrl: "",
              });
              setShowDialog(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New Exercise
          </Button>
        </div>

        <div className="bg-card rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Default Reps</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>YouTube</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : exercises.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No exercises found.
                  </TableCell>
                </TableRow>
              ) : (
                exercises.map((exercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell className="font-medium">
                      {exercise.name}
                    </TableCell>
                    <TableCell>{exercise.defaultReps}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {exercise.description}
                    </TableCell>
                    <TableCell>
                      {exercise.youtubeUrl ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <svg
                            className="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                          </svg>
                          <span className="text-xs">Video</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No video
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(exercise)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(exercise.id)}
                        >
                          <Trash2 className="h-4 w-4 text-yellow-500 hover:text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingExercise ? "Edit Exercise" : "New Exercise"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Exercise Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Bench Press"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultReps">Default Reps (Optional)</Label>
                <Input
                  id="defaultReps"
                  value={formData.defaultReps}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      defaultReps: e.target.value,
                    }))
                  }
                  placeholder="e.g. 3x10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description/Instructions</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Instructions on how to perform the exercise..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtubeUrl">YouTube Video URL (Optional)</Label>
                <Input
                  id="youtubeUrl"
                  type="url"
                  value={formData.youtubeUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      youtubeUrl: e.target.value,
                    }))
                  }
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="text-xs text-muted-foreground">
                  Add a YouTube video tutorial for this exercise
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Exercise"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ExerciseLibrary;
