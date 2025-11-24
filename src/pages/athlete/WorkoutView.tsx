import React, { useState, useEffect } from 'react';
import { Clock, PlusSquare, MoreVertical, PlayCircle, XCircle, Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Switch } from '@/components/ui/switch'; // Assuming you have a Switch component

// Custom Icon for the Hand
const HandIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18.7 15.3a2.4 2.4 0 0 0 .7-1.7V7.8a2.4 2.4 0 0 0-1.2-2.1 2.4 2.4 0 0 0-2.6.3l-2 2.3-2-2.3a2.4 2.4 0 0 0-2.6-.3 2.4 2.4 0 0 0-1.2 2.1v5.8a2.4 2.4 0 0 0 .7 1.7l5.3 5.3a1 1 0 0 0 1.4 0l5.3-5.3z" />
    </svg>
);

const WorkoutView: React.FC<{ workout: any, onBack: () => void }> = ({ workout, onBack }) => {
  const { t } = useLanguage();
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (isTimerRunning && timerSeconds === 0) {
      setIsTimerRunning(false);
      setActiveTimerId(null);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  const handleTimerToggle = (timerId: string, duration: number) => {
    if (activeTimerId === timerId) {
      setIsTimerRunning(false);
      setActiveTimerId(null);
      setTimerSeconds(0);
    } else {
      setTimerSeconds(duration);
      setActiveTimerId(timerId);
      setIsTimerRunning(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };
  
  const currentWorkout = workout || { name: 'Workout', instructions: '', exercises: [] };

  const renderSet = (set: any, exIndex: number, setIndex: number) => {
    const timerId = `${exIndex}-${setIndex}`;
    const isThisTimerActive = activeTimerId === timerId;

    if (set.type === 'rest') {
      return (
        <div key={setIndex} className="flex items-center gap-4 py-3 border-b border-border/60 last:border-b-0">
            <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
                <HandIcon className="w-6 h-6 text-black" />
            </div>
            <div className="flex-1">
                <p className="font-semibold">Rest for {set.duration}s</p>
            </div>
            <button onClick={() => handleTimerToggle(timerId, set.duration)} className={`flex items-center gap-2 text-sm font-bold rounded-full px-4 py-2 transition-all ${isThisTimerActive ? 'text-red-500' : 'text-primary'}`}>
                {isThisTimerActive ? (
                    <><XCircle className="w-5 h-5" /><span>STOP</span></>
                ) : (
                    <><PlayCircle className="w-5 h-5" /><span>START</span></>
                )}
            </button>
        </div>
      );
    }

    const isDurationSet = set.type === 'duration';

    return (
        <div key={setIndex} className="py-3 border-b border-border/60 last:border-b-0">
            <div className="flex items-center gap-4">
                <p className="font-bold text-muted-foreground w-10 text-center">SET {setIndex + 1}</p>
                <div className="flex-1">
                    {isDurationSet ? (
                        <p className="font-semibold">Go for {set.duration}sec</p>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input type="number" placeholder="reps" className="w-20 p-2 text-center border rounded-md bg-input" defaultValue={set.reps}/>
                            <span className="text-muted-foreground">x</span>
                            <input type="number" placeholder="kg" className="w-20 p-2 text-center border rounded-md bg-input" defaultValue={set.weight} />
                        </div>
                    )}
                </div>
                {isDurationSet && (
                     <button onClick={() => handleTimerToggle(timerId, set.duration)} className={`flex items-center gap-2 text-sm font-bold rounded-full px-4 py-2 transition-all ${isThisTimerActive ? 'text-red-500' : 'text-primary'}`}>
                        {isThisTimerActive ? (
                            <><XCircle className="w-5 h-5" /><span>STOP</span></>
                        ) : (
                            <><PlayCircle className="w-5 h-5" /><span>START</span></>
                        )}
                    </button>
                )}
                 {!isDurationSet && set.weight && <span className="text-muted-foreground text-sm pr-4">{set.reps} x - {set.weight}kg</span>}
            </div>
            {isDurationSet && (
                 <div className="flex items-center gap-2 mt-3 ml-14">
                    <input type="number" placeholder="reps" className="w-20 p-2 text-center border rounded-md bg-input"/>
                    <span className="text-muted-foreground">x</span>
                    <input type="number" placeholder="kg" className="w-20 p-2 text-center border rounded-md bg-input"/>
                </div>
            )}
        </div>
    );
  }

  return (
    <div className="bg-background min-h-screen text-foreground">
      <header className="fixed top-0 left-0 right-0 bg-background z-20 p-4 flex items-center justify-between h-16 border-b border-border">
        <button onClick={onBack} className="font-semibold text-primary-light">Cancel</button>
        <div className="flex-1 flex justify-center items-center">
            {isTimerRunning ? (
                <span className="text-2xl font-mono tracking-tighter">{formatTime(timerSeconds)}</span>
            ) : (
                <div className="flex items-center gap-6">
                    <Clock className="w-6 h-6 text-muted-foreground" />
                    <PlusSquare className="w-6 h-6 text-muted-foreground" />
                    <MoreVertical className="w-6 h-6 text-muted-foreground" />
                </div>
            )}
        </div>
        <button className="font-semibold text-primary-light">Save</button>
      </header>

      <main className="pt-16 pb-20">
        <div className="p-4 space-y-4">
            <p className="text-muted-foreground text-center text-sm">Follow each exercise and rest period from top to bottom.</p>
            
            {currentWorkout.instructions && (
                <div className="bg-card p-3 rounded-lg">
                    <h3 className="font-semibold text-sm mb-1">Instructions</h3>
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap">{currentWorkout.instructions}</p>
                </div>
            )}

            <div className="flex items-center justify-between bg-card p-3 rounded-lg">
                <div className="flex items-center gap-2">
                    <label htmlFor="auto-fill" className="font-semibold text-sm">Auto fill stats</label>
                    <Info className="w-4 h-4 text-muted-foreground" />
                </div>
                <Switch id="auto-fill" />
            </div>
        </div>

        <div className="space-y-4">
          {currentWorkout.exercises?.map((exercise, exIndex) => (
            <div key={exIndex} className="bg-card rounded-lg mx-2">
              <div className="p-4 flex items-start gap-4">
                <img src={exercise.imageUrl || '/public/lovable-uploads/murillo.png'} alt={exercise.name} className="w-16 h-16 object-cover rounded-lg bg-muted"/>
                <div className="flex-1">
                    <h4 className="font-semibold text-base leading-tight">{exercise.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{exercise.details}</p>
                </div>
                <button className="text-muted-foreground">
                    <MoreVertical className="h-5 w-5" />
                </button>
              </div>
              
              <div className="px-4">
                  {exercise.sets?.map((set, setIndex) => renderSet(set, exIndex, setIndex))}
              </div>

              <div className="p-4">
                 <button className="text-sm font-semibold text-primary">+ ADD NEW SET</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default WorkoutView;
