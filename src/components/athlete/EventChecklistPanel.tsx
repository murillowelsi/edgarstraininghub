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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  deleteEventChecklist,
  getEventChecklist,
  saveEventChecklist,
} from "@/services/eventChecklistService";
import {
  buildEventChecklistPreset,
  generateId,
  type EventChecklistCategory,
  type EventChecklistPreset,
  type EventChecklistSection,
} from "@/types/eventChecklist";
import {
  Bike,
  ClipboardList,
  FileText,
  Loader2,
  PackageOpen,
  Pencil,
  PersonStanding,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Waves,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  eventId: string;
  athleteId: string;
}

const presetOrder: EventChecklistPreset[] = [
  "running",
  "cycling",
  "swimming",
  "triathlon-sprint",
  "triathlon-long",
  "blank",
];

const categoryIcon: Record<EventChecklistCategory, React.ElementType> = {
  docs: FileText,
  running: PersonStanding,
  cycling: Bike,
  swimming: Waves,
  transition: PackageOpen,
  post: Sparkles,
  custom: ClipboardList,
};

const categoryColor: Record<EventChecklistCategory, string> = {
  docs: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  running: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
  cycling: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
  swimming: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30",
  transition: "text-purple-600 bg-purple-50 dark:bg-purple-950/30",
  post: "text-pink-600 bg-pink-50 dark:bg-pink-950/30",
  custom: "text-muted-foreground bg-muted",
};

