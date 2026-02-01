import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { WorkoutStage } from "@/types/workout";
import {
  drillLabels,
  durationLabels,
  equipmentLabels,
  intensityLabels,
  stageColors,
  stageLabels,
  strokeLabels,
} from "@/types/workout";
import { ChevronDown, ChevronRight, GripVertical, Repeat, Trash2 } from "lucide-react";
import { useState } from "react";

interface StageCardProps {
  stage: WorkoutStage;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

const StageCard = ({
  stage,
  onEdit,
  onDelete,
  dragHandleProps,
}: StageCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const color = stageColors[stage.type];

  const formatDuration = (s: WorkoutStage) => {
    if (s.duration.type === "lapButton") {
      return "Press Lap Button";
    }
    if (s.duration.value !== undefined) {
      const unit = s.duration.unit || "";
      return `${s.duration.value} ${unit}`;
    }
    return durationLabels[s.duration.type];
  };

  const formatIntensity = (s: WorkoutStage) => {
    if (s.intensity.type === "none") {
      return null;
    }
    if (s.intensity.type === "pace" && s.intensity.value) {
      return `${s.intensity.value} ${s.intensity.unit || "min/km"}`;
    }
    if (s.intensity.min !== undefined && s.intensity.max !== undefined) {
      return `${s.intensity.min}-${s.intensity.max} ${s.intensity.unit || ""}`;
    }
    return intensityLabels[s.intensity.type];
  };

  const formatSwimmingDetails = (s: WorkoutStage) => {
    const details: string[] = [];
    if (s.strokeType) {
      details.push(strokeLabels[s.strokeType]);
    }
    if (s.drillType && s.drillType !== "none") {
      details.push(drillLabels[s.drillType]);
    }
    if (s.equipment && s.equipment !== "none") {
      details.push(equipmentLabels[s.equipment]);
    }
    return details;
  };

  // Render a repeat block
  if (stage.type === "repeat") {
    return (
      <Card className="relative overflow-hidden">
        {/* Color indicator */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: color }}
        />

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="p-4 pl-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div
                {...dragHandleProps}
                className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              >
                <GripVertical className="h-5 w-5" />
              </div>

              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 hover:text-primary transition-colors">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </CollapsibleTrigger>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-indigo-500" />
                  <p className="font-medium">
                    Repeat {stage.repeatCount || 2}x
                  </p>
                  {!isExpanded && stage.stages && (
                    <span className="text-sm text-muted-foreground">
                      ({stage.stages.length} stages)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  className="text-primary"
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Nested stages - collapsible */}
            <CollapsibleContent>
              {stage.stages && stage.stages.length > 0 && (
                <div className="ml-8 mt-3 space-y-2 border-l-2 border-indigo-200 pl-4">
                  {stage.stages.map((nestedStage) => {
                    const nestedColor = stageColors[nestedStage.type];
                    const nestedIntensity = formatIntensity(nestedStage);
                    const nestedSwimmingDetails = formatSwimmingDetails(nestedStage);
                    return (
                      <div
                        key={nestedStage.id}
                        className="py-2 px-3 bg-muted/50 rounded-md"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-1 h-full min-h-[2rem] rounded-full flex-shrink-0"
                            style={{ backgroundColor: nestedColor }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {stageLabels[nestedStage.type]}
                            </p>
                            <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <div>
                                <span className="text-foreground/70">Duration:</span>{" "}
                                {formatDuration(nestedStage)}
                              </div>
                              {nestedSwimmingDetails.length > 0 && (
                                <div>
                                  <span className="text-foreground/70">Stroke:</span>{" "}
                                  {nestedSwimmingDetails[0]}
                                </div>
                              )}
                              {nestedIntensity && (
                                <div>
                                  <span className="text-foreground/70">Intensity:</span>{" "}
                                  {nestedIntensity}
                                </div>
                              )}
                              {nestedSwimmingDetails.length > 1 && (
                                <div>
                                  <span className="text-foreground/70">Details:</span>{" "}
                                  {nestedSwimmingDetails.slice(1).join(", ")}
                                </div>
                              )}
                            </div>
                            {nestedStage.notes && (
                              <p className="mt-2 text-xs text-muted-foreground italic">
                                {nestedStage.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CollapsibleContent>
          </div>
        </Collapsible>
      </Card>
    );
  }

  // Regular stage
  const intensity = formatIntensity(stage);
  const swimmingDetails = formatSwimmingDetails(stage);

  return (
    <Card className="relative overflow-hidden">
      {/* Color indicator */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: color }}
      />

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="p-4 pl-5">
          {/* Header row - always visible */}
          <div className="flex items-center gap-3">
            {/* Drag handle */}
            <div
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-5 w-5" />
            </div>

            {/* Expand/collapse toggle */}
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </CollapsibleTrigger>

            {/* Stage summary */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <p className="font-medium">{stageLabels[stage.type]}</p>
                <span className="text-sm text-muted-foreground">
                  {formatDuration(stage)}
                </span>
                {!isExpanded && swimmingDetails.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    · {swimmingDetails[0]}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="text-primary"
              >
                Edit stage
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Expanded details */}
          <CollapsibleContent>
            <div className="ml-9 mt-3 pt-3 border-t space-y-3">
              {/* Duration & Intensity row */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Duration
                  </p>
                  <p className="font-medium">{formatDuration(stage)}</p>
                  <p className="text-xs text-muted-foreground">
                    {durationLabels[stage.duration.type]}
                  </p>
                </div>

                {intensity && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Intensity
                    </p>
                    <p className="font-medium">{intensity}</p>
                    <p className="text-xs text-muted-foreground">
                      {intensityLabels[stage.intensity.type]}
                    </p>
                  </div>
                )}

                {stage.strokeType && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Stroke
                    </p>
                    <p className="font-medium">{strokeLabels[stage.strokeType]}</p>
                  </div>
                )}
              </div>

              {/* Swimming-specific details */}
              {(stage.drillType && stage.drillType !== "none") ||
              (stage.equipment && stage.equipment !== "none") ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {stage.drillType && stage.drillType !== "none" && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Drill Type
                      </p>
                      <p className="font-medium">{drillLabels[stage.drillType]}</p>
                    </div>
                  )}

                  {stage.equipment && stage.equipment !== "none" && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Equipment
                      </p>
                      <p className="font-medium">{equipmentLabels[stage.equipment]}</p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Notes */}
              {stage.notes && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                    {stage.notes}
                  </p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </Card>
  );
};

export default StageCard;
