import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  actions?: ReactNode;
}

export function AdminPageHeader({ title, description, action, actions }: AdminPageHeaderProps) {
  const ActionIcon = action?.icon;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action && (
        <Button onClick={action.onClick} className="w-full sm:w-auto">
          {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
          {action.label}
        </Button>
      )}
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
