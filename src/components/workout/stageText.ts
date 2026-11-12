import type { WorkoutStage } from "@/types/workout";
import type { TranslationsType } from "@/contexts/LanguageContext";
import { durationUnitLabel } from "@/utils/workoutLabels";
import { durationSeconds, formatClock, paceToText } from "@/utils/stageInput";

const isPace = (type: string) => type === "pace" || type === "targetPace" || type === "cssBasedPace";

/** Duration of a step as shown in lists: "15:00", "800 m", "volta" (lap button) */
export const durationText = (s: WorkoutStage, t: TranslationsType): string => {
  if (s.duration.type === "lapButton") return t.admin.workoutEditor.lapShort;
  const secs = durationSeconds(s.duration);
  if (secs !== undefined) return formatClock(secs);
  if (typeof s.duration.value === "number") return `${s.duration.value} ${durationUnitLabel(s.duration.unit)}`.trim();
  return "—";
};

/** Target as a chip: "Z2", "Pace 4:30–4:45", "140–150 bpm"; null when none */
export const targetChip = (s: WorkoutStage, t: TranslationsType): { kind: string; value: string } | null => {
  const i = s.intensity;
  if (!i || i.type === "none") return null;
  if ((i.type === "heartRateZone" || i.type === "powerZone") && i.value !== undefined) return { kind: `Z${i.value}`, value: "" };
  if (isPace(i.type)) {
    const lo = paceToText(i.min ?? i.value);
    const hi = i.max !== undefined ? paceToText(i.max) : "";
    return { kind: t.athlete.workoutView.paceChip, value: [lo, hi].filter(Boolean).join("–") };
  }
  const range = i.min !== undefined && i.max !== undefined ? `${i.min}–${i.max}` : i.value !== undefined ? String(i.value) : "";
  return { kind: range ? `${range} ${i.unit ?? ""}`.trim() : "", value: "" };
};

/** One line for compact lists: "Z2 · 15:00" */
export const stepLine = (s: WorkoutStage, t: TranslationsType): string => {
  const chip = targetChip(s, t);
  return [chip && [chip.kind, chip.value].filter(Boolean).join(" "), durationText(s, t)].filter(Boolean).join(" · ");
};
