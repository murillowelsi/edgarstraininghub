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
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { ReactNode } from "react";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Extra className for DrawerContent (e.g. "sm:w-[600px]") */
  className?: string;
  children: ReactNode;
}

export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  className,
  children,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();

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
        <DrawerContent direction="bottom" className="max-h-[90dvh] flex flex-col">
          <DrawerHeader className="text-left shrink-0">
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto flex-1">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent direction="right" className={className}>
        <DrawerHeader className="text-left shrink-0">
          <DrawerTitle>{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto flex-1">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
