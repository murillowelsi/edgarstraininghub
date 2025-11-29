import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Activity, ChevronRight, Dumbbell, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";

interface WorkoutStage {
  name: string;
  type: string;
  duration?: string;
  distance?: string;
  distanceUnit?: string;
  intensity?: string;
  notes?: string;
  exerciseName?: string;
  sets?: string;
  reps?: string;
  weight?: string;
  repeat?: number;
  equipment?: string[];
  libraryExerciseId?: string;
  youtubeUrl?: string;
  childStages?: WorkoutStage[];
}

interface Workout {
  id: string;
  date: string;
  type: "strength" | "swimming" | "cycling" | "running";
  exercises?: any[];
  stages?: WorkoutStage[];
  distance?: string;
  duration?: string;
  stroke?: string;
  route?: string;
  elevation?: string;
  avgSpeed?: string;
  pace?: string;
  terrain?: string;
  notes?: string;
  swimmingType?: string;
  cyclingType?: string;
  runningType?: string;
}

const AthleteCalendar = ({ onSelectWorkout }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [workouts, setWorkouts] = useState({});
  const [loading, setLoading] = useState(true);
  const [numberOfDays, setNumberOfDays] = useState(14);

  useEffect(() => {
    const fetchWorkouts = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, "workouts"),
          where("athleteId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        const fetchedWorkouts = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Workout[];

        // Group workouts by date
        const grouped = {};
        fetchedWorkouts.forEach((workout) => {
          const date = new Date(workout.date);
          const dayKey = date.toISOString().split("T")[0];
          if (!grouped[dayKey]) {
            grouped[dayKey] = [];
          }
          // Map to the format expected by the component
          const mappedWorkout = {
            id: workout.id,
            type: workout.type,
            completed: false, // Assume not completed for now
            distance: null,
            time: null,
          };

          // Extract distance and time from stages if available
          if (workout.stages && workout.stages.length > 0) {
            const mainStage =
              workout.stages.find((s) => s.type === "main") ||
              workout.stages[0];
            if (mainStage.distance) {
              mappedWorkout.distance = `${mainStage.distance} ${
                mainStage.distanceUnit || "km"
              }`;
            }
            if (mainStage.duration) {
              mappedWorkout.time = mainStage.duration;
            }
          } else if (workout.duration) {
            mappedWorkout.time = workout.duration;
          }

          grouped[dayKey].push(mappedWorkout);
        });

        setWorkouts(grouped);
      } catch (error) {
        console.error("Error fetching workouts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkouts();
  }, [user]);

  useEffect(() => {
    const scrollContainer = document.querySelector('main');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        setNumberOfDays((prev) => prev + 7);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const renderWorkoutIcon = (type) => {
    switch (type.toLowerCase()) {
      case "running":
        return <Activity className="w-6 h-6 text-yellow-500" />;
      case "swimming":
        return <Waves className="w-6 h-6 text-yellow-500" />;
      case "cycling":
        return <Activity className="w-6 h-6 text-yellow-500" />; // Or use a bike icon if available
      case "strength":
        return <Dumbbell className="w-6 h-6 text-yellow-500" />;
      default:
        return <Dumbbell className="w-6 h-6 text-yellow-500" />;
    }
  };

  const handleWorkoutClick = (workout, date) => {
    // Convert mock workout data to the format expected by WorkoutFlow
    const workoutDetails = {
      id: workout.id,
      name: workout.type,
      type: workout.type.toLowerCase(),
      duration: workout.time || "30 minutes",
      equipment:
        workout.type.toLowerCase() === "swimming" ? ["Pool"] : ["Body Weight"],
      instructions: `Complete your ${workout.type.toLowerCase()} workout`,
      exercises: [
        {
          name: workout.type,
          details: workout.distance
            ? `${workout.distance} in ${workout.time}`
            : workout.time,
          imageUrl: "/lovable-uploads/murillo.png",
          sets: [
            {
              reps: 1,
              previous: workout.distance || workout.time,
            },
          ],
        },
      ],
    };

    onSelectWorkout(workoutDetails);
  };

  const renderDay = (date) => {
    const dayKey = date.toISOString().split("T")[0];
    const dayWorkouts = workouts[dayKey] || [];
    const dayName = t.athlete.calendar.weekdays[date.getDay()];
    const dateString = date.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "short",
    });

    const isToday = new Date().toISOString().split("T")[0] === dayKey;
    const isYesterday =
      new Date(Date.now() - 86400000).toISOString().split("T")[0] === dayKey;

    let displayDate = dateString;
    if (isToday) displayDate = t.athlete.calendar.today;
    if (isYesterday) displayDate = t.athlete.calendar.yesterday;

  return (
    <div key={dayKey} className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-gray-900">{dayName}</h3>
          <span className="text-sm text-gray-500">{displayDate}</span>
        </div>
        {dayWorkouts.length > 0 ? (
          dayWorkouts.map((workout) => {
            const details = [workout.distance, workout.time]
              .filter(Boolean)
              .join(" . ");
            return (
              <div
                key={workout.id}
                onClick={() => handleWorkoutClick(workout, dayKey)}
                className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative mb-3"
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
                    {workout.completed ? (
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-current" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-gray-900 font-semibold text-base">
                      {workout.type}
                    </h4>
                    <p className="text-gray-500 text-sm mt-0.5">{details}</p>
                  </div>

                  {/* Workout Icon */}
                  <div className="flex-shrink-0">
                    {renderWorkoutIcon(workout.type)}
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-gray-500 text-sm">
              {t.athlete.calendar.noWorkouts}
            </p>
          </div>
        )}
      </div>
    );
  };

  const days = Array.from({ length: numberOfDays }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  return (
    <div className="bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-center">
        <h1 className="text-xl font-semibold text-gray-900">
          {t.athlete.calendar.title}
        </h1>
      </header>

      <div className="px-6 py-4 max-w-md mx-auto">
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            {t.athlete.loadingProgram}
          </div>
        ) : (
          days.map((day) => renderDay(day))
        )}
      </div>
    </div>
  );
};

export default AthleteCalendar;
