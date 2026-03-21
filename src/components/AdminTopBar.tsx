import { Moon, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import LanguageSwitcher from "./LanguageSwitcher";

/**
 * Minimal top bar for admin pages on mobile.
 * Replaces the public Navbar — no nav links, no hamburger.
 * Navigation is handled by the BottomNav on mobile and the sidebar on desktop.
 */
const AdminTopBar = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-background/80 backdrop-blur-lg fixed w-full z-50 border-b border-border/50">
      <div className="px-4 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="text-primary font-display font-extrabold text-3xl tracking-tighter">
            EZ
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminTopBar;
