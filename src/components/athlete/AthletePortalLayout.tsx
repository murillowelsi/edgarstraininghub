import { cn } from "@/lib/utils";
import { Calendar, Dumbbell, Home, LogOut, Moon, Sun } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { auth } from "@/lib/firebase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AthletePortalLayoutProps {
  children: React.ReactNode;
  title?: string;
  showHeader?: boolean;
}

const navItems = [
  { href: "/athlete", label: "Home", icon: Home },
  { href: "/athlete/calendar", label: "Calendar", icon: Calendar },
  { href: "/athlete/workouts", label: "Workouts", icon: Dumbbell },
];

const AthletePortalLayout = ({
  children,
  title,
  showHeader = true,
}: AthletePortalLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isActive = (href: string) => {
    if (href === "/athlete") {
      return location.pathname === "/athlete";
    }
    return location.pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  const getInitials = (email: string | null | undefined) => {
    if (!email) return "A";
    return email.charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header */}
      {showHeader && (
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="px-4 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link
              to="/athlete"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span className="text-primary font-display font-extrabold text-2xl tracking-tighter">
                EZ
              </span>
              <span className="text-foreground font-display font-bold text-sm hidden sm:block">
                Training
              </span>
            </Link>

            {/* Title - center on mobile */}
            {title && (
              <h1 className="absolute left-1/2 transform -translate-x-1/2 text-lg font-semibold">
                {title}
              </h1>
            )}

            {/* User Menu */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1 rounded-full hover:bg-accent transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                        {getInitials(user?.email)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium truncate">{user?.email}</p>
                    <p className="text-xs text-muted-foreground">Athlete</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
      )}

      {/* Main content area - scrollable */}
      <main className="flex-1 overflow-auto pb-20">{children}</main>

      {/* Bottom navigation - fixed */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border/50 safe-area-bottom z-50">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-all",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-transform",
                    active && "scale-110"
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span
                  className={cn(
                    "text-xs mt-1",
                    active ? "font-semibold" : "font-medium"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AthletePortalLayout;
