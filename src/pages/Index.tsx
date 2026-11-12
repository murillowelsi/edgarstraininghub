import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import LatestVideoSection from "@/components/LatestVideoSection";
import Navbar from "@/components/Navbar";
import PricingSection from "@/components/PricingSection";
import TestimonialsSection from "@/components/TestimonialsSection";

/**
 * Lean home (docs/design/public-site-v2 PS-2): hero → how it works → plans →
 * testimonials → latest YouTube video (thumbnail preview; player loads on tap).
 */
const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1">
        <HeroSection />
        <HowItWorksSection />
        <PricingSection />
        <TestimonialsSection />
        <LatestVideoSection />
      </div>
      <Footer />
    </div>
  );
};

export default Index;
