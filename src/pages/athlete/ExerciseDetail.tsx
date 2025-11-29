import { ChevronLeft } from "lucide-react";
import React from "react";

interface ExerciseDetailProps {
  exercise: any;
  onBack: () => void;
}

const ExerciseDetail: React.FC<ExerciseDetailProps> = ({
  exercise,
  onBack,
}) => {
  // Extract YouTube video ID from URL
  const getYouTubeEmbedUrl = (url: string) => {
    // For now, using hardcoded video
    const videoId = "dRSt9ZglKDA";
    return `https://www.youtube.com/embed/${videoId}`;
  };

  const videoUrl = getYouTubeEmbedUrl(exercise.videoUrl || "");

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white px-4 py-4 flex items-center flex-shrink-0">
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-yellow-500" />
        </button>
      </header>

      {/* Video Player */}
      <div
        className="relative w-full bg-black"
        style={{ paddingBottom: "56.25%" }}
      >
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={videoUrl}
          title="Exercise Video"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />

        {/* Full Video Badge */}
        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium">
          <div className="w-2 h-2 bg-white rounded-full" />
          FULL VIDEO
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
        {/* Exercise Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {exercise.name}
        </h1>

        {/* Personal Best Section */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-1">Personal Best To Beat</p>
          <p className="text-lg font-bold text-gray-900">No record set yet.</p>
        </div>

        {/* Workout History */}
        <div className="space-y-6">
          {/* Mock workout history - you can replace with real data */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">
                Treino A
              </h3>
              <span className="text-sm text-gray-500">24 Nov 2025</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700">Set 1</span>
                <span className="text-gray-900 font-medium">
                  {exercise.details || "15 x - kg"}
                </span>
              </div>
            </div>
          </div>

          {/* Additional workout sessions can be added here */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">
                Treino Perna + Core
              </h3>
              <span className="text-sm text-gray-500">21 Jul 2025</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700">Set 1</span>
                <span className="text-gray-900 font-medium">15 x - kg</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700">Set 2</span>
                <span className="text-gray-900 font-medium">15 x - kg</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700">Set 3</span>
                <span className="text-gray-900 font-medium">15 x - kg</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExerciseDetail;
