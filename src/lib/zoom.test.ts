import { describe, expect, it } from "vitest";
import { IDENTITY, MAX_SCALE, clampZoom, focusZoom, containSize, stepScale, toggleScale, wheelScale, zoomAt } from "./zoom";

const box = { w: 400, h: 800 };
const content = containSize(box, { w: 1000, h: 1250 }); // 400 × 500

describe("zoom maths", () => {
  it("fits a 4:5 image inside a tall viewport", () => {
    expect(content).toEqual({ w: 400, h: 500 });
  });

  it("keeps the scale between 1× and 4×", () => {
    expect(clampZoom({ scale: 9, x: 0, y: 0 }, box, content).scale).toBe(MAX_SCALE);
    expect(clampZoom({ scale: 0.3, x: 0, y: 0 }, box, content).scale).toBe(1);
    expect(stepScale(3.5, 1)).toBe(4);
    expect(stepScale(1.2, -1)).toBe(1);
    expect(wheelScale(1, 10_000, false)).toBe(1);
  });

  it("never lets the image leave the viewport", () => {
    // At 2×: 800 × 1000 content in a 400 × 800 box → x within ±200, y within ±100
    expect(clampZoom({ scale: 2, x: 999, y: -999 }, box, content)).toEqual({ scale: 2, x: 200, y: -100 });
    // At 1× nothing can move
    expect(clampZoom({ scale: 1, x: 50, y: 50 }, box, content)).toEqual(IDENTITY);
  });

  it("keeps the point under the cursor still when zooming", () => {
    const z = zoomAt(IDENTITY, 2, 100, 0, box, content);
    // Point at +100 from the centre: image point 100 → 100 = x + 100*2 → x = -100
    expect(z).toEqual({ scale: 2, x: -100, y: 0 });
    expect(zoomAt(z, 1, 0, 0, box, content)).toEqual(IDENTITY);
  });

  it("toggles 1× ↔ 2.5× on double tap", () => {
    expect(toggleScale(1)).toBe(2.5);
    expect(toggleScale(2.5)).toBe(1);
  });

  it("centres a focus point (the chest logo) when opening the detail", () => {
    // Logo at 36.5% / 36.3% of a 400×500 content, scale 2.6 → offsets (-54, -68.5) × 2.6
    expect(focusZoom({ scale: 2.6, x: 36.5, y: 36.3 }, box, content)).toEqual({ scale: 2.6, x: 140.4, y: 178.1 });
  });
});
