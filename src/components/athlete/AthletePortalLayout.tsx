import { cn } from "@/lib/utils";
import { Calendar, Camera, Dumbbell, Home, LayoutGrid, LogOut, Moon, MoreVertical, Shield, Sun, MessageSquare, X } from "lucide-react";
import GB from "country-flag-icons/react/3x2/GB";
import PT from "country-flag-icons/react/3x2/PT";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { ChatService } from "@/services/chat";
import { subscribeToMentionCount } from "@/services/timelineService";
import { NotificationService } from "@/services/notifications";
import { FCMService } from "@/services/fcm";
import { useEffect, useRef, useState } from "react";

interface AthletePortalLayoutProps {
  children: React.ReactNode;
  title?: string;
  showHeader?: boolean;
  fullHeight?: boolean;
  hideBottomNav?: boolean;
}

const AthletePortalLayout = ({
  children,
  title,
  showHeader = true,
  fullHeight = false,
  hideBottomNav = false,
}: AthletePortalLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, photoURL, setPhotoURL } = useAuth();
  const { t, language, changeLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const navItems = [
    { href: "/athlete", label: t.athlete.nav.home, icon: Home, exact: true, featured: false },
    { href: "/athlete/teams", label: t.athlete.nav.teams, icon: Shield, exact: false, featured: false },
    { href: "/athlete/timeline", label: "Feed", icon: LayoutGrid, featured: true },
    { href: "/athlete/calendar", label: t.athlete.nav.calendar, icon: Calendar, featured: false },
    { href: "/athlete/workouts", label: t.athlete.nav.workouts, icon: Dumbbell, featured: false },
  ];
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [feedUnreadCount, setFeedUnreadCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const prevMessageTimes = useRef<Map<string, number>>(new Map());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!user) return;
    return subscribeToMentionCount(user.uid, setFeedUnreadCount);
  }, [user]);

  // Register for push notifications and listen for FCM messages
  useEffect(() => {
    if (!user) return;

    let unsubscribeFCM: (() => void) | null = null;

    const setupFCM = async () => {
      // Register FCM token if permission already granted (e.g. returning user)
      if (NotificationService.isGranted()) {
        await FCMService.registerToken(user.uid);
      }

      // Listen for foreground messages
      unsubscribeFCM = FCMService.listenForeground('/athlete/chat');
    };

    setupFCM().catch(err => console.error("FCM setup error:", err));

    return () => {
      if (unsubscribeFCM) {
        unsubscribeFCM();
      }
    };
  }, [user]);

  // Subscribe to chats — unread count, badge, and in-app notifications
  useEffect(() => {
    if (!user) return;

    const unsubscribe = ChatService.subscribeToAthleteChats(user.uid, (chats) => {
      const totalUnread = chats.reduce((sum, chat) => {
        return sum + (chat.unreadCount?.[user.uid] || 0);
      }, 0);

      chats.forEach((chat) => {
        if (!isFirstLoad.current) {
          const currentTime = chat.lastMessageTime?.toMillis?.() ?? 0;
          const prevTime = prevMessageTimes.current.get(chat.id) ?? 0;
          const hasNewMessage = currentTime > prevTime;
          const hasUnread = (chat.unreadCount?.[user.uid] ?? 0) > 0;
          const onChatPage = window.location.pathname.includes('/chat');

          if (hasNewMessage && hasUnread && !onChatPage) {
            // Find the other participant's name (coach/admin name)
            const otherName = 'Coach';
            NotificationService.showChatNotification(
              otherName,
              chat.lastMessage || 'New message',
              '/athlete/chat'
            );
          }
        }
        prevMessageTimes.current.set(chat.id, chat.lastMessageTime?.toMillis?.() ?? 0);
      });

      if (isFirstLoad.current) isFirstLoad.current = false;

      setChatUnreadCount(totalUnread);
      NotificationService.setBadge(totalUnread);
    });

    return () => unsubscribe();
  }, [user]);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploadingPhoto(true);
    try {
      const url = await uploadImageToCloudinary(file, "profile-photos");
      await updateDoc(doc(db, "users", user.uid), { photoURL: url });
      setPhotoURL(url);
    } catch (err) {
      console.error("Error uploading photo:", err);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePhotoRemove = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { photoURL: null });
      setPhotoURL(null);
    } catch (err) {
      console.error("Error removing photo:", err);
    }
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

            {/* Right controls */}
            <div className="flex items-center gap-2">
              <Link
                to="/athlete/chat"
                className={cn(
                  "relative p-2 rounded-full transition-colors",
                  location.pathname.startsWith("/athlete/chat")
                    ? "text-primary bg-primary/10"
                    : "hover:bg-accent"
                )}
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
                className="p-2 rounded-full hover:bg-accent transition-colors"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Profile Drawer */}
      <Drawer open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DrawerContent>
          <DrawerTitle className="sr-only">Menu</DrawerTitle>
          <div className="px-4 pb-8 pt-2 space-y-4">
            {/* Profile info */}
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="relative group rounded-full focus:outline-none"
                >
                  <Avatar className="h-14 w-14 ring-2 ring-white">
                    {photoURL && <AvatarImage src={photoURL} alt="Profile" className="object-cover" />}
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                      {getInitials(user?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </button>
                {photoURL && !isUploadingPhoto && (
                  <button
                    onClick={handlePhotoRemove}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive flex items-center justify-center"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{user?.email}</p>
                <p className="text-sm text-muted-foreground">{t.athlete.role}</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />

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

      {/* Main content area */}
      <main className={fullHeight ? (hideBottomNav ? "h-[calc(100vh-4rem)] overflow-hidden flex flex-col" : "h-[calc(100vh-8rem)] overflow-hidden flex flex-col") : "flex-1 overflow-auto pb-20"}>{children}</main>

      {/* Bottom navigation - fixed */}
      <nav className={cn("fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border/50 safe-area-bottom z-50", hideBottomNav && "hidden")}>
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            const badgeCount = item.href === "/athlete/timeline" ? feedUnreadCount : 0;
            return (
              <Link
                key={item.href}
                to={item.href}
                className="flex flex-col items-center justify-center flex-1 h-full transition-all"
              >
                <div className="relative">
                  <div className={cn(
                    "flex items-center justify-center transition-all",
                    active ? "text-primary" : "text-muted-foreground"
                  )}>
                    <item.icon className={cn("h-5 w-5", active && "scale-110")} />
                  </div>
                  {badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  )}
                </div>
                <span className={cn("text-xs mt-1", active ? "text-primary font-semibold" : "text-muted-foreground font-medium")}>
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
