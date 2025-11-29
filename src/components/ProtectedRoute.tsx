import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    // If trying to access athlete routes, redirect to home instead of login
    if (location.pathname.startsWith("/athlete")) {
      return <Navigate to="/" />;
    }
    return <Navigate to="/admin/login" />;
  }

  return <>{children}</>;
};
