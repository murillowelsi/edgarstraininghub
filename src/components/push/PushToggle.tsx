import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePush } from "@/hooks/usePush";
import { cn } from "@/lib/utils";
import { InstallGuide } from "./InstallGuide";

/** "Notifications" row for the settings sheets (athlete profile, coach menu). */
export function PushToggle() {
  const { t } = useLanguage();
  const p = t.push.toggle;
  const { state, busy, isIOSDevice, enable, disable } = usePush();
  const [guide, setGuide] = useState(false);

  const status =
    state === "on"
      ? p.on
      : state === "blocked"
      ? isIOSDevice
        ? p.blockedIOS
        : p.blockedBrowser
      : state === "unsupported"
      ? p.unsupported
      : state === "needs-install"
      ? p.needsInstall
      : p.off;

  const toggle = (checked: boolean) => {
    if (checked) void enable();
    else void disable();
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm">
      {state === "on" ? <Bell size={18} aria-hidden /> : <BellOff size={18} aria-hidden className="text-muted-foreground" />}
      <div className="min-w-0 flex-1">
        <p id="push-toggle-label" className="font-medium">
          {p.label}
        </p>
        <p className={cn("text-caption", state === "blocked" ? "text-warning-ink" : "text-muted-foreground")}>{status}</p>
        {state === "needs-install" && (
          <button onClick={() => setGuide(true)} className="mt-1 min-h-8 text-caption font-semibold text-primary-ink underline-offset-2 hover:underline">
            {p.howToInstall}
          </button>
        )}
      </div>
      {state !== "needs-install" && (
        <Switch
          aria-labelledby="push-toggle-label"
          checked={state === "on"}
          disabled={busy || state === "blocked" || state === "unsupported"}
          onCheckedChange={toggle}
        />
      )}
      <InstallGuide open={guide} onOpenChange={setGuide} />
    </div>
  );
}
