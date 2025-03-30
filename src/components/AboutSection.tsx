import { useLanguage } from '@/contexts/LanguageContext';
import { Award, Clock, Users } from 'lucide-react';

const AboutSection = () => {
  const { t } = useLanguage(); // Use the translation hook

  return (
    <section id="about" className="section bg-white">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.about.title} <span className="text-brand-blue">{t.about.titleHighlight}</span></h2>
          <div className="h-1 w-20 bg-brand-orange mx-auto"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="rounded-lg overflow-hidden shadow-xl">
              <img
                src="/lovable-uploads/ba2184b9-65d7-4393-87da-9d1999bc5169.png"
                alt="Edgar Zanin - Personal Trainer"
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="absolute -bottom-5 -right-5 bg-white p-4 rounded-lg shadow-lg hidden md:block">
              <p className="font-display font-bold text-2xl text-brand-blue">{t.about.stats.experience}</p>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl md:text-3xl font-bold text-brand-dark">
              {t.about.name}
            </h3>
            <h4 className="text-xl text-brand-blue font-medium">
              {t.about.profession}
            </h4>
            <p className="text-gray-700 leading-relaxed">
              {t.about.bio1}
            </p>
            <p className="text-gray-700 leading-relaxed">
              {t.about.bio2}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <Award className="mx-auto text-brand-blue mb-2" size={32} />
                <h5 className="font-bold">{t.about.stats.certified}</h5>
                <p className="text-sm text-gray-600">{t.about.stats.certifiedDesc}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <Users className="mx-auto text-brand-blue mb-2" size={32} />
                <h5 className="font-bold">{t.about.stats.clients}</h5>
                <p className="text-sm text-gray-600">{t.about.stats.clientsDesc}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <Clock className="mx-auto text-brand-blue mb-2" size={32} />
                <h5 className="font-bold">{t.about.stats.experience}</h5>
                <p className="text-sm text-gray-600">{t.about.stats.experienceDesc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
