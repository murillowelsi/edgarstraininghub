
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t, language } = useLanguage();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-background/80 backdrop-blur-lg fixed w-full z-50 border-b border-border/50">
      <div className="container mx-auto px-4 md:px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-primary font-display font-extrabold text-3xl tracking-tighter">EZ</span>
            <div className="text-foreground font-display font-bold text-xl hidden sm:block">Edgar Zanin</div>
          </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          <a href="/#home" className="font-semibold text-muted-foreground hover:text-primary transition-colors relative group">
            {t.nav.home}
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
          </a>
          <a href="/#about" className="font-semibold text-muted-foreground hover:text-primary transition-colors relative group">
            {t.nav.about}
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
          </a>
          <a href="/#services" className="font-semibold text-muted-foreground hover:text-primary transition-colors relative group">
            {t.nav.services}
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
          </a>
          <a href="/#achievements" className="font-semibold text-muted-foreground hover:text-primary transition-colors relative group">
            {t.nav.achievements}
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
          </a>
          <a href="/blog" className="font-semibold text-muted-foreground hover:text-primary transition-colors relative group">
            {t.nav.blog}
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
          </a>
          <a href="/#contact" className="font-semibold text-muted-foreground hover:text-primary transition-colors relative group">
            {t.nav.contact}
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
          </a>
          <LanguageSwitcher />
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <LanguageSwitcher />
          <button onClick={toggleMenu} className="text-foreground ml-4 hover:text-primary transition-colors">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-lg py-6 px-4 shadow-xl animate-fade-in border-t border-border/50">
          <div className="flex flex-col space-y-4">
            <a href="/#home" className="font-semibold text-muted-foreground hover:text-primary transition-colors py-3 border-b border-border/50">{t.nav.home}</a>
            <a href="/#about" className="font-semibold text-muted-foreground hover:text-primary transition-colors py-3 border-b border-border/50">{t.nav.about}</a>
            <a href="/#services" className="font-semibold text-muted-foreground hover:text-primary transition-colors py-3 border-b border-border/50">{t.nav.services}</a>
            <a href="/#achievements" className="font-semibold text-muted-foreground hover:text-primary transition-colors py-3 border-b border-border/50">{t.nav.achievements}</a>
            <a href="/blog" className="font-semibold text-muted-foreground hover:text-primary transition-colors py-3 border-b border-border/50">{t.nav.blog}</a>
            <a href="/#contact" className="font-semibold text-muted-foreground hover:text-primary transition-colors py-3 border-b border-border/50">{t.nav.contact}</a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
