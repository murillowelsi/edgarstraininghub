import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { IDENTITY, clampZoom, containSize, focusZoom, stepScale, toggleScale, wheelScale, zoomAt, type Focus, type Size, type ZoomState } from "@/lib/zoom";
import { cn } from "@/lib/utils";

/*
 * One zoomable photo (own implementation, pointer events + CSS transform; no library):
 * pinch (touch), wheel / trackpad pinch, double click / double tap, drag to pan when zoomed.
 * Limits 1×–4× and the image never leaves the viewport. At 1× a horizontal swipe calls
 * onSwipe (previous / next photo). Animated only for button / double-tap zooms, never with
 * reduced motion.
 *
 * fit="width" (tall images such as receipts): the image fills the width (max 720 px) and opens at
 * the top; drag, swipe up/down and the plain wheel scroll it vertically; pinch, ctrl/⌘+wheel and
 * the buttons zoom.
 */

export interface ZoomControls {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}

interface Props {
  src: string;
  alt: string;
  /** Natural size of the image (for the contain box and the pan limits) */
  width: number;
  height: number;
  /** Start zoomed on a point of the image (e.g. the product "Detail" view) */
  initial?: Focus;
  /** "contain" (default): whole image in view. "width": fill the width, scroll vertically */
  fit?: "contain" | "width";
  onScaleChange?: (scale: number) => void;
  onSwipe?: (dir: 1 | -1) => void;
  className?: string;
}

type Pt = { x: number; y: number };

