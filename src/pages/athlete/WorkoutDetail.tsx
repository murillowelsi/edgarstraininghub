
import React from 'react';
import { X, Calendar, List, Hand, Weight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// Custom Icon for Mat, as it's not in Lucide
const MatIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <title>Mat</title>
    <path d="M4 6h16v12H4z" />
    <path d="M4 11h16" />
  </svg>
);


const WorkoutDetail: React.FC<{ workout: any, onStart: () => void, onBack: () => void }> = ({ workout, onStart, onBack }) => {
  const { t } = useLanguage();

  if (!workout) {
    return null;
  }

  const getEquipmentIcon = (name: string) => {
    const lowerCaseName = name.toLowerCase();
    if (lowerCaseName.includes('body')) {
      return <Weight className="w-8 h-8 text-muted-foreground" />;
    }
    if (lowerCaseName.includes('mat')) {
      return <MatIcon className="w-8 h-8 text-muted-foreground" />;
    }
    // Default icon
    return <Weight className="w-8 h-8 text-muted-foreground" />;
  };

  return (
    <div className="bg-background text-foreground flex flex-col h-full">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-primary text-primary-foreground z-10">
         <div className="max-w-md mx-auto flex items-center justify-between p-4 h-14">
            <button onClick={onBack}>
                <X className="w-6 h-6" />
            </button>
            <button className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="w-5 h-5" />
                <span>{t.athlete.schedule}</span>
            </button>
         </div>
      </header>
      
      {/* Spacer for fixed header */}
      <div className="h-14" />

      {/* Main Content */}
      <main className="flex-grow overflow-y-auto pb-32 px-4">
        <div className="max-w-md mx-auto">
            {/* Workout Title */}
            <div className="flex items-center gap-4 pt-6">
            <div className="w-5 h-5 rounded-full border-2 border-primary" />
            <h1 className="text-2xl font-bold">{workout.name}</h1>
            </div>

            {/* Meta Info */}
            <div className="space-y-1 text-muted-foreground mt-4 ml-9">
                <div className="flex items-center gap-2 text-sm">
                    <List className="w-4 h-4" />
                    <span>{workout.type || 'Regular'}</span>
                </div>
                <p className="text-sm">Duration: est. {workout.duration}</p>
            </div>
            
            {/* Equipment */}
            <div className="mt-8">
            <h2 className="text-base font-semibold mb-3 uppercase tracking-wide">{t.athlete.equipment.replace(':', '')}</h2>
            <div className="flex gap-8">
                {workout.equipment?.map((item, index) => (
                <div key={index} className="flex flex-col items-center gap-1.5">
                    {getEquipmentIcon(item)}
                    <span className="text-xs text-muted-foreground">{item}</span>
                </div>
                )) || <p className="text-muted-foreground">None</p>}
            </div>
            </div>
            
            {/* Instructions */}
            <div className="mt-8">
            <h2 className="text-base font-semibold mb-2 uppercase tracking-wide">{t.athlete.instructions.replace(':', '')}</h2>
            <p className="text-muted-foreground whitespace-pre-wrap text-sm">{workout.instructions}</p>
            </div>

            {/* Exercises */}
            <div className="mt-8 space-y-3">
                {workout.exercises?.map((exercise, index) => (
                    <div key={index} className="flex items-center gap-4 py-3 border-b border-border/80 last:border-b-0">
                        <img src={exercise.imageUrl || '/public/lovable-uploads/murillo.png'} alt={exercise.name} className="w-16 h-16 object-cover rounded-lg" />
                        <div className="flex-1">
                            <p className="font-semibold text-foreground leading-snug">{exercise.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">{exercise.details}</p>
                            {exercise.rest && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-sm text-amber-500">
                                <Hand className="w-3.5 h-3.5" />
                                <span>{exercise.rest}</span>
                            </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </main>
      
      {/* Floating Start Button */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent z-10">
        <div className="max-w-md mx-auto">
            <button 
                onClick={onStart} 
                className="w-full bg-primary text-primary-foreground py-3.5 rounded-full font-bold text-lg shadow-lg hover:bg-primary/90 transition-all uppercase"
            >
                {t.athlete.startNow}
            </button>
        </div>
      </footer>
    </div>
  );
};

export default WorkoutDetail;
