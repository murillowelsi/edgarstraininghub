import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { ArrowLeft, Pencil, Plus, Trash2, Youtube } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { db } from "../../lib/firebase";

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
  youtubeUrl?: string;
}

interface WorkoutStage {
  name: string;
  type: string;
  duration?: string;
  distance?: string;
  distanceUnit?: string;
  intensity?: string;
  notes?: string;
  // For strength training
  exerciseName?: string;
  sets?: string;
  reps?: string;
  weight?: string;
  // Repeat functionality
  repeat?: number;
  // Swimming specific
  stroke?: string;
  // Equipment type - now array for multiple selections
  equipment?: string[];
  // Library exercise ID for tracking selected exercises
  libraryExerciseId?: string;
  youtubeUrl?: string;
  childStages?: WorkoutStage[];
}

interface Workout {
  id: string;
  date: string;
  type: "strength" | "swimming" | "cycling" | "running";
  exercises?: Exercise[];
  stages?: WorkoutStage[];
  // Legacy fields (kept for backwards compatibility)
  distance?: string;
  duration?: string;
  stroke?: string;
  route?: string;
  elevation?: string;
  avgSpeed?: string;
  pace?: string;
  terrain?: string;
  notes?: string;
  // Swimming type for the entire workout
  swimmingType?: string;
  // Cycling type for the entire workout
  cyclingType?: string;
  // Running type for the entire workout
  runningType?: string;
}

