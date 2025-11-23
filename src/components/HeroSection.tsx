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
      className="relative h-[95vh] flex items-center overflow-hidden pt-20"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-slide-in-left">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight">
              {t.hero.title}{" "}
              <span className="text-primary">{t.hero.titleHighlight}</span>
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

          <div className="absolute right-0 bottom-0 animate-slide-in-right hidden lg:flex items-end justify-end w-[50%] xl:w-[45%]">
            <img
              src={edgarImage}
              alt="Edgar Zanin - Ironman Athlete"
              className="w-full h-[80vh] lg:h-[85vh] xl:h-[85vh] max-h-[1200px] object-contain object-bottom opacity-60"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
