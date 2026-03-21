import { Bell, BellOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { NotificationService } from "@/services/notifications";

/**
 * Shows a banner asking the user to enable notifications.
 * Uses a button click (user gesture) to call requestPermission(),
 * which is required by all mobile browsers.
 * Hidden if already granted, denied, or dismissed.
 */
export function NotificationBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if notifications are supported and not yet decided
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleEnable = async () => {
    const granted = await NotificationService.requestPermission();
    setVisible(false);
    if (!granted) {
      // Browser denied — nothing we can do
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
