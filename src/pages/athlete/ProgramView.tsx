
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

const ProgramView = ({ onSelectWorkout }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrograms = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Mock data based on the user's screenshot
        const mockPrograms = [
          {
            id: "program-1",
            name: "MURILLO\'S PROGRAM",
            isMain: true,
            currentWeek: {
              name: "Treino Fortalecimento",
              duration: "4 week (10 Nov 2025 - 7 Dec 2025)",
              workouts: [
                {
                  id: "workout-1",
                  name: "Treino A",
                  estimatedTime: "41 minutes",
                  exerciseCount: 10,
                  imageUrl: "/public/lovable-uploads/murillo.png",
                },
              ],
            },
          },
        ];
        setPrograms(mockPrograms);
      } catch (error) {
        console.error("Error fetching programs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, [user]);

  const handleWorkoutSelect = (workout) => {
    // Here you would fetch the full workout details
    const fullWorkoutDetails = {
        id: "workout-1",
        name: "Treino A",
        type: "Regular",
        duration: "41 minutes",
        equipment: ["Body Weight", "Mat"],
        instructions: "manter equilíbrio nos movimentos, ter um soft landing nos exercícios com pulo. respeitar o tempo de descanso.",
        exercises: [
            { name: "EZ Alongamento dinâmico", details: "1 set x 5 repetições cada lado", imageUrl: "/public/lovable-uploads/murillo.png" },
            { name: "Skipping", details: "3 sets x 30sec", rest: "30s rest between sets", imageUrl: "/public/lovable-uploads/murillo.png" },
            { name: "A skip Running drill", details: "3 sets x 30sec", rest: "30s rest between sets", imageUrl: "/public/lovable-uploads/murillo.png" },
            { name: "EZ Squat with band", details: "3 sets x 15", imageUrl: "/public/lovable-uploads/murillo.png" },
            { name: "EZ Squat jump", details: "3 sets x 10 reps", rest: "45s rest between sets", imageUrl: "/public/lovable-uploads/murillo.png" },
        ]
    };
    onSelectWorkout(fullWorkoutDetails);
  };


  if (loading) {
    return <div className="text-center p-8">{t.athlete.loadingProgram}</div>;
  }

  return (
    <div className="p-4 sm:p-6 bg-background min-h-full">
        <header className="fixed top-0 left-0 right-0 bg-primary/95 backdrop-blur-sm z-10">
            <div className="max-w-md mx-auto h-14 flex items-center justify-center">
                <h1 className="text-lg font-bold text-primary-foreground">{t.athlete.program}</h1>
            </div>
        </header>
        <div className="mt-14">
      {programs.map((program) => (
        <div key={program.id} className="mb-8">
          <h2 className="text-xl font-bold text-foreground">{program.name}</h2>
          {program.isMain && (
            <span className="inline-block bg-secondary text-secondary-foreground text-xs font-semibold px-2 py-1 rounded-full my-2">
              {t.athlete.main}
            </span>
          )}
          <div className="mt-2">
            <h3 className="text-lg font-semibold text-foreground">{program.currentWeek.name}</h3>
            <p className="text-sm text-muted-foreground">{program.currentWeek.duration}</p>
          </div>

          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-foreground">{t.athlete.workouts}</h4>
              {/* Filter Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M3 6h18M7 12h10M10 18h4"/></svg>
            </div>
            <div className="space-y-3">
              {program.currentWeek.workouts.map((workout) => (
                <div
                  key={workout.id}
                  className="bg-card rounded-lg shadow-sm p-3 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleWorkoutSelect(workout)}
                >
                  <img src={workout.imageUrl} alt={workout.name} className="w-24 h-16 object-cover rounded-md" />
                  <div className="flex-1">
                    <h5 className="font-bold text-base text-foreground">{workout.name}</h5>
                    <p className="text-sm text-muted-foreground">
                      {t.athlete.estimatedTime.replace('{time}', workout.estimatedTime)} | {t.athlete.exerciseCount.replace('{count}', workout.exerciseCount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
};

export default ProgramView;
