import CertificationBadge from "@/components/CertificationBadge";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { Award, CheckCircle, Clock, Medal, Trophy, Users } from "lucide-react";

const About = () => {
  const { t } = useLanguage();

  // Placeholder certificate images - replace with actual paths
  const certificates = [
    { src: "/lovable-uploads/cert1.svg", alt: "YMCA Level 3 Diploma" },
    {
      src: "/lovable-uploads/cert2.svg",
      alt: "Anatomy and Physiology Certification",
    },
    {
      src: "/lovable-uploads/cert3.svg",
      alt: "Gym Exercise Planning Certification",
    },
    { src: "/lovable-uploads/cert4.svg", alt: "Nutrition Certification" },
    {
      src: "/lovable-uploads/cert5.svg",
      alt: "Safety and Wellbeing Certification",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="section-modern bg-background pt-32">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {t.about.title}{" "}
              <span className="text-primary">{t.about.titleHighlight}</span>
            </h1>
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
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                {t.about.name}
              </h2>
              <h3 className="text-2xl text-primary font-semibold">
                {t.about.profession}
              </h3>
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
                  <h4 className="font-bold text-lg">
                    {t.about.stats.certified}
                  </h4>
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
                  <h4 className="font-bold text-lg">{t.about.stats.clients}</h4>
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
                  <h4 className="font-bold text-lg">
                    {t.about.stats.experience}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t.about.stats.experienceDesc}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-4">
                <CertificationBadge type="ymca" />
                <CertificationBadge type="ofqual" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-white">
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

      <section className="section-modern bg-background">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {t.certifications.title}{" "}
              <span className="text-primary">{t.certifications.subtitle}</span>
            </h2>
            <div
              className="h-1.5 w-24 mx-auto rounded-full"
              style={{ background: "var(--gradient-secondary)" }}
            ></div>
          </div>

          <div className="max-w-4xl mx-auto mb-16">
            <p className="text-muted-foreground leading-relaxed text-lg text-center">
              {t.certifications.text}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {t.certifications.items.map((item, index) => (
              <div
                key={index}
                className="card-modern p-6 text-center bg-gradient-to-br from-primary/5 to-transparent"
              >
                <CheckCircle
                  className="mx-auto text-primary mb-3 animate-float"
                  size={36}
                  style={{ animationDelay: `${index * 0.2}s` }}
                />
                <p className="text-foreground font-medium">{item}</p>
              </div>
            ))}
          </div>

          <div className="animate-fade-in">
            <h3 className="text-2xl font-bold mb-8 text-center text-foreground">
              Certificados
            </h3>
            <Carousel className="w-full max-w-4xl mx-auto">
              <CarouselContent>
                {certificates.map((cert, index) => (
                  <CarouselItem
                    key={index}
                    className="md:basis-1/2 lg:basis-1/3"
                  >
                    <div className="p-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <div className="cursor-pointer rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                            <img
                              src={cert.src}
                              alt={cert.alt}
                              className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <img
                            src={cert.src}
                            alt={cert.alt}
                            className="w-full h-auto"
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
