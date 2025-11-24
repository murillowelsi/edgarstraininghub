
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Calendar, RefreshCw, Activity, Waves, Dumbbell } from "lucide-react";

const AthleteCalendar = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [workouts, setWorkouts] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWorkouts = async () => {
            if (!user) return;
            setLoading(true);
            try {
                // Mock data based on the user's screenshot
                const mockWorkouts = {
                    '2025-11-18': [
                        { id: 'w1', type: 'Running', completed: true, distance: '5.3 km', time: '29m 59s' },
                        { id: 'w2', type: 'Swimming', completed: true, distance: '2000 m', time: '41m 54s' },
                    ],
                    '2025-11-19': [
                        { id: 'w3', type: 'General', completed: true, time: '1h 1m 57s' },
                    ],
                    '2025-11-20': [
                        { id: 'w4', type: 'Running', completed: true, distance: '6.97 km', time: '40m 2s' },
                        { id: 'w5', type: 'Swimming', completed: true, distance: '1200 m', time: '24 minutes' },
                    ],
                    '2025-11-22': [
                        { id: 'w6', type: 'Running', completed: true, distance: '10.01 km', time: '57 minutes' },
                    ],
                    '2025-11-23': [
                        { id: 'w7', type: 'General', completed: false, time: '45 minutes' },
                    ],
                };

                // Group workouts by date
                const grouped = {};
                Object.keys(mockWorkouts).forEach(date => {
                    const d = new Date(date);
                    const dayKey = d.toISOString().split('T')[0];
                    if (!grouped[dayKey]) {
                        grouped[dayKey] = [];
                    }
                    grouped[dayKey].push(...mockWorkouts[date]);
                });

                setWorkouts(grouped);

            } catch (error) {
                console.error("Error fetching workouts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWorkouts();
    }, [user]);

    const renderWorkoutIcon = (type) => {
        switch (type.toLowerCase()) {
            case 'running':
                return <Activity className="w-6 h-6 text-muted-foreground" />;
            case 'swimming':
                return <Waves className="w-6 h-6 text-muted-foreground" />;
            case 'general':
                return <Dumbbell className="w-6 h-6 text-muted-foreground" />;
            default:
                return <Dumbbell className="w-6 h-6 text-muted-foreground" />;
        }
    };

    const renderDay = (date) => {
        const dayKey = date.toISOString().split('T')[0];
        const dayWorkouts = workouts[dayKey] || [];
        const dayName = t.athlete.calendar.weekdays[date.getDay()];
        const dateString = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

        const isToday = new Date().toISOString().split('T')[0] === dayKey;
        const isYesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0] === dayKey;
        
        let displayDate = dateString;
        if (isToday) displayDate = t.athlete.calendar.today;
        if (isYesterday) displayDate = t.athlete.calendar.yesterday;


        return (
            <div key={dayKey} className="mb-6">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-lg text-foreground">{dayName}</h3>
                    <span className="text-sm text-muted-foreground">{displayDate}</span>
                </div>
                {dayWorkouts.length > 0 ? (
                    dayWorkouts.map((workout) => {
                        const details = [workout.distance, workout.time].filter(Boolean).join(' . ');
                        return (
                            <div key={workout.id} className="bg-card rounded-lg p-3 mb-2 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0">
                                        {workout.completed ? (
                                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">✓</div>
                                        ) : (
                                            <div className="w-6 h-6 rounded-full border-2 border-muted-foreground"></div>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground">{workout.type}</h4>
                                        <p className="text-sm text-muted-foreground">{details}</p>
                                    </div>
                                </div>
                                {renderWorkoutIcon(workout.type)}
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-3 border-b border-border text-sm text-muted-foreground">
                        {t.athlete.calendar.noWorkouts}
                    </div>
                )}
            </div>
        );
    };
    
    const days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(2025, 10, 17); // Start from Nov 17, 2025
        date.setDate(date.getDate() + i);
        return date;
    });


    return (
        <div className="bg-background min-h-full pb-32">
            <header className="fixed top-0 left-0 right-0 bg-primary/95 backdrop-blur-sm z-10">
                <div className="max-w-md mx-auto h-14 flex items-center justify-between px-4">
                    <h1 className="text-lg font-bold text-primary-foreground">{t.athlete.calendar.title}</h1>
                </div>
            </header>

            <div className="pt-20 px-4 max-w-md mx-auto">
                 {loading ? (
                    <div className="text-center py-8">{t.athlete.loadingProgram}</div>
                ) : (
                    days.map(day => renderDay(day))
                )}
            </div>

        </div>
    );
};

export default AthleteCalendar;
