import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Calendar as CalendarIcon, Dumbbell } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
}

const MOCK_WORKOUT: Workout = {
  id: "mock-1",
  date: new Date().toISOString().split("T")[0],
  exercises: [
    {
      name: "Push-ups",
      reps: "3 sets of 15",
      details: "Keep your back straight and core engaged.",
    },
    {
      name: "Squats",
      reps: "4 sets of 12",
      details: "Go as deep as possible while maintaining form.",
    },
    {
      name: "Plank",
      reps: "3 sets of 60 seconds",
      details: "Focus on breathing.",
    },
  ],
};

const AthleteDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );

  // Get dates that have workouts
  const workoutDates = allWorkouts.map((workout) => new Date(workout.date));

  useEffect(() => {
    const fetchWorkouts = async () => {
      if (!user) return;

      try {
        // Fetch all workouts for the athlete
        const q = query(
          collection(db, "workouts"),
          where("athleteId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        const fetchedWorkouts = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Workout[];

        // Sort by date (most recent first)
        fetchedWorkouts.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setAllWorkouts(fetchedWorkouts);

        // Find today's workout
        const today = new Date().toISOString().split("T")[0];
        const todayWorkout = fetchedWorkouts.find((w) => w.date === today);
        setWorkout(todayWorkout || null);
      } catch (error) {
        console.error("Error fetching workouts:", error);
        setWorkout(MOCK_WORKOUT);
        setAllWorkouts([MOCK_WORKOUT]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkouts();
  }, [user]);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back!
            </h1>
            <p className="text-muted-foreground mt-1 sm:mt-2">
              Here is your training plan for today.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setCalendarOpen(true)}
            className="flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 px-3 sm:px-4 py-2 rounded-lg self-start sm:self-auto border-primary/20"
          >
            <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="font-medium text-sm sm:text-base">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading workout...</div>
        ) : workout ? (
          <Card className="border-2">
            <CardHeader className="flex flex-row items-center gap-4 border-b bg-muted/50 pb-6">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Dumbbell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Today's Workout</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {workout.exercises.length} exercises scheduled
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
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No workout scheduled for today.
          </div>
        )}
      </div>

      <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30 flex-none">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Training Calendar
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid md:grid-cols-2 divide-x flex-1 min-h-0">
            {/* Left Side - Calendar */}
            <div className="flex flex-col">
              <div className="p-6 pb-4 flex-none">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide text-center">Select a Date</h3>
              </div>
              <div className="flex-1 overflow-y-auto flex items-start justify-center px-6 pt-8">
                <div className="space-y-4 w-full max-w-md">
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      modifiers={{
                        hasWorkout: workoutDates,
                      }}
                      modifiersClassNames={{
                        hasWorkout:
                          "bg-primary/10 text-primary font-semibold relative after:absolute after:bottom-0.5 after:left-1/2 after:transform after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full",
                      }}
                      className="rounded-md border-0"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md py-2 px-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Workout scheduled</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Workout Details */}
            <div className="bg-muted/20 flex flex-col min-h-0">
              <div className="p-6 pb-4 flex-none">
                <p className="text-lg font-bold text-center">
                  {selectedDate
                    ? selectedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "No date selected"}
                </p>
              </div>

              {selectedDate &&
                (() => {
                  const selectedDateString = selectedDate
                    .toISOString()
                    .split("T")[0];
                  const dayWorkout = allWorkouts.find(
                    (w) => w.date === selectedDateString
                  );

                  if (!dayWorkout) {
                    return (
                      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Dumbbell className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <h4 className="font-semibold text-base mb-1">No Workout Scheduled</h4>
                        <p className="text-sm text-muted-foreground">
                          This is a rest day or free training day
                        </p>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="px-6 pb-4 flex-none">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Dumbbell className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">Workout Plan</h4>
                            <p className="text-xs text-muted-foreground">
                              {dayWorkout.exercises.length} {dayWorkout.exercises.length === 1 ? 'exercise' : 'exercises'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto px-6 min-h-0">
                        <div className="space-y-2 pb-4">
                          {dayWorkout.exercises.map((exercise, index) => (
                            <div
                              key={index}
                              className="bg-background rounded-lg p-4 border border-border/50 hover:border-primary/30 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-none w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                                  {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-semibold text-sm mb-1">
                                    {exercise.name}
                                  </h5>
                                  {exercise.reps && (
                                    <p className="text-xs text-muted-foreground mb-2">
                                      <span className="font-medium">Sets/Reps:</span> {exercise.reps}
                                    </p>
                                  )}
                                  {exercise.details && (
                                    <p className="text-xs text-muted-foreground">
                                      {exercise.details}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-6 pt-4 border-t bg-background flex-none">
                        <Button
                          className="w-full"
                          onClick={() => {
                            setCalendarOpen(false);
                            navigate(`/athlete/workout/${dayWorkout.id}`);
                          }}
                        >
                          View Full Workout Details
                        </Button>
                      </div>
                    </>
                  );
                })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AthleteDashboard;
