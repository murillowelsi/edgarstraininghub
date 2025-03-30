
import { Instagram, Facebook, Linkedin, Mail } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-brand-dark text-white pt-16 pb-8">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="text-2xl font-bold mb-4 text-white">Edgar Zanin</h3>
            <p className="text-gray-300 mb-4">
              Personal Trainer & Triathlete based in Porto, Portugal, specializing in endurance training and performance optimization.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-brand-blue transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-brand-blue transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-brand-blue transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-brand-blue transition-colors">
                <Mail size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-bold mb-4 text-white">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#home" className="text-gray-300 hover:text-brand-blue transition-colors">Home</a></li>
              <li><a href="#about" className="text-gray-300 hover:text-brand-blue transition-colors">About</a></li>
              <li><a href="#services" className="text-gray-300 hover:text-brand-blue transition-colors">Services</a></li>
              <li><a href="#achievements" className="text-gray-300 hover:text-brand-blue transition-colors">Achievements</a></li>
              <li><a href="#contact" className="text-gray-300 hover:text-brand-blue transition-colors">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-bold mb-4 text-white">Services</h4>
            <ul className="space-y-2">
              <li><a href="#services" className="text-gray-300 hover:text-brand-blue transition-colors">Strength Training</a></li>
              <li><a href="#services" className="text-gray-300 hover:text-brand-blue transition-colors">Endurance Coaching</a></li>
              <li><a href="#services" className="text-gray-300 hover:text-brand-blue transition-colors">HIIT & Conditioning</a></li>
              <li><a href="#services" className="text-gray-300 hover:text-brand-blue transition-colors">Race Preparation</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-bold mb-4 text-white">Get in Touch</h4>
            <ul className="space-y-2">
              <li className="text-gray-300">Porto, Portugal</li>
              <li className="text-gray-300">edgar.zanin@example.com</li>
              <li className="text-gray-300">+351 123 456 789</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; {currentYear} Edgar Zanin. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 text-sm hover:text-brand-blue transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 text-sm hover:text-brand-blue transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
