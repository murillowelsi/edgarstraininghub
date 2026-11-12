import { Activity, Bike, Dumbbell, createLucideIcon, type LucideIcon } from "lucide-react";

/**
 * Sport icons in the lucide style (24 grid, 2px stroke, round caps) so they sit
 * with the rest of the app's icons. Drawn for EZ; bike and strength reuse lucide.
 */
export const RunIcon = createLucideIcon("EzRun", [
  ["circle", { cx: "15.5", cy: "4", r: "1.8", key: "head" }],
  ["path", { d: "M8.5 9.5 11.5 7.5l3 1.5 2 3 3 .5", key: "arms" }],
  ["path", { d: "M11.5 7.5 10 13l3.5 2.5-1.5 5", key: "lead" }],
  ["path", { d: "M10 13l-2.5 3-3.5.5", key: "trail" }],
]);

export const SwimIcon = createLucideIcon("EzSwim", [
  ["circle", { cx: "7.5", cy: "7", r: "1.8", key: "head" }],
  ["path", { d: "M3 12.5 9 10l3.5 2 4-3.5 4 1.5", key: "stroke" }],
  ["path", { d: "M2 17c1.7 0 1.7 1.2 3.3 1.2S7 17 8.7 17s1.7 1.2 3.3 1.2S13.7 17 15.3 17s1.7 1.2 3.4 1.2S20.3 17 22 17", key: "wave" }],
]);

const BY_TYPE: Record<string, LucideIcon> = {
  running: RunIcon,
  cycling: Bike,
  swimming: SwimIcon,
  strength: Dumbbell,
};

/** Picks the icon for a workout type ("running", "cycling", …); Activity otherwise. */
export const SportIcon = ({ type, ...props }: { type?: string } & React.ComponentProps<LucideIcon>) => {
  const Icon = (type && BY_TYPE[type]) || Activity;
  return <Icon {...props} />;
};
