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
import { ReactNode, useEffect, useState } from "react";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Extra className for DrawerContent (e.g. "sm:w-[600px]") */
  className?: string;
  children: ReactNode;
}

/**
 * Tracks the on-screen keyboard height via the VisualViewport API.
 * On iOS Safari, focusing an input inside a `position:fixed` drawer makes the
 * browser shift the whole layout viewport up to keep the input visible, which
 * pushes the drawer off-screen. By anchoring the drawer above the keyboard
 * ourselves, iOS no longer needs to do that shift.
 */
function useKeyboardViewport(active: boolean) {
  const [state, setState] = useState({ keyboardInset: 0, visualHeight: 0 });

  useEffect(() => {
    if (!active) {
      setState({ keyboardInset: 0, visualHeight: 0 });
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const inset = window.innerHeight - vv.height - vv.offsetTop;
      setState({
        keyboardInset: Math.max(0, Math.round(inset)),
        visualHeight: Math.round(vv.height),
      });
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);

  return state;
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
  const { keyboardInset, visualHeight } = useKeyboardViewport(isMobile && open);

  if (isMobile) {
    const mobileStyle =
      keyboardInset > 0
        ? {
            bottom: keyboardInset,
            maxHeight: Math.round(visualHeight * 0.95),
          }
        : undefined;

    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        repositionInputs={false}
        shouldScaleBackground={false}
      >
        <DrawerContent
          direction="bottom"
          className="max-h-[90dvh] flex flex-col"
          style={mobileStyle}
        >
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
