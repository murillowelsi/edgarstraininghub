import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { updateAssignmentActivityData } from "@/services/workoutAssignmentsService";
import type { ActivityData } from "@/types/workoutAssignment";
import type { WorkoutType } from "@/types/workout";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
  workoutType: WorkoutType;
  initial?: ActivityData;
  onSaved?: (next: ActivityData) => void;
}

const timeToString = (sec?: number) => {
  if (!sec && sec !== 0) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const stringToTime = (str: string): number | undefined => {
  if (!str.trim()) return undefined;
  const parts = str.split(":").map((x) => parseInt(x, 10));
  if (parts.some(isNaN)) return undefined;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
};

const formatPaceMSS = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const EditActivitySheet = ({ open, onOpenChange, assignmentId, workoutType, initial, onSaved }: Props) => {
  const { t } = useLanguage();
  const ta = t.athlete.activity;
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [distance, setDistance] = useState("");
  const [elapsed, setElapsed] = useState("");
  const [hr, setHr] = useState("");
  const [power, setPower] = useState("");
  const [saving, setSaving] = useState(false);

  const isSwim = workoutType === "swimming";
  const isCycle = workoutType === "cycling";

  useEffect(() => {
    if (open) {
      setDistance(
        initial?.distance != null
          ? isSwim
            ? String(Math.round(initial.distance * 1000))
            : String(initial.distance)
          : ""
      );
      setElapsed(timeToString(initial?.elapsedTime));
      setHr(initial?.avgHeartRate != null ? String(initial.avgHeartRate) : "");
      setPower(initial?.avgPower != null ? String(initial.avgPower) : "");
    }
  }, [open, initial, isSwim]);

  const distNum = parseFloat(distance.replace(",", "."));
  const elapsedSec = stringToTime(elapsed);
  const distanceKm = isNaN(distNum) ? undefined : isSwim ? distNum / 1000 : distNum;

  const derivedSpeed =
    elapsedSec && distanceKm && distanceKm > 0 ? (distanceKm / elapsedSec) * 3600 : undefined;
  const derivedPace =
    elapsedSec && distanceKm && distanceKm > 0
      ? isSwim
        ? elapsedSec / (distanceKm * 10)
        : elapsedSec / distanceKm
      : undefined;

  const handleSave = async () => {
    setSaving(true);
    try {
      const next: ActivityData = {
        ...(initial ?? {}),
        distance: distanceKm,
        elapsedTime: elapsedSec,
        avgPace: !isCycle ? derivedPace : undefined,
        avgSpeed: isCycle ? derivedSpeed : undefined,
        avgHeartRate: hr.trim() ? parseFloat(hr) : undefined,
        avgPower: isCycle && power.trim() ? parseFloat(power) : undefined,
      };
      Object.keys(next).forEach((k) => {
        if ((next as Record<string, unknown>)[k] === undefined) delete (next as Record<string, unknown>)[k];
      });
      await updateAssignmentActivityData(assignmentId, next);
      toast({ title: ta.updated });
      onSaved?.(next);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({ title: ta.saveFailed, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const formContent = (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>{ta.metrics.distance} {isSwim ? "(m)" : "(km)"}</Label>
        <Input value={distance} onChange={(e) => setDistance(e.target.value)} inputMode="decimal" />
      </div>
      <div className="space-y-2">
        <Label>{ta.metrics.time} (h:mm:ss)</Label>
        <Input value={elapsed} onChange={(e) => setElapsed(e.target.value)} placeholder="0:00" />
      </div>

      {(derivedPace !== undefined || derivedSpeed !== undefined) && (
        <div className="rounded-xl bg-muted/40 p-3 flex items-center gap-3">
          <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            {isCycle ? ta.metrics.avgSpeed : ta.metrics.avgPace}
          </span>
          <span className="ml-auto font-display font-bold tabular-nums">
            {isCycle
              ? `${derivedSpeed?.toFixed(1).replace(".", ",")} km/h`
              : `${formatPaceMSS(derivedPace ?? 0)} ${isSwim ? "/100m" : "/km"}`}
          </span>
        </div>
      )}

      <div className="space-y-2">
        <Label>{ta.metrics.avgHr} (bpm)</Label>
        <Input value={hr} onChange={(e) => setHr(e.target.value)} inputMode="numeric" />
      </div>

      {isCycle && (
        <div className="space-y-2">
          <Label>{ta.metrics.avgPower} (W)</Label>
          <Input value={power} onChange={(e) => setPower(e.target.value)} inputMode="numeric" />
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2">
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {ta.save}
        </Button>
        <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
          {t.athlete.events.cancel}
        </Button>
      </div>
    </div>
  );

  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange} direction={isMobile ? "bottom" : "right"}>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <DrawerPrimitive.Content
          className={cn(
            "fixed z-50 flex flex-col bg-background",
            isMobile
              ? "inset-x-0 bottom-0 rounded-t-[10px] max-h-[90dvh]"
              : "inset-y-0 right-0 h-full w-[480px] border-l"
          )}
        >
          {isMobile && <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted shrink-0" />}
          <div className="px-4 py-4 border-b shrink-0">
            <DrawerPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
              {ta.edit}
            </DrawerPrimitive.Title>
          </div>
          <div className="px-4 py-4 overflow-y-auto flex-1">{formContent}</div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
};

export default EditActivitySheet;
