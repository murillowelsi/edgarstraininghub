
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { MapPin, Phone, MessageSquare } from 'lucide-react';

const ContactSection = () => {
  const { t, language } = useLanguage();

  // WhatsApp pre-filled message based on language
  const getWhatsAppLink = () => {
    const phone = "+351962869476"; // Updated phone number

    const message = language === 'pt' ? "Olá! Estou interessado(a) em saber mais sobre os seus serviços de personal training." : "Hello! I'm interested in learning more about your personal training services.";
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };
  
  return <section id="contact" className="section bg-white">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.contact.title} <span className="text-brand-blue">{t.contact.titleHighlight}</span></h2>
          <div className="h-1 w-20 bg-brand-orange mx-auto mb-6"></div>
          <p className="max-w-2xl mx-auto text-gray-700">
            {t.contact.subtitle}
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold mb-6">{t.contact.info.title}</h3>
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="bg-brand-blue bg-opacity-10 p-3 rounded-full mr-4">
                <Phone className="h-6 w-6 text-brand-blue" />
              </div>
              <div>
                <h4 className="font-bold text-lg">{t.contact.info.phone}</h4>
                <p className="text-gray-700">+351 962 869 476</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-brand-blue bg-opacity-10 p-3 rounded-full mr-4">
                <MessageSquare className="h-6 w-6 text-brand-blue" />
              </div>
              <div>
                <h4 className="font-bold text-lg">{t.contact.info.whatsapp || "WhatsApp"}</h4>
                <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700 font-medium flex items-center mt-1 gap-2">
                  <span>Chat now</span>
                  <Button variant="outline" size="icon" className="bg-green-600 hover:bg-green-700 h-8 w-8 rounded-full p-1.5">
                    <MessageSquare className="h-full w-full text-white" />
                  </Button>
                </a>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-brand-blue bg-opacity-10 p-3 rounded-full mr-4">
                <MapPin className="h-6 w-6 text-brand-blue" />
              </div>
              <div>
                <h4 className="font-bold text-lg">{t.contact.info.location}</h4>
                <p className="text-gray-700">Porto, Portugal</p>
                <p className="text-gray-600 text-sm mt-1">{t.contact.info.locationDesc}</p>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4">{t.contact.hours.title}</h3>
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">{t.contact.hours.weekdays}</h4>
                  <p className="text-gray-700">6:00 AM - 8:00 PM</p>
                </div>
                <div>
                  <h4 className="font-medium">{t.contact.hours.weekends}</h4>
                  <p className="text-gray-700">8:00 AM - 2:00 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default ContactSection;
