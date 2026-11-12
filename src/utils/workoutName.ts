/**
 * Tidies a workout name typed in the editor before it is saved:
 * trims, collapses repeated spaces, removes spaces just inside brackets,
 * adds a space before an opening bracket, puts a space in "6km" → "6 km"
 * and capitalises the first letter. The wording itself is never changed.
 */
export const normalizeWorkoutName = (raw: string): string => {
  let name = (raw ?? "").replace(/\s+/g, " ").trim();
  name = name.replace(/([([{])\s+/g, "$1").replace(/\s+([)\]}])/g, "$1");
  name = name.replace(/(\S)([([{])/g, "$1 $2");
  name = name.replace(/(\d+(?:[.,]\d+)?)\s*km\b/gi, "$1 km");
  return name.charAt(0).toLocaleUpperCase() + name.slice(1);
};
