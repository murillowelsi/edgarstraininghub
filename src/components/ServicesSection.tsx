import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dumbbell, Heart, Timer, Trophy } from "lucide-react";
import CertificationBadge from "./CertificationBadge";

const ServicesSection = () => {
  const { t } = useLanguage();

  const services = [
    {
      icon: <Dumbbell className="h-12 w-12 text-primary" />,
      title: t.services.strength.title,
      description: t.services.strength.description,
    },
    {
      icon: <Heart className="h-12 w-12 text-primary" />,
      title: t.services.endurance.title,
      description: t.services.endurance.description,
    },
    {
      icon: <Timer className="h-12 w-12 text-primary" />,
      title: t.services.hiit.title,
      description: t.services.hiit.description,
    },
    {
      icon: <Trophy className="h-12 w-12 text-primary" />,
      title: t.services.race.title,
      description: t.services.race.description,
    },
  ];

  return (
    <section id="services" className="section bg-muted">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t.services.title}{" "}
            <span className="text-primary">{t.services.titleHighlight}</span>
          </h2>
          <div className="h-1 w-20 bg-secondary mx-auto mb-6"></div>
          <p className="max-w-2xl mx-auto text-muted-foreground">
            {t.services.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <Card
              key={index}
              className="border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="text-center pt-6">
                <div className="mx-auto mb-4">{service.icon}</div>
                <CardTitle className="text-xl font-bold">
                  {service.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-muted-foreground">
                  {service.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div
          className="mt-16 rounded-xl shadow-lg overflow-hidden"
          style={{
            background:
              "linear-gradient(to right, hsl(var(--primary)), hsl(var(--primary)) 100%)",
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                {t.services.cta.title}
              </h3>
              <p className="text-white/90 mb-6">{t.services.cta.description}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <CertificationBadge type="ymca" variant="dark" />
                <CertificationBadge type="ofqual" variant="dark" />
              </div>
              <div>
                <a
                  href="#contact"
                  className="inline-block px-6 py-3 bg-background text-primary font-bold rounded-md hover:bg-background/90 transition-colors"
                >
                  {t.services.cta.button}
                </a>
              </div>
            </div>
            <div className="hidden lg:block relative min-h-[600px] flex items-center justify-center">
              <img
                src="/lovable-uploads/c2022b01-82d4-4894-b5f3-eba98aebfd4e.png"
                alt="Edgar Zanin with running group in Porto"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
