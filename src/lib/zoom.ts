/**
 * Pan/zoom maths for the photo viewer (no library). The image is shown with object-contain in a
 * viewport; the zoom is `translate(x, y) scale(s)` around the viewport centre. Offsets are in CSS
 * pixels from the centre.
 */

export const MIN_SCALE = 1;
export const MAX_SCALE = 4;

export interface ZoomState {
  scale: number;
  x: number;
  y: number;
}

export const IDENTITY: ZoomState = { scale: 1, x: 0, y: 0 };

export interface Size {
  w: number;
  h: number;
}

/** Size of an image of natural size `img` shown with object-contain inside `box` */
export function containSize(box: Size, img: Size): Size {
  if (!box.w || !box.h || !img.w || !img.h) return { w: box.w, h: box.h };
  const k = Math.min(box.w / img.w, box.h / img.h);
  return { w: img.w * k, h: img.h * k };
}

// `+ 0` turns -0 into 0 (cleaner state, equal in tests)
const clampNum = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v)) + 0;

/** Keep the scale in [1, 4] and never let the image leave the viewport (no empty gap at an edge) */
export function clampZoom(z: ZoomState, box: Size, content: Size): ZoomState {
  const scale = clampNum(z.scale, MIN_SCALE, MAX_SCALE);
  const maxX = Math.max(0, (content.w * scale - box.w) / 2);
  const maxY = Math.max(0, (content.h * scale - box.h) / 2);
  return { scale, x: clampNum(z.x, -maxX, maxX), y: clampNum(z.y, -maxY, maxY) };
}

/**
 * Zoom to `nextScale` keeping the point under (px, py) still: (px, py) are offsets from the
 * viewport centre, e.g. the cursor, the pinch midpoint or the double-tap point.
 */
export function zoomAt(z: ZoomState, nextScale: number, px: number, py: number, box: Size, content: Size): ZoomState {
  const scale = clampNum(nextScale, MIN_SCALE, MAX_SCALE);
  const k = scale / z.scale;
  return clampZoom({ scale, x: px - (px - z.x) * k, y: py - (py - z.y) * k }, box, content);
}

/** Wheel / trackpad: smooth exponential step; ctrl+wheel is a trackpad pinch (bigger step) */
export function wheelScale(scale: number, deltaY: number, ctrlKey: boolean): number {
  return clampNum(scale * Math.exp(-deltaY * (ctrlKey ? 0.01 : 0.0025)), MIN_SCALE, MAX_SCALE);
}

/** Buttons: + / − in steps of ×1.5 */
export const stepScale = (scale: number, dir: 1 | -1) => clampNum(dir > 0 ? scale * 1.5 : scale / 1.5, MIN_SCALE, MAX_SCALE);

/** Double click / double tap: zoom in to 2.5× at the point, or back to 1× when already zoomed */
export const DOUBLE_TAP_SCALE = 2.5;
export const toggleScale = (scale: number) => (scale > 1.01 ? 1 : DOUBLE_TAP_SCALE);

/** A point of the image in % (0–100) and the scale to show it at, e.g. the chest logo */
export interface Focus {
  scale: number;
  x: number;
  y: number;
}

/** Zoom that puts the focus point in the middle of the viewport (as far as the limits allow) */
export function focusZoom(f: Focus, box: Size, content: Size): ZoomState {
  const ox = (f.x / 100 - 0.5) * content.w;
  const oy = (f.y / 100 - 0.5) * content.h;
  return clampZoom({ scale: f.scale, x: -ox * f.scale, y: -oy * f.scale }, box, content);
}
