import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Workout } from "@/types/workout";
import { AssignmentForm } from "./AssignmentForm";

interface AssignWorkoutDialogProps {
  workout: Workout | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/** Assign a library workout to athletes or a team on one or more days. */
export const AssignWorkoutDialog = ({ workout, open, onOpenChange, onSuccess }: AssignWorkoutDialogProps) => {
  const { t } = useLanguage();
  const ta = t.admin.assign;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={ta.title}
      description={workout ? ta.subtitle.replace("{{name}}", workout.name) : undefined}
      className="sm:w-[560px]"
    >
      {workout && open && (
        <AssignmentForm
          workout={workout}
          onCancel={() => onOpenChange(false)}
          onDone={(result) => {
            if (result.created > 0) {
              onOpenChange(false);
              onSuccess?.();
            }
          }}
        />
      )}
    </ResponsiveModal>
  );
};
