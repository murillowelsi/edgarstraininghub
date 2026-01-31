import { LogIn, Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import LanguageSwitcher from "./LanguageSwitcher";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-background/80 backdrop-blur-lg fixed w-full z-50 border-b border-border/50">
      <div className="container mx-auto px-4 md:px-6 py-5 flex justify-between items-center">
        <a
          href="/#home"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="text-primary font-display font-extrabold text-3xl tracking-tighter">
            EZ
          </span>
          <div className="text-foreground font-display font-bold text-xl hidden sm:block">
            Edgar Zanin
          </div>
        </a>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          <a
            href="/#home"
            className="font-semibold text-muted-foreground hover:text-primary transition-colors relative group"
          >
            {t.nav.home}
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
          </a>
          <Link
            to="/about"
            className="font-semibold text-muted-foreground hover:text-primary transition-colors relative group"
          >
            {t.nav.about}
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
          </Link>
          <Link
            to="/blog"
            className="font-semibold text-muted-foreground hover:text-primary transition-colors relative group"
          >
            Blog
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
          </Link>
          <Link
            to="/contact"
            className="font-semibold text-muted-foreground hover:text-primary transition-colors relative group"
          >
            {t.nav.contact}
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
          </Link>

          {/* Utility buttons group */}
          <div className="flex items-center gap-1 pl-4 border-l border-border">
            <LanguageSwitcher />

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <Link
              to="/admin/login"
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
              aria-label="Admin login"
            >
              <LogIn size={18} />
            </Link>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-1">
          <LanguageSwitcher />

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <Link
            to="/admin/login"
            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
            aria-label="Admin login"
          >
            <LogIn size={18} />
          </Link>

          <button
            onClick={toggleMenu}
            className="p-2 text-foreground hover:text-primary transition-colors"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-lg py-6 px-4 shadow-xl animate-fade-in border-t border-border/50">
          <div className="flex flex-col space-y-4">
            <a
              href="/#home"
              className="font-semibold text-muted-foreground hover:text-primary transition-colors py-3 border-b border-border/50"
            >
              {t.nav.home}
            </a>
            <Link
              to="/about"
              className="font-semibold text-muted-foreground hover:text-primary transition-colors py-3 border-b border-border/50"
            >
              {t.nav.about}
            </Link>
            <Link
              to="/blog"
              className="font-semibold text-muted-foreground hover:text-primary transition-colors py-3 border-b border-border/50"
            >
              Blog
            </Link>
            <Link
              to="/contact"
              className="font-semibold text-muted-foreground hover:text-primary transition-colors py-3 border-b border-border/50"
            >
              {t.nav.contact}
            </Link>
            <Link
              to="/admin/login"
              className="font-semibold text-muted-foreground hover:text-primary transition-colors py-3 flex items-center gap-2"
            >
              <LogIn size={18} />
              Login
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
