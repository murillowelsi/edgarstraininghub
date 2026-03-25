import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarDays, ChevronLeft, ChevronRight, Dumbbell, FileText, Home, LogOut, Menu, Shield, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { auth } from "../lib/firebase";
import AdminTopBar from "./AdminTopBar";
import { ChatService } from "../services/chat";
import { NotificationService } from "../services/notifications";
import { BottomNav } from "./admin/BottomNav";

interface AdminLayoutProps {
  children: React.ReactNode;
  fullHeight?: boolean;
  hideBottomNav?: boolean;
  pageTitle?: string;
}

const AdminLayout = ({ children, fullHeight = false, hideBottomNav = false, pageTitle }: AdminLayoutProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const navItems = [
    { href: "/admin", label: t.admin.nav.home, icon: Home },
    { href: "/admin/users", label: t.admin.nav.users, icon: Users },
    { href: "/admin/workouts", label: t.admin.nav.workouts, icon: Dumbbell },
    { href: "/admin/teams", label: t.admin.nav.teams, icon: Shield },
    { href: "/admin/calendar", label: t.admin.nav.calendar, icon: CalendarDays },
    { href: "/admin/posts", label: t.admin.nav.posts, icon: FileText },
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
      <div className="p-6 border-b">
        {!collapsed && (
          <>
            <h1 className="text-xl font-bold">{t.admin.panel}</h1>
            <p className="text-sm text-muted-foreground truncate">
              {user?.email}
            </p>
          </>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <Menu className="h-5 w-5" />
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
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

      <div className="p-4 border-t space-y-2">
        {!collapsed && (
          <Link to="/">
            <Button variant="outline" className="w-full">
              {t.admin.viewSite}
            </Button>
          </Link>
        )}
        <Button
          variant="ghost"
          className={cn("w-full", collapsed && "px-2")}
          onClick={handleLogout}
          title={collapsed ? t.auth.logout : undefined}
        >
          <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && t.auth.logout}
        </Button>
        {showCollapseButton && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                {t.admin.collapse}
              </>
            )}
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
          fullHeight ? (hideBottomNav ? "overflow-hidden flex flex-col min-h-0" : "overflow-hidden flex flex-col min-h-0 pb-16 md:pb-0") : "overflow-auto pb-16 md:pb-0",
          sidebarCollapsed ? "md:ml-20" : "md:ml-64"
        )}>
          {children}
        </main>
      </div>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
};

export default AdminLayout;
