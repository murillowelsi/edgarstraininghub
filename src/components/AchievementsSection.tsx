import { useLanguage } from '@/contexts/LanguageContext';
import { Clock, Medal, TrendingUp, Trophy } from "lucide-react";

const AchievementsSection = () => {
  const { t } = useLanguage();

  const runningPBs = [
    {
      distance: t.achievements.personalBests.title,
      time: "19:16",
      icon: <TrendingUp className="h-6 w-6 text-brand-orange" />,
    },
    {
      distance: t.achievements.personalBests.title,
      time: "36:31",
      icon: <TrendingUp className="h-6 w-6 text-brand-orange" />,
    },
    {
      distance: t.achievements.personalBests.title,
      time: "1:20:00",
      icon: <TrendingUp className="h-6 w-6 text-brand-orange" />,
    },
    {
      distance: t.achievements.personalBests.title,
      time: "2:56:09",
      icon: <TrendingUp className="h-6 w-6 text-brand-orange" />,
    },
  ];

  return (
    <section id="achievements" className="section bg-white">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t.achievements.title} <span className="text-brand-blue">{t.achievements.titleHighlight}</span>
          </h2>
          <div className="h-1 w-20 bg-brand-orange mx-auto mb-6"></div>
          <p className="max-w-2xl mx-auto text-gray-700">
            {t.achievements.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="bg-gray-50 p-8 rounded-xl shadow-sm">
            <div className="flex items-center mb-6">
              <Medal className="h-8 w-8 text-brand-blue mr-4" />
              <h3 className="text-2xl font-bold">{t.achievements.major.title}</h3>
            </div>

            <div className="space-y-6">
              <div className="flex items-start">
                <Trophy className="h-6 w-6 text-brand-blue mr-4 mt-1" />
                <div>
                  <h4 className="text-xl font-bold">{t.achievements.major.ironman.title}</h4>
                  <p className="text-gray-700">
                    {t.achievements.major.ironman.description}
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <Clock className="h-6 w-6 text-brand-blue mr-4 mt-1" />
                <div>
                  <h4 className="text-xl font-bold">{t.achievements.major.marathon.title}</h4>
                  <p className="text-gray-700">
                    {t.achievements.major.marathon.description}
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <Medal className="h-6 w-6 text-brand-blue mr-4 mt-1" />
                <div>
                  <h4 className="text-xl font-bold">{t.achievements.major.podiums.title}</h4>
                  <p className="text-gray-700">
                    {t.achievements.major.podiums.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-8 rounded-xl shadow-sm">
            <div className="flex items-center mb-6">
              <TrendingUp className="h-8 w-8 text-brand-blue mr-4" />
              <h3 className="text-2xl font-bold">{t.achievements.personalBests.title}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {runningPBs.map((pb, index) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-100"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-lg">{pb.distance}</h4>
                    {pb.icon}
                  </div>
                  <p className="text-3xl font-display font-bold text-brand-blue">
                    {pb.time}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 p-6 bg-brand-blue bg-opacity-10 rounded-lg border border-brand-blue border-opacity-20">
              <p className="text-gray-700 italic">
                {t.achievements.personalBests.quote}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AchievementsSection;
