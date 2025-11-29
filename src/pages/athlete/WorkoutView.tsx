import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Clock,
  Info,
  MoreVertical,
  Pause,
  Play,
  PlusCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";

const HandIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18.7 15.3a2.4 2.4 0 0 0 .7-1.7V7.8a2.4 2.4 0 0 0-1.2-2.1 2.4 2.4 0 0 0-2.6.3l-2 2.3-2-2.3a2.4 2.4 0 0 0-2.6-.3 2.4 2.4 0 0 0-1.2 2.1v5.8a2.4 2.4 0 0 0 .7 1.7l5.3 5.3a1 1 0 0 0 1.4 0l5.3-5.3z" />
  </svg>
);

const WorkoutView: React.FC<{ workout: any; onBack: () => void }> = ({
  workout,
  onBack,
}) => {
  const { t } = useLanguage();
  const [exerciseTimers, setExerciseTimers] = useState<{
    [key: number]: number;
  }>({});
  const [runningExercises, setRunningExercises] = useState<Set<number>>(
    new Set()
  );
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Default countdown duration in seconds (60 minutes = 3600 seconds)
  const DEFAULT_COUNTDOWN_DURATION = 3600;

  // Exercise timers effect - countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setExerciseTimers((prev) => {
        const updated = { ...prev };
        runningExercises.forEach((exIndex) => {
          const currentTime = updated[exIndex] || 0;
          if (currentTime > 0) {
            updated[exIndex] = currentTime - 1;
          } else {
            // Timer reached zero, stop this exercise
            setRunningExercises((prevRunning) => {
              const newRunning = new Set(prevRunning);
              newRunning.delete(exIndex);
              return newRunning;
            });
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [runningExercises]);

  // Individual set timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (isTimerRunning && timerSeconds === 0) {
      setIsTimerRunning(false);
      setActiveTimerId(null);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  const handleExerciseTimerToggle = (exIndex: number) => {
    setRunningExercises((prev) => {
      const updated = new Set(prev);
      if (updated.has(exIndex)) {
        // Pause the timer
        updated.delete(exIndex);
      } else {
        // Start the timer - initialize with default duration if not set
        updated.add(exIndex);
        setExerciseTimers((prevTimers) => ({
          ...prevTimers,
          [exIndex]: prevTimers[exIndex] || DEFAULT_COUNTDOWN_DURATION,
        }));
      }
      return updated;
    });
  };

  const handleTimerToggle = (timerId: string, duration: number) => {
    if (activeTimerId === timerId) {
      setIsTimerRunning(false);
      setActiveTimerId(null);
      setTimerSeconds(0);
    } else {
      setTimerSeconds(duration || 30);
      setActiveTimerId(timerId);
      setIsTimerRunning(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const currentWorkout = workout || {
    name: "Workout",
    instructions: "",
    exercises: [],
  };

  const renderTimerButton = (
    timerId: string,
    duration: number,
    label?: string
  ) => {
    const isActive = activeTimerId === timerId;
    return (
      <button
        onClick={() => handleTimerToggle(timerId, duration)}
        className={`flex items-center justify-center gap-1.5 px-3 h-9 rounded-full text-sm font-medium transition-all min-w-[80px]
                ${
                  isActive
                    ? "bg-yellow-500 text-white shadow-sm"
                    : "bg-white border border-gray-200 text-yellow-500 hover:border-yellow-300"
                }`}
      >
        {isActive ? (
          <>
            <Clock className="w-4 h-4" />
            <span>{formatTime(timerSeconds)}</span>
          </>
        ) : (
          <>
            <Clock className="w-4 h-4" />
            <span>{label || `${duration}s`}</span>
          </>
        )}
      </button>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Main Header */}
      <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <button
          onClick={onBack}
          className="text-base font-normal text-gray-900"
        >
          Cancel
        </button>
        <button className="text-base font-semibold text-gray-900">Save</button>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Workout Info */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {currentWorkout.name}
          </h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            {currentWorkout.instructions || "No instructions provided."}
          </p>
        </div>

        {/* Auto Fill Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-normal text-gray-900">
              Auto fill stats
            </span>
            <Info className="w-4 h-4 text-blue-500" />
          </div>
          <Switch />
        </div>

        {/* Exercises List */}
        <div className="space-y-6">
          {currentWorkout.exercises?.map((exercise: any, exIndex: number) => {
            // Check if any set has a duration property or is of type duration
            const hasDurationSets = exercise.sets?.some(
              (s: any) => s.duration || s.type === "duration"
            );
            const isExerciseRunning = runningExercises.has(exIndex);
            const exerciseTime = exerciseTimers[exIndex] || 0;

            // Grid with timer column between Previous and Reps
            const gridCols = hasDurationSets
              ? "grid-cols-[32px_1fr_85px_80px_80px]"
              : "grid-cols-[32px_1fr_80px_80px]";

            return (
              <div key={exIndex} className="space-y-4">
                {/* Exercise Header with Timer */}
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 flex-1">
                    <img
                      src={
                        exercise.imageUrl ||
                        "/public/lovable-uploads/murillo.png"
                      }
                      alt={exercise.name}
                      className="w-20 h-20 rounded-lg object-cover bg-gray-200"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-base text-gray-900">
                        {exercise.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {exercise.details || `${exercise.sets?.length} sets`}
                      </p>

                      {/* Timer Display */}
                      {isExerciseRunning && (
                        <div className="mt-2 inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-full">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-mono font-medium">
                            {formatTime(exerciseTime)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Play/Pause Button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExerciseTimerToggle(exIndex)}
                      className={`p-1.5 rounded-full transition-all ${
                        isExerciseRunning
                          ? "bg-primary text-primary-foreground shadow-md hover:opacity-90"
                          : "bg-white border border-gray-300 text-gray-700 hover:border-primary hover:text-primary"
                      }`}
                    >
                      {isExerciseRunning ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                    <button className="p-1">
                      <MoreVertical className="w-5 h-5 text-yellow-500" />
                    </button>
                  </div>
                </div>

                {/* Rest Row */}
                {hasDurationSets && (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 text-blue-500">
                      <HandIcon className="w-5 h-5" />
                      <span className="text-sm font-normal">
                        Rest between each set
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-medium text-blue-500">
                        30s
                      </span>
                    </div>
                  </div>
                )}

                {/* Sets Table */}
                <div className="w-full">
                  <div className={`grid ${gridCols} gap-2 mb-3 items-center`}>
                    <div className="text-xs font-semibold text-gray-900">
                      Set
                    </div>
                    <div className="text-xs font-semibold text-gray-900">
                      Previous
                    </div>
                    {hasDurationSets && (
                      <div className="text-xs font-semibold text-gray-900 text-center">
                        Time
                      </div>
                    )}
                    <div className="text-xs font-semibold text-gray-900 text-center">
                      Reps
                    </div>
                    <div className="text-xs font-semibold text-gray-900 text-center">
                      Kg
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {exercise.sets && exercise.sets.length > 0 ? (
                      exercise.sets.map((set: any, setIndex: number) => {
                        if (set.type === "rest") return null;

                        const timerId = `${exIndex}-${setIndex}`;
                        const hasTimer =
                          set.duration || set.type === "duration";

                        return (
                          <div
                            key={setIndex}
                            className={`grid ${gridCols} gap-2 items-center`}
                          >
                            <div className="font-medium text-gray-900">
                              {setIndex + 1}
                            </div>
                            <div className="text-sm text-gray-600 truncate">
                              {set.previous || `${set.reps || 0} x - kg`}
                            </div>

                            {/* Timer button in its own column between Previous and Reps */}
                            {hasDurationSets && (
                              <div className="flex justify-center">
                                {hasTimer ? (
                                  renderTimerButton(timerId, set.duration || 30)
                                ) : (
                                  <div className="w-[85px]"></div>
                                )}
                              </div>
                            )}

                            <input
                              type="text"
                              className="w-full h-12 border border-gray-200 rounded-xl text-center bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all text-gray-900 text-base"
                              placeholder=""
                            />
                            <input
                              type="text"
                              className="w-full h-12 border border-gray-200 rounded-xl text-center bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all text-gray-900 text-base"
                              placeholder=""
                            />
                          </div>
                        );
                      })
                    ) : (
                      // Fallback: Show at least one row if no sets defined
                      <div className={`grid ${gridCols} gap-2 items-center`}>
                        <div className="font-medium text-gray-900">1</div>
                        <div className="text-sm text-gray-600 truncate">-</div>

                        {hasDurationSets && <div className="w-[85px]"></div>}

                        <input
                          type="text"
                          className="w-full h-12 border border-gray-200 rounded-xl text-center bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all text-gray-900 text-base"
                          placeholder=""
                        />
                        <input
                          type="text"
                          className="w-full h-12 border border-gray-200 rounded-xl text-center bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all text-gray-900 text-base"
                          placeholder=""
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Add Set Button */}
                <button className="flex items-center gap-2 text-blue-500 font-normal text-base mt-3">
                  <PlusCircle className="w-5 h-5" />
                  Add new set
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default WorkoutView;
