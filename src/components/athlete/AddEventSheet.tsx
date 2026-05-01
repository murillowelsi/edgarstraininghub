import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  createAthleteEvent,
  deleteAthleteEvent,
  updateAthleteEvent,
} from "@/services/athleteEventsService";
import type { AthleteEvent, AthleteEventType, EventGoal } from "@/types/athleteEvent";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ClipboardList, Loader2, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import EventChecklistDrawer from "./EventChecklistDrawer";
import { Drawer as DrawerPrimitive } from "vaul";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: string;
  event?: AthleteEvent | null;
}

const newGoalId = () => `g_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const typeOptions: AthleteEventType[] = ["race", "test", "milestone", "other"];

const AddEventSheet = ({ open, onOpenChange, athleteId, event }: Props) => {
  const { t, language } = useLanguage();
  const te = t.athlete.events;
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isEdit = !!event;

  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
  const [type, setType] = useState<AthleteEventType>("race");
  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState<EventGoal[]>([]);
  const [saving, setSaving] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(event?.title ?? "");
      setEventDate(event?.eventDate);
      setType(event?.type ?? "race");
      setDescription(event?.description ?? "");
      setGoals(event?.goals ?? []);
    }
  }, [open, event]);

  const canSave = title.trim().length > 0 && !!eventDate && !saving;

  const handleSave = async () => {
    if (!canSave || !eventDate) return;
    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        eventDate,
        type,
        description: description.trim(),
        goals: goals.filter((g) => g.text.trim().length > 0),
      };
      if (isEdit && event) {
        await updateAthleteEvent(event.id, data);
        toast({ title: te.updated });
      } else {
        await createAthleteEvent(athleteId, data);
        toast({ title: te.created });
      }
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({ title: te.saveFailed, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    setSaving(true);
    try {
      await deleteAthleteEvent(event.id);
      toast({ title: te.removed });
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const dateLocale = language === "pt" ? ptBR : undefined;

  const formContent = (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="ev-title">{te.fields.title} *</Label>
        <Input
          id="ev-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={te.fields.titlePlaceholder}
        />
      </div>

      <div className="space-y-2">
        <Label>{te.fields.date} *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !eventDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {eventDate
                ? format(eventDate, "PPP", { locale: dateLocale })
                : te.fields.datePlaceholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={eventDate}
              onSelect={setEventDate}
              initialFocus
              locale={dateLocale}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>{te.fields.type} *</Label>
        <Select value={type} onValueChange={(v) => setType(v as AthleteEventType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {te.types[opt]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ev-desc">{te.fields.description}</Label>
        <Textarea
          id="ev-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{te.fields.goals}</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setGoals([...goals, { id: newGoalId(), text: "", achieved: false }])}
          >
            <Plus className="h-4 w-4 mr-1" />
            {te.fields.addGoal}
          </Button>
        </div>
        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{te.noGoals}</p>
        ) : (
          <div className="space-y-2">
            {goals.map((g, i) => (
              <div key={g.id} className="flex items-center gap-2">
                <Input
                  value={g.text}
                  onChange={(e) => {
                    const next = [...goals];
                    next[i] = { ...g, text: e.target.value };
                    setGoals(next);
                  }}
                  placeholder={te.fields.goalPlaceholder}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setGoals(goals.filter((x) => x.id !== g.id))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 pt-2">
        {isEdit && event && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setChecklistOpen(true)}
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            Checklist da prova
          </Button>
        )}
        <Button onClick={handleSave} disabled={!canSave} className="w-full">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEdit ? te.saveChanges : te.addAction}
        </Button>
        <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
          {te.cancel}
        </Button>
        {isEdit && (
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={saving}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {te.deleteEvent}
          </Button>
        )}
      </div>
    </div>
  );

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
              : "inset-y-0 right-0 h-full w-[480px] border-l"
          )}
        >
          {isMobile && <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted shrink-0" />}
          <div className="px-4 py-4 border-b shrink-0">
            <DrawerPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
              {isEdit ? te.editEvent : te.addEvent}
            </DrawerPrimitive.Title>
            <DrawerPrimitive.Description className="text-sm text-muted-foreground mt-1">
              {isEdit ? te.descEdit : te.descAdd}
            </DrawerPrimitive.Description>
          </div>
          <div className="px-4 py-4 overflow-y-auto flex-1">{formContent}</div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
      {isEdit && event && (
        <EventChecklistDrawer
          open={checklistOpen}
          onOpenChange={setChecklistOpen}
          eventId={event.id}
          athleteId={athleteId}
        />
      )}
    </DrawerPrimitive.Root>
  );
};

export default AddEventSheet;
