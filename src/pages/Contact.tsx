import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Clock, MapPin, MessageSquare, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Contact = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

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
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="section-modern bg-background pt-32">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {t.contact?.title || "Entre em"}{" "}
              <span className="text-primary">
                {t.contact?.titleHighlight || "Contacto"}
              </span>
            </h1>
            <div
              className="h-1.5 w-24 mx-auto rounded-full mb-6"
              style={{ background: "var(--gradient-secondary)" }}
            ></div>
            <p className="max-w-2xl mx-auto text-muted-foreground leading-relaxed text-lg">
              {t.contact?.subtitle ||
                "Vamos conversar sobre seus objetivos fitness. Estou aqui para ajudar você a alcançar seus melhores resultados."}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="section bg-white">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {/* Phone Card */}
            <Card className="card-modern hover:scale-105 transition-transform duration-300">
              <CardHeader className="text-center pb-4">
                <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Phone className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">
                  {t.contact?.info?.phone || "Telefone"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-2xl font-bold text-primary mb-2">
                  +351 962 869 476
                </p>
                <p className="text-muted-foreground">
                  {t.contact?.phoneCard?.available || "Available for calls"}
                </p>
              </CardContent>
            </Card>

            {/* WhatsApp Card */}
            <Card className="card-modern hover:scale-105 transition-transform duration-300">
              <CardHeader className="text-center pb-4">
                <div className="bg-green-600/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <MessageSquare className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl">WhatsApp</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-4">
                  {t.contact?.whatsappCard?.description ||
                    "Instant chat and quick scheduling"}
                </p>
                <Button
                  onClick={() => window.open(getWhatsAppLink(), "_blank")}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {t.contact?.whatsappCard?.button || "Start Conversation"}
                </Button>
              </CardContent>
            </Card>

            {/* Location Card */}
            <Card className="card-modern hover:scale-105 transition-transform duration-300">
              <CardHeader className="text-center pb-4">
                <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">
                  {t.contact?.info?.location || "Localização"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-2xl font-bold text-primary mb-2">
                  Porto, Portugal
                </p>
                <p className="text-muted-foreground">
                  {t.contact?.locationCard?.description ||
                    "In-person and online training"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Business Hours */}
          <Card className="card-modern max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">
                {t.contact?.hours?.title || "Horário de Funcionamento"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <h4 className="font-bold text-lg mb-2">
                    {t.contact?.hours?.weekdays || "Dias Úteis"}
                  </h4>
                  <p className="text-2xl font-bold text-primary">
                    6:00 - 20:00
                  </p>
                  <p className="text-muted-foreground">
                    {t.contact?.weekdaysText || "Monday to Friday"}
                  </p>
                </div>
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <h4 className="font-bold text-lg mb-2">
                    {t.contact?.hours?.weekends || "Fins de Semana"}
                  </h4>
                  <p className="text-2xl font-bold text-primary">
                    8:00 - 14:00
                  </p>
                  <p className="text-muted-foreground">
                    {t.contact?.weekendsText || "Saturday and Sunday"}
                  </p>
                </div>
              </div>
              <div className="mt-6 text-center">
                <p className="text-muted-foreground">
                  {t.contact?.info?.locationDesc ||
                    "Atendo clientes em todo o Porto e também ofereço treinos online personalizados"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <div className="text-center mt-16">
            <h3 className="text-2xl font-bold mb-4">
              {t.contact?.cta?.title || "Ready to start your fitness journey?"}
            </h3>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              {t.contact?.cta?.description ||
                "Schedule your free assessment and let's create a personalized plan for your goals."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="btn-primary text-lg py-6 px-8"
                onClick={() => window.open(getWhatsAppLink(), "_blank")}
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                {t.contact?.cta?.button || "Schedule Free Assessment"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-primary text-primary hover:bg-accent font-semibold text-lg py-6 px-8"
                onClick={() => navigate("/#pricing")}
              >
                {t.contact?.cta?.plansButton || "View Plans"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
