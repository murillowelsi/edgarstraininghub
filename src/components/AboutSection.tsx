import { useLanguage } from "@/contexts/LanguageContext";
import { useLatestYouTubeVideo } from "@/hooks/useLatestYouTubeVideo";
import { Award, Clock, Users } from "lucide-react";

const AboutSection = () => {
  const { t } = useLanguage(); // Use the translation hook
  const { video, loading } = useLatestYouTubeVideo();

  return (
    <section id="about" className="section-modern bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {t.about.title}{" "}
            <span className="text-primary">{t.about.titleHighlight}</span>
          </h2>
          <div
            className="h-1.5 w-24 mx-auto rounded-full"
            style={{ background: "var(--gradient-secondary)" }}
          ></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative animate-slide-in-left">
            <div className="rounded-3xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-500">
              <img
                src="/lovable-uploads/ba2184b9-65d7-4393-87da-9d1999bc5169.png"
                alt="Edgar Zanin - Personal Trainer"
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 card-modern p-6 hidden md:block animate-float">
              <p className="font-display font-bold text-3xl text-primary">
                {t.about.stats.experience}
              </p>
            </div>
          </div>

          <div className="space-y-6 animate-slide-in-right">
            <h3 className="text-3xl md:text-4xl font-bold text-foreground">
              {t.about.name}
            </h3>
            <h4 className="text-2xl text-primary font-semibold">
              {t.about.profession}
            </h4>
            <p className="text-muted-foreground leading-relaxed text-lg">
              {t.about.bio1}
            </p>
            <p className="text-muted-foreground leading-relaxed text-lg">
              {t.about.bio2}
            </p>
            <p className="text-primary font-semibold leading-relaxed text-lg mt-4">
              {t.about.certificationHighlight}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-6">
              <div className="card-modern p-6 text-center bg-gradient-to-br from-primary/5 to-transparent">
                <Award
                  className="mx-auto text-primary mb-3 animate-float"
                  size={36}
                />
                <h5 className="font-bold text-lg">{t.about.stats.certified}</h5>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.about.stats.certifiedDesc}
                </p>
              </div>
              <div className="card-modern p-6 text-center bg-gradient-to-br from-primary/5 to-transparent">
                <Users
                  className="mx-auto text-primary mb-3 animate-float"
                  size={36}
                  style={{ animationDelay: "0.3s" }}
                />
                <h5 className="font-bold text-lg">{t.about.stats.clients}</h5>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.about.stats.clientsDesc}
                </p>
              </div>
              <div className="card-modern p-6 text-center bg-gradient-to-br from-primary/5 to-transparent">
                <Clock
                  className="mx-auto text-primary mb-3 animate-float"
                  size={36}
                  style={{ animationDelay: "0.6s" }}
                />
                <h5 className="font-bold text-lg">
                  {t.about.stats.experience}
                </h5>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.about.stats.experienceDesc}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 animate-fade-in">
          <div className="card-modern p-8 text-center max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-6 text-foreground">
              {t.about.youtube}
            </h3>
            <div className="aspect-video w-full rounded-xl overflow-hidden shadow-lg">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <p className="text-muted-foreground">
                    Loading latest video...
                  </p>
                </div>
              ) : video?.videoId ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${video.videoId}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <p className="text-red-500">
                    Failed to load video. Check console for details.
                  </p>
                </div>
              )}
            </div>
            <p className="mt-4 text-muted-foreground">
              Check out more videos on my{" "}
              <a
                href="https://www.youtube.com/@edgarzanin"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                YouTube channel
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
