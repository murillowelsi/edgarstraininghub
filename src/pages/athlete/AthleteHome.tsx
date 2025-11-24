import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Calendar as CalendarIcon, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const AthleteHome = ({ onSelectWorkout }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState({ start: -30, end: 30 }); // Days relative to today
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  // Get user's first name
  const userName = user?.displayName?.split(" ")[0] || "Athlete";

  // Generate dates based on range
  const getDates = () => {
    const dates = [];
    for (let i = dateRange.start; i <= dateRange.end; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = getDates();

  const formatDate = (date: Date) => {
    return date.getDate();
  };

  const formatDay = (date: Date) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[date.getDay()];
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  // Handle scroll to load more dates
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    
    // Load more dates when scrolling near the edges
    if (scrollLeft < 200) {
      // Scrolling left - load earlier dates
      setDateRange(prev => ({ start: prev.start - 30, end: prev.end }));
    } else if (scrollLeft + clientWidth > scrollWidth - 200) {
      // Scrolling right - load later dates
      setDateRange(prev => ({ start: prev.start, end: prev.end + 30 }));
    }
  };

  // Scroll to today on mount
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Find today's index and scroll to it
    const todayIndex = dates.findIndex(date => isToday(date));
    if (todayIndex !== -1) {
      const buttonWidth = 64; // w-14 = 56px + gap
      const scrollPosition = todayIndex * buttonWidth - (container.clientWidth / 2) + (buttonWidth / 2);
      container.scrollLeft = scrollPosition;
    }
  }, []);

  const scrollToToday = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const todayIndex = dates.findIndex(date => isToday(date));
    if (todayIndex !== -1) {
      const buttonWidth = 64;
      const scrollPosition = todayIndex * buttonWidth - (container.clientWidth / 2) + (buttonWidth / 2);
      container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
    setSelectedDate(today);
  };

  // Mock activities data
  const activities = [
    {
      id: 2,
      title: "Treino A",
      subtitle: "Completed. ⏱ 6/10 📋 1",
      category: "Workout",
      categoryColor: "bg-blue-100 text-blue-600",
      completed: true,
      icon: "✓",
    },
    {
      id: 3,
      title: "General",
      subtitle: "Completed. ⏱ 30m 46s",
      category: "Activity",
      categoryColor: "bg-green-100 text-green-600",
      completed: true,
      icon: "✓",
      hasImage: true,
    },
  ];

  const handleActivityClick = (activity) => {
    if (activity.category === "Workout") {
      // Navigate to workout details
      const workoutDetails = {
        id: "workout-1",
        name: activity.title,
        type: "Regular",
        duration: "41 minutes",
        equipment: ["Body Weight", "Mat"],
        instructions: "Complete all exercises with proper form",
        exercises: [
          {
            name: "EZ Alongamento dinâmico",
            details: "1 set x 5 repetições cada lado",
            imageUrl: "/lovable-uploads/murillo.png",
            sets: [
              { reps: 5, previous: "15 x - kg" }
            ]
          },
          {
            name: "Skipping",
            details: "3 sets x 30sec",
            imageUrl: "/lovable-uploads/murillo.png",
            sets: [
              { duration: 30, previous: "1 x - kg", type: "duration" },
              { duration: 30, previous: "1 x - kg", type: "duration" },
              { duration: 30, previous: "1 x - kg", type: "duration" }
            ]
          },
          {
            name: "Supino Reto",
            details: "4 sets x 12 reps",
            imageUrl: "/lovable-uploads/murillo.png",
            sets: [
              { reps: 12, previous: "60 x 12 kg" },
              { reps: 12, previous: "60 x 12 kg" },
              { reps: 12, previous: "60 x 12 kg" },
              { reps: 12, previous: "60 x 12 kg" }
            ]
          }
        ],
      };
      onSelectWorkout(workoutDetails);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-center">
        <h1 className="text-xl font-semibold text-gray-900">Home</h1>
      </header>

      {/* Greeting */}
      <div className="px-6 py-6 bg-white">
        <p className="text-gray-600 text-base">Let's Go,</p>
        <h2 className="text-4xl font-bold text-gray-900 mt-1">{userName}</h2>
      </div>

      {/* Date Selector */}
      <div className="bg-white px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 font-semibold">
            {selectedDate.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}
          </h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={scrollToToday}
              className="text-primary font-semibold text-sm hover:underline"
            >
              Today
            </button>
            <button className="p-1 hover:bg-gray-100 rounded transition-colors">
              <CalendarIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Infinite Scroll Calendar */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide"
        >
          {dates.map((date, index) => (
            <button
              key={`${date.getTime()}-${index}`}
              onClick={() => setSelectedDate(date)}
              className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-xl transition-all ${
                isSelected(date)
                  ? "bg-gray-900 text-white shadow-lg scale-105"
                  : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="text-xl font-semibold">{formatDate(date)}</span>
              <span className="text-xs mt-0.5 opacity-70">
                {formatDay(date)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Activities List */}
      <div className="px-6 py-4 space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            onClick={() => handleActivityClick(activity)}
            className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative"
          >
            <div className="flex items-start gap-4">
              {/* Status Icon */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  activity.completed
                    ? "bg-blue-500 text-white"
                    : "border-2 border-red-400 text-red-400"
                }`}
              >
                {activity.completed ? (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-current" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="text-gray-900 font-semibold text-base">
                  {activity.title}
                </h4>
                <p className="text-gray-500 text-sm mt-0.5">
                  {activity.subtitle}
                </p>
                <span
                  className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${activity.categoryColor}`}
                >
                  {activity.category}
                </span>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />

              {/* Profile Image for Activity */}
              {activity.hasImage && (
                <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 overflow-hidden border-2 border-white">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                      {userName.charAt(0)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AthleteHome;
