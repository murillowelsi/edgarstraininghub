import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  getWorkoutChecklistInstance,
  getWorkoutChecklistTemplate,
  saveWorkoutChecklistInstance,
  saveWorkoutChecklistTemplate,
} from "@/services/checklistService";
import {
  defaultChecklistByType,
  generateChecklistItemId,
  type ChecklistItem,
} from "@/types/checklist";
import type { WorkoutType } from "@/types/workout";
import { Loader2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
  userId: string;
  workoutType: WorkoutType;
}

export const WorkoutChecklistDrawer = ({
  open,
  onOpenChange,
  assignmentId,
  userId,
  workoutType,
}: Props) => {
  const { toast } = useToast();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getWorkoutChecklistInstance(assignmentId, userId, workoutType)
      .then((inst) => {
        if (!cancelled) setItems(inst.items);
      })
      .catch((err) => {
        console.error(err);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o checklist.",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, assignmentId, userId, workoutType, toast]);

  const toggle = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it))
    );
  };

  const addItem = () => {
    const label = newLabel.trim();
    if (!label) return;
    setItems((prev) => [
      ...prev,
      { id: generateChecklistItemId(), label, checked: false },
    ]);
    setNewLabel("");
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const updateLabel = (id: string, label: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, label } : it)));
  };

  const resetToDefault = () => {
    setItems(defaultChecklistByType[workoutType]().map((it) => ({ ...it, checked: false })));
  };

  const handleSave = async (alsoSaveAsTemplate: boolean) => {
    setSaving(true);
    try {
      await saveWorkoutChecklistInstance(assignmentId, userId, items);
      if (alsoSaveAsTemplate) {
        await saveWorkoutChecklistTemplate(userId, workoutType, items);
      }
      toast({
        title: "Checklist salvo",
        description: alsoSaveAsTemplate
          ? "Salvo neste treino e como seu padrão para próximos."
          : "Salvo neste treino.",
      });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro",
        description: "Não foi possível salvar.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Checklist do treino</DrawerTitle>
          <DrawerDescription>
            {loading
              ? "Carregando..."
              : `${checkedCount}/${items.length} itens conferidos`}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-2 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditMode((v) => !v)}
          >
            <Pencil className="h-4 w-4 mr-1" />
            {editMode ? "Concluir edição" : "Editar"}
          </Button>
          {editMode && (
            <Button variant="ghost" size="sm" onClick={resetToDefault}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Restaurar padrão
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-auto px-4 pb-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum item. Adicione abaixo.
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  editMode ? "" : "cursor-pointer hover:bg-accent/50 active:bg-accent"
                }`}
                onClick={editMode ? undefined : () => toggle(item.id)}
              >
                {!editMode && (
                  <Checkbox
                    checked={!!item.checked}
                    onCheckedChange={() => toggle(item.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                {editMode ? (
                  <>
                    <Input
                      value={item.label}
                      onChange={(e) => updateLabel(item.id, e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                ) : (
                  <span
                    className={
                      item.checked
                        ? "flex-1 line-through text-muted-foreground"
                        : "flex-1"
                    }
                  >
                    {item.label}
                  </span>
                )}
              </div>
            ))
          )}

          {editMode && (
            <div className="flex items-center gap-2 pt-2">
              <Input
                placeholder="Novo item..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
              />
              <Button onClick={addItem} disabled={!newLabel.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <DrawerFooter className="border-t">
          <Button
            onClick={() => handleSave(true)}
            disabled={saving || loading}
            variant="outline"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Salvar e definir como padrão
          </Button>
          <Button
            onClick={() => handleSave(false)}
            disabled={saving || loading}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Salvar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default WorkoutChecklistDrawer;
