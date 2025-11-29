import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Activity, Bike, Calendar, Clock, Dumbbell, Waves, X } from "lucide-react";
import React, { useState } from "react";
import ExerciseDetail from "./ExerciseDetail";

// Custom Icon for Mat
const MatIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <title>Mat</title>
    <path d="M4 6h16v12H4z" />
    <path d="M4 11h16" />
  </svg>
);

// Custom Icon for Body Weight
const BodyWeightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="3" />
    <path d="M12 11v5" />
    <path d="M9 14l-2 2" />
    <path d="M15 14l2 2" />
  </svg>
);

// Custom Icon for List/Regular
const ListIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const WorkoutDetail: React.FC<{
  workout: any;
  onStart: () => void;
  onBack: () => void;
}> = ({ workout, onStart, onBack }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [selectedExercise, setSelectedExercise] = useState<any>(null);

  if (!workout) {
    return null;
  }

  // If an exercise is selected, show ExerciseDetail
  if (selectedExercise) {
    return (
      <ExerciseDetail
        exercise={selectedExercise}
        onBack={() => setSelectedExercise(null)}
      />
    );
  }

  const userName = user?.displayName?.split(" ")[0] || "Athlete";

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

  const getEquipmentIcon = (name: string) => {
    const lowerCaseName = name.toLowerCase();
    if (lowerCaseName.includes("body")) {
      return <BodyWeightIcon className="w-10 h-10 text-yellow-500" />;
    }
    if (lowerCaseName.includes("mat")) {
      return <MatIcon className="w-10 h-10 text-yellow-500" />;
    }
    return <Dumbbell className="w-10 h-10 text-yellow-500" />;
  };

  return (
    <div className="bg-white text-gray-900 flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-yellow-500" />
        </button>
        <button className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors">
          <Calendar className="w-6 h-6 text-yellow-500" />
        </button>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto pb-32 px-6">
        {/* Workout Title */}
        <div className="flex items-center gap-4 pt-6 mb-6">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-yellow-500 text-white">
            {(() => {
              const IconComponent = getWorkoutIcon(workout.type);
              return <IconComponent className="w-5 h-5" />;
            })()}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{workout.name}</h1>
        </div>

        {/* Meta Info */}
        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 text-gray-700">
            <ListIcon className="w-5 h-5 text-yellow-500" />
            <span className="text-base">{workout.type || "Regular"}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <Clock className="w-5 h-5 text-yellow-500" />
            <span className="text-base">est. {workout.duration}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <Dumbbell className="w-5 h-5 text-yellow-500" />
            <span className="text-base">
              {workout.exercises?.length || 0} Exercises
            </span>
          </div>
        </div>

        {/* Equipment */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 text-gray-900">Equipment:</h2>
          <div className="flex gap-4">
            {workout.equipment?.map((item, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-2 bg-gray-100 rounded-2xl p-4 min-w-[80px]"
              >
                {getEquipmentIcon(item)}
                <span className="text-sm text-gray-700 text-center font-medium">
                  {item}
                </span>
              </div>
            )) || <p className="text-gray-500">None</p>}
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-3 text-gray-900">Instructions</h2>
          <p className="text-gray-700 leading-relaxed">
            {workout.instructions}
          </p>
        </div>

        {/* Exercises List */}
        <div className="space-y-4">
          {workout.exercises?.map((exercise, index) => (
            <div
              key={index}
              className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
              onClick={() => setSelectedExercise(exercise)}
            >
              {/* Blue indicator line */}
              <div className="w-1 bg-blue-400 rounded-full flex-shrink-0 self-stretch" />

              {/* Exercise Image */}
              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-200">
                <img
                  src={exercise.imageUrl || "/lovable-uploads/murillo.png"}
                  alt={exercise.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23e5e7eb' width='100' height='100'/%3E%3C/svg%3E";
                  }}
                />
              </div>

              {/* Exercise Info */}
              <div className="flex-1 min-w-0 py-1">
                <h3 className="font-bold text-base text-gray-900 mb-1 leading-tight">
                  {exercise.name}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {exercise.details}
                  {exercise.rest && `, ${exercise.rest}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Fixed Bottom Section */}
      <div className="fixed bottom-0 left-0 right-0 px-6 py-4 flex items-center justify-center pointer-events-none">
        {/* Start Workout Button */}
        <button
          onClick={onStart}
          className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold text-lg py-4 px-12 rounded-full shadow-lg transition-all pointer-events-auto"
        >
          Start Workout
        </button>
      </div>
    </div>
  );
};

export default WorkoutDetail;
