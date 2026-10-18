import { Button } from "@/components/ui/button";
import { GrBike, GrRun, GrSwim } from "react-icons/gr";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  DurationType,
  DurationUnit,
  IntensityType,
  StageType,
  SwimmingDrillType,
  SwimmingEquipmentType,
  SwimmingStrokeType,
  WorkoutStage,
  WorkoutType,
} from "@/types/workout";
import {
  createDefaultStage,
  durationTypesByWorkout,
  getDefaultIntervalType,
  intensityTypesByWorkout,
  stageColors,
  stageTypesByWorkout,
  swimmingDistancePresets,
} from "@/types/workout";
import { useLanguage } from "@/contexts/LanguageContext";
import { workoutLabels } from "@/utils/workoutLabels";
import {
  ChevronRight,
  Minus,
  Clock,
  Flame,
  Heart,
  Plus,
  Repeat,
  Trash2,
  Wind,
  Zap,
} from "lucide-react";

interface StageEditorProps {
  stage: WorkoutStage;
  onChange: (stage: WorkoutStage) => void;
  onDone: () => void;
  workoutType?: WorkoutType;
  /** Repeat blocks: open one of the block's stages in the editor */
  onEditNested?: (stageId: string) => void;
  /** One-line summary of a stage (duration · target) for the block's list */
  describe?: (stage: WorkoutStage) => string;
}

const stageIcons: Record<string, React.ElementType> = {
  warmup: Flame,
  run: GrRun,
  cooldown: Wind,
  recovery: Heart,
  interval: Zap,
  repeat: Repeat,
  bike: GrBike,
  rest: Clock,
  swim: GrSwim,
};

