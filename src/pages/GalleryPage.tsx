
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PhotoGallery from "@/components/PhotoGallery";
import { useLanguage } from "@/contexts/LanguageContext";

const GalleryPage = () => {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="section bg-brand-light py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Training Group <span className="text-brand-blue">Gallery</span>
            </h1>
            <div className="h-1 w-20 bg-brand-orange mx-auto mb-6"></div>
            <p className="max-w-2xl mx-auto text-gray-700">
              Check out photos from our amazing training sessions and events
            </p>
          </div>
          
          <PhotoGallery />
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default GalleryPage;
