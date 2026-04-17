import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
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
import {
  formatDuration,
  formatIntensity,
  formatSwimmingDetails,
} from "@/utils/workoutFormatters";
import {
  Bike,
  ChevronDown,
  Clock,
  Flame,
  GripVertical,
  Heart,
  PersonStanding,
  Repeat,
  Trash2,
  Waves,
  Wind,
  Zap,
} from "lucide-react";
import { useState } from "react";

const stageIcons: Record<string, React.ElementType> = {
  warmup: Flame,
  run: PersonStanding,
  cooldown: Wind,
  recovery: Heart,
  interval: Zap,
  repeat: Repeat,
  bike: Bike,
  rest: Clock,
  swim: Waves,
};

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

  // Render a repeat block
  if (stage.type === "repeat") {
    return (
      <div className="rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all overflow-hidden">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="p-4 flex items-center gap-3">
            <div
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
            >
              <GripVertical className="h-4 w-4" />
            </div>

            <div
              className="p-2 rounded-xl shrink-0 flex items-center justify-center"
              style={{ backgroundColor: "#6366f11a", color: "#6366f1" }}
            >
              <Repeat className="h-4 w-4" />
            </div>

            <CollapsibleTrigger asChild>
              <button className="flex flex-1 items-center gap-2 min-w-0 text-left">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    Repeat {stage.repeatCount || 2}x
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stage.stages?.length || 0} stages
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>
            </CollapsibleTrigger>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="text-primary h-8 px-2 text-xs"
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <CollapsibleContent>
            {stage.stages && stage.stages.length > 0 && (
              <div className="px-4 pb-4 pt-3 border-t border-border/50 space-y-2">
                {stage.stages.map((nestedStage) => {
                  const NestedIcon = stageIcons[nestedStage.type] || PersonStanding;
                  const nestedColor = stageColors[nestedStage.type];
                  const nestedIntensity = formatIntensity(nestedStage);
                  const nestedSwimmingDetails = formatSwimmingDetails(nestedStage);
                  return (
                    <div
                      key={nestedStage.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                    >
                      <div
                        className="p-2 rounded-lg shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: `${nestedColor}1a`, color: nestedColor }}
                      >
                        <NestedIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs">
                          {stageLabels[nestedStage.type]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(nestedStage)}
                          {nestedSwimmingDetails.length > 0 && ` · ${nestedSwimmingDetails[0]}`}
                          {nestedIntensity && ` · ${nestedIntensity}`}
                          {nestedStage.notes && (
                            <span className="italic ml-1">— {nestedStage.notes}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  // Regular stage
  const intensity = formatIntensity(stage);
  const swimmingDetails = formatSwimmingDetails(stage);
  const StageIcon = stageIcons[stage.type] || PersonStanding;

  return (
    <div className="rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="p-4 flex items-center gap-3">
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          <div
            className="p-2 rounded-xl shrink-0 flex items-center justify-center"
            style={{ backgroundColor: `${color}1a`, color }}
          >
            <StageIcon className="h-4 w-4" />
          </div>

          <CollapsibleTrigger asChild>
            <button className="flex flex-1 items-center gap-2 min-w-0 text-left">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{stageLabels[stage.type]}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDuration(stage)}
                  {swimmingDetails.length > 0 && ` · ${swimmingDetails[0]}`}
                  {!isExpanded && intensity && ` · ${intensity}`}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </button>
          </CollapsibleTrigger>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="text-primary h-8 px-2 text-xs"
            >
              Edit stage
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-3 border-t border-border/50 space-y-3">
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

            {((stage.drillType && stage.drillType !== "none") ||
              (stage.equipment && stage.equipment !== "none")) && (
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
            )}

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
      </Collapsible>
    </div>
  );
};

export default StageCard;
