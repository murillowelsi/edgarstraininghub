/**
 * ResponsiveModal
 * - Desktop (md+): Drawer sliding from the right
 * - Mobile: Drawer sliding from the bottom (swipeable)
 *
 * Usage:
 *   <ResponsiveModal open={open} onOpenChange={setOpen} title="My Title">
 *     {children}
 *   </ResponsiveModal>
 */
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { X } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Extra className for DrawerContent (e.g. "sm:w-[600px]") */
  className?: string;
  /** Replaces the default padded, scrolling body wrapper's classes */
  bodyClassName?: string;
  /** Pinned below the body (e.g. a Done button) */
  footer?: ReactNode;
  /** Mobile: take the full 90dvh instead of hugging the content */
  fullHeight?: boolean;
  children: ReactNode;
}

export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  className,
  bodyClassName = "px-4 pb-6 overflow-y-auto flex-1",
  footer,
  fullHeight,
  children,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  // Visible close next to the title — swipe/backdrop alone isn't discoverable
  const header = (
    <DrawerHeader className="text-left shrink-0 flex flex-row items-start gap-2 space-y-0">
      <div className="grid gap-1.5 flex-1 min-w-0">
        <DrawerTitle>{title}</DrawerTitle>
        {description && <DrawerDescription>{description}</DrawerDescription>}
      </div>
      <DrawerClose
        className="-mr-2 -mt-2 h-10 w-10 shrink-0 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t.common.close}
      >
        <X className="h-5 w-5" />
      </DrawerClose>
    </DrawerHeader>
  );
  const footerNode = footer && (
    <div className="shrink-0 border-t border-border/50 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>
  );

  if (isMobile) {
    // Note: `repositionInputs` (vaul default = true) is what enables vaul's
    // `preventScrollMobileSafari` helper, which uses the `translateY(-2000px)`
    // trick to stop iOS Safari from auto-scrolling the layout viewport when an
    // input inside a fixed-position drawer gains focus. Without it, focusing
    // the textarea launches the whole drawer off-screen. `shouldScaleBackground`
    // is left disabled because its body-transform conflicts with Radix Select's
    // scroll-lock toggles inside the drawer.
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        shouldScaleBackground={false}
      >
        <DrawerContent direction="bottom" className={cn("max-h-[90dvh] flex flex-col", fullHeight && "h-[90dvh]")}>
          {header}
          <div className={cn("min-h-0", bodyClassName)}>{children}</div>
          {footerNode}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent direction="right" className={className}>
        {header}
        <div className={cn("min-h-0", bodyClassName)}>{children}</div>
        {footerNode}
      </DrawerContent>
    </Drawer>
  );
}
