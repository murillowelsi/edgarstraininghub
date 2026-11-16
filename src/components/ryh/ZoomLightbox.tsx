import { useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { MAX_SCALE, type Focus } from "@/lib/zoom";
import { cn } from "@/lib/utils";
import { ZoomViewport, type ZoomControls } from "./ZoomViewport";

/*
 * Full-screen photo viewer with zoom, shared by the shop gallery and the logbook photos.
 * Radix Dialog: focus trapped inside, Esc / X close, focus goes back to the photo that opened it.
 * Previous / next with buttons, ← → and swipe (at 1×); the zoom resets when the photo changes.
 * Keys: + / − zoom, 0 resets.
 */

export interface LightboxPhoto {
  /** Largest file available (the viewer zooms up to 4×) */
  src: string;
  alt: string;
  w: number;
  h: number;
  /** Start zoomed in (product "Detail") */
  initial?: Focus;
}

interface Props {
  photos: LightboxPhoto[];
  index: number | null;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  /** Accessible name of the dialog */
  label: string;
  /** "studio": light product background (same in both themes); "dark": photos */
  tone?: "studio" | "dark";
  /** Extra text after the counter, e.g. "Personal details hidden" */
  caption?: string;
}

export function ZoomLightbox({ photos, index, onIndexChange, onClose, label, tone = "dark", caption }: Props) {
  const { t } = useLanguage();
  const z = t.ryh.zoom;
  const controls = useRef<ZoomControls>(null);
  const [scale, setScale] = useState(1);
  // Focus goes back to whatever opened the viewer (the photo), also without a Dialog.Trigger
  const opener = useRef<HTMLElement | null>(null);
  const total = photos.length;
  const current = index === null ? null : photos[index];
  const go = (delta: number) => index !== null && onIndexChange((index + delta + total) % total);
  const dark = tone === "dark";

  const btn = cn(
    "grid h-11 w-11 place-items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 disabled:opacity-35",
    dark ? "bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white" : // Solid buttons: they sit on top of the photo, which can be the dark graphite fabric
        "bg-[#FBF8F2]/95 text-[#2B2620] shadow-[0_1px_6px_rgba(0,0,0,0.18)] hover:bg-white focus-visible:outline-[#2B2620]",
  );

  return (
    <DialogPrimitive.Root open={index !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn("fixed inset-0 z-50 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none", dark ? "bg-[#100f0d]" : "bg-[#EDE7DB]")}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(e) => {
            if (opener.current?.isConnected) {
              e.preventDefault();
              opener.current.focus();
            }
          }}
          className="fixed inset-0 z-50 flex flex-col outline-none"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" && total > 1) go(1);
            else if (e.key === "ArrowLeft" && total > 1) go(-1);
            else if (e.key === "+" || e.key === "=") controls.current?.zoomIn();
            else if (e.key === "-") controls.current?.zoomOut();
            else if (e.key === "0") controls.current?.reset();
          }}
        >
          <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
          <div className="relative min-h-0 flex-1">
            {current && (
              <ZoomViewport
                // A new photo starts at its own zoom (reset)
                key={`${index}-${current.src}`}
                ref={controls}
                src={current.src}
                alt={current.alt}
                width={current.w}
                height={current.h}
                initial={current.initial}
                onScaleChange={setScale}
                onSwipe={total > 1 ? go : undefined}
              />
            )}
            {total > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label={z.prev} className={cn(btn, "absolute left-2 top-1/2 -translate-y-1/2 md:left-6")}>
                  <ChevronLeft className="h-6 w-6" aria-hidden />
                </button>
                <button type="button" onClick={() => go(1)} aria-label={z.next} className={cn(btn, "absolute right-2 top-1/2 -translate-y-1/2 md:right-6")}>
                  <ChevronRight className="h-6 w-6" aria-hidden />
                </button>
              </>
            )}
            <DialogPrimitive.Close aria-label={z.close} className={cn(btn, "absolute right-3 top-3")}>
              <X className="h-5 w-5" aria-hidden />
            </DialogPrimitive.Close>
          </div>

          {/* Zoom controls and counter */}
          <div className="flex flex-col items-center gap-2 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => controls.current?.zoomOut()} disabled={scale <= 1.01} aria-label={z.zoomOut} className={btn}>
                <Minus className="h-5 w-5" aria-hidden />
              </button>
              <button type="button" onClick={() => controls.current?.reset()} disabled={scale <= 1.01} aria-label={z.reset} className={cn(btn, "w-auto gap-1.5 px-4 text-[13px] tabular-nums")}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                <span aria-hidden>{Math.round(scale * 100)}%</span>
              </button>
              <button type="button" onClick={() => controls.current?.zoomIn()} disabled={scale >= MAX_SCALE - 0.01} aria-label={z.zoomIn} className={btn}>
                <Plus className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <p className={cn("text-center text-[13px] tabular-nums tracking-[0.04em]", dark ? "text-white/60" : "text-[#6B6257]")} aria-live="polite">
              {total > 1 && z.counter.replace("{{n}}", String((index ?? 0) + 1)).replace("{{total}}", String(total))}
              {total > 1 && caption && " · "}
              {caption}
            </p>
            <p className={cn("hidden text-center text-[12px] md:block", dark ? "text-white/45" : "text-[#6B6257]")}>{z.hintDesktop}</p>
            <p className={cn("text-center text-[12px] md:hidden", dark ? "text-white/45" : "text-[#6B6257]")}>{z.hintTouch}</p>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
