import { cn } from "@/lib/utils";
import { Bell, Calendar, Camera, Dumbbell, Home, LayoutGrid, LogOut, Moon, Shield, SquarePen, Sun, MessageSquare, User, X } from "lucide-react";
import LanguageChoice from "@/components/LanguageChoice";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { Spinner } from "@/components/ui/spinner";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { ChatService } from "@/services/chat";
import { createMentionNotifications, createTimelinePost, subscribeToMentionCount } from "@/services/timelineService";
import { NotificationService } from "@/services/notifications";
import { FCMService } from "@/services/fcm";
import { useEffect, useRef, useState } from "react";
import LogExtraWorkoutSheet from "@/components/athlete/LogExtraWorkoutSheet";
import { getAssignmentsWithWorkoutsByAthlete } from "@/services/workoutAssignmentsService";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import { GlassTabBar } from "@/components/glass/GlassTabBar";
import { GlassCircleButton, GlassCircleLink } from "@/components/glass/GlassToolbar";
import { useTopBarMenu } from "@/contexts/TopBarMenuContext";
import { useTimelineActions } from "@/contexts/TimelineActionsContext";
import { CreatePostModal } from "@/components/timeline/CreatePostModal";
import type { ComposerResult } from "@/types/timeline";
import { ActivityDrawer } from "@/components/timeline/ActivityDrawer";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";

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
  const { user, photoURL, setPhotoURL, userRole, displayName } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(false);
  usePageTitle(title);

  const navItems = [
    { href: "/athlete", label: t.athlete.nav.home, icon: Home, exact: true, featured: false },
    { href: "/athlete/teams", label: t.athlete.nav.teams, icon: Shield, exact: false, featured: false },
    { href: "/athlete/timeline", label: t.athlete.nav.timeline, icon: LayoutGrid, featured: true },
    { href: "/athlete/calendar", label: t.athlete.nav.calendar, icon: Calendar, featured: false },
    { href: "/athlete/profile", label: t.athlete.nav.profile, icon: User, exact: false, featured: false },
  ];
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [feedUnreadCount, setFeedUnreadCount] = useState(0);
  const { isMenuOpen, setIsMenuOpen } = useTopBarMenu();
  const { createOpen, setCreateOpen, activityOpen, setActivityOpen, activityUnreadCount } = useTimelineActions();
  // Quick "log a strength workout" from any page; the athlete's workouts load on first open
  const [logExtraOpen, setLogExtraOpen] = useState(false);
  const [logExtraAssignments, setLogExtraAssignments] = useState<AssignmentWithWorkout[] | null>(null);

  const openLogExtra = () => {
    setLogExtraOpen(true);
    if (user && logExtraAssignments === null) {
      getAssignmentsWithWorkoutsByAthlete(user.uid)
        .then(setLogExtraAssignments)
        .catch((err) => {
          console.error("Error loading workouts:", err);
          setLogExtraAssignments([]);
        });
    }
  };

  const handleCreate = async ({ caption, imageUrls, mentions }: ComposerResult) => {
    if (!user || !userRole) return;
    const authorName = displayName || user.email || "User";
    const postId = await createTimelinePost({ caption, imageUrls, mentions }, user.uid, authorName, userRole, photoURL);
    if (mentions.length) {
      await createMentionNotifications(postId, mentions.map((m) => m.id), authorName, caption);
    }
    toast({ title: t.timeline.postShared });
  };

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

  const handleLogout = async () => {
    setIsMenuOpen(false);
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
    setConfirmRemovePhoto(false);
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
        // Standalone PWA with viewport-fit=cover: keep the bar below the iPhone status bar
        <header className="sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
          <div aria-hidden className="glass-fade absolute inset-x-0 top-0 -bottom-4 pointer-events-none" />
          {/* Strava-style bar: create on the left, title (the "EZ" logo on Home) centered, inbox + alerts on the right */}
          <div className="relative px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GlassCircleButton active={createOpen} aria-expanded={createOpen} onClick={() => setCreateOpen(true)} aria-label={t.timeline.newPost} title={t.timeline.newPost}>
                <SquarePen />
              </GlassCircleButton>
              <GlassCircleButton active={logExtraOpen} aria-expanded={logExtraOpen} onClick={openLogExtra} aria-label={t.athlete.home.logExtra} title={t.athlete.home.logExtra}>
                <Dumbbell />
              </GlassCircleButton>
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 max-w-[calc(100%-14rem)] flex justify-center">
              {location.pathname === "/athlete" || !title ? (
                <Link
                  to="/athlete"
                  aria-label={t.athlete.nav.home}
                  // Padding grows the hit area to 40px+ without changing the logo size
                  className="-m-1.5 p-1.5 min-h-10 flex items-center rounded-lg text-primary font-display font-extrabold text-[28px] leading-none tracking-tighter hover:opacity-80 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  EZ
                </Link>
              ) : (
                <h1 className="truncate text-center text-[17px] font-semibold">{title}</h1>
              )}
            </div>

            <div className="flex items-center gap-2">
              <GlassCircleLink to="/athlete/chat" active={location.pathname.startsWith("/athlete/chat") && !createOpen && !activityOpen && !logExtraOpen} aria-label={t.athlete.chat.title}>
                <MessageSquare />
                {chatUnreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                  </span>
                )}
              </GlassCircleLink>

              <GlassCircleButton active={activityOpen} aria-expanded={activityOpen} onClick={() => setActivityOpen(true)} aria-label={t.timeline.activity.title} title={t.timeline.activity.title}>
                <Bell />
                {activityUnreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
                )}
              </GlassCircleButton>
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
                  aria-label={t.settings.changePhoto}
                  className="relative group rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <CachedAvatar
                    src={photoURL}
                    alt="Profile"
                    fallback={getInitials(user?.email)}
                    className="h-14 w-14 ring-2 ring-[#e1b506]"
                    fallbackClassName="bg-primary text-primary-foreground text-lg font-semibold"
                  />
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                      <Spinner size="xs" className="text-white" />
                    </div>
                  )}
                </button>
                {photoURL && !isUploadingPhoto && (
                  // 32px badge with a 40px hit area (::after); removing asks first
                  <button
                    onClick={() => setConfirmRemovePhoto(true)}
                    aria-label={t.settings.removePhoto}
                    className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-destructive ring-2 ring-background flex items-center justify-center after:absolute after:-inset-1 after:content-[''] outline-none focus-visible:ring-primary"
                  >
                    <X className="h-4 w-4 text-white" />
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
              <LanguageChoice />

              {/* Theme */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border hover:bg-accent/50 transition-colors text-sm"
              >
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
                <span>{theme === "light" ? t.settings.darkMode : t.settings.lightMode}</span>
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 dark:border-red-400/40 dark:text-red-400 dark:hover:bg-red-400/10 transition-colors text-sm font-medium"
              >
                <LogOut size={18} />
                {t.athlete.logout}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      <ResponsiveConfirm
        open={confirmRemovePhoto}
        onOpenChange={setConfirmRemovePhoto}
        title={t.settings.removePhoto}
        description={t.settings.removePhotoDescription}
        confirmLabel={t.common.remove}
        destructive
        onConfirm={handlePhotoRemove}
      />

      {/* Main content area */}
      <main className={fullHeight ? (hideBottomNav ? "h-[calc(100vh-4rem-env(safe-area-inset-top))] overflow-hidden flex flex-col" : "h-[calc(100vh-9.5rem-env(safe-area-inset-top))] overflow-hidden flex flex-col") : cn("flex-1 overflow-auto", hideBottomNav ? "pb-6" : "pb-28")}>{children}</main>

      {/* Bottom navigation — floating liquid-glass pill */}
      {!hideBottomNav && (
        <GlassTabBar
          id="athlete"
          items={navItems.map((item) => ({
            ...item,
            badge: item.href === "/athlete/timeline" ? feedUnreadCount : undefined,
          }))}
        />
      )}

      <CreatePostModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />
      <ActivityDrawer
        open={activityOpen}
        onOpenChange={setActivityOpen}
      />
      {user && (
        <LogExtraWorkoutSheet
          open={logExtraOpen}
          onOpenChange={setLogExtraOpen}
          athleteId={user.uid}
          date={new Date()}
          assignments={logExtraAssignments ?? []}
          loading={logExtraAssignments === null}
        />
      )}
    </div>
  );
};

export default AthletePortalLayout;