export const ZoomViewport = forwardRef<ZoomControls, Props>(function ZoomViewport({ src, alt, width, height, initial, fit = "contain", onScaleChange, onSwipe, className }, ref) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoomState] = useState<ZoomState>(IDENTITY);
  const [animate, setAnimate] = useState(false);
  const [contentSize, setContentSize] = useState<Size | null>(null);
  const byWidth = fit === "width";
  const zoomRef = useRef(zoom);
  const pointers = useRef(new Map<number, Pt>());
  const gesture = useRef<{ start: Pt; startZoom: ZoomState; pinchDist?: number; pinchMid?: Pt; moved: boolean } | null>(null);
  const lastTap = useRef<{ t: number; p: Pt } | null>(null);
  // Touch browsers also fire dblclick after a double tap: handled once, by the pointer code
  const lastPointerType = useRef<string>("mouse");

  const measure = useCallback((): { box: Size; content: Size } => {
    const r = boxRef.current?.getBoundingClientRect();
    const box = { w: r?.width ?? 0, h: r?.height ?? 0 };
    if (!byWidth) return { box, content: containSize(box, { w: width, h: height }) };
    const w = Math.min(box.w, 720);
    return { box, content: { w, h: (w * height) / width } };
  }, [width, height, byWidth]);

  /** Fit-width start: scale 1, scrolled to the top (y is clamped to the largest offset) */
  const topOf = useCallback((box: Size, content: Size) => clampZoom({ scale: 1, x: 0, y: Number.MAX_SAFE_INTEGER }, box, content), []);

  /** Point relative to the viewport centre */
  const local = useCallback((clientX: number, clientY: number): Pt => {
    const r = boxRef.current!.getBoundingClientRect();
    return { x: clientX - r.left - r.width / 2, y: clientY - r.top - r.height / 2 };
  }, []);

  const setZoom = useCallback(
    (next: ZoomState, withAnimation = false) => {
      zoomRef.current = next;
      setAnimate(withAnimation);
      setZoomState(next);
      onScaleChange?.(next.scale);
    },
    [onScaleChange],
  );

  // Start state (e.g. Detail) once the viewport has a size
  useEffect(() => {
    const { box, content } = measure();
    setContentSize(content);
    setZoom(initial ? focusZoom(initial, box, content) : byWidth ? topOf(box, content) : IDENTITY);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the photo changes
  }, [src]);

  // Keep the limits right when the window is resized / rotated
  useEffect(() => {
    const onResize = () => {
      const { box, content } = measure();
      setContentSize(content);
      setZoom(clampZoom(zoomRef.current, box, content));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measure, setZoom]);

  // Wheel needs a non-passive listener to stop the page from scrolling
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { box, content } = measure();
      // Tall images: the plain wheel scrolls; ctrl/⌘+wheel (and trackpad pinch) zooms
      if (byWidth && !e.ctrlKey && !e.metaKey) {
        const z = zoomRef.current;
        setZoom(clampZoom({ ...z, x: z.x - e.deltaX, y: z.y - e.deltaY }, box, content));
        return;
      }
      const p = local(e.clientX, e.clientY);
      setZoom(zoomAt(zoomRef.current, wheelScale(zoomRef.current.scale, e.deltaY, e.ctrlKey), p.x, p.y, box, content));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [local, measure, setZoom, byWidth]);

  const zoomCentre = useCallback(
    (scale: number) => {
      const { box, content } = measure();
      setZoom(zoomAt(zoomRef.current, scale, 0, 0, box, content), true);
    },
    [measure, setZoom],
  );

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => zoomCentre(stepScale(zoomRef.current.scale, 1)),
      zoomOut: () => zoomCentre(stepScale(zoomRef.current.scale, -1)),
      reset: () => {
        const { box, content } = measure();
        setZoom(byWidth ? topOf(box, content) : IDENTITY, true);
      },
    }),
    [zoomCentre, setZoom, measure, byWidth, topOf],
  );

  const toggleAt = (clientX: number, clientY: number) => {
    const { box, content } = measure();
    const p = local(clientX, clientY);
    setZoom(zoomAt(zoomRef.current, toggleScale(zoomRef.current.scale), p.x, p.y, box, content), true);
  };

  const startGesture = () => {
    const pts = [...pointers.current.values()];
    const start = pts[0];
    const g: NonNullable<typeof gesture.current> = { start, startZoom: zoomRef.current, moved: false };
    if (pts.length >= 2) {
      g.pinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      g.pinchMid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    }
    gesture.current = g;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    lastPointerType.current = e.pointerType;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    boxRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    startGesture();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const { box, content } = measure();
    const pts = [...pointers.current.values()];
    if (pts.length >= 2 && g.pinchDist && g.pinchMid) {
      // Pinch: scale by the finger distance, around the starting midpoint, and follow the midpoint
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const anchor = local(g.pinchMid.x, g.pinchMid.y);
      const z = zoomAt(g.startZoom, g.startZoom.scale * (dist / g.pinchDist), anchor.x, anchor.y, box, content);
      setZoom(clampZoom({ ...z, x: z.x + mid.x - g.pinchMid.x, y: z.y + mid.y - g.pinchMid.y }, box, content));
      g.moved = true;
      return;
    }
    const dx = e.clientX - g.start.x;
    const dy = e.clientY - g.start.y;
    if (Math.hypot(dx, dy) > 6) g.moved = true;
    // Drag to pan when zoomed, or vertically on a tall image (otherwise at 1× the gesture is a swipe)
    const horizontal = Math.abs(dx) > Math.abs(dy) * 1.5;
    if (g.startZoom.scale > 1.01 || (byWidth && content.h > box.h && !horizontal)) setZoom(clampZoom({ ...g.startZoom, x: g.startZoom.x + dx, y: g.startZoom.y + dy }, box, content));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) {
      // One finger left after a pinch: continue as a pan from here (never a tap or a swipe)
      startGesture();
      if (gesture.current) {
        gesture.current.moved = true;
        gesture.current.pinchDist = 0;
      }
      return;
    }
    gesture.current = null;
    if (!g) return;
    const dx = e.clientX - g.start.x;
    const dy = e.clientY - g.start.y;
    // Swipe between photos at 1× (not right after a pinch: pinchDist is then set)
    if (g.startZoom.scale <= 1.01 && (!byWidth || Math.abs(dy) < 40) && g.pinchDist === undefined && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      onSwipe?.(dx < 0 ? 1 : -1);
      return;
    }
    // Double tap on touch screens (the mouse uses dblclick)
    if (e.pointerType !== "mouse" && !g.moved) {
      const now = Date.now();
      const last = lastTap.current;
      if (last && now - last.t < 300 && Math.hypot(e.clientX - last.p.x, e.clientY - last.p.y) < 30) {
        lastTap.current = null;
        toggleAt(e.clientX, e.clientY);
      } else lastTap.current = { t: now, p: { x: e.clientX, y: e.clientY } };
    }
  };

  const zoomed = zoom.scale > 1.01 || byWidth;

  return (
    <div
      ref={boxRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={(e) => lastPointerType.current === "mouse" && toggleAt(e.clientX, e.clientY)}
      className={cn("relative h-full w-full touch-none select-none overflow-hidden", zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in", className)}
      data-scale={zoom.scale.toFixed(2)}
    >
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        draggable={false}
        style={
          byWidth && contentSize
            ? // Centred at its fit-width size; the transform moves and scales it from there
              { left: "50%", top: "50%", width: contentSize.w, height: contentSize.h, marginLeft: -contentSize.w / 2, marginTop: -contentSize.h / 2, transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})` }
            : { transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})` }
        }
        className={cn(
          "absolute origin-center will-change-transform",
          !byWidth && "inset-0 h-full w-full object-contain",
          animate && "transition-transform duration-200 ease-out motion-reduce:transition-none",
        )}
      />
    </div>
  );
});
