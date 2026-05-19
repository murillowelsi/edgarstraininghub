import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SectionSpinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { completeStravaAuth, consumeStravaState } from "@/services/stravaService";

const StravaCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    if (authLoading) return;

    const code = params.get("code");
    const state = params.get("state");
    const stravaError = params.get("error");

    if (stravaError) {
      ran.current = true;
      setError(`Strava authorization was denied (${stravaError}).`);
      return;
    }
    if (!code) {
      ran.current = true;
      setError("Missing authorization code.");
      return;
    }
    if (!user) {
      ran.current = true;
      setError("You need to be signed in to connect Strava.");
      return;
    }

    const { ok, returnTo } = consumeStravaState(state);
    if (!ok) {
      ran.current = true;
      setError("Authorization state mismatch. Please try connecting again.");
      return;
    }

    ran.current = true;
    completeStravaAuth(code)
      .then(() => {
        toast({ title: "Strava connected" });
        navigate(returnTo || "/athlete/profile", { replace: true });
      })
      .catch((err) => {
        setError(err.message || "Failed to connect Strava.");
      });
  }, [authLoading, navigate, params, toast, user]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full space-y-4 text-center">
          <h1 className="font-display text-xl font-bold">Strava connection failed</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate("/athlete/profile", { replace: true })}
            className="rounded-full px-4 py-2 bg-primary text-primary-foreground font-semibold"
          >
            Back to profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <SectionSpinner />
    </div>
  );
};

export default StravaCallback;
