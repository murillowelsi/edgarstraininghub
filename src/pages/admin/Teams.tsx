import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createTeam, deleteTeam, getTeamsByCoach } from "@/services/teamsService";
import type { Team } from "@/types/team";
import { Users2, Loader2, Trash2, ChevronRight } from "lucide-react";

export default function AdminTeams() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewTeamOpen, setIsNewTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);
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
    } catch {
      toast({ title: "Error", description: "Failed to load teams.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTeamName.trim()) return;
    setCreating(true);
    try {
      const team = await createTeam(newTeamName.trim(), user.uid);
      setTeams((prev) => [team, ...prev]);
      setIsNewTeamOpen(false);
      setNewTeamName("");
      toast({ title: "Team created", description: `"${team.name}" is ready.` });
    } catch {
      toast({ title: "Error", description: "Failed to create team.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (team: Team) => {
    setDeleting(team.id);
    try {
      await deleteTeam(team.id);
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      toast({ title: "Team deleted", description: `"${team.name}" has been deleted.` });
    } catch {
      toast({ title: "Error", description: "Failed to delete team.", variant: "destructive" });
    } finally {
      setDeleting(null);
      setConfirmTeam(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <AdminPageHeader
          title="Teams"
          description="Manage your training teams and invite athletes."
          action={{ label: "New Team", onClick: () => setIsNewTeamOpen(true) }}
        />

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-center">
            <Users2 className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">No teams yet</p>
            <p className="text-sm mt-1">Create a team to start inviting athletes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <button
                  className="flex-1 flex items-center gap-3 text-left"
                  onClick={() => navigate(`/admin/teams/${team.id}`)}
                >
                  <Users2 className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-semibold">{team.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {team.memberIds.length} member{team.memberIds.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive ml-2 shrink-0"
                  onClick={() => setConfirmTeam(team)}
                  disabled={deleting === team.id}
                >
                  {deleting === team.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* New Team Modal */}
        <ResponsiveModal
          open={isNewTeamOpen}
          onOpenChange={setIsNewTeamOpen}
          title="New Team"
        >
          <form onSubmit={handleCreate} className="space-y-4 p-2">
            <div className="space-y-1.5">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                placeholder="e.g. U17 Football"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={creating || !newTeamName.trim()}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Team
            </Button>
          </form>
        </ResponsiveModal>

        {/* Delete Confirm */}
        <ResponsiveConfirm
          open={!!confirmTeam}
          onOpenChange={(open) => { if (!open) setConfirmTeam(null); }}
          title="Delete Team"
          description={`Are you sure you want to delete "${confirmTeam?.name}"? Members and their workout assignments are not affected.`}
          confirmLabel="Delete"
          onConfirm={() => confirmTeam && handleDelete(confirmTeam)}
          destructive
        />
      </div>
    </AdminLayout>
  );
}
