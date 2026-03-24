import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  actions?: ReactNode;
  /** Custom FAB content for mobile (e.g. a DropdownMenu). Overrides default action FAB. */
  mobileFab?: ReactNode;
}

export function AdminPageHeader({ title, description, action, actions, mobileFab }: AdminPageHeaderProps) {
  const ActionIcon = action?.icon;

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-6 md:mb-8">
        <div className="hidden md:block">
          <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {/* Desktop only */}
        {action && (
          <Button onClick={action.onClick} className="hidden sm:flex w-auto">
            {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
            {action.label}
          </Button>
        )}
        {actions && <div className="hidden sm:flex gap-2 w-auto">{actions}</div>}
      </div>

      {/* Mobile FAB — bottom-right, above BottomNav */}
      {mobileFab ? (
        <div
          className="fixed right-4 z-30 sm:hidden"
          style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
        >
          {mobileFab}
        </div>
      ) : action ? (
        <button
          onClick={action.onClick}
          className="fixed right-4 z-30 sm:hidden h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
          aria-label={action.label}
        >
          {ActionIcon ? <ActionIcon className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      ) : null}
    </>
  );
}
