import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../../lib/firebase";

interface Exercise {
  name: string;
  reps: string;
  details: string;
}

interface Workout {
  id: string;
  date: string;
  exercises: Exercise[];
  athleteId?: string;
}

const WorkoutDetail = () => {
  const { workoutId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkout = async () => {
      if (!workoutId || !user) return;

      try {
        const workoutDoc = await getDoc(doc(db, "workouts", workoutId));
        if (workoutDoc.exists()) {
          const workoutData = {
            id: workoutDoc.id,
            ...workoutDoc.data(),
          } as Workout;
          // Verify the workout belongs to the current user
          if (workoutData.athleteId === user.uid) {
            setWorkout(workoutData);
          } else {
            navigate("/athlete/dashboard");
          }
        } else {
          navigate("/athlete/dashboard");
        }
      } catch (error) {
        console.error("Error fetching workout:", error);
        navigate("/athlete/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkout();
  }, [workoutId, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading workout...</p>
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Workout not found</p>
          <Button onClick={() => navigate("/athlete/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/athlete/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {new Date(workout.date).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h1>
          <p className="text-muted-foreground">
            {workout.exercises.length} exercises scheduled
          </p>
        </div>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center gap-4 border-b bg-muted/50 pb-6">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Dumbbell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Workout Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Complete all exercises as planned
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {workout.exercises.map((exercise, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold text-lg">{exercise.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {exercise.details}
                  </p>
                </div>
                <div className="flex-none flex items-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-secondary text-secondary-foreground">
                    {exercise.reps}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkoutDetail;
