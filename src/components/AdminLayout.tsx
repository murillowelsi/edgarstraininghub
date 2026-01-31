import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { FileText, LogOut, Menu, Users } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../lib/firebase";
import Navbar from "./Navbar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/admin/posts", label: "Posts", icon: FileText },
  { href: "/admin/users", label: "Users", icon: Users },
];

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/admin/login");
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold">Admin Panel</h1>
        <p className="text-sm text-muted-foreground truncate">
          {user?.email}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link key={item.href} to={item.href} onClick={() => setSidebarOpen(false)}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start",
                  isActive && "bg-accent text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 mr-3" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t space-y-2">
        <Link to="/" onClick={() => setSidebarOpen(false)}>
          <Button variant="outline" className="w-full">
            View Site
          </Button>
        </Link>
        <Button variant="ghost" className="w-full" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
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
        <aside className="hidden md:flex w-64 border-r bg-card flex-col sticky top-[73px] h-[calc(100vh-73px)]">
          <SidebarContent />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
