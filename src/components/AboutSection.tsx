
import { Award, Users, Clock } from 'lucide-react';

const AboutSection = () => {
  return (
    <section id="about" className="section bg-white">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">About <span className="text-brand-blue">Me</span></h2>
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
              <p className="font-display font-bold text-2xl text-brand-blue">7+ Years Experience</p>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl md:text-3xl font-bold text-brand-dark">
              Edgar Alan Zanin
            </h3>
            <h4 className="text-xl text-brand-blue font-medium">
              Personal Trainer & Triathlete
            </h4>
            <p className="text-gray-700 leading-relaxed">
              Based in the beautiful coastal city of Porto, Portugal, I've dedicated my life to fitness, 
              endurance sports, and helping others achieve their peak performance potential. As a certified 
              personal trainer and experienced triathlete, I bring both professional knowledge and practical 
              experience to my training programs.
            </p>
            <p className="text-gray-700 leading-relaxed">
              My journey began with a passion for running, which evolved into competitive racing and eventually 
              led me to complete the challenging Ironman 70.3. I understand the dedication, discipline, and 
              mental fortitude required to push your limits and achieve seemingly impossible goals.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <Award className="mx-auto text-brand-blue mb-2" size={32} />
                <h5 className="font-bold">Certified</h5>
                <p className="text-sm text-gray-600">Professional training</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <Users className="mx-auto text-brand-blue mb-2" size={32} />
                <h5 className="font-bold">100+ Clients</h5>
                <p className="text-sm text-gray-600">Success stories</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <Clock className="mx-auto text-brand-blue mb-2" size={32} />
                <h5 className="font-bold">7+ Years</h5>
                <p className="text-sm text-gray-600">Experience</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
