/**
 * Typed durations ("elapsed time"): accepts h:mm:ss and m:ss, with or without
 * leading zeros ("1:00:00", "01:00:00", "45:30", "5:07"). Minutes and seconds
 * after the first part must be 0–59. Anything else is invalid (undefined), so
 * a typo never turns into a 10-hour workout.
 */
export const parseDuration = (input: string): number | undefined => {
  const value = input.trim();
  if (!value) return undefined;
  const parts = value.split(":");
  if (parts.length < 2 || parts.length > 3) return undefined;
  if (parts.some((p) => !/^\d{1,3}$/.test(p))) return undefined;
  const nums = parts.map(Number);
  const [first, ...rest] = nums;
  // Every part after the first is a 0–59 field written with 1–2 digits
  if (rest.some((n, i) => n > 59 || parts[i + 1].length > 2)) return undefined;
  const seconds = nums.length === 3 ? first * 3600 + rest[0] * 60 + rest[1] : first * 60 + rest[0];
  return seconds > 0 ? seconds : undefined;
};

/** 3725 → "1:02:05", 330 → "5:30". */
export const formatDuration = (totalSeconds: number): string => {
  const sec = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};

/** While typing: keep digits and at most two ":"; never regroup what the person typed. */
export const sanitizeDurationInput = (raw: string): string => {
  let colons = 0;
  let out = "";
  for (const ch of raw) {
    if (/\d/.test(ch)) out += ch;
    else if ((ch === ":" || ch === "." ) && colons < 2) {
      out += ":";
      colons++;
    }
  }
  return out.slice(0, 9);
};

/** On blur: tidy a valid value ("01:00:00" → "1:00:00"); leave invalid text for the person to fix. */
export const normalizeDurationInput = (raw: string): string => {
  const sec = parseDuration(raw);
  return sec === undefined ? raw.trim() : formatDuration(sec);
};

export type DurationInputMode = "auto" | "manual";

const separators = (s: string) => (s.match(/[:.]/g) || []).length;

/**
 * Next value of a duration field after a keystroke.
 * - "auto" (numeric keypads have no ":"): digits fill from the right like a
 *   timer: 1 → 10 → 1:00 → 10:00 → 1:00:00.
 * - "manual": once the person types ":" themselves, keep exactly what they
 *   type ("1:5:07"); normalizeDurationInput tidies it on blur.
 */
export const nextDurationInput = (
  prev: string,
  raw: string,
  mode: DurationInputMode
): { value: string; mode: DurationInputMode } => {
  if (!raw.trim()) return { value: "", mode: "auto" };
  if (mode === "manual" || separators(raw) > separators(prev)) {
    return { value: sanitizeDurationInput(raw), mode: "manual" };
  }
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d{3})/, "").slice(0, 6);
  const ss = digits.slice(-2);
  const mm = digits.slice(-4, -2);
  const hh = digits.slice(0, -4);
  const value = digits.length <= 2 ? digits : digits.length <= 4 ? `${mm}:${ss}` : `${hh}:${mm}:${ss}`;
  return { value, mode: "auto" };
};
