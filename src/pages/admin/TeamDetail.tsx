import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { t } = useLanguage();

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
    let cancelled = false;
    const load = async () => {
      try {
        const team = await getTeamById(teamId);
        if (cancelled) return;
        if (!team) { navigate("/admin/teams"); return; }
        setTeam(team);
        setNameInput(team.name);
        const memberUsers = await Promise.all(
          team.memberIds.map((uid) => getUserById(uid))
        );
        if (cancelled) return;
        setMembers(memberUsers.filter((u): u is User => u !== null));
      } catch {
        if (cancelled) return;
        toast({ title: t.common.error, description: t.admin.teamDetail.toast.loadError, variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [teamId]);

  const inviteUrl = team
    ? `${window.location.origin}/join/${team.inviteToken}`
    : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast({ title: t.common.error, description: "Could not copy to clipboard.", variant: "destructive" });
    });
  };

  const handleSaveName = async () => {
    if (!team || !nameInput.trim() || nameInput === team.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await updateTeamName(team.id, nameInput.trim());
      setTeam((prev) => prev ? { ...prev, name: nameInput.trim() } : prev);
      setEditingName(false);
      toast({ title: t.admin.teamDetail.toast.teamRenamed });
    } catch {
      toast({ title: t.common.error, description: t.admin.teamDetail.toast.renameError, variant: "destructive" });
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
      setTeam((prev) => prev ? { ...prev, memberIds: prev.memberIds.filter((id) => id !== member.id) } : prev);
      toast({
        title: t.admin.teamDetail.toast.memberRemoved,
        description: t.admin.teamDetail.toast.memberRemovedDescription.replace("{{name}}", member.displayName),
      });
    } catch {
      toast({ title: t.common.error, description: t.admin.teamDetail.toast.removeError, variant: "destructive" });
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
      toast({ title: t.admin.teamDetail.toast.teamDeleted });
      navigate("/admin/teams");
    } catch {
      toast({ title: t.common.error, description: t.admin.teamDetail.toast.deleteError, variant: "destructive" });
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
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6 md:mb-8">
          {editingName ? (
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
          ) : (
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl md:text-2xl font-bold">{team.name}</h1>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setEditingName(true)}
                aria-label={t.admin.teamDetail.renameTeam}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <Button onClick={() => navigate(`/admin/teams/${team.id}/stats`)} className="hidden sm:flex w-auto shrink-0">
            <BarChart2 className="h-4 w-4 mr-2" />
            {t.admin.teamDetail.viewStats}
          </Button>
        </div>
        {/* Mobile FAB for Stats */}
        <button
          onClick={() => navigate(`/admin/teams/${team.id}/stats`)}
          className="fixed right-4 z-30 sm:hidden h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
          aria-label={t.admin.teamDetail.viewStats}
        >
          <BarChart2 className="h-6 w-6" />
        </button>

        {/* Members */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t.admin.teamDetail.membersTitle.replace("{{count}}", String(members.length))}
          </h2>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.admin.teamDetail.noMembers}</p>
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
            {t.admin.teamDetail.inviteLink}
          </h2>
          <div className="flex items-center gap-2 mb-4">
            <Input value={inviteUrl} readOnly className="text-sm font-mono" />
            <Button variant="outline" size="icon" onClick={handleCopyLink} className="shrink-0">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="p-4 bg-white rounded-lg inline-block border">
            {inviteUrl && <QRCodeSVG value={inviteUrl} size={160} />}
          </div>
        </section>

        {/* Danger zone */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t.admin.teamDetail.dangerZone}
          </h2>
          <Button
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            {t.admin.teamDetail.deleteTeam}
          </Button>
        </section>
      </div>

      {/* Remove member confirm */}
      <ResponsiveConfirm
        open={!!confirmMember}
        onOpenChange={(open) => { if (!open) setConfirmMember(null); }}
        title={t.admin.teamDetail.removeMember.title}
        description={t.admin.teamDetail.removeMember.description.replace("{{name}}", confirmMember?.displayName ?? "")}
        confirmLabel={t.admin.teamDetail.removeMember.confirm}
        destructive
        onConfirm={() => confirmMember && handleRemoveMember(confirmMember)}
      />

      {/* Delete team confirm */}
      <ResponsiveConfirm
        open={confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(false); }}
        title={t.admin.teamDetail.deleteTeam}
        description={t.admin.teamDetail.deleteConfirm.description}
        confirmLabel={t.common.delete}
        destructive
        onConfirm={handleDeleteTeam}
        loading={deleting}
      />
    </AdminLayout>
  );
}
