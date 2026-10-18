import type { CSSProperties } from "react";

export interface AthleteColor {
  hue: number;
  saturation: number;
  lightness: number;
}

// Hand-picked so neighbours differ in hue *and* lightness — ordered so the
// first athletes get the most contrasting colors.
const PALETTE: [number, number, number][] = [
  [217, 91, 55], // blue
  [25, 95, 53],  // orange
  [142, 70, 38], // green
  [330, 80, 55], // pink
  [270, 65, 55], // purple
  [175, 85, 32], // teal
  [0, 80, 48],   // red
  [45, 95, 48],  // amber
  [225, 70, 32], // navy
  [85, 65, 42],  // lime
  [192, 90, 45], // cyan
  [25, 55, 33],  // brown
  [290, 55, 68], // lilac
  [10, 90, 66],  // coral
  [60, 55, 34],  // olive
  [210, 15, 45], // slate
  [150, 60, 22], // forest
  [350, 70, 72], // rose
  [245, 60, 60], // indigo
  [38, 60, 58],  // sand
];

// Past the palette, golden-angle hues keep every color unique.
const GOLDEN_ANGLE = 137.508;

const colorForIndex = (index: number): AthleteColor => {
  if (index < PALETTE.length) {
    const [hue, saturation, lightness] = PALETTE[index];
    return { hue, saturation, lightness };
  }
  const n = index - PALETTE.length;
  return {
    hue: Math.round(((11 + n * GOLDEN_ANGLE) % 360) * 10) / 10,
    saturation: 70,
    lightness: n % 2 === 0 ? 42 : 60,
  };
};

/**
 * One unique color per athlete. Athletes are ordered by sign-up date so
 * existing athletes keep their color when new ones join.
 */
export const buildAthleteColorMap = (
  athletes: { id: string; createdAt?: Date }[]
): Map<string, AthleteColor> => {
  const sorted = [...athletes].sort(
    (a, b) =>
      (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0) ||
      a.id.localeCompare(b.id)
  );
  return new Map(sorted.map((a, i) => [a.id, colorForIndex(i)]));
};

/** CSS variables consumed by the `athlete*Class` classes below. */
export const athleteColorVars = (color?: AthleteColor): CSSProperties =>
  (color
    ? { "--ah": color.hue, "--as": `${color.saturation}%`, "--al": `${color.lightness}%` }
    : { "--ah": 0, "--as": "0%", "--al": "60%" }) as CSSProperties;

// Light tint background + solid accent stripe on the left; the stripe carries
// the identity so the text can stay neutral and readable.
export const athleteChipClass =
  "text-foreground border-l-4 " +
  "bg-[hsl(var(--ah)_var(--as)_94%)] border-[hsl(var(--ah)_var(--as)_85%)] border-l-[hsl(var(--ah)_var(--as)_var(--al))] " +
  "dark:bg-[hsl(var(--ah)_var(--as)_16%)] dark:border-[hsl(var(--ah)_var(--as)_28%)] dark:border-l-[hsl(var(--ah)_var(--as)_var(--al))]";

/** Solid accent color, e.g. for icons. */
export const athleteAccentTextClass = "text-[hsl(var(--ah)_var(--as)_var(--al))]";

export const athleteDotClass = "bg-[hsl(var(--ah)_var(--as)_var(--al))]";
