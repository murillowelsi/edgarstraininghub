import { useLanguage } from "@/contexts/LanguageContext";
import { Calendar, Dumbbell, Home } from "lucide-react";
import { useEffect, useState } from "react";
import AthleteCalendar from "./AthleteCalendar";
import AthleteHome from "./AthleteHome";
import WorkoutFlow from "./WorkoutFlow";
import WorkoutsView from "./WorkoutsView";

const AthleteDashboard = () => {
  const [activeTab, setActiveTab] = useState("program");
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    const savedTab = localStorage.getItem("athleteActiveTab");
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem("athleteActiveTab", tab);
  };

  const renderContent = () => {
    if (selectedWorkout) {
      // Pass the selected workout to the WorkoutFlow component
      return (
        <WorkoutFlow
          workout={selectedWorkout}
          onBackToDashboard={() => setSelectedWorkout(null)}
          onGoToCalendar={() => {
            setSelectedWorkout(null);
            handleTabChange("calendar");
          }}
        />
      );
    }

    switch (activeTab) {
      case "program":
        return <AthleteHome onSelectWorkout={setSelectedWorkout} />;
      case "calendar":
        return <AthleteCalendar onSelectWorkout={setSelectedWorkout} />;
      case "workouts":
        return <WorkoutsView onSelectWorkout={setSelectedWorkout} />;
      default:
        return <AthleteHome onSelectWorkout={setSelectedWorkout} />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <main className="flex-1 overflow-y-auto">{renderContent()}</main>

      {!selectedWorkout && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg">
          <div className="flex justify-around items-center h-16 max-w-md mx-auto">
            <button
              onClick={() => handleTabChange("program")}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                activeTab === "program"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Home className="h-6 w-6" />
              <span className="text-xs font-medium">{t.athlete.program}</span>
            </button>
            <button
              onClick={() => handleTabChange("calendar")}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                activeTab === "calendar"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Calendar className="h-6 w-6" />
              <span className="text-xs font-medium">{t.athlete.schedule}</span>
            </button>
            <button
              onClick={() => handleTabChange("workouts")}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                activeTab === "workouts"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Dumbbell className="h-6 w-6" />
              <span className="text-xs font-medium">{t.athlete.workouts}</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
};

export default AthleteDashboard;
