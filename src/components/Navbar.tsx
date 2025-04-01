
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useLanguage();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-white/90 backdrop-blur-sm fixed w-full z-50 shadow-sm">
      <div className="container mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
        <div className="text-brand-blue font-display font-bold text-2xl">Edgar Zanin</div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          <a href="#home" className="font-medium text-gray-700 hover:text-brand-blue transition-colors">{t.nav.home}</a>
          <a href="#about" className="font-medium text-gray-700 hover:text-brand-blue transition-colors">{t.nav.about}</a>
          <a href="#services" className="font-medium text-gray-700 hover:text-brand-blue transition-colors">{t.nav.services}</a>
          <a href="#achievements" className="font-medium text-gray-700 hover:text-brand-blue transition-colors">{t.nav.achievements}</a>
          <a href="#contact" className="font-medium text-gray-700 hover:text-brand-blue transition-colors">{t.nav.contact}</a>
          <Link to="/gallery" className="font-medium text-gray-700 hover:text-brand-blue transition-colors">Gallery</Link>
          <Button className="bg-brand-blue hover:bg-blue-600 text-white font-medium">{t.nav.getStarted}</Button>
          <LanguageSwitcher />
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <LanguageSwitcher />
          <button onClick={toggleMenu} className="text-gray-700 ml-4">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white py-4 px-4 shadow-lg animate-fade-in">
          <div className="flex flex-col space-y-4">
            <a href="#home" className="font-medium text-gray-700 hover:text-brand-blue transition-colors py-2 border-b">{t.nav.home}</a>
            <a href="#about" className="font-medium text-gray-700 hover:text-brand-blue transition-colors py-2 border-b">{t.nav.about}</a>
            <a href="#services" className="font-medium text-gray-700 hover:text-brand-blue transition-colors py-2 border-b">{t.nav.services}</a>
            <a href="#achievements" className="font-medium text-gray-700 hover:text-brand-blue transition-colors py-2 border-b">{t.nav.achievements}</a>
            <a href="#contact" className="font-medium text-gray-700 hover:text-brand-blue transition-colors py-2 border-b">{t.nav.contact}</a>
            <Link to="/gallery" className="font-medium text-gray-700 hover:text-brand-blue transition-colors py-2 border-b">Gallery</Link>
            <Button className="bg-brand-blue hover:bg-blue-600 text-white font-medium mt-2">{t.nav.getStarted}</Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
