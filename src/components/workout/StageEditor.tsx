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
  WorkoutStage,
} from "@/types/workout";
import {
  createDefaultStage,
  durationLabels,
  generateStageId,
  intensityLabels,
  stageColors,
  stageLabels,
} from "@/types/workout";
import { GripVertical, Plus, Trash2 } from "lucide-react";

interface StageEditorProps {
  stage: WorkoutStage;
  onChange: (stage: WorkoutStage) => void;
  onDone: () => void;
}

// Editor for non-repeat stage types
const regularStageTypes = ["warmup", "run", "cooldown", "recovery", "interval"] as const;

const StageEditor = ({ stage, onChange, onDone }: StageEditorProps) => {
  const color = stageColors[stage.type];
  const isRepeat = stage.type === "repeat";

  const handleTypeChange = (type: StageType) => {
    if (type === "repeat") {
      // Converting to repeat - add default nested stages
      onChange({
        ...stage,
        type,
        repeatCount: 2,
        stages: [createDefaultStage("interval"), createDefaultStage("recovery")],
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
        unit: type === "distance" ? "km" : type === "time" ? "min" : undefined,
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

  const handleIntensityTypeChange = (type: IntensityType) => {
    onChange({
      ...stage,
      intensity: {
        type,
        value: undefined,
        min: undefined,
        max: undefined,
        unit: type === "pace" ? "min/km" : undefined,
      },
    });
  };

  const handleNotesChange = (notes: string) => {
    onChange({ ...stage, notes: notes || undefined });
  };

  // Nested stage handlers for repeat blocks
  const handleNestedStageChange = (index: number, nestedStage: WorkoutStage) => {
    const newStages = [...(stage.stages || [])];
    newStages[index] = nestedStage;
    onChange({ ...stage, stages: newStages });
  };

  const handleAddNestedStage = () => {
    const newStage = createDefaultStage("interval");
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
                        {(Object.keys(stageLabels) as StageType[]).map((type) => (
                          <SelectItem key={type} value={type}>
                            {stageLabels[type]}
                          </SelectItem>
                        ))}
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
                          {(Object.keys(durationLabels) as DurationType[]).map(
                            (type) => (
                              <SelectItem key={type} value={type}>
                                {durationLabels[type]}
                              </SelectItem>
                            )
                          )}
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
                          : "Value"}
                      </Label>
                      <div className="col-span-2 flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={stage.duration.value || ""}
                          onChange={(e) => handleDurationValueChange(e.target.value)}
                          placeholder="0.00"
                          className="flex-1"
                        />
                        {showDistanceUnit && (
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
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
                          {(Object.keys(intensityLabels) as IntensityType[]).map(
                            (type) => (
                              <SelectItem key={type} value={type}>
                                {intensityLabels[type]}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
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
                            {regularStageTypes.map((type) => (
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
