import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  getEventChecklist,
  saveEventChecklist,
} from "@/services/eventChecklistService";
import {
  buildEventChecklistPreset,
  generateId,
  type EventChecklistPreset,
  type EventChecklistSection,
} from "@/types/eventChecklist";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Drawer as DrawerPrimitive } from "vaul";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export const EventChecklistDrawer = ({
  open,
  onOpenChange,
  eventId,
  athleteId,
}: Props) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const tec = t.athlete.eventChecklist;
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [needsPreset, setNeedsPreset] = useState(false);
  const [sections, setSections] = useState<EventChecklistSection[]>([]);
  const [preset, setPreset] = useState<EventChecklistPreset | undefined>();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getEventChecklist(eventId)
      .then((cl) => {
        if (cancelled) return;
        if (cl) {
          setSections(cl.sections);
          setPreset(cl.preset);
          setNeedsPreset(false);
          setEditMode(false);
        } else {
          setSections([]);
          setPreset(undefined);
          setNeedsPreset(true);
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
  }, [open, eventId]);

  const applyPreset = (p: EventChecklistPreset) => {
    setPreset(p);
    setSections(buildEventChecklistPreset(p, tec));
    setNeedsPreset(false);
    setEditMode(p === "blank");
  };

  const totals = sections.reduce(
    (acc, s) => {
      acc.total += s.items.length;
      acc.checked += s.items.filter((i) => i.checked).length;
      return acc;
    },
    { total: 0, checked: 0 }
  );

  const toggleItem = (sectionId: string, itemId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              items: s.items.map((i) =>
                i.id === itemId ? { ...i, checked: !i.checked } : i
              ),
            }
      )
    );
  };

  const updateItemLabel = (sectionId: string, itemId: string, label: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              items: s.items.map((i) => (i.id === itemId ? { ...i, label } : i)),
            }
      )
    );
  };

  const removeItem = (sectionId: string, itemId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : { ...s, items: s.items.filter((i) => i.id !== itemId) }
      )
    );
  };

  const addItem = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              items: [
                ...s.items,
                { id: generateId(), label: tec.newItem, checked: false },
              ],
            }
      )
    );
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title } : s))
    );
  };

  const removeSection = (sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      { id: generateId(), title: tec.newSection, items: [] },
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveEventChecklist(eventId, athleteId, sections, preset);
      toast({ title: tec.saved });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({ title: tec.saveError, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      direction={isMobile ? "bottom" : "right"}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <DrawerPrimitive.Content
          className={cn(
            "fixed z-50 flex flex-col bg-background",
            isMobile
              ? "inset-x-0 bottom-0 rounded-t-[10px] max-h-[90dvh]"
              : "inset-y-0 right-0 h-full w-[520px] border-l"
          )}
        >
          {isMobile && (
            <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted shrink-0" />
          )}
          <div className="px-4 py-4 border-b shrink-0">
            <DrawerPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
              {tec.title}
            </DrawerPrimitive.Title>
            <DrawerPrimitive.Description className="text-sm text-muted-foreground mt-1">
              {loading
                ? t.common.loading
                : needsPreset
                ? tec.startHint
                : tec.itemsChecked
                    .replace("{{checked}}", String(totals.checked))
                    .replace("{{total}}", String(totals.total))}
            </DrawerPrimitive.Description>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : needsPreset ? (
              <div className="space-y-3">
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
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditMode((v) => !v)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    {editMode ? tec.doneEditing : tec.edit}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNeedsPreset(true)}
                  >
                    {tec.changeTemplate}
                  </Button>
                </div>

                {sections.map((section) => (
                  <div key={section.id} className="rounded-lg border p-3 space-y-2">
                    {editMode ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={section.title}
                          onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                          className="font-semibold"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSection(section.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                        {section.title}
                      </h3>
                    )}

                    {section.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        {!editMode && (
                          <Checkbox
                            checked={!!item.checked}
                            onCheckedChange={() => toggleItem(section.id, item.id)}
                          />
                        )}
                        {editMode ? (
                          <>
                            <Input
                              value={item.label}
                              onChange={(e) =>
                                updateItemLabel(section.id, item.id, e.target.value)
                              }
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
                ))}

                {editMode && (
                  <Button variant="outline" onClick={addSection} className="w-full">
                    <Plus className="h-4 w-4 mr-1" />
                    {tec.addSection}
                  </Button>
                )}
              </>
            )}
          </div>

          <div className="px-4 py-3 border-t flex flex-col gap-2 shrink-0">
            <Button
              onClick={handleSave}
              disabled={saving || loading || needsPreset}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t.common.save}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.close}
            </Button>
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
};

export default EventChecklistDrawer;
