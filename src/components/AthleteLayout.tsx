
import AdminSidebar from "@/components/AdminSidebar";
import { Outlet } from "react-router-dom";

const AthleteLayout = () => {

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

    </div>
  );
};

export default AthleteLayout;
