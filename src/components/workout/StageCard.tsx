import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { WorkoutStage } from "@/types/workout";
import {
  durationLabels,
  stageColors,
  stageLabels,
} from "@/types/workout";
import { GripVertical, Repeat, Trash2 } from "lucide-react";

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
    return null;
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

        <div className="p-4 pl-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-indigo-500" />
                <p className="font-medium">
                  Repeat {stage.repeatCount || 2}x
                </p>
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

          {/* Nested stages */}
          {stage.stages && stage.stages.length > 0 && (
            <div className="ml-8 space-y-2 border-l-2 border-indigo-200 pl-4">
              {stage.stages.map((nestedStage) => {
                const nestedColor = stageColors[nestedStage.type];
                const nestedIntensity = formatIntensity(nestedStage);
                return (
                  <div
                    key={nestedStage.id}
                    className="flex items-center gap-3 py-2 px-3 bg-muted/50 rounded-md"
                  >
                    <div
                      className="w-1 h-8 rounded-full"
                      style={{ backgroundColor: nestedColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {stageLabels[nestedStage.type]}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDuration(nestedStage)}</span>
                        {nestedIntensity && <span>{nestedIntensity}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Regular stage
  const intensity = formatIntensity(stage);

  return (
    <Card className="relative overflow-hidden">
      {/* Color indicator */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-center gap-3 p-4 pl-5">
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-5 w-5" />
        </div>

        {/* Stage info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium">{stageLabels[stage.type]}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{formatDuration(stage)}</span>
            {intensity && <span>{intensity}</span>}
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
    </Card>
  );
};

export default StageCard;
