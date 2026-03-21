import { LogIn, Menu, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { ChatService } from "../services/chat";
import { useEffect } from "react";
import LanguageSwitcher from "./LanguageSwitcher";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, isAthlete } = useAuth();

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

          {user && isAthlete && (
            <ChatLinkWithBadge user={user} />
          )}


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

        {/* Mobile: utility buttons + Sheet trigger */}
        <div className="md:hidden flex items-center gap-1">
          <LanguageSwitcher />

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <button
                className="p-2 text-foreground hover:text-primary transition-colors"
                aria-label="Open menu"
              >
                <Menu size={24} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <div className="flex flex-col h-full pt-12">
                <nav className="flex flex-col px-6 space-y-1">
                  <a
                    href="/#home"
                    onClick={() => setIsMenuOpen(false)}
                    className="font-semibold text-muted-foreground hover:text-primary transition-colors py-3 border-b border-border/50"
                  >
                    {t.nav.home}
                  </a>
                  <Link
                    to="/about"
                    onClick={() => setIsMenuOpen(false)}
                    className="font-semibold text-muted-foreground hover:text-primary transition-colors py-3 border-b border-border/50"
                  >
                    {t.nav.about}
                  </Link>
                  <Link
                    to="/blog"
                    onClick={() => setIsMenuOpen(false)}
                    className="font-semibold text-muted-foreground hover:text-primary transition-colors py-3 border-b border-border/50"
                  >
                    Blog
                  </Link>
                  <Link
                    to="/contact"
                    onClick={() => setIsMenuOpen(false)}
                    className="font-semibold text-muted-foreground hover:text-primary transition-colors py-3 border-b border-border/50"
                  >
                    {t.nav.contact}
                  </Link>
                  {user && isAthlete && (
                    <ChatLinkWithBadge
                      user={user}
                      className="font-semibold text-muted-foreground hover:text-primary transition-colors py-3 border-b border-border/50 flex items-center justify-between"
                    />
                  )}
                  <Link
                    to="/admin/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="font-semibold text-muted-foreground hover:text-primary transition-colors py-3 flex items-center gap-2"
                  >
                    <LogIn size={18} />
                    Login
                  </Link>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

const ChatLinkWithBadge = ({ user, className }: { user: any, className?: string }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Subscribe to athlete's chats to get total unread count
    const unsubscribe = ChatService.subscribeToUserChats(user.uid, (chats) => {
      const total = chats.reduce((sum, chat) => sum + (chat.unreadCount?.[user.uid] || 0), 0);
      setUnreadCount(total);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <Link
      to="/athlete/chat"
      className={className || "font-semibold text-muted-foreground hover:text-primary transition-colors relative group flex items-center gap-1"}
    >
      Chat
      {unreadCount > 0 && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {unreadCount}
        </span>
      )}
      {!className && <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>}
    </Link>
  );
};

export default Navbar;
