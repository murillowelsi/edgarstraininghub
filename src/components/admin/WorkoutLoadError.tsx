import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertTriangle } from "lucide-react";

/**
 * Shown instead of the editor when an existing workout couldn't be loaded, so
 * an empty form can never be saved over the real workout.
 */
export function WorkoutLoadError({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  const { t } = useLanguage();
  const te = t.admin.workoutEditor;
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 px-6 py-24 max-w-md mx-auto">
      <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold">{te.loadFailedTitle}</h2>
      <p className="text-sm text-muted-foreground">{te.loadFailedDescription}</p>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack}>
          {te.backToWorkouts}
        </Button>
        <Button onClick={onRetry}>{te.retry}</Button>
      </div>
    </div>
  );
}
