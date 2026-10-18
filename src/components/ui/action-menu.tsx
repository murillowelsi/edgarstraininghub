import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { cloneElement, isValidElement, useState } from "react";

export interface ActionMenuItem {
  icon: React.ElementType;
  label: string;
  /** Second line, shown in the mobile sheet only */
  hint?: string;
  onClick: () => void;
  destructive?: boolean;
  loading?: boolean;
  hidden?: boolean;
}

interface ActionMenuProps {
  /** Heading of the mobile sheet (and a small label atop the desktop menu) */
  title?: string;
  items: ActionMenuItem[];
  /** The "⋮" button; receives the click handler */
  children: React.ReactElement;
  align?: "start" | "end";
}

/**
 * Row actions behind a "⋮" button: an anchored dropdown on desktop, a bottom
 * sheet on mobile — so desktop never gets a sheet rising from the bottom.
 */
export function ActionMenu({ title, items, children, align = "end" }: ActionMenuProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const visible = items.filter((i) => !i.hidden);
  // Destructive actions go last, behind a separator
  const regular = visible.filter((i) => !i.destructive);
  const destructive = visible.filter((i) => i.destructive);

  if (!isMobile) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-56" onClick={(e) => e.stopPropagation()}>
          {title && (
            <>
              <DropdownMenuLabel className="truncate text-xs font-medium text-muted-foreground">{title}</DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}
          {regular.map((item) => (
            <DropdownMenuItem key={item.label} onClick={item.onClick} disabled={item.loading}>
              {item.loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <item.icon className="h-4 w-4 mr-2" />}
              {item.label}
            </DropdownMenuItem>
          ))}
          {regular.length > 0 && destructive.length > 0 && <DropdownMenuSeparator />}
          {destructive.map((item) => (
            <DropdownMenuItem
              key={item.label}
              onClick={item.onClick}
              className="text-destructive focus:text-destructive"
            >
              <item.icon className="h-4 w-4 mr-2" />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const trigger = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
        onClick: (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        },
      })
    : children;

  return (
    <>
      {trigger}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          {title && (
            <DrawerHeader>
              <DrawerTitle className="truncate">{title}</DrawerTitle>
            </DrawerHeader>
          )}
          <div className={cn("px-4 pb-6 space-y-2", !title && "pt-4")}>
            {[...regular, ...destructive].map((item) => (
              <button
                key={item.label}
                disabled={item.loading}
                className={cn(
                  "flex items-center gap-3 w-full p-4 rounded-xl border bg-card hover:bg-muted transition-colors text-left text-sm font-medium",
                  item.destructive && "text-destructive"
                )}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
              >
                {item.loading ? <Loader2 className="h-5 w-5 animate-spin shrink-0" /> : <item.icon className="h-5 w-5 shrink-0" />}
                <span className="min-w-0">
                  <span className="block">{item.label}</span>
                  {item.hint && <span className="block text-xs font-normal text-muted-foreground">{item.hint}</span>}
                </span>
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
