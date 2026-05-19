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
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { PageSpinner } from "@/components/ui/spinner";

export default function AppEntry() {
  const { user, loading, isAdmin, isEditor, isAthlete } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login", { replace: true });
    } else if (isAdmin || isEditor) {
      navigate("/admin", { replace: true });
    } else if (isAthlete) {
      navigate("/athlete", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [user, loading, isAdmin, isEditor, isAthlete, navigate]);

  return <PageSpinner />;
}
