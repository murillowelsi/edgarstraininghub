import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import Navbar from "@/components/Navbar";
import PricingSection from "@/components/PricingSection";
import ServicesSection from "@/components/ServicesSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import YouTubeSection from "@/components/YouTubeSection";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 md:pb-20">
        <HeroSection />
        <ServicesSection />
        <PricingSection />
        <YouTubeSection />
        <TestimonialsSection />
      </div>
      <Footer />
    </div>
  );
};

export default Index;
