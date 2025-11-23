import AdminSidebar from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router-dom";

const AdminLayout = () => {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar - Always visible */}
      <div className="hidden md:flex">
        <AdminSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden fixed top-4 right-4 z-40 bg-background/80 backdrop-blur-sm border-2 shadow-lg"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <AdminSidebar />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminLayout;
