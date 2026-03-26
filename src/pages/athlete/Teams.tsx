import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import { ListItemCard } from "@/components/shared/ListItemCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { getTeamsByMember } from "@/services/teamsService";
import { getUserById } from "@/services/usersService";
import type { Team } from "@/types/team";
import type { User } from "@/types/user";
import { getTeamColor } from "@/lib/teamColors";
import { Loader2, Search, Shield } from "lucide-react";

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function MemberAvatarStack({ memberIds, memberMap }: { memberIds: string[]; memberMap: Map<string, User> }) {
  const preview = memberIds.slice(0, 3);
  const overflow = memberIds.length - preview.length;
  return (
    <div className="flex items-center -space-x-2">
      {preview.map((id) => {
        const u = memberMap.get(id);
        return (
          <Avatar key={id} className="h-7 w-7 ring-2 ring-background">
            {u?.photoURL && <AvatarImage src={u.photoURL} alt={u.displayName} className="object-cover" />}
            <AvatarFallback className="text-[10px] font-semibold bg-muted">
              {u ? getInitials(u.displayName) : "?"}
            </AvatarFallback>
          </Avatar>
        );
      })}
      {overflow > 0 && (
        <div className="h-7 w-7 ring-2 ring-background rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
          +{overflow}
        </div>
      )}
    </div>
  );
}

export default function AthleteTeams() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [teams, setTeams] = useState<Team[]>([]);
  const [memberMap, setMemberMap] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const data = await getTeamsByMember(user.uid);
        setTeams(data);

        const previewIds = new Set<string>();
        data.forEach((team) => team.memberIds.slice(0, 4).forEach((id) => previewIds.add(id)));
        const users = await Promise.all(Array.from(previewIds).map((id) => getUserById(id)));
        const map = new Map<string, User>();
        users.forEach((u) => { if (u) map.set(u.id, u); });
        setMemberMap(map);
      } catch {
        toast({ title: t.common.error, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const filtered = search
    ? teams.filter((team) => team.name.toLowerCase().includes(search.toLowerCase()))
    : teams;

  return (
    <AthletePortalLayout title={t.athlete.nav.teams}>
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t.admin.teams.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm rounded-full"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
            <Shield className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {search ? t.admin.teams.noTeamsTitle : t.admin.teams.noTeamsTitle}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((team) => {
              const color = getTeamColor(team.color);
              return (
                <ListItemCard
                  key={team.id}
                  onClick={() => navigate(`/athlete/teams/${team.id}`)}
                  icon={team.photoURL
                    ? <img src={team.photoURL} alt={team.name} className="h-10 w-10 object-cover rounded-full" />
                    : <Shield className="h-5 w-5" style={{ color: color.color }} />}
                  iconClassName={team.photoURL ? "shrink-0 !p-0" : "shrink-0"}
                  iconStyle={team.photoURL ? undefined : { backgroundColor: `${color.color}1a` }}
                  title={team.name}
                  subtitle={`${team.memberIds.length} ${team.memberIds.length !== 1 ? t.admin.teams.members : t.admin.teams.member}`}
                  right={team.memberIds.length > 0 ? <MemberAvatarStack memberIds={team.memberIds} memberMap={memberMap} /> : undefined}
                />
              );
            })}
          </div>
        )}
      </div>
    </AthletePortalLayout>
  );
}
