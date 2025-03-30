
import { Medal, TrendingUp, Clock, Trophy } from 'lucide-react';

const AchievementsSection = () => {
  const runningPBs = [
    { distance: "5 km", time: "19:16", icon: <TrendingUp className="h-6 w-6 text-brand-orange" /> },
    { distance: "10 km", time: "36:31", icon: <TrendingUp className="h-6 w-6 text-brand-orange" /> },
    { distance: "Half Marathon", time: "1:20:00", icon: <TrendingUp className="h-6 w-6 text-brand-orange" /> },
    { distance: "Marathon", time: "2:56:09", icon: <TrendingUp className="h-6 w-6 text-brand-orange" /> }
  ];

  return (
    <section id="achievements" className="section bg-white">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">My <span className="text-brand-blue">Achievements</span></h2>
          <div className="h-1 w-20 bg-brand-orange mx-auto mb-6"></div>
          <p className="max-w-2xl mx-auto text-gray-700">
            Personal records and competitive achievements that demonstrate my dedication to fitness and endurance sports.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="bg-gray-50 p-8 rounded-xl shadow-sm">
            <div className="flex items-center mb-6">
              <Medal className="h-8 w-8 text-brand-blue mr-4" />
              <h3 className="text-2xl font-bold">Major Accomplishments</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <Trophy className="h-6 w-6 text-brand-blue mr-4 mt-1" />
                <div>
                  <h4 className="text-xl font-bold">Ironman 70.3 Finisher</h4>
                  <p className="text-gray-700">
                    Completed the challenging half Ironman distance triathlon, consisting of a 1.9 km swim, 
                    90 km bike ride, and 21.1 km run.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Clock className="h-6 w-6 text-brand-blue mr-4 mt-1" />
                <div>
                  <h4 className="text-xl font-bold">Sub-3 Hour Marathon</h4>
                  <p className="text-gray-700">
                    Finished a full marathon in under 3 hours (2:56:09), an achievement that puts me in the 
                    top percentile of marathon runners worldwide.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Medal className="h-6 w-6 text-brand-blue mr-4 mt-1" />
                <div>
                  <h4 className="text-xl font-bold">Multiple Podium Finishes</h4>
                  <p className="text-gray-700">
                    Achieved numerous top-3 finishes in local and regional running events across various distances.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-8 rounded-xl shadow-sm">
            <div className="flex items-center mb-6">
              <TrendingUp className="h-8 w-8 text-brand-blue mr-4" />
              <h3 className="text-2xl font-bold">Running Personal Bests</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {runningPBs.map((pb, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-lg">{pb.distance}</h4>
                    {pb.icon}
                  </div>
                  <p className="text-3xl font-display font-bold text-brand-blue">{pb.time}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-6 bg-brand-blue bg-opacity-10 rounded-lg border border-brand-blue border-opacity-20">
              <p className="text-gray-700 italic">
                "Every personal best represents countless hours of training, discipline, and determination. 
                I bring this same dedication to helping my clients achieve their fitness goals."
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AchievementsSection;
