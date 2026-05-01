import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import AddEventSheet from "@/components/athlete/AddEventSheet";
import EventChecklistPanel from "@/components/athlete/EventChecklistPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { getAthleteEventById } from "@/services/athleteEventsService";
import type { AthleteEvent } from "@/types/athleteEvent";
import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  Flag,
  Loader2,
  Pencil,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const typeIcon = {
  race: Flag,
  test: Target,
  milestone: Trophy,
  other: Sparkles,
} as const;

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const dateLocale = language === "pt" ? ptBR : undefined;

  const [event, setEvent] = useState<AthleteEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getAthleteEventById(id);
      if (!data) {
        toast({ title: "Evento não encontrado", variant: "destructive" });
        navigate("/athlete/profile");
        return;
      }
      setEvent(data);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao carregar evento", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Reload when edit sheet closes
  useEffect(() => {
    if (!editOpen && event) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOpen]);

  if (loading || !event || !user) {
    return (
      <AthletePortalLayout title="Evento" hideBottomNav>
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AthletePortalLayout>
    );
  }

  const Icon = typeIcon[event.type];
  const daysUntil = differenceInCalendarDays(event.eventDate, new Date());
  const countdown =
    daysUntil < 0
      ? `há ${Math.abs(daysUntil)} dias`
      : daysUntil === 0
      ? "hoje"
      : daysUntil === 1
      ? "amanhã"
      : `em ${daysUntil} dias`;

  return (
    <AthletePortalLayout title={event.title} hideBottomNav>
      <div className="flex-1 overflow-auto pb-6">
        <div className="relative flex items-center px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold truncate max-w-[60%] text-center">
            {event.title}
          </h1>
          <button
            onClick={() => setEditOpen(true)}
            className="ml-auto p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Editar evento"
            title="Editar"
          >
            <Pencil className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-balance break-words">
                    {event.title}
                  </h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary" className="capitalize">
                      {t.athlete.events.types[event.type]}
                    </Badge>
                    <Badge variant="outline">{countdown}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(event.eventDate, "PPP", { locale: dateLocale })}
                  </div>
                </div>
              </div>

              {event.description && (
                <p className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap">
                  {event.description}
                </p>
              )}

              {event.goals.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Objetivos
                  </h3>
                  <ul className="space-y-1">
                    {event.goals.map((g) => (
                      <li key={g.id} className="text-sm flex items-start gap-2">
                        <span className={g.achieved ? "line-through text-muted-foreground" : ""}>
                          {g.achieved ? "✓" : "○"} {g.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <EventChecklistPanel eventId={event.id} athleteId={user.uid} />
        </div>
      </div>

      <AddEventSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        athleteId={user.uid}
        event={event}
      />
    </AthletePortalLayout>
  );
};

export default EventDetail;
