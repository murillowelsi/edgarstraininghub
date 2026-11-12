import { AlertTriangle, ArrowLeft, CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { IssueCode, WorkoutIssue } from "@/lib/validateWorkout";

/**
 * One bar for both workout editors (WE-2): ← Workouts · save state · Assign · Save.
 * Replaces the repeated title and the separate back/save row.
 */
export function EditorBar({
  dirty,
  isNew,
  saving,
  blocked,
  onBack,
  onAssign,
  onSave,
}: {
  dirty: boolean;
  isNew: boolean;
  saving: boolean;
  /** An error the coach must fix first */
  blocked: boolean;
  onBack: () => void;
  /** Only for a saved workout */
  onAssign?: () => void;
  onSave: () => void;
}) {
  const { t } = useLanguage();
  const te = t.admin.workoutEditor;
  const state = dirty ? (isNew ? te.newDraft : te.unsaved) : te.saved;
  return (
    <div className="sticky top-0 z-30 -mx-4 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur-md md:-mx-6 md:px-5">
      <Button variant="ghost" size="sm" className="-ml-1 rounded-full text-muted-foreground" onClick={onBack}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        {t.admin.nav.workouts}
      </Button>
      <span
        role="status"
        className={cn("ml-auto hidden truncate text-xs sm:block", dirty ? "font-semibold text-warning-ink" : "text-muted-foreground")}
      >
        {state}
      </span>
      {onAssign && (
        <Button variant="outline" size="sm" className="ml-auto rounded-full sm:ml-0" onClick={onAssign} disabled={dirty}>
          <CalendarPlus className="mr-1.5 h-4 w-4" />
          {te.assign}
        </Button>
      )}
      <Button
        size="sm"
        className={cn("rounded-full px-4", !onAssign && "ml-auto sm:ml-0", !dirty && "bg-muted text-muted-foreground hover:bg-muted")}
        onClick={onSave}
        disabled={saving || blocked}
        title={blocked ? te.fixToSave : undefined}
      >
        {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
        {t.workout.editor.saveWorkout}
      </Button>
    </div>
  );
}

/** Shown only when something is missing (WE-4); errors first, each with "Open" when it points at a step */
export function IssuesBanner({ issues, onOpen }: { issues: WorkoutIssue[]; onOpen?: (id: string) => void }) {
  const { t } = useLanguage();
  const ti = t.admin.workoutEditor.issues as Record<IssueCode, string>;
  if (!issues.length) return null;
  // Group repeated warnings ("3 steps without a target")
  const groups = new Map<IssueCode, WorkoutIssue[]>();
  for (const i of issues) groups.set(i.code, [...(groups.get(i.code) ?? []), i]);
  const ordered = [...groups.entries()].sort(([, a], [, b]) => (a[0].level === b[0].level ? 0 : a[0].level === "error" ? -1 : 1));
  const hasError = issues.some((i) => i.level === "error");
  return (
    <div
      role={hasError ? "alert" : "status"}
      className={cn("rounded-2xl border px-3 py-2.5 text-sm", hasError ? "border-destructive-ink/40 bg-destructive/10" : "border-warning/40 bg-warning/10")}
    >
      <ul className="space-y-1">
        {ordered.map(([code, list]) => (
          <li key={code} className="flex items-center gap-2">
            <AlertTriangle className={cn("h-4 w-4 shrink-0", list[0].level === "error" ? "text-destructive-ink" : "text-warning-ink")} aria-hidden />
            <span className="min-w-0 flex-1">{ti[code].replace("{{n}}", String(list.length))}</span>
            {onOpen && list[0].stageId && (
              <button type="button" onClick={() => onOpen(list[0].stageId!)} className="min-h-9 shrink-0 px-1 font-semibold text-primary-ink">
                {t.admin.workoutEditor.fixAction}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LeaveConfirm({ open, onLeave, onStay }: { open: boolean; onLeave: () => void; onStay: () => void }) {
  const { t } = useLanguage();
  const te = t.admin.workoutEditor;
  return (
    <ResponsiveConfirm
      open={open}
      onOpenChange={(o) => !o && onStay()}
      title={te.leaveTitle}
      description={te.leaveDescription}
      confirmLabel={te.leaveConfirm}
      cancelLabel={te.stay}
      destructive
      onConfirm={onLeave}
    />
  );
}

/** Edit / Preview on phones (WE-1); hidden from lg, where the preview is a column */
export function EditorTabs({ tab, onTab }: { tab: "edit" | "preview"; onTab: (t: "edit" | "preview") => void }) {
  const { t } = useLanguage();
  const te = t.admin.workoutEditor;
  return (
    <div role="tablist" className="grid grid-cols-2 rounded-full bg-muted p-1 text-sm font-semibold lg:hidden">
      {(["edit", "preview"] as const).map((k) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={tab === k}
          onClick={() => onTab(k)}
          className={cn("h-9 rounded-full transition-colors", tab === k ? "bg-background shadow-sm" : "text-muted-foreground")}
        >
          {k === "edit" ? te.tabEdit : te.tabPreview}
        </button>
      ))}
    </div>
  );
}
