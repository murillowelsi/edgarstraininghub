import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { ListItemCard } from "@/components/shared/ListItemCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { createTeam, deleteTeam, getTeamsByCoach, updateTeamName, updateTeamColor } from "@/services/teamsService";
import type { Team } from "@/types/team";
import { TEAM_COLORS, getTeamColor } from "@/lib/teamColors";
import { getUserById } from "@/services/usersService";
import type { User } from "@/types/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, Loader2, Trash2, Check, EllipsisVertical, Search } from "lucide-react";

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

function ColorPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {TEAM_COLORS.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onChange(c.key)}
          className="h-7 w-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{ backgroundColor: c.color }}
          aria-label={c.key}
        >
          {value === c.key && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}

export default function AdminTeams() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [teams, setTeams] = useState<Team[]>([]);
  const [memberMap, setMemberMap] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);

  // Create
  const [isNewTeamOpen, setIsNewTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState(TEAM_COLORS[0].key);
  const [creating, setCreating] = useState(false);

  // Edit
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(TEAM_COLORS[0].key);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  // Delete
  const [confirmTeam, setConfirmTeam] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadTeams();
  }, [user]);

  const loadTeams = async () => {
    if (!user) return;
    try {
      const data = await getTeamsByCoach(user.uid);
      setTeams(data);

      // Collect unique member IDs (first 4 per team) and fetch their data
      const previewIds = new Set<string>();
      data.forEach((team) => team.memberIds.slice(0, 4).forEach((id) => previewIds.add(id)));
      const users = await Promise.all(Array.from(previewIds).map((id) => getUserById(id)));
      const map = new Map<string, User>();
      users.forEach((u) => { if (u) map.set(u.id, u); });
      setMemberMap(map);
    } catch {
      toast({ title: t.common.error, description: t.admin.teams.toast.loadError, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTeamName.trim()) return;
    setCreating(true);
    try {
      const team = await createTeam(newTeamName.trim(), user.uid, newTeamColor);
      setTeams((prev) => [team, ...prev]);
      setIsNewTeamOpen(false);
      setNewTeamName("");
      setNewTeamColor(TEAM_COLORS[0].key);
      toast({ title: t.admin.teams.toast.created, description: t.admin.teams.toast.createdDescription.replace("{{name}}", team.name) });
    } catch {
      toast({ title: t.common.error, description: t.admin.teams.toast.createError, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (team: Team) => {
    setEditTeam(team);
    setEditName(team.name);
    setEditColor(team.color ?? TEAM_COLORS[0].key);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTeam || !editName.trim()) return;
    setSaving(true);
    try {
      const promises: Promise<void>[] = [];
      if (editName.trim() !== editTeam.name) promises.push(updateTeamName(editTeam.id, editName.trim()));
      if (editColor !== (editTeam.color ?? TEAM_COLORS[0].key)) promises.push(updateTeamColor(editTeam.id, editColor));
      await Promise.all(promises);
      setTeams((prev) => prev.map((t) =>
        t.id === editTeam.id ? { ...t, name: editName.trim(), color: editColor } : t
      ));
      setEditTeam(null);
      toast({ title: t.admin.teams.toast.updated });
    } catch {
      toast({ title: t.common.error, description: t.admin.teams.toast.updateError, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (team: Team) => {
    setDeleting(team.id);
    try {
      await deleteTeam(team.id);
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      toast({ title: t.admin.teams.toast.deleted, description: t.admin.teams.toast.deletedDescription.replace("{{name}}", team.name) });
    } catch {
      toast({ title: t.common.error, description: t.admin.teams.toast.deleteError, variant: "destructive" });
    } finally {
      setDeleting(null);
      setConfirmTeam(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <AdminPageHeader
          title={t.admin.teams.title}
          description={t.admin.teams.description}
          action={{ label: t.admin.teams.newTeam, onClick: () => setIsNewTeamOpen(true) }}
        />

        <div className="relative mb-4">
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
        ) : teams.length === 0 ? (
          <AdminEmptyState
            illustration="/undraw_security.svg"
            title={t.admin.teams.noTeamsTitle}
            description={t.admin.teams.noTeamsDescription}
          />
        ) : (
          <div className="space-y-2">
            {(search ? teams.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())) : teams).map((team) => {
              const color = getTeamColor(team.color);
              return (
                <ListItemCard
                  key={team.id}
                  to={`/admin/teams/${team.id}`}
                  icon={<Shield className="h-5 w-5" style={{ color: color.color }} />}
                  iconClassName="shrink-0"
                  iconStyle={{ backgroundColor: `${color.color}1a` }}
                  title={team.name}
                  subtitle={`${team.memberIds.length} ${team.memberIds.length !== 1 ? t.admin.teams.members : t.admin.teams.member}`}
                  right={team.memberIds.length > 0 ? <MemberAvatarStack memberIds={team.memberIds} memberMap={memberMap} /> : undefined}
                  actions={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={() => handleOpenEdit(team)}
                    >
                      {deleting === team.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <EllipsisVertical className="h-4 w-4" />}
                    </Button>
                  }
                />
              );
            })}
          </div>
        )}

        {/* New Team Modal */}
        <ResponsiveModal
          open={isNewTeamOpen}
          onOpenChange={(open) => { setIsNewTeamOpen(open); if (!open) { setNewTeamName(""); setNewTeamColor(TEAM_COLORS[0].key); } }}
          title={t.admin.teams.newTeam}
        >
          <form onSubmit={handleCreate} className="space-y-4 p-2">
            <div className="space-y-1.5">
              <Label htmlFor="teamName">{t.admin.teams.teamName}</Label>
              <Input
                id="teamName"
                placeholder={t.admin.teams.teamNamePlaceholder}
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.admin.teams.teamColor}</Label>
              <ColorPicker value={newTeamColor} onChange={setNewTeamColor} />
            </div>
            <Button type="submit" className="w-full" disabled={creating || !newTeamName.trim()}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.admin.teams.createTeam}
            </Button>
          </form>
        </ResponsiveModal>

        {/* Edit Team Modal */}
        <ResponsiveModal
          open={!!editTeam}
          onOpenChange={(open) => { if (!open) setEditTeam(null); }}
          title={t.admin.teams.editTeam}
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 p-2">
            <div className="space-y-1.5">
              <Label htmlFor="editTeamName">{t.admin.teams.teamName}</Label>
              <Input
                id="editTeamName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.admin.teams.teamColor}</Label>
              <ColorPicker value={editColor} onChange={setEditColor} />
            </div>
            <Button type="submit" className="w-full" disabled={saving || !editName.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.admin.teams.saveTeam}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full gap-2 text-destructive hover:text-destructive"
              onClick={() => { setConfirmTeam(editTeam); setEditTeam(null); }}
            >
              <Trash2 className="h-4 w-4" />
              {t.common.delete}
            </Button>
          </form>
        </ResponsiveModal>

        {/* Delete Confirm */}
        <ResponsiveConfirm
          open={!!confirmTeam}
          onOpenChange={(open) => { if (!open) setConfirmTeam(null); }}
          title={t.admin.teams.delete.title}
          description={t.admin.teams.delete.description.replace("{{name}}", confirmTeam?.name ?? "")}
          confirmLabel={t.common.delete}
          onConfirm={() => confirmTeam && handleDelete(confirmTeam)}
          destructive
        />
      </div>
    </AdminLayout>
  );
}
