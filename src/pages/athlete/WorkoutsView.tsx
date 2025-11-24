import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const WorkoutsView = ({ onSelectWorkout }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  // Get user's first name
  const userName = user?.displayName?.split(" ")[0] || "Athlete";

  // Mock program data
  const program = {
    name: `${userName}'s program`,
    isMain: true,
    phase: {
      name: "Treino Fortalecimento",
      duration: "4 week 10 Nov 2025 - 7 Dec 2025",
    },
    workouts: [
      {
        id: "workout-1",
        name: "Treino A",
        estimatedTime: "41 minutes",
        exerciseCount: 10,
        imageUrl: "/lovable-uploads/murillo.png",
      },
      {
        id: "workout-2",
        name: "Treino B",
        estimatedTime: "35 minutes",
        exerciseCount: 8,
        imageUrl: "/lovable-uploads/murillo.png",
      },
      {
        id: "workout-3",
        name: "Treino C",
        estimatedTime: "45 minutes",
        exerciseCount: 12,
        imageUrl: "/lovable-uploads/murillo.png",
      },
    ],
  };

  const handleWorkoutClick = (workout) => {
    // Create full workout details
    const fullWorkoutDetails = {
      id: workout.id,
      name: workout.name,
      type: "Regular",
      duration: workout.estimatedTime,
      equipment: ["Body Weight", "Mat"],
      instructions:
        "manter equilíbrio nos movimentos, ter um soft landing nos exercícios com pulo. respeitar o tempo de descanso.",
      exercises: [
        {
          name: "EZ Alongamento dinâmico",
          details: "1 set x 5 repetições cada lado",
          imageUrl: "/lovable-uploads/murillo.png",
        },
        {
          name: "Skipping",
          details: "3 sets x 30sec",
          rest: "30s rest between sets",
          imageUrl: "/lovable-uploads/murillo.png",
        },
        {
          name: "A skip Running drill",
          details: "3 sets x 30sec",
          rest: "30s rest between sets",
          imageUrl: "/lovable-uploads/murillo.png",
        },
        {
          name: "EZ Squat with band",
          details: "3 sets x 15",
          imageUrl: "/lovable-uploads/murillo.png",
        },
        {
          name: "EZ Squat jump",
          details: "3 sets x 10 reps",
          rest: "45s rest between sets",
          imageUrl: "/lovable-uploads/murillo.png",
        },
      ],
    };
    onSelectWorkout(fullWorkoutDetails);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16 flex flex-col">
      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-center flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">Program</h1>
      </header>

      {/* Program Card */}
      <div className="px-2 py-2 flex-1 flex flex-col">
        <div className="bg-white rounded-3xl p-6 shadow-sm flex-1 flex flex-col">
          {/* Program Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {program.name}
          </h2>

          {/* Main Badge */}
          {program.isMain && (
            <span className="inline-block bg-gray-100 text-gray-700 text-sm font-medium px-3 py-1 rounded-full mb-4 flex-shrink-0 w-fit">
              Main
            </span>
          )}

          {/* Phase Info */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {program.phase.name}
            </h3>
            <p className="text-sm text-gray-500">{program.phase.duration}</p>
          </div>

          {/* Workouts Section */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h4 className="text-base font-semibold text-gray-900">
                Workouts
              </h4>
            </div>

            {/* Workouts List */}
            <div className="space-y-3 flex-1 overflow-y-auto">
              {program.workouts.map((workout) => (
                <div
                  key={workout.id}
                  onClick={() => handleWorkoutClick(workout)}
                  className="bg-gray-50 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  {/* Workout Image */}
                  <div className="w-24 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-200">
                    <img
                      src={workout.imageUrl}
                      alt={workout.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23e5e7eb' width='100' height='100'/%3E%3C/svg%3E";
                      }}
                    />
                  </div>

                  {/* Workout Info */}
                  <div className="flex-1 min-w-0">
                    <h5 className="text-base font-bold text-gray-900 mb-1">
                      {workout.name}
                    </h5>
                    <p className="text-sm text-gray-500">
                      est. {workout.estimatedTime} · {workout.exerciseCount}{" "}
                      exercises
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkoutsView;
