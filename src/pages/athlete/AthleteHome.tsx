import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  Activity,
  Bike,
  Calendar as CalendarIcon,
  ChevronRight,
  Dumbbell,
  Waves,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const AthleteHome = ({ onSelectWorkout }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState({ start: -30, end: 30 }); // Days relative to today
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  // Get user's first name
  const userName = user?.displayName?.split(" ")[0] || "Athlete";

  // Generate dates based on range
  const getDates = () => {
    const dates = [];
    for (let i = dateRange.start; i <= dateRange.end; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = getDates();

  const formatDate = (date: Date) => {
    return date.getDate();
  };

  const formatDay = (date: Date) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[date.getDay()];
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  // Handle scroll to load more dates
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;

    // Load more dates when scrolling near the edges
    if (scrollLeft < 200) {
      // Scrolling left - load earlier dates
      setDateRange((prev) => ({ start: prev.start - 30, end: prev.end }));
    } else if (scrollLeft + clientWidth > scrollWidth - 200) {
      // Scrolling right - load later dates
      setDateRange((prev) => ({ start: prev.start, end: prev.end + 30 }));
    }
  };

  // Scroll to today on mount
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Find today's index and scroll to it
    const todayIndex = dates.findIndex((date) => isToday(date));
    if (todayIndex !== -1) {
      const buttonWidth = 64; // w-14 = 56px + gap
      const scrollPosition =
        todayIndex * buttonWidth - container.clientWidth / 2 + buttonWidth / 2;
      container.scrollLeft = scrollPosition;
    }
  }, []);

  const scrollToToday = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const todayIndex = dates.findIndex((date) => isToday(date));
    if (todayIndex !== -1) {
      const buttonWidth = 64;
      const scrollPosition =
        todayIndex * buttonWidth - container.clientWidth / 2 + buttonWidth / 2;
      container.scrollTo({ left: scrollPosition, behavior: "smooth" });
    }
    setSelectedDate(today);
  };

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch workouts for the selected date
  useEffect(() => {
    const fetchWorkouts = async () => {
      if (!user?.uid) return;

      setLoading(true);
      try {
        // Format the selected date to match the date format in Firestore (YYYY-MM-DD)
        const dateStr = selectedDate.toISOString().split("T")[0];

        // Query workouts for this user and date
        const q = query(
          collection(db, "workouts"),
          where("athleteId", "==", user.uid),
          where("date", "==", dateStr)
        );

        const querySnapshot = await getDocs(q);
        const fetchedWorkouts = querySnapshot.docs.map((doc) => {
          const data = doc.data();

          // Convert workout to activity format
          return {
            id: doc.id,
            title: getWorkoutTitle(data),
            subtitle: getWorkoutSubtitle(data),
            category: "Workout",
            categoryColor: "bg-blue-100 text-blue-600",
            completed: data.completed || false,
            icon: "✓",
            workoutType: data.type || "strength",
            workoutData: { id: doc.id, ...data },
          };
        });

        setActivities(fetchedWorkouts);
      } catch (error) {
        console.error("Error fetching workouts:", error);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkouts();
  }, [selectedDate, user?.uid]);

  // Helper function to get workout title
  const getWorkoutTitle = (workout) => {
    if (workout.type === "strength") return "Strength Training";
    if (workout.type === "swimming") return "Swimming";
    if (workout.type === "cycling") return "Cycling";
    if (workout.type === "running") return "Running";
    return "Workout";
  };

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

  // Helper function to get workout subtitle
  const getWorkoutSubtitle = (workout) => {
    const parts = [];

    if (workout.completed) {
      parts.push("Completed");
    } else {
      parts.push("Scheduled");
    }

    // Add stage/exercise count
    if (workout.stages && workout.stages.length > 0) {
      parts.push(`📋 ${workout.stages.length}`);
    } else if (workout.exercises && workout.exercises.length > 0) {
      parts.push(`📋 ${workout.exercises.length}`);
    }

    // Add duration if available
    if (workout.duration) {
      parts.push(`⏱ ${workout.duration}`);
    }

    return parts.join(". ");
  };

  const handleActivityClick = (activity) => {
    if (activity.category === "Workout" && activity.workoutData) {
      const workout = activity.workoutData;

      // Convert workout stages to exercises format for WorkoutView
      const exercises =
        workout.stages?.map((stage) => {
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
        ...new Set(workout.stages?.flatMap((s) => s.equipment || []) || []),
      ];

      const workoutDetails = {
        id: workout.id,
        name: activity.title,
        type: workout.type || "Regular",
        duration: workout.duration || "",
        equipment: equipment,
        instructions:
          workout.notes || "Complete all exercises with proper form",
        exercises: exercises,
        stages: workout.stages || [], // Include the original stages data
        completed: workout.completed || false,
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-center">
        <h1 className="text-xl font-semibold text-gray-900">Home</h1>
      </header>

      {/* Greeting */}
      <div className="px-6 py-6 bg-white">
        <p className="text-gray-600 text-base">Let's Go,</p>
        <h2 className="text-4xl font-bold text-gray-900 mt-1">{userName}</h2>
      </div>

      {/* Date Selector */}
      <div className="bg-white px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 font-semibold">
            {selectedDate.toLocaleDateString("pt-BR", {
              month: "long",
              day: "numeric",
            })}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={scrollToToday}
              className="text-primary font-semibold text-sm hover:underline"
            >
              Today
            </button>
            <button className="p-1 hover:bg-gray-100 rounded transition-colors">
              <CalendarIcon className="w-5 h-5 text-yellow-500" />
            </button>
          </div>
        </div>

        {/* Infinite Scroll Calendar */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide"
        >
          {dates.map((date, index) => (
            <button
              key={`${date.getTime()}-${index}`}
              onClick={() => setSelectedDate(date)}
              className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-xl transition-all ${
                isSelected(date)
                  ? "bg-gray-900 text-white shadow-lg scale-105"
                  : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="text-xl font-semibold">{formatDate(date)}</span>
              <span className="text-xs mt-0.5 opacity-70">
                {formatDay(date)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Activities List */}
      <div className="px-6 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading workouts...</div>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <p className="text-gray-500 text-base">
              No workouts scheduled for this date
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Select a different date or check back later
            </p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              onClick={() => handleActivityClick(activity)}
              className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative"
            >
              <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activity.completed
                      ? "bg-yellow-500 text-white"
                      : "border-2 border-yellow-400 text-yellow-400"
                  }`}
                >
                  {(() => {
                    const IconComponent = getWorkoutIcon(activity.workoutType);
                    return (
                      <IconComponent
                        className={`w-5 h-5 ${
                          activity.completed ? "text-white" : "text-yellow-500"
                        }`}
                      />
                    );
                  })()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-gray-900 font-semibold text-base">
                    {activity.title}
                  </h4>
                  <p className="text-gray-500 text-sm mt-0.5">
                    {activity.subtitle}
                  </p>
                  <span
                    className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${activity.categoryColor}`}
                  >
                    {activity.category}
                  </span>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />

                {/* Profile Image for Activity */}
                {activity.hasImage && (
                  <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 overflow-hidden border-2 border-white">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                        {userName.charAt(0)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AthleteHome;
