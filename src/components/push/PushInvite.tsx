import { useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePush } from "@/hooks/usePush";
import { markAsked, wasAsked } from "@/lib/pushSupport";
import { cn } from "@/lib/utils";
import { InstallGuide } from "./InstallGuide";

/**
 * Contextual invitation ("Notify me when the coach replies"). Shown once per
 * place, only while push is off; asks for permission only when tapped.
 */
export function PushInvite({
  place,
  title,
  description,
  className,
}: {
  place: string;
  title: string;
  description: string;
  className?: string;
}) {
  const { t } = useLanguage();
  const { state, busy, enable } = usePush();
  const [hidden, setHidden] = useState(() => wasAsked(place));
  const [guide, setGuide] = useState(false);

  if (hidden || (state !== "off" && state !== "needs-install")) return null;

  const dismiss = () => {
    markAsked(place);
    setHidden(true);
  };

  const onEnable = async () => {
    if (state === "needs-install") {
      setGuide(true);
      return;
    }
    const result = await enable();
    if (result === "on" || result === "blocked") dismiss();
  };

  return (
    <div className={cn("relative flex items-start gap-3 rounded-2xl border bg-card p-3.5 pr-10", className)}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary-ink">
        <Bell className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-caption text-muted-foreground">{state === "needs-install" ? t.push.toggle.needsInstall : description}</p>
        <Button size="sm" className="mt-2.5 h-9" onClick={onEnable} disabled={busy}>
          {state === "needs-install" ? t.push.toggle.howToInstall : t.push.invite.enable}
        </Button>
      </div>
      <button
        onClick={dismiss}
        aria-label={t.push.invite.notNow}
        className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-accent"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      <InstallGuide open={guide} onOpenChange={setGuide} />
    </div>
  );
}
