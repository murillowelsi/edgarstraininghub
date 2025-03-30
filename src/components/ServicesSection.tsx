
import { Dumbbell, Heart, Timer, Trophy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ServicesSection = () => {
  const services = [
    {
      icon: <Dumbbell className="h-12 w-12 text-brand-blue" />,
      title: "Strength Training",
      description: "Customized strength programs for all fitness levels, focusing on proper form and progressive overload principles."
    },
    {
      icon: <Heart className="h-12 w-12 text-brand-blue" />,
      title: "Endurance Coaching",
      description: "Specialized training for runners, cyclists, and triathletes looking to improve stamina and race performance."
    },
    {
      icon: <Timer className="h-12 w-12 text-brand-blue" />,
      title: "HIIT & Conditioning",
      description: "High-intensity interval training sessions designed to maximize calorie burn and improve cardiovascular fitness."
    },
    {
      icon: <Trophy className="h-12 w-12 text-brand-blue" />,
      title: "Race Preparation",
      description: "Comprehensive training plans for upcoming races, from 5K to marathon and triathlon events."
    }
  ];

  return (
    <section id="services" className="section bg-gray-50">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">My <span className="text-brand-blue">Services</span></h2>
          <div className="h-1 w-20 bg-brand-orange mx-auto mb-6"></div>
          <p className="max-w-2xl mx-auto text-gray-700">
            Comprehensive fitness and performance coaching tailored to your individual goals and needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <Card key={index} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="text-center pt-6">
                <div className="mx-auto mb-4">{service.icon}</div>
                <CardTitle className="text-xl font-bold">{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-gray-700">{service.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 bg-gradient-to-r from-brand-blue to-blue-600 rounded-xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to Transform Your Fitness?</h3>
              <p className="text-blue-100 mb-6">
                I offer personalized 1-on-1 training sessions both in-person in Porto and online for clients worldwide.
                Every program is custom-designed to fit your specific goals, fitness level, and schedule.
              </p>
              <div>
                <a href="#contact" className="inline-block px-6 py-3 bg-white text-brand-blue font-bold rounded-md hover:bg-gray-100 transition-colors">
                  Get in Touch
                </a>
              </div>
            </div>
            <div className="hidden lg:block relative min-h-[300px]">
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
