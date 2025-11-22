import { Button } from "@/components/ui/button";
import { ArrowDown, Medal } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import edgarImage from "@/assets/edgar-ironman.png";

const HeroSection = () => {
  const { t, language } = useLanguage();

  // WhatsApp pre-filled message based on language
  const getWhatsAppLink = () => {
    const phone = "+351962869476";
    const message =
      language === "pt"
        ? "Olá! Estou interessado(a) em saber mais sobre os seus serviços de personal training."
        : "Hello! I'm interested in learning more about your personal training services.";
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden pt-20"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div
        className="absolute inset-0 z-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: "url('/lovable-uploads/bg-1.png')" }}
      ></div>

      {/* Animated gradient orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float"></div>
      <div
        className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float"
        style={{ animationDelay: "1s" }}
      ></div>

      <div className="container mx-auto px-4 md:px-6 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-slide-in-left">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight">
              {t.hero.title}{" "}
              <span className="text-primary">{t.hero.titleHighlight}</span>{" "}
              <span className="block mt-2 text-4xl md:text-5xl lg:text-6xl">
                {t.hero.title.includes("Transform Your")
                  ? "with Edgar Zanin"
                  : "com Edgar Zanin"}
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-xl leading-relaxed">
              {t.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                size="lg"
                className="btn-primary text-lg py-7 px-10 shadow-lg hover:shadow-xl"
                onClick={() => window.open(getWhatsAppLink(), "_blank")}
              >
                {t.hero.startButton}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-primary text-primary hover:bg-accent font-semibold text-lg py-7 px-10 rounded-xl transition-all duration-300"
              >
                {t.hero.learnButton}
              </Button>
            </div>
          </div>

          <div className="relative animate-slide-in-right flex items-end justify-end -mr-4 md:-mr-6">
            <img
              src={edgarImage}
              alt="Edgar Zanin - Ironman Athlete"
              className="w-full h-[700px] md:h-[850px] lg:h-[1000px] object-cover object-top"
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce z-10">
        <a
          href="#about"
          className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
        >
          <ArrowDown className="text-primary" size={28} />
        </a>
      </div>
    </section>
  );
};

export default HeroSection;
