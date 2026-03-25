import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface AdminEmptyStateProps {
  icon?: LucideIcon;
  illustration?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function AdminEmptyState({ icon: Icon, illustration, title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      {illustration ? (
        <img src={illustration} alt="" className="w-48 h-48 mb-6 opacity-90 mx-auto" />
      ) : Icon ? (
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      ) : null}
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}
