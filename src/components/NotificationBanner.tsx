import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationService } from "@/services/notifications";
import { FCMService } from "@/services/fcm";

type BannerState = "prompt" | "denied" | "hidden";

export function NotificationBanner() {
  const { user } = useAuth();
  const [state, setState] = useState<BannerState>("hidden");

  useEffect(() => {
    if (typeof Notification === "undefined") return;

    if (Notification.permission === "default") {
      setState("prompt");
    } else if (Notification.permission === "denied") {
      setState("denied");
    } else if (Notification.permission === "granted" && user) {
      FCMService.registerToken(user.uid);
    }
  }, [user]);

  if (state === "hidden") return null;

  if (state === "denied") {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-destructive/10 border-b text-sm">
        <Bell className="h-4 w-4 text-destructive shrink-0" />
        <span className="flex-1 text-foreground">
          Notificações bloqueadas. Para ativar, clique no cadeado na barra do browser e permita notificações.
        </span>
        <button
          onClick={() => setState("hidden")}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
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
    <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 border-b text-sm">
      <Bell className="h-4 w-4 text-primary shrink-0" />
      <span className="flex-1 text-foreground">
        Ative as notificações para receber alertas de novas mensagens
      </span>
      <Button
        size="sm"
        variant="default"
        className="shrink-0 h-7 px-3 text-xs"
        onClick={handleEnable}
      >
        Ativar
      </Button>
      <button
        onClick={() => setState("hidden")}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
