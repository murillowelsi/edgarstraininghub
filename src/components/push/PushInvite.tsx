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
  compact = false,
}: {
  place: string;
  title: string;
  description: string;
  className?: string;
  /** One row (icon, text, "Enable", ✕) for pages where it must not push content down */
  compact?: boolean;
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

  const cta = state === "needs-install" ? t.push.toggle.howToInstall : t.push.invite.enable;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2.5 rounded-2xl border bg-card py-1.5 pl-3 pr-1", className)}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary-ink">
          <Bell className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="truncate text-caption text-muted-foreground">{state === "needs-install" ? t.push.toggle.needsInstall : description}</p>
        </div>
        <button
          type="button"
          onClick={onEnable}
          disabled={busy}
          className="min-h-11 shrink-0 whitespace-nowrap px-2 text-sm font-bold text-primary-ink disabled:opacity-50"
        >
          {cta}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t.push.invite.notNow}
          className="grid h-11 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        <InstallGuide open={guide} onOpenChange={setGuide} />
      </div>
    );
  }

  return (
    <div className={cn("relative flex items-start gap-3 rounded-2xl border bg-card p-3.5 pr-10", className)}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary-ink">
        <Bell className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-caption text-muted-foreground">{state === "needs-install" ? t.push.toggle.needsInstall : description}</p>
        <Button size="sm" className="mt-2.5 h-9" onClick={onEnable} disabled={busy}>
          {cta}
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
