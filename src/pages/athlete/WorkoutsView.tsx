import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  Activity,
  Bike,
  ChevronRight,
  Dumbbell,
  Undo2,
  Waves,
} from "lucide-react";
import { useEffect, useState } from "react";

const WorkoutsView = ({ onSelectWorkout }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  // Get user's first name
  const userName = user?.displayName?.split(" ")[0] || "Athlete";

  // Helper function to get workout icon
  const getWorkoutIcon = (workoutType) => {
    switch (workoutType) {
      case "strength":
        return Dumbbell;
      case "swimming":
        return Waves;
      case "cycling":
        return Bike;
      case "running":
        return Activity;
      default:
        return Dumbbell;
    }
  };

  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [swipedCards, setSwipedCards] = useState(new Set()); // Track which cards are swiped

  // Fetch workouts for today
  useEffect(() => {
    const fetchWorkouts = async () => {
      if (!user?.uid) return;

      setLoading(true);
      try {
        // Format today's date to match the date format in Firestore (YYYY-MM-DD)
        const todayStr = new Date().toISOString().split("T")[0];

        // Query workouts for this user and today's date
        const q = query(
          collection(db, "workouts"),
          where("athleteId", "==", user.uid),
          where("date", "==", todayStr)
        );

        const querySnapshot = await getDocs(q);
        const fetchedWorkouts = querySnapshot.docs.map((doc) => {
          const data = doc.data();

          // Get workout name with better fallback logic
          const getWorkoutName = (data) => {
            // Try different name fields that might exist
            if (data.workoutName) return data.workoutName;
            if (data.title) return data.title;
            if (data.name && data.name !== "Workout") return data.name;

            // Fallback to type-based names like in AthleteHome
            if (data.type === "strength") return "Strength Training";
            if (data.type === "swimming") return "Swimming";
            if (data.type === "cycling") return "Cycling";
            if (data.type === "running") return "Running";

            // Last resort
            return `Workout ${doc.id.slice(-4)}`;
          };

          return {
            id: doc.id,
            name: getWorkoutName(data),
            estimatedTime: data.duration || "30 minutes",
            exerciseCount: data.stages?.length || data.exercises?.length || 0,
            imageUrl: "/lovable-uploads/murillo.png",
            workoutData: { id: doc.id, ...data },
            date: data.date,
            completed: data.completed || false,
          };
        });

        setWorkouts(fetchedWorkouts);
      } catch (error) {
        console.error("Error fetching workouts:", error);
        setWorkouts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkouts();
  }, [user?.uid]);

  const handleWorkoutClick = (workout) => {
    // If workout has workoutData (from Firebase), use it directly
    if (workout.workoutData) {
      const workoutData = workout.workoutData;

      // Convert workout stages to exercises format for WorkoutView
      const exercises =
        workoutData.stages?.map((stage) => {
          // Build sets array based on stage type
          let sets = [];

          if (stage.sets && stage.reps) {
            // Strength training with sets and reps
            const numSets = parseInt(stage.sets) || 1;
            for (let i = 0; i < numSets; i++) {
              sets.push({
                reps: parseInt(stage.reps) || 0,
                previous: stage.weight
                  ? `${stage.weight} x ${stage.reps}`
                  : `${stage.reps} x - kg`,
              });
            }
          } else if (stage.duration) {
            // Duration-based exercise
            const repeat = stage.repeat || 1;
            for (let i = 0; i < repeat; i++) {
              sets.push({
                duration: parseInt(stage.duration) || 30,
                type: "duration",
                previous: `${stage.duration}`,
              });
            }
          } else {
            // Default single set
            sets.push({
              reps: parseInt(stage.reps) || 0,
              previous: "-",
            });
          }

          return {
            name: stage.exerciseName || stage.name || "Exercise",
            details: buildExerciseDetails(stage),
            imageUrl: "/lovable-uploads/murillo.png",
            sets: sets,
          };
        }) || [];

      // Collect unique equipment from all stages
      const equipment = [
        ...new Set(workoutData.stages?.flatMap((s) => s.equipment || []) || []),
      ];

      const workoutDetails = {
        id: workoutData.id,
        name: workoutData.name || workout.name,
        type: workoutData.type || "Regular",
        duration: workoutData.duration || workout.estimatedTime,
        equipment: equipment,
        instructions:
          workoutData.notes || "Complete all exercises with proper form",
        exercises: exercises,
        stages: workoutData.stages || [], // Include the original stages data
        completed: workoutData.completed || false,
      };

      onSelectWorkout(workoutDetails);
    } else {
      // Fallback for mock data structure
      const workoutDetails = {
        id: workout.id,
        name: workout.name,
        type: "Regular",
        duration: workout.estimatedTime,
        equipment: ["Body Weight", "Mat"],
        instructions: "Complete all exercises with proper form",
        exercises: [],
      };
      onSelectWorkout(workoutDetails);
    }
  };

  // Helper to build exercise details string
  const buildExerciseDetails = (stage) => {
    const parts = [];

    if (stage.sets && stage.reps) {
      parts.push(`${stage.sets} sets x ${stage.reps} reps`);
    } else if (stage.duration) {
      const repeat = stage.repeat || 1;
      parts.push(`${repeat} sets x ${stage.duration}`);
    } else if (stage.distance) {
      parts.push(`${stage.distance}${stage.distanceUnit || "m"}`);
    }

    if (stage.intensity) {
      parts.push(stage.intensity);
    }

    return parts.join(" · ") || "1 set";
  };

  // Function to mark workout as incomplete
  const handleMarkIncomplete = async (workoutId) => {
    try {
      await updateDoc(doc(db, "workouts", workoutId), {
        completed: false,
      });

      // Update local state
      setWorkouts((prevWorkouts) =>
        prevWorkouts.map((workout) =>
          workout.id === workoutId ? { ...workout, completed: false } : workout
        )
      );

      // Hide the swipe action
      setSwipedCards((prev) => {
        const newSet = new Set(prev);
        newSet.delete(workoutId);
        return newSet;
      });
    } catch (error) {
      console.error("Error marking workout as incomplete:", error);
      alert("Failed to mark workout as incomplete");
    }
  };

  // Swipe handling functions
  const handleTouchStart = (e, workoutId, isCompleted) => {
    if (!isCompleted) return;
    e.stopPropagation();
    const touch = e.touches[0];
    e.currentTarget.dataset.startX = touch.clientX;
    e.currentTarget.dataset.startY = touch.clientY;
  };

  const handleTouchMove = (e, workoutId, isCompleted) => {
    if (!isCompleted) return;
    e.stopPropagation();
    const touch = e.touches[0];
    const startX = parseFloat(e.currentTarget.dataset.startX);
    const startY = parseFloat(e.currentTarget.dataset.startY);
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    // Only allow horizontal swipe if it's more horizontal than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.currentTarget.style.transform = `translateX(${Math.max(
        deltaX,
        -80
      )}px)`;
    }
  };

  const handleTouchEnd = (e, workoutId, isCompleted) => {
    if (!isCompleted) return;
    e.stopPropagation();
    const touch = e.changedTouches[0];
    const startX = parseFloat(e.currentTarget.dataset.startX);
    const deltaX = touch.clientX - startX;

    // Reset transform
    e.currentTarget.style.transform = "";

    // If swiped left enough, show the action
    if (deltaX < -50) {
      setSwipedCards((prev) => new Set([...prev, workoutId]));
    } else {
      setSwipedCards((prev) => {
        const newSet = new Set(prev);
        newSet.delete(workoutId);
        return newSet;
      });
    }
  };

  // Mouse events for desktop
  const handleMouseDown = (e, workoutId, isCompleted) => {
    if (!isCompleted) return;
    e.stopPropagation();
    e.currentTarget.dataset.startX = e.clientX;
    e.currentTarget.dataset.startY = e.clientY;
    e.currentTarget.dataset.isDragging = "true";
  };

  const handleMouseMove = (e, workoutId, isCompleted) => {
    if (!isCompleted) return;
    e.stopPropagation();
    if (e.currentTarget.dataset.isDragging !== "true") return;

    const startX = parseFloat(e.currentTarget.dataset.startX);
    const startY = parseFloat(e.currentTarget.dataset.startY);
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Only allow horizontal swipe if it's more horizontal than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.currentTarget.style.transform = `translateX(${Math.max(
        deltaX,
        -80
      )}px)`;
    }
  };

  const handleMouseUp = (e, workoutId, isCompleted) => {
    if (!isCompleted) return;
    e.stopPropagation();
    e.currentTarget.dataset.isDragging = "false";
    const startX = parseFloat(e.currentTarget.dataset.startX);
    const deltaX = e.clientX - startX;

    // Reset transform
    e.currentTarget.style.transform = "";

    // If swiped left enough, show the action
    if (deltaX < -50) {
      setSwipedCards((prev) => new Set([...prev, workoutId]));
    } else {
      setSwipedCards((prev) => {
        const newSet = new Set(prev);
        newSet.delete(workoutId);
        return newSet;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16 flex flex-col">
      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-center flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">Workouts</h1>
      </header>

      {/* Workouts List */}
      <div className="px-6 py-4 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading workouts...</div>
          </div>
        ) : workouts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <p className="text-gray-500 text-base">No workouts available</p>
            <p className="text-gray-400 text-sm mt-2">
              Check back later for new workouts
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map((workout) => (
              <div key={workout.id} className="relative overflow-hidden">
                {/* Swipe Action (only visible when swiped) */}
                {swipedCards.has(workout.id) && workout.completed && (
                  <div className="absolute right-0 top-0 bottom-0 w-20 bg-yellow-600 rounded-r-2xl flex items-center justify-center z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkIncomplete(workout.id);
                      }}
                      className="flex flex-col items-center gap-1 text-white"
                    >
                      <Undo2 className="w-5 h-5" />
                      <span className="text-xs font-medium">Undo</span>
                    </button>
                  </div>
                )}

                {/* Main Card */}
                <div
                  onClick={() => handleWorkoutClick(workout)}
                  onTouchStart={(e) =>
                    handleTouchStart(e, workout.id, workout.completed)
                  }
                  onTouchMove={(e) =>
                    handleTouchMove(e, workout.id, workout.completed)
                  }
                  onTouchEnd={(e) =>
                    handleTouchEnd(e, workout.id, workout.completed)
                  }
                  onMouseDown={(e) =>
                    handleMouseDown(e, workout.id, workout.completed)
                  }
                  onMouseMove={(e) =>
                    handleMouseMove(e, workout.id, workout.completed)
                  }
                  onMouseUp={(e) =>
                    handleMouseUp(e, workout.id, workout.completed)
                  }
                  onMouseLeave={(e) => {
                    e.currentTarget.dataset.isDragging = "false";
                    e.currentTarget.style.transform = "";
                  }}
                  className={`bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative ${
                    swipedCards.has(workout.id)
                      ? "transform translate-x-[-80px] scale-105"
                      : ""
                  }`}
                  style={{
                    transition: swipedCards.has(workout.id)
                      ? "transform 0.3s ease-out"
                      : "all 0.2s ease",
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        workout.completed
                          ? "bg-yellow-500 text-white"
                          : "border-2 border-yellow-400 text-yellow-400"
                      }`}
                    >
                      {(() => {
                        const IconComponent = getWorkoutIcon(
                          workout.workoutData?.type || "strength"
                        );
                        return <IconComponent className="w-5 h-5" />;
                      })()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-gray-900 font-semibold text-base">
                        {workout.name}
                      </h4>
                      <p className="text-gray-500 text-sm mt-0.5">
                        est. {workout.estimatedTime} · {workout.exerciseCount}{" "}
                        exercises
                        {workout.date &&
                          ` · ${new Date(workout.date).toLocaleDateString(
                            "pt-BR"
                          )}`}
                      </p>
                      <span
                        className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                          workout.completed
                            ? "bg-green-100 text-green-600"
                            : "bg-blue-100 text-blue-600"
                        }`}
                      >
                        {workout.completed ? "Completed" : "Available"}
                      </span>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutsView;