const StageEditor = ({ stage, onChange, onDone, workoutType = "running", onEditNested, describe }: StageEditorProps) => {
  const { t } = useLanguage();
  const L = workoutLabels(t);
  const te = t.admin.workoutEditor;
  const isRepeat = stage.type === "repeat";
  const isSwimming = workoutType === "swimming";

  const availableStageTypes = stageTypesByWorkout[workoutType];
  const availableDurationTypes = durationTypesByWorkout[workoutType];
  const availableIntensityTypes = intensityTypesByWorkout[workoutType];

  const handleTypeChange = (type: StageType) => {
    if (type === "repeat") {
      onChange({
        ...stage,
        type,
        repeatCount: 2,
        stages: [createDefaultStage(getDefaultIntervalType(workoutType)), createDefaultStage("recovery")],
      });
    } else {
      onChange({ ...stage, type, repeatCount: undefined, stages: undefined });
    }
  };

  const setRepeatCount = (count: number) =>
    onChange({ ...stage, repeatCount: Math.min(50, Math.max(2, count)) });

  const handleDurationTypeChange = (type: DurationType) => {
    onChange({
      ...stage,
      duration: {
        type,
        value: type === "lapButton" ? undefined : stage.duration.value,
        unit: type === "distance" ? "km" : type === "time" ? "min" : type === "power" ? "w" : undefined,
      },
    });
  };

  const handleDurationValueChange = (value: string) => {
    const numValue = parseFloat(value);
    onChange({ ...stage, duration: { ...stage.duration, value: isNaN(numValue) ? undefined : numValue } });
  };

  const handleDurationUnitChange = (unit: DurationUnit) => {
    onChange({ ...stage, duration: { ...stage.duration, unit } });
  };

  const handleSwimmingDistancePreset = (value: string) => {
    if (value === "custom") {
      onChange({ ...stage, duration: { ...stage.duration, value: undefined, unit: "m" } });
    } else {
      onChange({ ...stage, duration: { ...stage.duration, value: parseInt(value), unit: "m" } });
    }
  };

  const handleStrokeTypeChange = (strokeType: SwimmingStrokeType) => {
    onChange({ ...stage, strokeType });
  };

  const handleDrillTypeChange = (drillType: SwimmingDrillType) => {
    onChange({ ...stage, drillType });
  };

  const handleEquipmentChange = (equipment: SwimmingEquipmentType) => {
    onChange({ ...stage, equipment });
  };

  const handleIntensityTypeChange = (type: IntensityType) => {
    let unit: string | undefined = undefined;
    let defaultValue: number | undefined = undefined;

    if (type === "pace") unit = "min/km";
    if (type === "speed") unit = "km/h";
    if (type === "cadence" || type === "bikeCadence") unit = "rpm";
    if (type === "customHeartRate") unit = "bpm";
    if (type === "customPower") unit = "W";
    if (type === "heartRateZone") defaultValue = 1;
    if (type === "powerZone") defaultValue = 1;

    onChange({
      ...stage,
      intensity: { type, value: defaultValue, min: undefined, max: undefined, unit },
    });
  };

  const handleIntensityMinChange = (value: string) => {
    const numValue = parseFloat(value);
    onChange({ ...stage, intensity: { ...stage.intensity, min: isNaN(numValue) ? undefined : numValue } });
  };

  const handleIntensityMaxChange = (value: string) => {
    const numValue = parseFloat(value);
    onChange({ ...stage, intensity: { ...stage.intensity, max: isNaN(numValue) ? undefined : numValue } });
  };

  const handleIntensityZoneChange = (zone: string) => {
    onChange({ ...stage, intensity: { ...stage.intensity, value: parseInt(zone) } });
  };

  const handleNotesChange = (notes: string) => {
    onChange({ ...stage, notes: notes || undefined });
  };

  const handleNestedStageChange = (index: number, nestedStage: WorkoutStage) => {
    const newStages = [...(stage.stages || [])];
    newStages[index] = nestedStage;
    onChange({ ...stage, stages: newStages });
  };

  const handleAddNestedStage = () => {
    const newStage = createDefaultStage(getDefaultIntervalType(workoutType));
    onChange({ ...stage, stages: [...(stage.stages || []), newStage] });
    // Straight into the new stage, like "Add stage" at the top level
    onEditNested?.(newStage.id);
  };

  const handleDeleteNestedStage = (index: number) => {
    const newStages = (stage.stages || []).filter((_, i) => i !== index);
    onChange({ ...stage, stages: newStages });
  };

  const needsRangeInput = ["speed", "bikeCadence", "cadence", "customHeartRate", "customPower", "pace"].includes(stage.intensity.type);
  const showDurationValue = stage.duration.type !== "lapButton";
  const showDistanceUnit = stage.duration.type === "distance";
  const showTimeUnit = stage.duration.type === "time";
  const showPowerUnit = stage.duration.type === "power";

  const getIntensityLabel = () => {
    switch (stage.intensity.type) {
      case "speed": return "Speed";
      case "bikeCadence": return "Bike Cadence";
      case "cadence": return "Cadence";
      case "pace": return "Pace";
      case "customHeartRate": return "Heart Rate";
      case "customPower": return "Power";
      case "heartRateZone": return "HR Zone";
      case "powerZone": return "Power Zone";
      default: return "Value";
    }
  };

  const heartRateZones = [
    { value: 1, label: "Zone 1 (101-121 bpm)" },
    { value: 2, label: "Zone 2 (121-141 bpm)" },
    { value: 3, label: "Zone 3 (141-159 bpm)" },
    { value: 4, label: "Zone 4 (159-181 bpm)" },
    { value: 5, label: "Zone 5 (181-201 bpm)" },
  ];

  const powerZones = [
    { value: 1, label: "Zone 1 (0-110 W)" },
    { value: 2, label: "Zone 2 (110-150 W)" },
    { value: 3, label: "Zone 3 (150-185 W)" },
    { value: 4, label: "Zone 4 (185-220 W)" },
    { value: 5, label: "Zone 5 (220-260 W)" },
    { value: 6, label: "Zone 6 (260-310 W)" },
    { value: 7, label: "Zone 7 (310+ W)" },
  ];

  return (
    <div className="space-y-6">
      {/* Stage type — a block is created with "Add repetition", never by switching type */}
      {!isRepeat && (
        <div className="space-y-1.5">
          <Label>{te.type}</Label>
          <Select value={stage.type} onValueChange={handleTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableStageTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {L.stage(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isRepeat && (
        <div className="flex items-center justify-between">
          <Label className="text-base">{te.repeatCount}</Label>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-full"
              disabled={(stage.repeatCount || 2) <= 2}
              onClick={() => setRepeatCount((stage.repeatCount || 2) - 1)}
              aria-label="-1"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-14 text-center text-2xl font-bold tabular-nums">{stage.repeatCount || 2}×</span>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-full"
              disabled={(stage.repeatCount || 2) >= 50}
              onClick={() => setRepeatCount((stage.repeatCount || 2) + 1)}
              aria-label="+1"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Duration — non-repeat only */}
      {!isRepeat && (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration</p>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={stage.duration.type} onValueChange={handleDurationTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableDurationTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {L.duration(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showDurationValue && (
            <div className="space-y-1.5">
              <Label>
                {stage.duration.type === "distance"
                  ? "Distance"
                  : stage.duration.type === "time"
                  ? "Time"
                  : stage.duration.type === "calories"
                  ? "Calories"
                  : stage.duration.type === "power"
                  ? "Power"
                  : "Value"}
              </Label>
              <div className="flex gap-2">
                {isSwimming && showDistanceUnit ? (
                  <Select
                    value={
                      stage.duration.value && swimmingDistancePresets.includes(stage.duration.value)
                        ? String(stage.duration.value)
                        : "custom"
                    }
                    onValueChange={handleSwimmingDistancePreset}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {swimmingDistancePresets.map((dist) => (
                        <SelectItem key={dist} value={String(dist)}>
                          {dist} m
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="number"
                    step="0.01"
                    value={stage.duration.value || ""}
                    onChange={(e) => handleDurationValueChange(e.target.value)}
                    placeholder="0.00"
                    className="flex-1"
                  />
                )}
                {showDistanceUnit && !isSwimming && (
                  <Select
                    value={stage.duration.unit || "km"}
                    onValueChange={(v) => handleDurationUnitChange(v as DurationUnit)}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="km">km</SelectItem>
                      <SelectItem value="m">m</SelectItem>
                      <SelectItem value="mi">mi</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {showTimeUnit && (
                  <Select
                    value={stage.duration.unit || "min"}
                    onValueChange={(v) => handleDurationUnitChange(v as DurationUnit)}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="min">min</SelectItem>
                      <SelectItem value="sec">sec</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {showPowerUnit && (
                  <span className="flex items-center text-sm text-muted-foreground px-2">W</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Swimming fields — non-repeat only */}
      {isSwimming && !isRepeat && (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Swimming</p>

          <div className="space-y-1.5">
            <Label>Stroke type</Label>
            <Select
              value={stage.strokeType || "freestyle"}
              onValueChange={(v) => handleStrokeTypeChange(v as SwimmingStrokeType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(t.workoutMeta.strokes) as SwimmingStrokeType[]).map((stroke) => (
                  <SelectItem key={stroke} value={stroke}>
                    {L.stroke(stroke)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Drill type</Label>
            <Select
              value={stage.drillType || "none"}
              onValueChange={(v) => handleDrillTypeChange(v as SwimmingDrillType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(t.workoutMeta.drills) as SwimmingDrillType[]).map((drill) => (
                  <SelectItem key={drill} value={drill}>
                    {L.drill(drill)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Equipment</Label>
            <Select
              value={stage.equipment || "none"}
              onValueChange={(v) => handleEquipmentChange(v as SwimmingEquipmentType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(t.workoutMeta.swimEquipment) as SwimmingEquipmentType[]).map((equip) => (
                  <SelectItem key={equip} value={equip}>
                    {L.swimEquipment(equip)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Intensity goal — non-repeat only */}
      {!isRepeat && (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Intensity Goal</p>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={stage.intensity.type} onValueChange={handleIntensityTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableIntensityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {L.intensity(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsRangeInput && (
            <div className="space-y-1.5">
              <Label>{getIntensityLabel()}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.1"
                  value={stage.intensity.min ?? ""}
                  onChange={(e) => handleIntensityMinChange(e.target.value)}
                  placeholder="Min"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground shrink-0">to</span>
                <Input
                  type="number"
                  step="0.1"
                  value={stage.intensity.max ?? ""}
                  onChange={(e) => handleIntensityMaxChange(e.target.value)}
                  placeholder="Max"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground shrink-0">
                  {stage.intensity.unit || ""}
                </span>
              </div>
            </div>
          )}

          {stage.intensity.type === "heartRateZone" && (
            <div className="space-y-1.5">
              <Label>{getIntensityLabel()}</Label>
              <Select
                value={String(stage.intensity.value || 1)}
                onValueChange={handleIntensityZoneChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {heartRateZones.map((zone) => (
                    <SelectItem key={zone.value} value={String(zone.value)}>
                      {zone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {stage.intensity.type === "powerZone" && (
            <div className="space-y-1.5">
              <Label>{getIntensityLabel()}</Label>
              <Select
                value={String(stage.intensity.value || 1)}
                onValueChange={handleIntensityZoneChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {powerZones.map((zone) => (
                    <SelectItem key={zone.value} value={String(zone.value)}>
                      {zone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Nested stages — repeat only: each row opens that stage's full editor */}
      {isRepeat && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{te.stagesToRepeat}</p>
          {(stage.stages || []).map((nestedStage, index) => {
            const NestedIcon = stageIcons[nestedStage.type] || GrRun;
            const nestedColor = stageColors[nestedStage.type];
            return (
              <div key={nestedStage.id} className="flex items-center gap-1 rounded-xl border bg-card pr-1">
                <button
                  type="button"
                  onClick={() => onEditNested?.(nestedStage.id)}
                  className="flex flex-1 min-w-0 items-center gap-3 p-3 text-left"
                >
                  <div
                    className="p-2 rounded-lg shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: `${nestedColor}1a`, color: nestedColor }}
                  >
                    <NestedIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{L.stage(nestedStage.type)}</p>
                    {describe && <p className="text-xs text-muted-foreground truncate">{describe(nestedStage)}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteNestedStage(index)}
                  disabled={(stage.stages || []).length <= 1}
                  className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                  aria-label={t.common.delete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={handleAddNestedStage} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            {t.admin.workoutEditor.addStage}
          </Button>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea
          placeholder="Add notes about this stage"
          value={stage.notes || ""}
          onChange={(e) => handleNotesChange(e.target.value)}
          rows={3}
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground text-right">
          {(stage.notes || "").length}/200
        </p>
      </div>

      {/* Done */}
      <Button onClick={onDone} className="w-full">
        Done
      </Button>
    </div>
  );
};

export default StageEditor;
