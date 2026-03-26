import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import { ListItemCard } from "@/components/shared/ListItemCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { getTeamById } from "@/services/teamsService";
import { getUserById } from "@/services/usersService";
import type { Team } from "@/types/team";
import type { User } from "@/types/user";
import { getTeamColor } from "@/lib/teamColors";
import { ChevronLeft, Loader2, Shield, Users } from "lucide-react";

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function AthleteTeamDetail() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId || !user) return;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getTeamById(teamId);
        if (cancelled) return;
        if (!data) { navigate("/athlete/teams"); return; }
        setTeam(data);
        const memberUsers = await Promise.all(data.memberIds.map((id) => getUserById(id)));
        if (cancelled) return;
        setMembers(memberUsers.filter((u): u is User => u !== null));
      } catch {
        if (!cancelled) toast({ title: t.common.error, variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [teamId, user]);

  if (loading) {
    return (
      <AthletePortalLayout title={t.athlete.nav.teams}>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AthletePortalLayout>
    );
  }

  if (!team) return null;

  const color = getTeamColor(team.color);

  return (
    <AthletePortalLayout title={t.athlete.nav.teams} hideBottomNav>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="relative flex items-center">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => navigate("/athlete/teams")}
            aria-label="Voltar"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 max-w-[60%]">
            {team.photoURL && (
              <img src={team.photoURL} alt={team.name} className="h-8 w-8 object-cover rounded-full shrink-0" />
            )}
            <h1 className="text-lg font-bold truncate text-center">
              {team.name}
            </h1>
          </div>
        </div>

        {/* Team badge */}
        <div className="flex items-center gap-3 px-1">
          {team.photoURL ? (
            <img src={team.photoURL} alt={team.name} className="h-12 w-12 object-cover rounded-full shrink-0" />
          ) : (
            <div
              className="p-3 rounded-xl shrink-0"
              style={{ backgroundColor: `${color.color}1a` }}
            >
              <Shield className="h-6 w-6" style={{ color: color.color }} />
            </div>
          )}
          <div>
            <p className="font-semibold text-base">{team.name}</p>
            <p className="text-sm text-muted-foreground">
              {members.length} {members.length !== 1 ? t.admin.teams.members : t.admin.teams.member}
            </p>
          </div>
        </div>

        {/* Members */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t.admin.teamDetail.members ?? "Members"}
            </h2>
          </div>

          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              {t.admin.teamDetail.noMembers}
            </p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <ListItemCard
                  key={member.id}
                  icon={
                    <Avatar className="h-9 w-9 ring-2 ring-[#e1b506]">
                      {member.photoURL && <AvatarImage src={member.photoURL} alt={member.displayName} className="object-cover" />}
                      <AvatarFallback className="text-xs font-semibold" style={{ backgroundColor: `${color.color}18`, color: color.color }}>
                        {getInitials(member.displayName || "?")}
                      </AvatarFallback>
                    </Avatar>
                  }
                  iconClassName="p-0"
                  title={member.displayName}
                  subtitle={member.email}
                  right={
                    member.id === user?.uid ? (
                      <Badge variant="outline" className="text-xs font-normal">
                        Você
                      </Badge>
                    ) : undefined
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AthletePortalLayout>
  );
}
