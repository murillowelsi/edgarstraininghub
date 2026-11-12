import { PlusSquare, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { useLanguage } from "@/contexts/LanguageContext";

/** iPhone: web push only works for apps on the Home Screen, so show how to add it. */
export function InstallGuide({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useLanguage();
  const g = t.push.install;
  const steps = [
    { icon: Share, text: g.step1 },
    { icon: PlusSquare, text: g.step2 },
    { icon: null, text: g.step3 },
  ];
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={g.title}
      description={g.description}
      footer={
        <Button className="h-11 w-full" onClick={() => onOpenChange(false)}>
          {g.ok}
        </Button>
      }
    >
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {i + 1}
            </span>
            <span className="flex flex-1 items-center gap-2 pt-0.5 text-body-sm">
              {s.text}
              {s.icon && <s.icon className="h-4 w-4 shrink-0 text-info-ink" aria-hidden />}
            </span>
          </li>
        ))}
      </ol>
    </ResponsiveModal>
  );
}
