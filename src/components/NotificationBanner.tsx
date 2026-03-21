import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationService } from "@/services/notifications";
import { FCMService } from "@/services/fcm";

/**
 * Shows a banner asking the user to enable notifications.
 * Uses a button click (user gesture) to call requestPermission(),
 * which is required by all mobile browsers.
 * After granting, registers the FCM token so push notifications work
 * even when the app is closed (requires Cloud Function).
 */
export function NotificationBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      setVisible(true);
    } else if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted" &&
      user
    ) {
      // Already granted — register FCM token silently (no banner needed)
      FCMService.registerToken(user.uid);
    }
  }, [user]);

  if (!visible) return null;

  const handleEnable = async () => {
    const granted = await NotificationService.requestPermission();
    setVisible(false);
    if (granted && user) {
      await FCMService.registerToken(user.uid);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 border-b text-sm">
      <Bell className="h-4 w-4 text-primary shrink-0" />
      <span className="flex-1 text-foreground">
        Enable notifications to be alerted of new messages
      </span>
      <Button
        size="sm"
        variant="default"
        className="shrink-0 h-7 px-3 text-xs"
        onClick={handleEnable}
      >
        Enable
      </Button>
      <button
        onClick={() => setVisible(false)}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
