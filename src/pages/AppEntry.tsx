/**
 * AppEntry — PWA start_url landing page
 *
 * Opened when the user taps the app icon on their home screen.
 * Redirects immediately based on auth state:
 *   - Admin/Editor  → /admin/posts
 *   - Athlete       → /athlete
 *   - Not logged in → /login
 *
 * The public website stays at / for desktop browsers.
 */
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function AppEntry() {
  const { user, loading, isAdmin, isEditor, isAthlete } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login", { replace: true });
    } else if (isAdmin || isEditor) {
      navigate("/admin/posts", { replace: true });
    } else if (isAthlete) {
      navigate("/athlete", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [user, loading, isAdmin, isEditor, isAthlete, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
