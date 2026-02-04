import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CalendarDays, ChevronLeft, ChevronRight, CreditCard, Dumbbell, FileText, LogOut, Menu, Users, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../lib/firebase";
import Navbar from "./Navbar";
import { ChatService } from "../services/chat";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/admin/posts", label: "Posts", icon: FileText },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/chat", label: "Chat", icon: MessageSquare },
];

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Subscribe to all chats to calculate total unread for admin
  useEffect(() => {
    if (!user) return;

    const unsubscribe = ChatService.subscribeToAllChats((chats) => {
      let totalUnread = 0;
      chats.forEach((chat) => {
        if (chat.unreadCount && chat.unreadCount[user.uid]) {
          totalUnread += chat.unreadCount[user.uid];
        }
      });
      setChatUnreadCount(totalUnread);
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
            <h1 className="text-xl font-bold">Admin Panel</h1>
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
          const isActive = location.pathname.startsWith(item.href);
          const showBadge = item.href === "/admin/chat" && chatUnreadCount > 0;
          return (
            <Link key={item.href} to={item.href} onClick={() => setSidebarOpen(false)}>
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
          <Link to="/" onClick={() => setSidebarOpen(false)}>
            <Button variant="outline" className="w-full">
              View Site
            </Button>
          </Link>
        )}
        <Button
          variant="ghost"
          className={cn("w-full", collapsed && "px-2")}
          onClick={handleLogout}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && "Logout"}
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
                Collapse
              </>
            )}
          </Button>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-[73px] flex min-h-[calc(100vh-73px)]">
        {/* Mobile Sidebar Trigger */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              className="fixed bottom-4 left-4 z-30 md:hidden shadow-lg"
              aria-label="Open admin menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <div className="flex flex-col h-full">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Sidebar */}
        <aside className={cn(
          "hidden md:flex border-r bg-card flex-col fixed left-0 top-[73px] h-[calc(100vh-73px)] overflow-y-auto transition-all duration-300",
          sidebarCollapsed ? "w-20" : "w-64"
        )}>
          <SidebarContent collapsed={sidebarCollapsed} showCollapseButton={true} />
        </aside>

        {/* Main content */}
        <main className={cn(
          "flex-1 overflow-auto transition-all duration-300",
          sidebarCollapsed ? "md:ml-20" : "md:ml-64"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
