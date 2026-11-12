import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import Navbar from "@/components/Navbar";
import PricingSection from "@/components/PricingSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import { useLanguage } from "@/contexts/LanguageContext";
import { Youtube } from "lucide-react";

/**
 * Lean home (docs/design/public-site-v2 PS-2): hero → how it works → plans →
 * testimonials, with the YouTube channel as one line instead of a large player.
 */
const Index = () => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1">
        <HeroSection />
        <HowItWorksSection />
        <PricingSection />
        <TestimonialsSection />
        <p className="container mx-auto flex items-center justify-center gap-2 px-4 pb-12 text-center text-muted-foreground">
          <Youtube className="h-5 w-5 shrink-0 text-destructive-ink" aria-hidden />
          <span>
            {t.youtube.moreVideos}{" "}
            <a href="https://www.youtube.com/@edgarzanin" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-ink hover:underline">
              {t.youtube.channel}
            </a>
            .
          </span>
        </p>
      </div>
      <Footer />
    </div>
  );
};

export default Index;
