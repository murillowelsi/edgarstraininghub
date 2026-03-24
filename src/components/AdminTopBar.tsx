import { Moon, Sun, LogOut, MessageSquare } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import GB from "country-flag-icons/react/3x2/GB";
import PT from "country-flag-icons/react/3x2/PT";
import { useState } from "react";

interface AdminTopBarProps {
  chatUnreadCount?: number;
}

const AdminTopBar = ({ chatUnreadCount = 0 }: AdminTopBarProps) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const location = useLocation();

  const navItems = [
    { href: "/admin/posts", label: t.admin.nav.posts },
    { href: "/admin/users", label: t.admin.nav.users },
    { href: "/admin/workouts", label: t.admin.nav.workouts },
    { href: "/admin/teams", label: t.admin.nav.teams },
    { href: "/admin/calendar", label: t.admin.nav.calendar },
    { href: "/admin/subscriptions", label: t.admin.nav.subscriptions },
    { href: "/admin/chat", label: t.admin.nav.chat },
  ];

  const currentTitle = navItems.find((item) =>
    location.pathname.startsWith(item.href)
  )?.label ?? "";
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getInitials = (email?: string | null) => {
    if (!email) return "A";
    return email.charAt(0).toUpperCase();
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

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

        {currentTitle && (
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold">
            {currentTitle}
          </h1>
        )}

        <div className="flex items-center gap-2">
          <Link
            to="/admin/chat"
            className="relative p-2 rounded-full hover:bg-accent transition-colors"
          >
            <MessageSquare className="h-5 w-5" />
            {chatUnreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
              </span>
            )}
          </Link>

          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-1 rounded-full hover:bg-accent transition-colors"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {getInitials(user?.email)}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>

      <Drawer open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DrawerContent>
          <DrawerTitle className="sr-only">Menu</DrawerTitle>
          <div className="px-4 pb-8 pt-2 space-y-4">
            {/* Profile info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                  {getInitials(user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium truncate">{user?.email}</p>
                <p className="text-sm text-muted-foreground capitalize">{t.admin.panel}</p>
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              {/* Language */}
              <div className="flex gap-2">
                <button
                  onClick={() => changeLanguage("en")}
                  className={`flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${language === "en" ? "bg-accent border-primary/30" : "border-border text-muted-foreground hover:bg-accent/50"}`}
                >
                  <GB className="w-5 h-4 rounded-sm shrink-0" />
                  English
                </button>
                <button
                  onClick={() => changeLanguage("pt")}
                  className={`flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${language === "pt" ? "bg-accent border-primary/30" : "border-border text-muted-foreground hover:bg-accent/50"}`}
                >
                  <PT className="w-5 h-4 rounded-sm shrink-0" />
                  Português
                </button>
              </div>

              {/* Theme */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border hover:bg-accent/50 transition-colors text-sm"
              >
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
                <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
              >
                <LogOut size={18} />
                {t.athlete.logout}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </header>
  );
};

export default AdminTopBar;
