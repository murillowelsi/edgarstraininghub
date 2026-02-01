import edgarImage from "@/assets/edgar-ironman.png";
import { Button } from "@/components/ui/button";
import { useLanguage } from "../contexts/LanguageContext";

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
      className="relative min-h-[calc(100vh-80px)] md:h-[85vh] lg:h-[95vh] flex items-center justify-center overflow-hidden pt-20 pb-12 md:pt-20 md:pb-0 bg-background"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div
        className="absolute inset-0 z-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: "url('/lovable-uploads/bg-1.png')" }}
      ></div>

      {/* Animated gradient orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float"></div>
      <div
        className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float"
        style={{ animationDelay: "1s" }}
      ></div>

      <div className="container mx-auto px-4 md:px-6 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16 items-center max-w-7xl mx-auto">
          <div className="space-y-5 md:space-y-8 animate-slide-in-left text-center md:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight">
              <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold text-foreground align-middle">{t.hero.title}</span>{" "}
              <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-primary font-bold whitespace-nowrap align-middle">{t.hero.titleHighlight}</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-xl leading-relaxed mx-auto md:mx-0">
              {t.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-2 md:pt-4 justify-center md:justify-start">
              <Button
                size="lg"
                className="btn-primary text-base md:text-lg py-5 md:py-7 px-8 md:px-10 shadow-lg hover:shadow-xl w-full sm:w-auto"
                onClick={() => window.open(getWhatsAppLink(), "_blank")}
              >
                {t.hero.startButton}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-primary text-primary hover:bg-accent font-semibold text-base md:text-lg py-5 md:py-7 px-8 md:px-10 rounded-xl transition-all duration-300 w-full sm:w-auto"
                onClick={() => {
                  document
                    .getElementById("services")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {t.hero.learnButton}
              </Button>
            </div>
          </div>

          <div className="absolute right-0 bottom-0 animate-slide-in-right hidden lg:flex items-end justify-end w-[55%] xl:w-[50%] 2xl:w-[48%]">
            <img
              src={edgarImage}
              alt="Edgar Zanin - Ironman Athlete"
              className="w-full h-[88vh] lg:h-[90vh] xl:h-[92vh] max-h-[1400px] object-contain object-bottom opacity-80"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
