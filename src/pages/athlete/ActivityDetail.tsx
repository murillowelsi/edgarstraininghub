import AdminLayout from "@/components/AdminLayout";
import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import { cn } from "@/lib/utils";
import EditActivitySheet from "@/components/athlete/EditActivitySheet";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { deleteAssignment, subscribeToAssignmentsByAthlete } from "@/services/workoutAssignmentsService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { useToast } from "@/hooks/use-toast";
import { getUserById } from "@/services/usersService";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import { modalityAccent } from "@/utils/modalityColors";
import {
  formatDistance,
  formatHeartRate,
  formatPace,
  formatSpeed,
  formatTimeShort,
} from "@/utils/activityFormat";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, Dumbbell, Flame, Footprints, Gauge, HeartPulse, MoreHorizontal, Pencil, Timer, Trash2, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GrSwim, GrBike, GrRun } from "react-icons/gr";
import { useNavigate, useParams } from "react-router-dom";

const icons = {
  running: GrRun,
  cycling: GrBike,
  swimming: GrSwim,
  strength: Dumbbell,
} as const;

const ActivityDetail = () => {
  // Coach route (/admin/athletes/:athleteId/activity/:id) shows an athlete's
  // session read-only inside the admin layout; the athlete route shows their own.
  const { id, athleteId } = useParams<{ id: string; athleteId?: string }>();
  const isCoachView = !!athleteId;
  const navigate = useNavigate();
  const { user, photoURL: ownPhotoURL } = useAuth();
  const [athletePhotoURL, setAthletePhotoURL] = useState<string | null>(null);
  const photoURL = isCoachView ? athletePhotoURL : ownPhotoURL;
  const Layout = isCoachView ? CoachLayout : AthletePortalLayout;
  const { t, language } = useLanguage();
  const ta = t.athlete.activity;
  const lang = language === "pt" ? "pt" : "en";
  const [assignment, setAssignment] = useState<AssignmentWithWorkout | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!assignment) return;
    setDeleting(true);
    try {
      await deleteAssignment(assignment.id);
      toast({ title: ta.removed });
      navigate("/athlete/profile");
    } catch (e) {
      console.error(e);
      toast({ title: ta.removeFailed, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const ownerId = athleteId ?? user.uid;
    getUserById(ownerId).then((u) => {
      if (!u) return;
      setDisplayName(u.displayName || "Athlete");
      setAthletePhotoURL(u.photoURL ?? null);
    });
    const unsub = subscribeToAssignmentsByAthlete(ownerId, (data) => {
      setAssignment(data.find((a) => a.id === id) || null);
    });
    return unsub;
  }, [user, id, athleteId]);

  if (!assignment) {
    return (
      <Layout showHeader={false}>
        <div className="p-6 text-center text-muted-foreground">{ta.loading}</div>
      </Layout>
    );
  }

  const type = assignment.workout.type;
  const Icon = icons[type];
  const color = modalityAccent(type);
  const data = assignment.activityData;
  const dateStr = format(
    assignment.completedAt || assignment.scheduledDate,
    lang === "pt" ? "dd 'de' MMMM 'de' yyyy 'às' HH:mm" : "MMMM d, yyyy 'at' HH:mm",
    { locale: lang === "pt" ? ptBR : undefined }
  );

  const isStrength = type === "strength";
  const isSwim = type === "swimming";
  const isCycle = type === "cycling";

  const metrics = isStrength
    ? [
        { icon: Timer, label: ta.metrics.totalTime, value: formatTimeShort(assignment.totalTime) },
        { icon: Footprints, label: ta.metrics.completion, value: assignment.completionPercentage != null ? `${Math.round(assignment.completionPercentage)}%` : "—" },
        {
          icon: Dumbbell,
          label: ta.metrics.setsDone,
          value: String(
            (assignment.progressData ?? []).reduce(
              (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
              0
            )
          ),
        },
      ]
    : [
        { icon: Footprints, label: ta.metrics.distance, value: formatDistance(data?.distance, type) },
        isCycle
          ? { icon: Gauge, label: ta.metrics.avgSpeed, value: formatSpeed(data?.avgSpeed) }
          : { icon: Gauge, label: ta.metrics.avgPace, value: formatPace(data?.avgPace, type) },
        { icon: Timer, label: ta.metrics.time, value: formatTimeShort(data?.elapsedTime) },
        { icon: HeartPulse, label: ta.metrics.avgHr, value: formatHeartRate(data?.avgHeartRate) },
        ...(isCycle && data?.avgPower != null
          ? [{ icon: Zap, label: ta.metrics.avgPower, value: `${Math.round(data.avgPower)} W` }]
          : []),
      ];

  return (
    <Layout showHeader={false}>
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between px-3 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display font-bold text-lg flex items-center gap-2">
            <Icon className="h-5 w-5" style={{ color }} />
            {assignment.workout.name}
          </h1>
          <div className={cn("flex items-center", isCoachView && "invisible")}>
            {!isStrength && (
              <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {ta.remove}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        <div className="flex items-center gap-3">
          <CachedAvatar
            src={photoURL}
            alt={displayName}
            fallback={displayName.charAt(0).toUpperCase()}
            className="h-12 w-12"
            fallbackClassName="bg-primary text-primary-foreground font-semibold"
          />
          <div>
            <p className="font-semibold">{displayName}</p>
            <p className="text-xs text-muted-foreground">{dateStr}</p>
          </div>
        </div>

        <div>
          <h2 className="font-display text-3xl font-extrabold leading-tight">{assignment.workout.name}</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <m.icon className="h-3.5 w-3.5" />
                  <p className="text-[11px] uppercase tracking-wide font-semibold">{m.label}</p>
                </div>
                <p className="font-display text-2xl font-extrabold leading-none">{m.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {assignment.workout.notes && (
          <>
            <Separator />
            <div>
              <h3 className="font-display font-bold text-base mb-2">{ta.notes}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assignment.workout.notes}</p>
            </div>
          </>
        )}

        {!isStrength && data?.stageTimes && data.stageTimes.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="font-display font-bold text-base mb-2">{ta.stages}</h3>
              <div className="space-y-2">
                {data.stageTimes.map((s, i) => {
                  const stage = assignment.workout.stages[s.stageIndex];
                  if (!stage) return null;
                  return (
                    <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-border/30 last:border-0">
                      <span className="capitalize">{stage.type}</span>
                      <span className="font-medium font-mono">
                        {s.time != null
                          ? formatTimeShort(s.time)
                          : s.reps
                          ? `${s.reps.length}× ${ta.reps}`
                          : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <ResponsiveConfirm
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={ta.remove}
        description={ta.removeConfirm}
        confirmLabel={ta.removeAction}
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
      {!isStrength && (
        <EditActivitySheet
          open={editOpen}
          onOpenChange={setEditOpen}
          assignmentId={assignment.id}
          workoutType={type}
          initial={data}
        />
      )}
    </Layout>
  );
};

// AdminLayout with the same props shape as AthletePortalLayout
const CoachLayout = ({ children }: { children: React.ReactNode; showHeader?: boolean }) => (
  <AdminLayout>
    <div className="max-w-2xl mx-auto w-full">{children}</div>
  </AdminLayout>
);

export default ActivityDetail;
