import React, { useState } from "react";
import WorkoutDetail from "./WorkoutDetail";
import WorkoutView from "./WorkoutView";

const WorkoutFlow: React.FC<{
  workout: any;
  onBackToDashboard: () => void;
  onGoToCalendar?: () => void;
}> = ({ workout, onBackToDashboard, onGoToCalendar }) => {
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);

  const handleStartWorkout = () => {
    setIsWorkoutStarted(true);
  };

  // When the user cancels from the WorkoutView
  const handleBack = () => {
    setIsWorkoutStarted(false);
  };

  if (isWorkoutStarted) {
    return <WorkoutView workout={workout} onBack={handleBack} />;
  }

  return (
    <WorkoutDetail
      workout={workout}
      onStart={handleStartWorkout}
      onBack={onBackToDashboard}
      onGoToCalendar={onGoToCalendar}
    />
  );
};

export default WorkoutFlow;
