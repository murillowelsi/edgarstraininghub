import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { NotificationService } from "@/services/notifications";
import { FCMService } from "@/services/fcm";

type BannerState = "prompt" | "denied" | "hidden";

const DISMISS_KEY = "notificationBannerDismissed";

// Installed PWAs have no browser bar, so the "padlock" instructions don't apply
const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const readDismissed = (): string | null => {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
};

export function NotificationBanner() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [state, setState] = useState<BannerState>("hidden");

  useEffect(() => {
    if (typeof Notification === "undefined") return;

    // Remember a dismissal per permission state, so the banner returns only if it changes
    const dismissed = readDismissed() === Notification.permission;

    if (Notification.permission === "default") {
      if (!dismissed) setState("prompt");
    } else if (Notification.permission === "denied") {
      if (!dismissed) setState("denied");
    } else if (Notification.permission === "granted" && user) {
      FCMService.registerToken(user.uid);
    }
  }, [user]);

  if (state === "hidden") return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, Notification.permission);
    } catch {
      // Storage unavailable; hide for this view only
    }
    setState("hidden");
  };

  const dismissButton = (
    <button
      onClick={dismiss}
      className="shrink-0 -mr-2 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
      aria-label={t.notifications.dismiss}
    >
      <X className="h-4 w-4" />
    </button>
  );

  if (state === "denied") {
    return (
      <div className="flex items-center gap-3 px-4 py-1 bg-destructive/10 border-b text-sm">
        <Bell className="h-4 w-4 text-destructive shrink-0" />
        <span className="flex-1 text-foreground">
          {isStandalone() ? t.notifications.blockedApp : t.notifications.blocked}
        </span>
        {dismissButton}
      </div>
    );
  }

  const handleEnable = async () => {
    const granted = await NotificationService.requestPermission();
    if (granted) {
      setState("hidden");
      if (user) await FCMService.registerToken(user.uid);
    } else {
      setState("denied");
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-1 bg-primary/10 border-b text-sm">
      <Bell className="h-4 w-4 text-primary shrink-0" />
      <span className="flex-1 text-foreground">
        {t.notifications.enablePrompt}
      </span>
      <Button
        size="sm"
        variant="default"
        className="shrink-0 h-9 px-3 text-xs"
        onClick={handleEnable}
      >
        {t.notifications.enable}
      </Button>
      {dismissButton}
    </div>
  );
}