const UserWorkouts = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [athleteName, setAthleteName] = useState("");
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [libraryExercises, setLibraryExercises] = useState<LibraryExercise[]>(
    []
  );

  const getStageTypeColor = (type: string) => {
    switch (type) {
      case "warmup":
        return "bg-yellow-50 border-l-4 border-yellow-400";
      case "main":
        return "bg-blue-50 border-l-4 border-blue-400";
      case "cooldown":
        return "bg-green-50 border-l-4 border-green-400";
      case "recovery":
        return "bg-purple-50 border-l-4 border-purple-400";
      default:
        return "bg-gray-50 border-l-4 border-gray-400";
    }
  };

  const getYouTubeVideoId = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      try {
        // Fetch user details
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          setAthleteName(userDoc.data().name);
        }

        // Fetch library exercises
        const exercisesSnapshot = await getDocs(collection(db, "exercises"));
        const fetchedLibraryExercises = exercisesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LibraryExercise[];
        setLibraryExercises(fetchedLibraryExercises);

        // Fetch workouts
        const q = query(
          collection(db, "workouts"),
          where("athleteId", "==", userId)
        );
        const querySnapshot = await getDocs(q);
        const fetchedWorkouts = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Workout[];

        // Sort by date desc
        fetchedWorkouts.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setWorkouts(fetchedWorkouts);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handleDeleteWorkout = async (workoutId: string) => {
    const result = await Swal.fire({
      title: "Tem certeza?",
      text: "Esta ação não pode ser desfeita. O treino será excluído permanentemente.",
      icon: "warning",
      iconColor: "hsl(48 96% 45%)",
      showCancelButton: true,
      confirmButtonColor: "hsl(0 84% 60%)",
      cancelButtonColor: "hsl(210 40% 96%)",
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar",
      background: "hsl(var(--card))",
      color: "hsl(var(--card-foreground))",
      customClass: {
        popup: "rounded-xl shadow-xl border border-border/50",
        title: "font-display font-bold text-lg",
        htmlContainer: "text-sm text-muted-foreground",
        confirmButton:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 px-6 py-3 rounded-lg font-semibold transition-all duration-300",
        cancelButton:
          "bg-muted text-muted-foreground hover:bg-muted/80 px-6 py-3 rounded-lg font-semibold transition-all duration-300 border border-border",
        actions: "gap-3",
      },
      showClass: {
        popup: "animate-scale-in",
      },
      hideClass: {
        popup: "animate-fade-out",
      },
    });

    if (!result.isConfirmed) return;

    try {
      await deleteDoc(doc(db, "workouts", workoutId));
      toast.success("Treino excluído com sucesso");

      // Refresh workouts after deletion
      const q = query(
        collection(db, "workouts"),
        where("athleteId", "==", userId)
      );
      const querySnapshot = await getDocs(q);
      const fetchedWorkouts = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Workout[];

      // Sort by date desc
      fetchedWorkouts.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setWorkouts(fetchedWorkouts);
    } catch (error) {
      console.error("Error deleting workout:", error);
      toast.error("Falha ao excluir treino");
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/users")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">Manage Workouts</h1>
              {!loading && athleteName && (
                <p className="text-sm text-muted-foreground mt-1">
                  {athleteName}
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={() => {
              navigate(`/admin/users/${userId}/workouts/new`);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New Workout
          </Button>
        </div>

        <div className="bg-card rounded-lg border shadow-sm">
          <CardHeader>
            <CardTitle>Workout History</CardTitle>
          </CardHeader>
          <CardContent>
            {workouts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No workouts found.
              </p>
            ) : (
              <div className="space-y-4">
                {workouts.map((workout) => (
                  <div
                    key={workout.id}
                    className="border rounded-lg p-4 relative"
                  >
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          navigate(
                            `/admin/users/${userId}/workouts/edit/${workout.id}`
                          )
                        }
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
                    <div className="flex items-center gap-2 mb-6">
                      <div className="font-semibold text-lg">
                        {new Date(workout.date).toLocaleDateString(undefined, {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary capitalize">
                        {workout.type === "strength"
                          ? "Strength Training"
                          : workout.type}
                      </span>
                    </div>

                    {workout.stages && workout.stages.length > 0 ? (
                      <div className="text-sm space-y-2 mt-2">
                        {workout.stages.map((stage, idx) => {
                          if (stage.type === "repetition") {
                            return (
                              <div
                                key={idx}
                                className="rounded-md border p-3 bg-muted/20 my-2"
                              >
                                <div className="font-semibold text-sm mb-2">
                                  Repetir {stage.repeat}x
                                </div>
                                <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                                  {stage.childStages?.map((child, cIdx) => (
                                    <div
                                      key={cIdx}
                                      className={`rounded-md pl-2 py-1 ${getStageTypeColor(
                                        child.type
                                      )}`}
                                    >
                                      <span className="font-medium text-sm">
                                        {child.name ||
                                          child.exerciseName ||
                                          `Stage ${cIdx + 1}`}
                                      </span>
                                      <span className="text-xs text-muted-foreground ml-2">
                                        {child.distance
                                          ? `${child.distance}${child.distanceUnit}`
                                          : ""}
                                        {child.duration
                                          ? `${child.duration}`
                                          : ""}
                                        {child.sets
                                          ? `${child.sets}x${child.reps}`
                                          : ""}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div
                              key={idx}
                              className={`rounded-md pl-3 pr-2 py-2 ${getStageTypeColor(
                                stage.type
                              )}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">
                                    {stage.exerciseName ||
                                      stage.name ||
                                      `Stage ${idx + 1}`}
                                    {stage.repeat && stage.repeat > 1 && (
                                      <span className="ml-2 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                                        {stage.repeat}x
                                      </span>
                                    )}
                                  </p>
                                  <div className="text-xs text-muted-foreground mt-1 space-x-3">
                                    <span className="capitalize">
                                      {stage.type}
                                    </span>
                                    {workout.type === "strength" ? (
                                      <>
                                        {stage.sets && (
                                          <span>{stage.sets} sets</span>
                                        )}
                                        {stage.reps && (
                                          <span>{stage.reps} reps</span>
                                        )}
                                        {stage.weight && (
                                          <span>{stage.weight}</span>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        {stage.distance && (
                                          <span>
                                            {stage.distance}{" "}
                                            {stage.distanceUnit}
                                          </span>
                                        )}
                                        {stage.duration && (
                                          <span>{stage.duration}</span>
                                        )}
                                        {stage.intensity && (
                                          <span>{stage.intensity}</span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  {/* YouTube Video */}
                                  {stage.libraryExerciseId &&
                                    (() => {
                                      const exercise = libraryExercises.find(
                                        (ex) =>
                                          ex.id === stage.libraryExerciseId
                                      );
                                      const videoId = exercise?.youtubeUrl
                                        ? getYouTubeVideoId(exercise.youtubeUrl)
                                        : null;
                                      return videoId ? (
                                        <div className="mt-3">
                                          <div className="aspect-video w-full max-w-sm mx-auto rounded-lg overflow-hidden border">
                                            <iframe
                                              src={`https://www.youtube.com/embed/${videoId}`}
                                              title={`${exercise?.name} tutorial`}
                                              className="w-full h-full"
                                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                              allowFullScreen
                                            />
                                          </div>
                                          <div className="mt-1 text-center">
                                            <a
                                              href={exercise.youtubeUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:underline"
                                            >
                                              <Youtube className="h-3 w-3" />
                                              Open on YouTube
                                            </a>
                                          </div>
                                        </div>
                                      ) : null;
                                    })()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {workout.notes && (
                          <p className="text-muted-foreground mt-2 italic text-xs">
                            {workout.notes}
                          </p>
                        )}
                      </div>
                    ) : workout.exercises && workout.exercises.length > 0 ? (
                      // Legacy format support
                      <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                        {workout.exercises.map((ex, i) => (
                          <li key={i} className="text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {ex.name}
                            </span>
                            {ex.reps && ` - ${ex.reps}`}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </div>
      </div>
    </div>
  );
};

export default UserWorkouts;
