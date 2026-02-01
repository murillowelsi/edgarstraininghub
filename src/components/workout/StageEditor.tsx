import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  drillLabels,
  durationLabels,
  durationTypesByWorkout,
  equipmentLabels,
  getDefaultIntervalType,
  intensityLabels,
  intensityTypesByWorkout,
  stageColors,
  stageLabels,
  stageTypesByWorkout,
  strokeLabels,
  swimmingDistancePresets,
} from "@/types/workout";
import { GripVertical, Plus, Trash2 } from "lucide-react";

interface StageEditorProps {
  stage: WorkoutStage;
  onChange: (stage: WorkoutStage) => void;
  onDone: () => void;
  workoutType?: WorkoutType;
}

const StageEditor = ({ stage, onChange, onDone, workoutType = "running" }: StageEditorProps) => {
  const color = stageColors[stage.type];
  const isRepeat = stage.type === "repeat";
  const isSwimming = workoutType === "swimming";

  // Get available types based on workout type
  const availableStageTypes = stageTypesByWorkout[workoutType];
  const availableDurationTypes = durationTypesByWorkout[workoutType];
  const availableIntensityTypes = intensityTypesByWorkout[workoutType];

  const handleTypeChange = (type: StageType) => {
    if (type === "repeat") {
      // Converting to repeat - add default nested stages
      onChange({
        ...stage,
        type,
        repeatCount: 2,
        stages: [createDefaultStage(getDefaultIntervalType(workoutType)), createDefaultStage("recovery")],
      });
    } else {
      // Converting from repeat - remove nested stages
      onChange({
        ...stage,
        type,
        repeatCount: undefined,
        stages: undefined,
      });
    }
  };

  const handleRepeatCountChange = (value: string) => {
    const count = parseInt(value);
    onChange({
      ...stage,
      repeatCount: isNaN(count) || count < 1 ? 1 : count,
    });
  };

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
    onChange({
      ...stage,
      duration: {
        ...stage.duration,
        value: isNaN(numValue) ? undefined : numValue,
      },
    });
  };

  const handleDurationUnitChange = (unit: DurationUnit) => {
    onChange({
      ...stage,
      duration: { ...stage.duration, unit },
    });
  };

  // Swimming distance preset handler
  const handleSwimmingDistancePreset = (value: string) => {
    if (value === "custom") {
      onChange({
        ...stage,
        duration: { ...stage.duration, value: undefined, unit: "m" },
      });
    } else {
      onChange({
        ...stage,
        duration: { ...stage.duration, value: parseInt(value), unit: "m" },
      });
    }
  };

  // Swimming-specific handlers
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
      intensity: {
        type,
        value: defaultValue,
        min: undefined,
        max: undefined,
        unit,
      },
    });
  };

  const handleIntensityMinChange = (value: string) => {
    const numValue = parseFloat(value);
    onChange({
      ...stage,
      intensity: {
        ...stage.intensity,
        min: isNaN(numValue) ? undefined : numValue,
      },
    });
  };

  const handleIntensityMaxChange = (value: string) => {
    const numValue = parseFloat(value);
    onChange({
      ...stage,
      intensity: {
        ...stage.intensity,
        max: isNaN(numValue) ? undefined : numValue,
      },
    });
  };

  const handleIntensityZoneChange = (zone: string) => {
    onChange({
      ...stage,
      intensity: {
        ...stage.intensity,
        value: parseInt(zone),
      },
    });
  };

  const handleNotesChange = (notes: string) => {
    onChange({ ...stage, notes: notes || undefined });
  };

  // Intensity type helpers
  const needsRangeInput = ["speed", "bikeCadence", "cadence", "customHeartRate", "customPower", "pace"].includes(stage.intensity.type);
  const needsZoneSelect = ["heartRateZone", "powerZone"].includes(stage.intensity.type);

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

  const getIntensityUnit = () => {
    return stage.intensity.unit || "";
  };

  // Heart rate zones (based on typical Garmin zones)
  const heartRateZones = [
    { value: 1, label: "Zone 1 (101-121 bpm)" },
    { value: 2, label: "Zone 2 (121-141 bpm)" },
    { value: 3, label: "Zone 3 (141-159 bpm)" },
    { value: 4, label: "Zone 4 (159-181 bpm)" },
    { value: 5, label: "Zone 5 (181-201 bpm)" },
  ];

  // Power zones (based on typical cycling zones)
  const powerZones = [
    { value: 1, label: "Zone 1 (0-110 W)" },
    { value: 2, label: "Zone 2 (110-150 W)" },
    { value: 3, label: "Zone 3 (150-185 W)" },
    { value: 4, label: "Zone 4 (185-220 W)" },
    { value: 5, label: "Zone 5 (220-260 W)" },
    { value: 6, label: "Zone 6 (260-310 W)" },
    { value: 7, label: "Zone 7 (310+ W)" },
  ];

  // Nested stage handlers for repeat blocks
  const handleNestedStageChange = (index: number, nestedStage: WorkoutStage) => {
    const newStages = [...(stage.stages || [])];
    newStages[index] = nestedStage;
    onChange({ ...stage, stages: newStages });
  };

  const handleAddNestedStage = () => {
    const newStage = createDefaultStage(getDefaultIntervalType(workoutType));
    onChange({
      ...stage,
      stages: [...(stage.stages || []), newStage],
    });
  };

  const handleDeleteNestedStage = (index: number) => {
    const newStages = (stage.stages || []).filter((_, i) => i !== index);
    onChange({ ...stage, stages: newStages });
  };

  const showDurationValue = stage.duration.type !== "lapButton";
  const showDistanceUnit = stage.duration.type === "distance";
  const showTimeUnit = stage.duration.type === "time";
  const showPowerUnit = stage.duration.type === "power";

  return (
    <Card className="relative overflow-hidden">
      {/* Color indicator */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: color }}
      />

      <div className="p-6 pl-7">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {isRepeat ? "Editing repeat block..." : "Editing stage..."}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left column - Details */}
          <div className="space-y-6">
            {/* Details Section */}
            <div>
              <h3 className="font-semibold mb-4">Details</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label className="text-right">Type</Label>
                  <div className="col-span-2">
                    <Select value={stage.type} onValueChange={handleTypeChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStageTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {stageLabels[type]}
                          </SelectItem>
                        ))}
                        <SelectItem value="repeat">
                          {stageLabels.repeat}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isRepeat && (
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label className="text-right">Repeat</Label>
                    <div className="col-span-2 flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="99"
                        value={stage.repeatCount || 2}
                        onChange={(e) => handleRepeatCountChange(e.target.value)}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">times</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Duration Section - only for non-repeat */}
            {!isRepeat && (
              <div>
                <h3 className="font-semibold mb-4">Duration</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label className="text-right">Type</Label>
                    <div className="col-span-2">
                      <Select
                        value={stage.duration.type}
                        onValueChange={handleDurationTypeChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableDurationTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {durationLabels[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {showDurationValue && (
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label className="text-right">
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
                      <div className="col-span-2 flex gap-2">
                        {/* Swimming distance presets */}
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
                            onValueChange={(v) =>
                              handleDurationUnitChange(v as DurationUnit)
                            }
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
                            onValueChange={(v) =>
                              handleDurationUnitChange(v as DurationUnit)
                            }
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
                          <span className="flex items-center text-sm text-muted-foreground px-2">
                            W
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Swimming-specific fields - only for swimming workouts and non-repeat */}
            {isSwimming && !isRepeat && (
              <>
                {/* Stroke Type Section */}
                <div>
                  <h3 className="font-semibold mb-4">Stroke Type</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label className="text-right">Type</Label>
                      <div className="col-span-2">
                        <Select
                          value={stage.strokeType || "freestyle"}
                          onValueChange={(v) => handleStrokeTypeChange(v as SwimmingStrokeType)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(strokeLabels) as SwimmingStrokeType[]).map((stroke) => (
                              <SelectItem key={stroke} value={stroke}>
                                {strokeLabels[stroke]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Drill Type Section */}
                <div>
                  <h3 className="font-semibold mb-4">Drill Type</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label className="text-right">Type</Label>
                      <div className="col-span-2">
                        <Select
                          value={stage.drillType || "none"}
                          onValueChange={(v) => handleDrillTypeChange(v as SwimmingDrillType)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(drillLabels) as SwimmingDrillType[]).map((drill) => (
                              <SelectItem key={drill} value={drill}>
                                {drillLabels[drill]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Equipment Section */}
                <div>
                  <h3 className="font-semibold mb-4">Equipment</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label className="text-right">Type</Label>
                      <div className="col-span-2">
                        <Select
                          value={stage.equipment || "none"}
                          onValueChange={(v) => handleEquipmentChange(v as SwimmingEquipmentType)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(equipmentLabels) as SwimmingEquipmentType[]).map((equip) => (
                              <SelectItem key={equip} value={equip}>
                                {equipmentLabels[equip]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Intensity Section - only for non-repeat */}
            {!isRepeat && (
              <div>
                <h3 className="font-semibold mb-4">Intensity Goal</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label className="text-right">Type</Label>
                    <div className="col-span-2">
                      <Select
                        value={stage.intensity.type}
                        onValueChange={handleIntensityTypeChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableIntensityTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {intensityLabels[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Range input for speed, cadence, custom HR, custom power */}
                  {needsRangeInput && (
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label className="text-right">{getIntensityLabel()}</Label>
                      <div className="col-span-2 flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          value={stage.intensity.min ?? ""}
                          onChange={(e) => handleIntensityMinChange(e.target.value)}
                          placeholder="Min"
                          className="w-24"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="number"
                          step="0.1"
                          value={stage.intensity.max ?? ""}
                          onChange={(e) => handleIntensityMaxChange(e.target.value)}
                          placeholder="Max"
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">
                          {getIntensityUnit()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Zone select for heart rate zone */}
                  {stage.intensity.type === "heartRateZone" && (
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label className="text-right">{getIntensityLabel()}</Label>
                      <div className="col-span-2">
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
                    </div>
                  )}

                  {/* Zone select for power zone */}
                  {stage.intensity.type === "powerZone" && (
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label className="text-right">{getIntensityLabel()}</Label>
                      <div className="col-span-2">
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
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Nested Stages Section - only for repeat */}
            {isRepeat && (
              <div>
                <h3 className="font-semibold mb-4">Stages to Repeat</h3>
                <div className="space-y-3">
                  {(stage.stages || []).map((nestedStage, index) => (
                    <div
                      key={nestedStage.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-md"
                    >
                      <div
                        className="w-1 h-10 rounded-full"
                        style={{ backgroundColor: stageColors[nestedStage.type] }}
                      />
                      <div className="flex-1">
                        <Select
                          value={nestedStage.type}
                          onValueChange={(type: StageType) =>
                            handleNestedStageChange(index, {
                              ...nestedStage,
                              type,
                            })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableStageTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {stageLabels[type]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteNestedStage(index)}
                        disabled={(stage.stages || []).length <= 1}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddNestedStage}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stage
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right column - Notes */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-4">Notes</h3>
              <Textarea
                placeholder="Add notes about this stage"
                value={stage.notes || ""}
                onChange={(e) => handleNotesChange(e.target.value)}
                rows={5}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right mt-1">
                {(stage.notes || "").length}/200
              </p>
            </div>
          </div>
        </div>

        {/* Done button */}
        <div className="flex justify-end mt-6 pt-4 border-t">
          <Button onClick={onDone}>Done</Button>
        </div>
      </div>
    </Card>
  );
};

export default StageEditor;
