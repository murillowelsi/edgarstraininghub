import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarPlus, ChevronDown, Dumbbell, Link2, Megaphone, MessagesSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTimelineActions } from "@/contexts/TimelineActionsContext";
import { useToast } from "@/hooks/use-toast";
import { ChatService } from "@/services/chat";
import type { Team } from "@/types/team";
import type { WorkoutType } from "@/types/workout";

const TYPES: WorkoutType[] = ["running", "cycling", "swimming", "strength"];
const newWorkoutPath = (type: WorkoutType) => (type === "strength" ? "/admin/workouts/strength/new" : `/admin/workouts/new?type=${type}`);

/**
 * Header actions (CD-3, layout A): "Assign workout" is the one primary button;
 * the rest (new workout, feed post, team message, invite) live in "Actions".
 * Phones: the same list in a sheet, and Assign as a floating button.
 * All reuse flows that already exist; nothing new is stored.
 */
export function QuickActions({ teams, onAssign }: { teams: Team[]; onAssign: () => void }) {
  const { t } = useLanguage();
  const tv = t.admin.dashboard.v2;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { setCreateOpen } = useTimelineActions();
  const [sheet, setSheet] = useState(false);

  const messageTeam = async (team: Team) => {
    if (!user) return;
    const chat = await ChatService.createOrGetGroupChat(team.id, team.name, user.uid, team.memberIds);
    navigate("/admin/chat", { state: { openChatId: chat.id } });
  };
  const inviteTeam = async (team: Team) => {
    await navigator.clipboard.writeText(`${window.location.origin}/join/${team.inviteToken}`);
    toast({ title: tv.inviteCopied, description: team.name });
  };

  // Phone sheet rows: one per team when there are several
  const perTeam = (label: string, run: (team: Team) => void) =>
    teams.map((team) => ({ key: `${label}-${team.id}`, label: teams.length > 1 ? `${label} · ${team.name}` : label, run: () => run(team) }));

  return (
    <div className="flex items-center gap-2">
      {/* Desktop menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="hidden rounded-full md:inline-flex">
            {tv.actions}
            <ChevronDown className="ml-1.5 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Dumbbell className="mr-2 h-4 w-4" />
              {tv.newWorkout}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {TYPES.map((type) => (
                <DropdownMenuItem key={type} onClick={() => navigate(newWorkoutPath(type))}>
                  {t.workoutMeta.types[type]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <Megaphone className="mr-2 h-4 w-4" />
            {tv.feedPost}
          </DropdownMenuItem>
          {teams.length > 0 && (
            <>
              <TeamItem icon={MessagesSquare} label={tv.teamMessage} teams={teams} onPick={messageTeam} chooseLabel={tv.chooseTeam} />
              <TeamItem icon={Link2} label={tv.inviteAthlete} teams={teams} onPick={inviteTeam} chooseLabel={tv.chooseTeam} />
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Phone: Actions opens a sheet */}
      <Button variant="outline" className="rounded-full md:hidden" onClick={() => setSheet(true)}>
        {tv.actions}
        <ChevronDown className="ml-1.5 h-4 w-4" />
      </Button>
      <Drawer open={sheet} onOpenChange={setSheet}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{tv.actions}</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 px-4 pb-6">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{tv.newWorkout}</p>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => navigate(newWorkoutPath(type))}
                    className="flex min-h-11 items-center gap-2 rounded-xl border bg-card px-3 text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    {t.workoutMeta.types[type]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {[
                { key: "feed", label: tv.feedPost, icon: Megaphone, run: () => setCreateOpen(true) },
                ...perTeam(tv.teamMessage, messageTeam).map((x) => ({ ...x, icon: MessagesSquare })),
                ...perTeam(tv.inviteAthlete, inviteTeam).map((x) => ({ ...x, icon: Link2 })),
              ].map((row) => (
                <button
                  key={row.key}
                  type="button"
                  onClick={() => {
                    setSheet(false);
                    row.run();
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl border bg-card px-4 text-left text-sm font-medium"
                >
                  <row.icon className="h-5 w-5 shrink-0" aria-hidden />
                  {row.label}
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* The one primary action; on phones it floats */}
      <Button className="hidden rounded-full md:inline-flex" onClick={onAssign}>
        <CalendarPlus className="mr-1.5 h-4 w-4" />
        {t.admin.dashboard.quickAssign}
      </Button>
      <Button
        onClick={onAssign}
        className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-4 z-40 h-14 rounded-full px-5 shadow-lg md:hidden"
      >
        <CalendarPlus className="mr-1.5 h-5 w-5" />
        {t.admin.dashboard.assign}
      </Button>
    </div>
  );
}

function TeamItem({
  icon: Icon,
  label,
  teams,
  onPick,
  chooseLabel,
}: {
  icon: React.ElementType;
  label: string;
  teams: Team[];
  onPick: (team: Team) => void;
  chooseLabel: string;
}) {
  if (teams.length === 1) {
    return (
      <DropdownMenuItem onClick={() => onPick(teams[0])}>
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </DropdownMenuItem>
    );
  }
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent aria-label={chooseLabel}>
        {teams.map((team) => (
          <DropdownMenuItem key={team.id} onClick={() => onPick(team)}>
            {team.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
