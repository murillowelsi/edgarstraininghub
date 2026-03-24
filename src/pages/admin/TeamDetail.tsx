import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { useToast } from "@/hooks/use-toast";
import {
  getTeamById,
  updateTeamName,
  deleteTeam,
  removeMemberFromTeam,
} from "@/services/teamsService";
import { getUserById } from "@/services/usersService";
import type { Team } from "@/types/team";
import type { User } from "@/types/user";
import { QRCodeSVG } from "qrcode.react";
import {
  Loader2,
  Copy,
  Check,
  Trash2,
  UserMinus,
  BarChart2,
  Pencil,
  X,
} from "lucide-react";

export default function AdminTeamDetail() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Copy link
  const [copied, setCopied] = useState(false);

  // Remove member
  const [confirmMember, setConfirmMember] = useState<User | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  // Delete team
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    loadTeam();
  }, [teamId]);

  const loadTeam = async () => {
    if (!teamId) return;
    try {
      const t = await getTeamById(teamId);
      if (!t) { navigate("/admin/teams"); return; }
      setTeam(t);
      setNameInput(t.name);
      // Load member details
      const memberUsers = await Promise.all(
        t.memberIds.map((uid) => getUserById(uid))
      );
      setMembers(memberUsers.filter((u): u is User => u !== null));
    } catch {
      toast({ title: "Error", description: "Failed to load team.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const inviteUrl = team
    ? `${window.location.origin}/join/${team.inviteToken}`
    : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveName = async () => {
    if (!team || !nameInput.trim() || nameInput === team.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await updateTeamName(team.id, nameInput.trim());
      setTeam((t) => t ? { ...t, name: nameInput.trim() } : t);
      setEditingName(false);
      toast({ title: "Team renamed" });
    } catch {
      toast({ title: "Error", description: "Failed to rename team.", variant: "destructive" });
    } finally {
      setSavingName(false);
    }
  };

  const handleRemoveMember = async (member: User) => {
    if (!team) return;
    setRemovingMember(member.id);
    try {
      await removeMemberFromTeam(team.id, member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      setTeam((t) => t ? { ...t, memberIds: t.memberIds.filter((id) => id !== member.id) } : t);
      toast({ title: "Member removed", description: `${member.displayName} removed from team.` });
    } catch {
      toast({ title: "Error", description: "Failed to remove member.", variant: "destructive" });
    } finally {
      setRemovingMember(null);
      setConfirmMember(null);
    }
  };

  const handleDeleteTeam = async () => {
    if (!team) return;
    setDeleting(true);
    try {
      await deleteTeam(team.id);
      toast({ title: "Team deleted" });
      navigate("/admin/teams");
    } catch {
      toast({ title: "Error", description: "Failed to delete team.", variant: "destructive" });
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!team) return null;

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 space-y-8">
        {/* Header: title is always a plain string; inline edit UI lives below */}
        {!editingName ? (
          <AdminPageHeader
            title={team.name}
            action={{ label: "View Stats", icon: BarChart2, onClick: () => navigate(`/admin/teams/${team.id}/stats`) }}
          />
        ) : (
          <div className="flex items-center justify-between gap-3 mb-6 md:mb-8">
            <div className="flex items-center gap-2">
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="max-w-xs h-8 text-lg font-bold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") setEditingName(false);
                }}
              />
              <Button size="icon" variant="ghost" onClick={handleSaveName} disabled={savingName}>
                {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setEditingName(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => navigate(`/admin/teams/${team.id}/stats`)} className="hidden sm:flex w-auto">
              <BarChart2 className="h-4 w-4 mr-2" />
              View Stats
            </Button>
          </div>
        )}

        {/* Rename button when not editing */}
        {!editingName && (
          <div className="-mt-6">
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-muted-foreground" onClick={() => setEditingName(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </Button>
          </div>
        )}

        {/* Members */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Members ({members.length})
          </h2>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet. Share the invite link below.</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{member.displayName?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => setConfirmMember(member)}
                    disabled={removingMember === member.id}
                  >
                    {removingMember === member.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserMinus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Invite section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Invite Link
          </h2>
          <div className="flex items-center gap-2 mb-4">
            <Input value={inviteUrl} readOnly className="text-sm font-mono" />
            <Button variant="outline" size="icon" onClick={handleCopyLink} className="shrink-0">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="p-4 bg-white rounded-lg inline-block border">
            <QRCodeSVG value={inviteUrl} size={160} />
          </div>
        </section>

        {/* Danger zone */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Danger Zone
          </h2>
          <Button
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete Team
          </Button>
        </section>
      </div>

      {/* Remove member confirm */}
      <ResponsiveConfirm
        open={!!confirmMember}
        onOpenChange={(open) => { if (!open) setConfirmMember(null); }}
        title="Remove Member"
        description={`Remove ${confirmMember?.displayName} from this team? Their workout assignments are not affected.`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => confirmMember && handleRemoveMember(confirmMember)}
      />

      {/* Delete team confirm */}
      <ResponsiveConfirm
        open={confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(false); }}
        title="Delete Team"
        description="Are you sure you want to delete this team? Members and their workout assignments are not affected."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteTeam}
        loading={deleting}
      />
    </AdminLayout>
  );
}
