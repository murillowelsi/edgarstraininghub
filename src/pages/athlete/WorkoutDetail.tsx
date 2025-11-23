import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../../lib/firebase";

interface Exercise {
  name: string;
  reps: string;
  details: string;
}

interface Stage {
  name?: string;
  exerciseName?: string;
  type: string;
  sets?: string;
  reps?: string;
  weight?: string;
  duration?: string;
  distance?: string;
  distanceUnit?: string;
  intensity?: string;
  notes?: string;
  repeat?: number;
  stroke?: string;
  equipment?: string[];
}

interface Workout {
  id: string;
  date: string;
  exercises?: Exercise[];
  stages?: Stage[];
  type?: string;
  notes?: string;
  athleteId?: string;
  swimmingType?: string;
  cyclingType?: string;
  runningType?: string;
}

const WorkoutDetail = () => {
  const { workoutId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to get stage type color
  const getStageTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      warmup:
        "border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/20",
      work: "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
      cardio: "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20",
      recovery:
        "border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20",
      rest: "border-l-4 border-l-gray-500 bg-gray-50 dark:bg-gray-950/20",
      cooldown:
        "border-l-4 border-l-purple-500 bg-purple-50 dark:bg-purple-950/20",
      other:
        "border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
    };
    return colors[type] || "border-l-4 border-l-gray-300 bg-muted/20";
  };

  // Helper function to get workout items (exercises or stages)
  const getWorkoutItems = (workout: Workout) => {
    if (workout.stages && workout.stages.length > 0) {
      return workout.stages;
    }
    if (workout.exercises && workout.exercises.length > 0) {
      return workout.exercises;
    }
    return [];
  };

  // Helper function to get item count
  const getWorkoutItemCount = (workout: Workout) => {
    return getWorkoutItems(workout).length;
  };

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
    <div className="container mx-auto py-10 px-4">
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
            {getWorkoutItemCount(workout)} exercises scheduled
          </p>
        </div>

        <div className="bg-card rounded-lg border shadow-sm">
          <CardHeader>
            <CardTitle>Workout Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Workout Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-muted/20 p-4 rounded-lg border">
                <h3 className="font-semibold text-base mb-2">Workout Type</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {workout.type === "strength"
                    ? "Strength Training"
                    : workout.type}
                </p>
              </div>
              <div className="bg-muted/20 p-4 rounded-lg border">
                <h3 className="font-semibold text-base mb-2">Total Stages</h3>
                <p className="text-sm text-muted-foreground">
                  {getWorkoutItemCount(workout)}{" "}
                  {getWorkoutItemCount(workout) === 1 ? "stage" : "stages"}
                </p>
              </div>
              <div className="bg-muted/20 p-4 rounded-lg border">
                <h3 className="font-semibold text-base mb-2">Date</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(workout.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Sport-Specific Details */}
            {workout.type !== "strength" && (
              <div className="bg-muted/20 p-6 rounded-lg border">
                <h3 className="font-semibold text-lg mb-4">
                  {workout.type === "swimming" && "Swimming Details"}
                  {workout.type === "cycling" && "Cycling Details"}
                  {workout.type === "running" && "Running Details"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {workout.type === "swimming" && workout.swimmingType && (
                    <div className="bg-background/50 p-3 rounded border">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Swimming Type
                      </span>
                      <p className="text-sm font-semibold mt-1">
                        {workout.swimmingType === "pool"
                          ? "Pool Swimming"
                          : "Open Water Swimming"}
                      </p>
                    </div>
                  )}
                  {workout.type === "cycling" && workout.cyclingType && (
                    <div className="bg-background/50 p-3 rounded border">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Cycling Type
                      </span>
                      <p className="text-sm font-semibold mt-1">
                        {workout.cyclingType === "indoor"
                          ? "Indoor Cycling"
                          : "Outdoor Cycling"}
                      </p>
                    </div>
                  )}
                  {workout.type === "running" && workout.runningType && (
                    <div className="bg-background/50 p-3 rounded border">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Running Type
                      </span>
                      <p className="text-sm font-semibold mt-1">
                        {workout.runningType === "indoor"
                          ? "Indoor Running"
                          : "Outdoor Running"}
                      </p>
                    </div>
                  )}
                  {/* Additional sport-specific details from stages */}
                  {getWorkoutItems(workout).some(
                    (item) => "type" in item && (item as Stage).stroke
                  ) && (
                    <div className="bg-background/50 p-3 rounded border">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Stroke Types Used
                      </span>
                      <p className="text-sm font-semibold mt-1">
                        {Array.from(
                          new Set(
                            getWorkoutItems(workout)
                              .filter((item) => "type" in item)
                              .map((item) => (item as Stage).stroke)
                              .filter(Boolean)
                          )
                        ).join(", ")}
                      </p>
                    </div>
                  )}
                  {getWorkoutItems(workout).some(
                    (item) =>
                      "type" in item && (item as Stage).equipment?.length
                  ) && (
                    <div className="bg-background/50 p-3 rounded border">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Equipment Needed
                      </span>
                      <p className="text-sm font-semibold mt-1">
                        {Array.from(
                          new Set(
                            getWorkoutItems(workout)
                              .filter((item) => "type" in item)
                              .flatMap(
                                (item) => (item as Stage).equipment || []
                              )
                              .filter(Boolean)
                          )
                        ).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Detailed Stages */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Stage Breakdown</h3>
              {getWorkoutItems(workout).map((item, index) => {
                const isStage = "type" in item;
                const stage = item as Stage;
                const exercise = item as Exercise;

                return (
                  <div
                    key={index}
                    className={`p-6 rounded-lg border ${
                      isStage ? getStageTypeColor(stage.type) : "bg-muted/20"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-none flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <h4 className="font-semibold text-lg">
                            {isStage
                              ? stage.exerciseName ||
                                stage.name ||
                                `Stage ${index + 1}`
                              : exercise.name}
                          </h4>
                          {isStage && stage.type && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-secondary text-secondary-foreground capitalize">
                                {stage.type}
                              </span>
                              {stage.repeat && stage.repeat > 1 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                                  {stage.repeat}x
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Stage Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {isStage ? (
                            workout.type === "strength" ? (
                              <>
                                {stage.sets && (
                                  <div className="bg-background/50 p-3 rounded border">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Sets
                                    </span>
                                    <p className="text-sm font-semibold mt-1">
                                      {stage.sets}
                                    </p>
                                  </div>
                                )}
                                {stage.reps && (
                                  <div className="bg-background/50 p-3 rounded border">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Reps
                                    </span>
                                    <p className="text-sm font-semibold mt-1">
                                      {stage.reps}
                                    </p>
                                  </div>
                                )}
                                {stage.weight && (
                                  <div className="bg-background/50 p-3 rounded border">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Weight
                                    </span>
                                    <p className="text-sm font-semibold mt-1">
                                      {stage.weight}
                                    </p>
                                  </div>
                                )}
                                {stage.equipment &&
                                  stage.equipment.length > 0 && (
                                    <div className="bg-background/50 p-3 rounded border">
                                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Equipment
                                      </span>
                                      <p className="text-sm font-semibold mt-1">
                                        {stage.equipment.join(", ")}
                                      </p>
                                    </div>
                                  )}
                              </>
                            ) : workout.type === "swimming" ? (
                              <>
                                {stage.distance && (
                                  <div className="bg-background/50 p-3 rounded border">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Distance
                                    </span>
                                    <p className="text-sm font-semibold mt-1">
                                      {stage.distance}{" "}
                                      {stage.distanceUnit || "m"}
                                    </p>
                                  </div>
                                )}
                                {stage.duration && (
                                  <div className="bg-background/50 p-3 rounded border">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Duration
                                    </span>
                                    <p className="text-sm font-semibold mt-1">
                                      {stage.duration}
                                    </p>
                                  </div>
                                )}
                                {stage.intensity && (
                                  <div className="bg-background/50 p-3 rounded border">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Intensity
                                    </span>
                                    <p className="text-sm font-semibold mt-1">
                                      {stage.intensity}
                                    </p>
                                  </div>
                                )}
                                {stage.stroke && (
                                  <div className="bg-background/50 p-3 rounded border">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Stroke Type
                                    </span>
                                    <p className="text-sm font-semibold mt-1">
                                      {stage.stroke}
                                    </p>
                                  </div>
                                )}
                                {stage.equipment &&
                                  stage.equipment.length > 0 && (
                                    <div className="bg-background/50 p-3 rounded border">
                                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Equipment
                                      </span>
                                      <p className="text-sm font-semibold mt-1">
                                        {stage.equipment.join(", ")}
                                      </p>
                                    </div>
                                  )}
                              </>
                            ) : workout.type === "cycling" ? (
                              <>
                                {stage.distance && (
                                  <div className="bg-background/50 p-3 rounded border">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Distance
                                    </span>
                                    <p className="text-sm font-semibold mt-1">
                                      {stage.distance}{" "}
                                      {stage.distanceUnit || "km"}
                                    </p>
                                  </div>
                                )}
                                {stage.duration && (
                                  <div className="bg-background/50 p-3 rounded border">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Duration
                                    </span>
                                    <p className="text-sm font-semibold mt-1">
                                      {stage.duration}
                                    </p>
                                  </div>
                                )}
                                {stage.intensity && (
                                  <div className="bg-background/50 p-3 rounded border">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Intensity
                                    </span>
                                    <p className="text-sm font-semibold mt-1">
                                      {stage.intensity}
                                    </p>
                                  </div>
                                )}
                                {stage.equipment &&
                                  stage.equipment.length > 0 && (
                                    <div className="bg-background/50 p-3 rounded border">
                                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Equipment
                                      </span>
                                      <p className="text-sm font-semibold mt-1">
                                        {stage.equipment.join(", ")}
                                      </p>
                                    </div>
                                  )}
                              </>
                            ) : workout.type === "running" ? (
                              <>
                                {stage.distance && (
                                  <div className="bg-background/50 p-3 rounded border">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Distance
                                    </span>
                                    <p className="text-sm font-semibold mt-1">
                                      {stage.distance}{" "}
                                      {stage.distanceUnit || "km"}
                                    </p>
                                  </div>
                                )}
                                {stage.duration && (
                                  <div className="bg-background/50 p-3 rounded border">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Duration
                                    </span>
                                    <p className="text-sm font-semibold mt-1">
                                      {stage.duration}
                                    </p>
                                  </div>
                                )}
                                {stage.intensity && (
                                  <div className="bg-background/50 p-3 rounded border">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Intensity
                                    </span>
                                    <p className="text-sm font-semibold mt-1">
                                      {stage.intensity}
                                    </p>
                                  </div>
                                )}
                                {stage.equipment &&
                                  stage.equipment.length > 0 && (
                                    <div className="bg-background/50 p-3 rounded border">
                                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Equipment
                                      </span>
                                      <p className="text-sm font-semibold mt-1">
                                        {stage.equipment.join(", ")}
                                      </p>
                                    </div>
                                  )}
                              </>
                            ) : (
                              <>
                                {stage.distance && (
                                  <div className="bg-background/50 p-3 rounded border">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Distance
                                    </span>
                                    <p className="text-sm font-semibold mt-1">
                                      {stage.distance}{" "}
                                      {stage.distanceUnit || "km"}
                                    </p>
                                  </div>
                                )}
                                {stage.duration && (
                                  <div className="bg-background/50 p-3 rounded border">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Duration
                                    </span>
                                    <p className="text-sm font-semibold mt-1">
                                      {stage.duration}
                                    </p>
                                  </div>
                                )}
                                {stage.intensity && (
                                  <div className="bg-background/50 p-3 rounded border">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Intensity
                                    </span>
                                    <p className="text-sm font-semibold mt-1">
                                      {stage.intensity}
                                    </p>
                                  </div>
                                )}
                                {stage.equipment &&
                                  stage.equipment.length > 0 && (
                                    <div className="bg-background/50 p-3 rounded border">
                                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Equipment
                                      </span>
                                      <p className="text-sm font-semibold mt-1">
                                        {stage.equipment.join(", ")}
                                      </p>
                                    </div>
                                  )}
                              </>
                            )
                          ) : (
                            <div className="bg-background/50 p-3 rounded border md:col-span-2">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Reps
                              </span>
                              <p className="text-sm font-semibold mt-1">
                                {exercise.reps}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {(isStage ? stage.notes : exercise.details) && (
                          <div className="bg-background/30 p-4 rounded border">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Notes
                            </span>
                            <p className="text-sm mt-2">
                              {isStage ? stage.notes : exercise.details}
                            </p>
                          </div>
                        )}

                        {/* Stage Type Description */}
                        {isStage && stage.type && (
                          <div className="bg-background/30 p-4 rounded border">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Stage Purpose
                            </span>
                            <p className="text-sm mt-2 capitalize">
                              {stage.type === "warmup" &&
                                "Aquecimento - Prepare your body for the main workout"}
                              {stage.type === "work" &&
                                "Exercícios - Main working phase of the workout"}
                              {stage.type === "cardio" &&
                                "Corrida - Cardiovascular training phase"}
                              {stage.type === "recovery" &&
                                "Recuperação - Active recovery between intense efforts"}
                              {stage.type === "rest" &&
                                "Descanso - Rest or recovery period"}
                              {stage.type === "cooldown" &&
                                "Desaquecimento - Cool down and recovery phase"}
                              {stage.type === "other" &&
                                "Outros - Additional or miscellaneous activities"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Workout Notes */}
            {workout.notes && (
              <div className="bg-muted/20 p-6 rounded-lg border">
                <h3 className="font-semibold text-lg mb-3">Workout Notes</h3>
                <p className="text-sm text-muted-foreground">{workout.notes}</p>
              </div>
            )}
          </CardContent>
        </div>
      </div>
    </div>
  );
};

export default WorkoutDetail;
