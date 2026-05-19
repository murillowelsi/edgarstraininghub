import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, RefreshCw, Link2, Link2Off } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildStravaAuthUrl,
  disconnectStrava,
  subscribeToStravaIntegration,
  syncStrava,
} from "@/services/stravaService";
import type { StravaIntegration as StravaIntegrationData } from "@/types/integration";
import { formatDistanceToNow } from "date-fns";

const StravaIntegration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [integration, setIntegration] = useState<StravaIntegrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"sync" | "disconnect" | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsub = subscribeToStravaIntegration(user.uid, (data) => {
      setIntegration(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const handleConnect = () => {
    try {
      const url = buildStravaAuthUrl(window.location.pathname + window.location.search);
      window.location.href = url;
    } catch (err) {
      toast({
        title: "Cannot start connection",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleSync = async () => {
    setBusy("sync");
    try {
      const { matched, scanned } = await syncStrava();
      toast({
        title: "Strava synced",
        description: `Scanned ${scanned} activit${scanned === 1 ? "y" : "ies"}, updated ${matched} workout${matched === 1 ? "" : "s"}.`,
      });
    } catch (err) {
      toast({
        title: "Sync failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Strava? Already synced workouts will stay.")) return;
    setBusy("disconnect");
    try {
      await disconnectStrava();
      toast({ title: "Strava disconnected" });
    } catch (err) {
      toast({
        title: "Disconnect failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-[#FC4C02]/10">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="#FC4C02"
              aria-hidden="true"
            >
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.172" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-bold leading-tight">Strava</h3>
            <p className="text-xs text-muted-foreground">
              {integration
                ? `Connected${integration.athleteUsername ? ` as @${integration.athleteUsername}` : ""}`
                : "Sync completed runs, rides and swims automatically"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="h-9 flex items-center text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
            Checking connection…
          </div>
        ) : !integration ? (
          <button
            onClick={handleConnect}
            className="w-full rounded-full bg-[#FC4C02] text-white font-semibold py-2 flex items-center justify-center gap-2 hover:opacity-90 transition"
          >
            <Link2 className="h-4 w-4" />
            Connect with Strava
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={busy !== null}
                className="flex-1 rounded-full bg-primary text-primary-foreground font-semibold py-2 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy === "sync" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sync now
              </button>
              <button
                onClick={handleDisconnect}
                disabled={busy !== null}
                className="rounded-full px-3 py-2 border border-border text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60"
                aria-label="Disconnect Strava"
              >
                {busy === "disconnect" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2Off className="h-4 w-4" />
                )}
              </button>
            </div>
            {integration.lastSyncAt && (
              <p className="text-[11px] text-muted-foreground">
                Last sync: {formatDistanceToNow(integration.lastSyncAt, { addSuffix: true })}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StravaIntegration;
