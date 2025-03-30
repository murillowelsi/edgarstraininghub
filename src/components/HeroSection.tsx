
import { ArrowDown, Medal, Clock, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HeroSection = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center bg-gradient-to-r from-gray-100 to-blue-50 overflow-hidden pt-20">
      <div className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=2070')] bg-cover bg-center opacity-10"></div>
      
      <div className="container mx-auto px-4 md:px-6 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-brand-dark leading-tight">
              Transform Your <span className="text-brand-blue">Fitness</span> Journey with Edgar Zanin
            </h1>
            <p className="text-lg md:text-xl text-gray-700 max-w-xl">
              Personal Trainer & Triathlete based in Porto, Portugal. Specializing in endurance training, 
              strength conditioning, and performance optimization.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="bg-brand-blue hover:bg-blue-600 text-white font-medium text-lg py-6 px-8">
                Start Your Journey
              </Button>
              <Button variant="outline" className="border-brand-blue text-brand-blue hover:bg-blue-50 font-medium text-lg py-6 px-8">
                Learn More
              </Button>
            </div>
          </div>
          
          <div className="relative hidden lg:block">
            <div className="bg-gradient-to-b from-white to-gray-50 p-6 rounded-lg shadow-xl max-w-md ml-auto animate-slide-up relative" style={{ animationDelay: '0.4s' }}>
              {/* Achievement Trophy Section */}
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
                <Trophy className="h-10 w-10 text-brand-orange bg-white rounded-full p-2 shadow-md" />
              </div>
              
              <h3 className="text-xl font-bold text-brand-dark mb-4 text-center pt-4">Achievement Shelf</h3>
              
              {/* Wooden Shelf Effect */}
              <div className="bg-gradient-to-r from-amber-700 to-amber-900 h-3 w-full rounded-t-md mb-2"></div>
              
              <div className="space-y-4">
                {/* Ironman Achievement */}
                <div className="bg-white rounded-lg p-4 shadow-md border-l-4 border-brand-orange flex items-start">
                  <Medal className="text-brand-orange h-8 w-8 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-brand-dark">Ironman 70.3 Finisher</h4>
                    <p className="text-sm text-gray-600">1.9 km swim | 90 km bike | 21.1 km run</p>
                  </div>
                </div>
                
                {/* Running PBs */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-lg p-3 shadow-md border-t-2 border-brand-blue">
                    <p className="text-xs text-gray-500 mb-1">5K PB</p>
                    <p className="font-bold text-lg text-brand-blue">19:16</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-md border-t-2 border-brand-blue">
                    <p className="text-xs text-gray-500 mb-1">10K PB</p>
                    <p className="font-bold text-lg text-brand-blue">36:31</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-md border-t-2 border-brand-blue">
                    <p className="text-xs text-gray-500 mb-1">Half Marathon</p>
                    <p className="font-bold text-lg text-brand-blue">1:20:00</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-md border-t-2 border-brand-blue">
                    <p className="text-xs text-gray-500 mb-1">Marathon</p>
                    <p className="font-bold text-lg text-brand-blue">2:56:09</p>
                  </div>
                </div>
              </div>
              
              {/* Wooden Shelf Effect Bottom */}
              <div className="bg-gradient-to-r from-amber-800 to-amber-950 h-4 w-full rounded-b-md mt-4 shadow-inner"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <a href="#about" className="text-brand-blue">
          <ArrowDown size={32} />
        </a>
      </div>
    </section>
  );
};

export default HeroSection;