export const EventChecklistPanel = ({ eventId, athleteId }: Props) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const tec = t.athlete.eventChecklist;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [needsPreset, setNeedsPreset] = useState(false);
  const [sections, setSections] = useState<EventChecklistSection[]>([]);
  const [preset, setPreset] = useState<EventChecklistPreset | undefined>();
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hasSavedChecklist, setHasSavedChecklist] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getEventChecklist(eventId)
      .then((cl) => {
        if (cancelled) return;
        if (cl) {
          setSections(cl.sections);
          setPreset(cl.preset);
          setNeedsPreset(false);
          setHasSavedChecklist(true);
        } else {
          setNeedsPreset(true);
          setHasSavedChecklist(false);
        }
      })
      .catch((err) => {
        console.error(err);
        toast({ title: tec.loadError, variant: "destructive" });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const applyPreset = async (p: EventChecklistPreset) => {
    const newSections = buildEventChecklistPreset(p, tec);
    setPreset(p);
    setSections(newSections);
    setNeedsPreset(false);
    setEditMode(p === "blank");
    setDirty(false);
    if (p === "blank") {
      // Don't persist an empty checklist; wait for the user to add items.
      setDirty(true);
      return;
    }
    setSaving(true);
    try {
      await saveEventChecklist(eventId, athleteId, newSections, p);
      setHasSavedChecklist(true);
    } catch (err) {
      console.error(err);
      toast({ title: tec.savePresetError, variant: "destructive" });
      setDirty(true);
    } finally {
      setSaving(false);
    }
  };

  const totals = sections.reduce(
    (acc, s) => {
      acc.total += s.items.length;
      acc.checked += s.items.filter((i) => i.checked).length;
      return acc;
    },
    { total: 0, checked: 0 }
  );

  const mutate = (updater: (prev: EventChecklistSection[]) => EventChecklistSection[]) => {
    setSections(updater);
    setDirty(true);
  };

  const toggleItem = (sId: string, iId: string) =>
    mutate((prev) =>
      prev.map((s) =>
        s.id !== sId
          ? s
          : { ...s, items: s.items.map((i) => (i.id === iId ? { ...i, checked: !i.checked } : i)) }
      )
    );

  const updateItemLabel = (sId: string, iId: string, label: string) =>
    mutate((prev) =>
      prev.map((s) =>
        s.id !== sId
          ? s
          : { ...s, items: s.items.map((i) => (i.id === iId ? { ...i, label } : i)) }
      )
    );

  const removeItem = (sId: string, iId: string) =>
    mutate((prev) =>
      prev.map((s) => (s.id !== sId ? s : { ...s, items: s.items.filter((i) => i.id !== iId) }))
    );

  const addItem = (sId: string) =>
    mutate((prev) =>
      prev.map((s) =>
        s.id !== sId
          ? s
          : { ...s, items: [...s.items, { id: generateId(), label: tec.newItem, checked: false }] }
      )
    );

  const updateSectionTitle = (sId: string, title: string) =>
    mutate((prev) => prev.map((s) => (s.id === sId ? { ...s, title } : s)));

  const removeSection = (sId: string) =>
    mutate((prev) => prev.filter((s) => s.id !== sId));

  const addSection = () =>
    mutate((prev) => [
      ...prev,
      { id: generateId(), title: tec.newSection, category: "custom", items: [] },
    ]);

  const handleDelete = async () => {
    setSaving(true);
    try {
      if (hasSavedChecklist) {
        await deleteEventChecklist(eventId);
      }
      setSections([]);
      setPreset(undefined);
      setHasSavedChecklist(false);
      setDirty(false);
      setEditMode(false);
      setNeedsPreset(true);
      setConfirmDelete(false);
      toast({ title: tec.removed });
    } catch (err) {
      console.error(err);
      toast({ title: tec.removeError, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveEventChecklist(eventId, athleteId, sections, preset);
      toast({ title: tec.saved });
      setDirty(false);
      setHasSavedChecklist(true);
    } catch (err) {
      console.error(err);
      toast({ title: tec.saveError, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (needsPreset) {
    return (
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">{tec.title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{tec.templateHint}</p>
        <Select onValueChange={(v) => applyPreset(v as EventChecklistPreset)}>
          <SelectTrigger>
            <SelectValue placeholder={tec.templatePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {presetOrder.map((p) => (
              <SelectItem key={p} value={p}>
                {tec.presets[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{tec.title}</h3>
          </div>
          <span className="text-sm text-muted-foreground">
            {totals.checked}/{totals.total}
          </span>
        </div>
        <Progress
          value={totals.total > 0 ? (totals.checked / totals.total) * 100 : 0}
        />
        <div className="grid grid-cols-3 gap-2 pt-1">
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode((v) => !v)}
          >
            <Pencil className="h-4 w-4 mr-1.5" />
            {editMode ? tec.done : tec.edit}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setNeedsPreset(true)}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            {tec.template}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            {tec.remove}
          </Button>
        </div>
      </div>

      <Drawer open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{tec.removeTitle}</DrawerTitle>
            <DrawerDescription>{tec.removeDesc}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tec.remove}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setConfirmDelete(false)}
              disabled={saving}
            >
              {t.common.cancel}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {sections.map((section) => {
        const cat = section.category ?? "custom";
        const Icon = categoryIcon[cat];
        return (
          <div key={section.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-md ${categoryColor[cat]}`}>
                <Icon className="h-4 w-4" />
              </span>
              {editMode ? (
                <>
                  <Input
                    value={section.title}
                    onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                    className="font-semibold flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSection(section.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              ) : (
                <h4 className="font-semibold text-sm uppercase tracking-wide flex-1">
                  {section.title}
                </h4>
              )}
            </div>

            {section.items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 pl-1 ${
                  editMode ? "" : "cursor-pointer rounded-md py-1 -mx-1 px-1 hover:bg-accent/50 active:bg-accent"
                }`}
                onClick={
                  editMode ? undefined : () => toggleItem(section.id, item.id)
                }
              >
                {!editMode && (
                  <Checkbox
                    checked={!!item.checked}
                    onCheckedChange={() => toggleItem(section.id, item.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                {editMode ? (
                  <>
                    <Input
                      value={item.label}
                      onChange={(e) => updateItemLabel(section.id, item.id, e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(section.id, item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                ) : (
                  <span
                    className={
                      item.checked
                        ? "flex-1 line-through text-muted-foreground text-sm"
                        : "flex-1 text-sm"
                    }
                  >
                    {item.label}
                  </span>
                )}
              </div>
            ))}

            {editMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addItem(section.id)}
              >
                <Plus className="h-4 w-4 mr-1" />
                {tec.addItem}
              </Button>
            )}
          </div>
        );
      })}

      {editMode && (
        <Button variant="outline" onClick={addSection} className="w-full">
          <Plus className="h-4 w-4 mr-1" />
          {tec.addSection}
        </Button>
      )}

      {dirty && (
        <div className="sticky bottom-4 z-10">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full shadow-lg"
            size="lg"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {tec.save}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EventChecklistPanel;
