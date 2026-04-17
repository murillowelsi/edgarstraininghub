import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { WorkoutStage } from "@/types/workout";
import {
  drillLabels,
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
  Heart,
  PersonStanding,
  Repeat,
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

interface WorkoutStageItemProps {
  stage: WorkoutStage;
  index: number;
  /** i18n labels — pass the `t` object from useLanguage() */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

const WorkoutStageItem = ({ stage, t }: WorkoutStageItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const color = stageColors[stage.type];
  const intensity = formatIntensity(stage);
  const swimmingDetails = formatSwimmingDetails(stage);
  const StageIcon = stageIcons[stage.type] || PersonStanding;
  const lapLabel: string = t.athlete.workoutView.pressLapButton;

  if (stage.type === "repeat") {
    return (
      <div className="rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all overflow-hidden">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger className="w-full">
            <div className="p-4 flex items-center gap-3">
              <div
                className="p-2.5 rounded-xl shrink-0 flex items-center justify-center"
                style={{ backgroundColor: "#6366f11a", color: "#6366f1" }}
              >
                <Repeat className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-semibold text-sm">
                  {t.athlete.workoutView.repeat} {stage.repeatCount || 2}x
                </p>
                <p className="text-xs text-muted-foreground">
                  {stage.stages?.length || 0} {t.athlete.workoutView.stages}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            {stage.stages && stage.stages.length > 0 && (
              <div className="px-4 pb-4 pt-3 border-t border-border/50 space-y-2">
                {stage.stages.map((nested, nestedIndex) => {
                  const NestedIcon = stageIcons[nested.type] || PersonStanding;
                  const nestedColor = stageColors[nested.type];
                  return (
                    <div
                      key={nested.id}
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
                          {nestedIndex + 1}. {stageLabels[nested.type]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(nested, lapLabel)}
                          {formatSwimmingDetails(nested).length > 0 &&
                            ` · ${formatSwimmingDetails(nested)[0]}`}
                          {formatIntensity(nested) && ` · ${formatIntensity(nested)}`}
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

  return (
    <div className="rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="w-full">
          <div className="p-4 flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl shrink-0 flex items-center justify-center"
              style={{ backgroundColor: `${color}1a`, color }}
            >
              <StageIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold text-sm truncate">{stageLabels[stage.type]}</p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(stage, lapLabel)}
                {swimmingDetails.length > 0 && ` · ${swimmingDetails[0]}`}
                {intensity && ` · ${intensity}`}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-3 border-t border-border/50 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-medium">
                  {t.athlete.workoutView.duration}
                </p>
                <p className="font-medium mt-1">{formatDuration(stage, lapLabel)}</p>
              </div>
              {intensity && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-medium">
                    {t.athlete.workoutView.intensity}
                  </p>
                  <p className="font-medium mt-1">{intensity}</p>
                </div>
              )}
              {stage.strokeType && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-medium">
                    {t.athlete.workoutView.stroke}
                  </p>
                  <p className="font-medium mt-1">{strokeLabels[stage.strokeType]}</p>
                </div>
              )}
              {stage.drillType && stage.drillType !== "none" && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-medium">
                    {t.athlete.workoutView.drill}
                  </p>
                  <p className="font-medium mt-1">{drillLabels[stage.drillType]}</p>
                </div>
              )}
              {stage.equipment && stage.equipment !== "none" && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-medium">
                    {t.athlete.workoutView.equipment}
                  </p>
                  <p className="font-medium mt-1">{equipmentLabels[stage.equipment]}</p>
                </div>
              )}
            </div>
            {stage.notes && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-medium">
                  {t.athlete.workoutView.notes}
                </p>
                <p className="text-sm mt-1">{stage.notes}</p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default WorkoutStageItem;
