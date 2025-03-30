
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-white/90 backdrop-blur-sm fixed w-full z-50 shadow-sm">
      <div className="container mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
        <div className="text-brand-blue font-display font-bold text-2xl">Edgar Zanin</div>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          <a href="#home" className="font-medium text-gray-700 hover:text-brand-blue transition-colors">Home</a>
          <a href="#about" className="font-medium text-gray-700 hover:text-brand-blue transition-colors">About</a>
          <a href="#services" className="font-medium text-gray-700 hover:text-brand-blue transition-colors">Services</a>
          <a href="#achievements" className="font-medium text-gray-700 hover:text-brand-blue transition-colors">Achievements</a>
          <a href="#contact" className="font-medium text-gray-700 hover:text-brand-blue transition-colors">Contact</a>
          <Button className="bg-brand-blue hover:bg-blue-600 text-white font-medium">Get Started</Button>
        </div>
        
        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button onClick={toggleMenu} className="text-gray-700">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white py-4 px-4 shadow-lg animate-fade-in">
          <div className="flex flex-col space-y-4">
            <a href="#home" className="font-medium text-gray-700 hover:text-brand-blue transition-colors py-2 border-b">Home</a>
            <a href="#about" className="font-medium text-gray-700 hover:text-brand-blue transition-colors py-2 border-b">About</a>
            <a href="#services" className="font-medium text-gray-700 hover:text-brand-blue transition-colors py-2 border-b">Services</a>
            <a href="#achievements" className="font-medium text-gray-700 hover:text-brand-blue transition-colors py-2 border-b">Achievements</a>
            <a href="#contact" className="font-medium text-gray-700 hover:text-brand-blue transition-colors py-2 border-b">Contact</a>
            <Button className="bg-brand-blue hover:bg-blue-600 text-white font-medium mt-2">Get Started</Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
