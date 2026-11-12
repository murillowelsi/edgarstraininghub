import type { StageDuration } from "@/types/workout";

/**
 * mm:ss on screen, same stored format underneath (docs/design/workout-editor WE-3):
 * - pace stays the "m.ss" decimal it always was (4.3 = 4:30 /km), in the same field;
 * - time stays { value, unit } with unit "min" (fractions allowed, 1.5 = 1:30) or "sec".
 */

/** 90 → "1:30", 3725 → "1:02:05" */
export const formatClock = (seconds: number): string => {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
};

/**
 * "15" (minutes), "1:30", "1:02:05" → seconds. undefined when it can't be read
 * (seconds ≥ 60, letters, empty).
 */
export const parseClock = (text: string): number | undefined => {
  const v = text.trim();
  if (!v) return undefined;
  if (/^\d+([.,]\d+)?$/.test(v)) return Math.round(parseFloat(v.replace(",", ".")) * 60);
  const parts = v.split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return undefined;
  const nums = parts.map(Number);
  const [a, b, c] = nums;
  if (nums.length === 2) return b < 60 ? a * 60 + b : undefined;
  return b < 60 && c < 60 ? a * 3600 + b * 60 + c : undefined;
};

/** Stored time duration → seconds */
export const durationSeconds = (d: StageDuration): number | undefined => {
  if (d.type !== "time" || typeof d.value !== "number") return undefined;
  const unit: string = d.unit ?? "min";
  return unit === "sec" ? d.value : d.value * 60;
};

/** Seconds typed as mm:ss → stored time duration, keeping the stage's unit */
export const secondsToDuration = (seconds: number, unit: string | undefined): Pick<StageDuration, "value" | "unit"> =>
  unit === "sec" ? { value: seconds, unit: "sec" } : { value: Math.round((seconds / 60) * 10000) / 10000, unit: "min" };

/** Stored pace decimal (4.3) → "4:30" */
export const paceToText = (pace: number | undefined): string => {
  if (pace === undefined || isNaN(pace)) return "";
  const m = Math.floor(pace);
  const s = Math.round((pace - m) * 100);
  return `${m}:${String(s).padStart(2, "0")}`;
};

/** "4:30" (or "4") → stored pace decimal 4.3. undefined when invalid */
export const textToPace = (text: string): number | undefined => {
  const v = text.trim();
  if (!v) return undefined;
  const match = v.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return undefined;
  const m = Number(match[1]);
  const s = match[2] === undefined ? 0 : Number(match[2]);
  if (s >= 60) return undefined;
  return Math.round((m + s / 100) * 100) / 100;
};

/** Pace decimal → seconds, to compare paces (4.3 → 270) */
export const paceSeconds = (pace: number): number => Math.floor(pace) * 60 + Math.round((pace % 1) * 100);
