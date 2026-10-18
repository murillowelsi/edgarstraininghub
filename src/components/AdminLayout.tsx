import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarDays, Dumbbell, ExternalLink, FileText, Home, LayoutGrid, LogOut, MessageSquareQuote, PanelLeftClose, PanelLeftOpen, Shield, UserRound, Users } from "lucide-react";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { auth } from "../lib/firebase";
import AdminTopBar from "./AdminTopBar";
import { ChatService } from "../services/chat";
import { NotificationService } from "../services/notifications";
import { BottomNav } from "./admin/BottomNav";
import { CreatePostModal } from "./timeline/CreatePostModal";
import type { ComposerResult } from "@/types/timeline";
import { ActivityDrawer } from "./timeline/ActivityDrawer";
import { useTimelineActions } from "../contexts/TimelineActionsContext";
import { createMentionNotifications, createTimelinePost } from "../services/timelineService";
import { useToast } from "../hooks/use-toast";

interface AdminLayoutProps {
  children: React.ReactNode;
  fullHeight?: boolean;
  hideBottomNav?: boolean;
  pageTitle?: string;
}

const AdminLayout = ({ children, fullHeight = false, hideBottomNav = false, pageTitle }: AdminLayoutProps) => {
  const { user, userRole, displayName, photoURL } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { createOpen, setCreateOpen, activityOpen, setActivityOpen } = useTimelineActions();

  const handleCreate = async ({ caption, imageUrls, mentions }: ComposerResult) => {
    if (!user || !userRole) return;
    const authorName = displayName || user.email || "User";
    const postId = await createTimelinePost({ caption, imageUrls, mentions }, user.uid, authorName, userRole, photoURL);
    if (mentions.length) {
      await createMentionNotifications(postId, mentions.map((m) => m.id), authorName, caption);
    }
    toast({ title: t.timeline.postShared });
  };

  const navItems = [
    { href: "/admin", label: t.admin.nav.home, icon: Home },
    { href: "/admin/users", label: t.admin.nav.users, icon: Users },
    { href: "/admin/workouts", label: t.admin.nav.workouts, icon: Dumbbell },
    { href: "/admin/teams", label: t.admin.nav.teams, icon: Shield },
    { href: "/admin/calendar", label: t.admin.nav.calendar, icon: CalendarDays },
    { href: "/admin/posts", label: t.admin.nav.posts, icon: FileText },
    { href: "/admin/timeline", label: t.admin.nav.timeline, icon: LayoutGrid },
    { href: "/admin/testimonials", label: t.admin.nav.testimonials, icon: MessageSquareQuote },
  ];
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("adminSidebarCollapsed");
      return stored === "true";
    }
    return false;
  });
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  useEffect(() => {
    localStorage.setItem("adminSidebarCollapsed", sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  // Track previous lastMessageTime per chat to detect genuinely new messages
  const prevMessageTimes = useRef<Map<string, number>>(new Map());
  const isFirstLoad = useRef(true);

  // Subscribe to all chats — calculate unread count and detect new messages
  useEffect(() => {
    if (!user) return;

    const unsubscribe = ChatService.subscribeToAllChats((chats) => {
      let totalUnread = 0;

      chats.forEach((chat) => {
        if (chat.unreadCount && chat.unreadCount[user.uid]) {
          totalUnread += chat.unreadCount[user.uid];
        }

        // Detect new incoming messages (skip first load to avoid notifying old messages)
        if (!isFirstLoad.current) {
          const currentTime = chat.lastMessageTime?.toMillis?.() ?? 0;
          const prevTime = prevMessageTimes.current.get(chat.id) ?? 0;
          const hasNewMessage = currentTime > prevTime;
          const hasUnread = (chat.unreadCount?.[user.uid] ?? 0) > 0;
          const onChatPage = window.location.pathname.includes('/chat');

          if (hasNewMessage && hasUnread && !onChatPage) {
            const senderName = chat.athleteName || 'Someone';
            NotificationService.showChatNotification(
              senderName,
              chat.lastMessage || 'New message',
              '/admin/chat'
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
    await auth.signOut();
    navigate("/admin/login");
  };

  const SidebarContent = ({ collapsed = false, showCollapseButton = false }: { collapsed?: boolean; showCollapseButton?: boolean }) => (
    <>
      <nav className="flex-1 p-3 pt-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.href === "/admin"
            ? location.pathname === "/admin"
            : location.pathname.startsWith(item.href);
          const showBadge = item.href === "/admin/chat" && chatUnreadCount > 0;
          return (
            <Link key={item.href} to={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full relative",
                  collapsed ? "justify-center px-2" : "justify-start",
                  isActive && "bg-accent text-accent-foreground"
                )}
                title={collapsed ? item.label : undefined}
              >
                <div className="relative">
                  <item.icon className={cn("h-4 w-4", !collapsed && "mr-3")} />
                  {showBadge && (
                    <span className={cn(
                      "absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white",
                      !collapsed && "-right-2"
                    )}>
                      {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                    </span>
                  )}
                </div>
                {!collapsed && item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Account + collapse: one compact row instead of three stacked buttons */}
      <div className={cn("p-3 border-t flex items-center gap-1", collapsed && "flex-col")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2.5 rounded-xl p-1.5 text-left hover:bg-accent transition-colors min-w-0",
                !collapsed && "flex-1"
              )}
              title={collapsed ? displayName || user?.email || undefined : undefined}
            >
              <CachedAvatar
                src={photoURL}
                alt={displayName || ""}
                fallback={(displayName || user?.email || "?").charAt(0).toUpperCase()}
                className="h-8 w-8 shrink-0"
                fallbackClassName="bg-primary text-primary-foreground text-sm font-semibold"
              />
              {!collapsed && (
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{displayName || t.admin.panel}</span>
                  <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem onClick={() => navigate("/")}>
              <ExternalLink className="h-4 w-4 mr-2" />
              {t.admin.viewSite}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              {t.auth.logout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {showCollapseButton && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9 text-muted-foreground"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={collapsed ? t.admin.expand : t.admin.collapse}
            aria-label={collapsed ? t.admin.expand : t.admin.collapse}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </>
  );

  return (
    <div className={cn("bg-background", fullHeight ? "h-screen overflow-hidden" : "min-h-screen")}>
      <AdminTopBar chatUnreadCount={chatUnreadCount} pageTitle={pageTitle} />

      <div className={cn("pt-[73px] flex", fullHeight ? "h-screen" : "min-h-[calc(100vh-73px)]")}>
        {/* Desktop Sidebar */}
        <aside className={cn(
          "hidden md:flex border-r bg-card flex-col fixed left-0 top-[73px] h-[calc(100vh-73px)] overflow-y-auto transition-all duration-300",
          sidebarCollapsed ? "w-20" : "w-64"
        )}>
          <SidebarContent collapsed={sidebarCollapsed} showCollapseButton={true} />
        </aside>

        {/* Main content */}
        <main className={cn(
          "flex-1 transition-all duration-300",
          fullHeight ? (hideBottomNav ? "overflow-hidden flex flex-col min-h-0" : "overflow-hidden flex flex-col min-h-0 pb-[5.5rem] md:pb-0") : cn("overflow-auto md:pb-0", hideBottomNav ? "pb-6" : "pb-28"),
          sidebarCollapsed ? "md:ml-20" : "md:ml-64"
        )}>
          {children}
        </main>
      </div>
      {!hideBottomNav && <BottomNav />}

      <CreatePostModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />
      <ActivityDrawer
        open={activityOpen}
        onOpenChange={setActivityOpen}
      />
    </div>
  );
};

export default AdminLayout;
