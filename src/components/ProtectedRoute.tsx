import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireEditor?: boolean;
  requireAthlete?: boolean;
}

export const ProtectedRoute = ({
  children,
  requireAdmin = false,
  requireEditor = false,
  requireAthlete = false,
}: ProtectedRouteProps) => {
  const { user, loading, isAdmin, isEditor, isAthlete } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Requires admin but user is not admin - redirect athletes to their portal
  if (requireAdmin && !isAdmin) {
    if (isAthlete) {
      return <Navigate to="/athlete" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Requires editor but user is not editor (or admin)
  if (requireEditor && !isEditor) {
    if (isAthlete) {
      return <Navigate to="/athlete" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Requires athlete but user is not athlete - redirect admins to admin panel
  if (requireAthlete && !isAthlete) {
    if (isAdmin) {
      return <Navigate to="/admin/posts" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
