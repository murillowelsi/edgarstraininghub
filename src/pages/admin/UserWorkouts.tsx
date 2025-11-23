import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { db } from '../../lib/firebase';

interface Exercise {
  name: string;
  reps: string;
  details: string;
}

interface LibraryExercise {
  id: string;
  name: string;
  defaultReps: string;
  description: string;
}

interface Workout {
  id: string;
  date: string;
  exercises: Exercise[];
}

const UserWorkouts = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [athleteName, setAthleteName] = useState('');
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [libraryExercises, setLibraryExercises] = useState<LibraryExercise[]>([]);
  
  // Workout form state
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: '', reps: '', details: '' }
  ]);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      try {
        // Fetch user details
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setAthleteName(userDoc.data().name);
        }

        // Fetch library exercises
        const exercisesSnapshot = await getDocs(collection(db, 'exercises'));
        const fetchedLibraryExercises = exercisesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LibraryExercise[];
        fetchedLibraryExercises.sort((a, b) => a.name.localeCompare(b.name));
        setLibraryExercises(fetchedLibraryExercises);

        await fetchWorkouts();
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const fetchWorkouts = async () => {
    if (!userId) return;
    const q = query(collection(db, 'workouts'), where('athleteId', '==', userId));
    const querySnapshot = await getDocs(q);
    const fetchedWorkouts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Workout[];
    
    // Sort by date desc
    fetchedWorkouts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setWorkouts(fetchedWorkouts);
  };

  const handleAddExercise = () => {
    setExercises([...exercises, { name: '', reps: '', details: '' }]);
  };

  const handleRemoveExercise = (index: number) => {
    const newExercises = exercises.filter((_, i) => i !== index);
    setExercises(newExercises);
  };

  const handleExerciseChange = (index: number, field: keyof Exercise, value: string) => {
    const newExercises = [...exercises];
    newExercises[index][field] = value;
    setExercises(newExercises);
  };

  const handleLibraryExerciseSelect = (index: number, exerciseId: string) => {
    const selectedExercise = libraryExercises.find(ex => ex.id === exerciseId);
    if (selectedExercise) {
      const newExercises = [...exercises];
      newExercises[index] = {
        name: selectedExercise.name,
        reps: selectedExercise.defaultReps || '',
        details: selectedExercise.description || ''
      };
      setExercises(newExercises);
    }
  };

  const handleEditWorkout = (workout: Workout) => {
    setEditingWorkoutId(workout.id);
    setDate(workout.date);
    setExercises(workout.exercises);
    setShowDialog(true);
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    if (!confirm('Are you sure you want to delete this workout?')) return;

    try {
      await deleteDoc(doc(db, 'workouts', workoutId));
      toast.success('Workout deleted');
      fetchWorkouts();
    } catch (error) {
      console.error('Error deleting workout:', error);
      toast.error('Failed to delete workout');
    }
  };

  const handleSaveWorkout = async () => {
    if (!userId) return;
    
    // Validate
    if (exercises.some(ex => !ex.name)) {
      toast.error('Please select or enter exercise name for all exercises');
      return;
    }

    setSaving(true);
    try {
      const workoutData = {
        athleteId: userId,
        date,
        exercises,
        updatedAt: new Date().toISOString()
      };

      if (editingWorkoutId) {
        await setDoc(doc(db, 'workouts', editingWorkoutId), workoutData, { merge: true });
        toast.success('Workout updated successfully');
      } else {
        await addDoc(collection(db, 'workouts'), {
          ...workoutData,
          createdAt: new Date().toISOString()
        });
        toast.success('Workout created successfully');
      }
      
      await fetchWorkouts();
      setShowDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error saving workout:', error);
      toast.error('Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingWorkoutId(null);
    setExercises([{ name: '', reps: '', details: '' }]);
    setDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/users')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">
                Manage Workouts
              </h1>
              {!loading && athleteName && (
                <p className="text-sm text-muted-foreground mt-1">
                  {athleteName}
                </p>
              )}
            </div>
          </div>
          <Button onClick={() => {
            resetForm();
            setShowDialog(true);
          }}>
            <Plus className="mr-2 h-4 w-4" /> New Workout
          </Button>
        </div>

        <div className="bg-card rounded-lg border shadow-sm">
          <CardHeader>
            <CardTitle>Workout History</CardTitle>
          </CardHeader>
          <CardContent>
            {workouts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No workouts found.</p>
            ) : (
              <div className="space-y-4">
                {workouts.map((workout) => (
                  <div key={workout.id} className="border rounded-lg p-4 relative">
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditWorkout(workout)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteWorkout(workout.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="font-semibold mb-2 text-lg">
                      {new Date(workout.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                      {workout.exercises.map((ex, i) => (
                        <li key={i} className="text-muted-foreground">
                          <span className="font-medium text-foreground">{ex.name}</span>
                          {ex.reps && ` - ${ex.reps}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingWorkoutId ? 'Edit Workout' : 'Create New Workout'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                />
              </div>

              <div className="space-y-4">
                <Label>Exercises</Label>
                {exercises.map((exercise, index) => (
                  <div key={index} className="space-y-3 p-4 border rounded-lg bg-muted/20 relative">
                    {exercises.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 text-destructive"
                        onClick={() => handleRemoveExercise(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs text-muted-foreground">Select from Library (Optional)</Label>
                        <Button
                          variant="link"
                          className="h-auto p-0 text-xs"
                          onClick={() => window.open('/admin/exercises', '_blank')}
                        >
                          Manage Library
                        </Button>
                      </div>
                      <Select onValueChange={(value) => handleLibraryExerciseSelect(index, value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an exercise..." />
                        </SelectTrigger>
                        <SelectContent>
                          {libraryExercises.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              No exercises found. <br />
                              <span className="text-xs">Go to "Exercises" to add some.</span>
                            </div>
                          ) : (
                            libraryExercises.map((ex) => (
                              <SelectItem key={ex.id} value={ex.id}>
                                {ex.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input
                          placeholder="Exercise Name"
                          value={exercise.name}
                          onChange={(e) => handleExerciseChange(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Reps</Label>
                        <Input
                          placeholder="Reps (e.g. 3x10)"
                          value={exercise.reps}
                          onChange={(e) => handleExerciseChange(index, 'reps', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Details</Label>
                      <Textarea
                        placeholder="Details/Notes"
                        value={exercise.details}
                        onChange={(e) => handleExerciseChange(index, 'details', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={handleAddExercise} className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> Add Exercise
                </Button>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveWorkout} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Workout'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default UserWorkouts;
