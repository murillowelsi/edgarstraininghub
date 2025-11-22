import { useLanguage } from "@/contexts/LanguageContext";
import { Activity, Award, BarChart, Clock, Medal, Trophy } from "lucide-react";

const AchievementsSection = () => {
  const { t } = useLanguage();

  const runningPBs = [
    {
      distance: "5K",
      time: "19:16",
      icon: <Clock className="h-6 w-6 text-secondary" />,
    },
    {
      distance: "10K",
      time: "36:31",
      icon: <Activity className="h-6 w-6 text-secondary" />,
    },
    {
      distance: "Half Marathon",
      time: "1:20:00",
      icon: <Award className="h-6 w-6 text-secondary" />,
    },
    {
      distance: "Marathon",
      time: "2:56:09",
      icon: <Trophy className="h-6 w-6 text-secondary" />,
    },
  ];

  return (
    <section id="achievements" className="section bg-white">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t.achievements.title}{" "}
            <span className="text-primary">
              {t.achievements.titleHighlight}
            </span>
          </h2>
          <div className="h-1 w-20 bg-secondary mx-auto mb-6"></div>
          <p className="max-w-2xl mx-auto text-gray-700">
            {t.achievements.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="bg-gray-50 p-8 rounded-xl shadow-sm">
            <div className="flex items-center mb-6">
              <Medal className="h-8 w-8 text-primary mr-4" />
              <h3 className="text-2xl font-bold">
                {t.achievements.major.title}
              </h3>
            </div>

            <div className="space-y-6">
              <div className="flex items-start">
                <Trophy className="h-6 w-6 text-primary mr-4 mt-1" />
                <div>
                  <h4 className="text-xl font-bold">
                    {t.achievements.major.fullIronman.title}
                  </h4>
                  <p className="text-gray-700">
                    {t.achievements.major.fullIronman.description}
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <Trophy className="h-6 w-6 text-primary mr-4 mt-1" />
                <div>
                  <h4 className="text-xl font-bold">
                    {t.achievements.major.ironman.title}
                  </h4>
                  <p className="text-gray-700">
                    {t.achievements.major.ironman.description}
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <Clock className="h-6 w-6 text-primary mr-4 mt-1" />
                <div>
                  <h4 className="text-xl font-bold">
                    {t.achievements.major.marathon.title}
                  </h4>
                  <p className="text-gray-700">
                    {t.achievements.major.marathon.description}
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <Medal className="h-6 w-6 text-primary mr-4 mt-1" />
                <div>
                  <h4 className="text-xl font-bold">
                    {t.achievements.major.podiums.title}
                  </h4>
                  <p className="text-gray-700">
                    {t.achievements.major.podiums.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card-modern p-8 backdrop-blur-xl bg-card/80">
            <h3 className="text-2xl font-bold text-foreground mb-6 text-center">
              {t.hero.achievementShelf}
            </h3>

            <div className="space-y-5">
              <div className="card-modern p-5 bg-gradient-to-br from-green-500/10 to-transparent border-l-4 border-green-500 flex items-start">
                <Medal className="text-green-500 h-9 w-9 mr-4 flex-shrink-0 animate-glow" />
                <div>
                  <h4 className="font-bold text-foreground text-lg">
                    {t.hero.ironmanTitle}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t.hero.ironmanDescription}
                  </p>
                </div>
              </div>
              <div className="card-modern p-5 bg-gradient-to-br from-green-500/10 to-transparent border-l-4 border-green-500 flex items-start">
                <Medal className="text-green-500 h-9 w-9 mr-4 flex-shrink-0 animate-glow" />
                <div>
                  <h4 className="font-bold text-foreground text-lg">
                    {t.hero.fullIronmanTitle}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t.hero.fullIronmanDescription}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="card-modern p-4 bg-gradient-to-br from-primary/10 to-transparent border-t-4 border-primary hover:scale-105 transition-transform">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">
                    {t.hero.records["5k"]}
                  </p>
                  <p className="font-bold text-2xl text-primary">19:16</p>
                </div>
                <div className="card-modern p-4 bg-gradient-to-br from-primary/10 to-transparent border-t-4 border-primary hover:scale-105 transition-transform">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">
                    {t.hero.records["10k"]}
                  </p>
                  <p className="font-bold text-2xl text-primary">36:31</p>
                </div>
                <div className="card-modern p-4 bg-gradient-to-br from-primary/10 to-transparent border-t-4 border-primary hover:scale-105 transition-transform">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">
                    {t.hero.records.halfMarathon}
                  </p>
                  <p className="font-bold text-2xl text-primary">1:20:00</p>
                </div>
                <div className="card-modern p-4 bg-gradient-to-br from-primary/10 to-transparent border-t-4 border-primary hover:scale-105 transition-transform">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">
                    {t.hero.records.marathon}
                  </p>
                  <p className="font-bold text-2xl text-primary">2:56:09</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AchievementsSection;
