import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getTeamById,
  updateTeamName,
  deleteTeam,
  removeMemberFromTeam,
  addMemberToTeam,
  autoAssignTeamWorkoutsToMember,
} from "@/services/teamsService";
import { ChatService } from "@/services/chat";
import { getUserById, getUsersByRole } from "@/services/usersService";
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
  UserPlus,
  MessageSquare,
} from "lucide-react";

export default function AdminTeamDetail() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
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

  // Group chat
  const [openingChat, setOpeningChat] = useState(false);

  // Add athlete
  const [addAthleteOpen, setAddAthleteOpen] = useState(false);
  const [allAthletes, setAllAthletes] = useState<User[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  const [athleteSearch, setAthleteSearch] = useState("");
  const [addingAthlete, setAddingAthlete] = useState<string | null>(null);

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

  const handleOpenGroupChat = async () => {
    if (!team || !user) return;
    setOpeningChat(true);
    try {
      await ChatService.createOrGetGroupChat(team.id, team.name, user.uid, team.memberIds);
      navigate("/admin/chat", { state: { openChatId: `team_${team.id}` } });
    } catch {
      toast({ title: t.common.error, description: "Failed to open group chat.", variant: "destructive" });
      setOpeningChat(false);
    }
  };

  const handleOpenAddAthlete = async () => {
    setAddAthleteOpen(true);
    setAthleteSearch("");
    if (allAthletes.length > 0) return; // already loaded
    setLoadingAthletes(true);
    try {
      const athletes = await getUsersByRole("athlete");
      setAllAthletes(athletes);
    } catch {
      toast({ title: t.common.error, description: t.admin.teamDetail.toast.addAthleteError, variant: "destructive" });
    } finally {
      setLoadingAthletes(false);
    }
  };

  const handleAddAthlete = async (athlete: User) => {
    if (!team) return;
    setAddingAthlete(athlete.id);
    try {
      await addMemberToTeam(team.id, athlete.id);
      await autoAssignTeamWorkoutsToMember(team.id, athlete.id);
      setTeam((prev) => prev ? { ...prev, memberIds: [...prev.memberIds, athlete.id] } : prev);
      setMembers((prev) => [...prev, athlete]);
      toast({
        title: t.admin.teamDetail.toast.athleteAdded,
        description: t.admin.teamDetail.toast.athleteAddedDescription.replace("{{name}}", athlete.displayName),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.admin.teamDetail.toast.addAthleteError;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
    } finally {
      setAddingAthlete(null);
    }
  };

  const memberIdSet = useMemo(() => new Set(team?.memberIds ?? []), [team?.memberIds]);

  const filteredAthletes = useMemo(() => {
    const q = athleteSearch.toLowerCase();
    return allAthletes.filter(
      (a) =>
        !memberIdSet.has(a.id) &&
        (a.displayName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q))
    );
  }, [allAthletes, memberIdSet, athleteSearch]);

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
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={handleOpenGroupChat} disabled={openingChat}>
              {openingChat
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <MessageSquare className="h-4 w-4 mr-2" />}
              {t.admin.teamDetail.groupChat}
            </Button>
            <Button onClick={() => navigate(`/admin/teams/${team.id}/stats`)}>
              <BarChart2 className="h-4 w-4 mr-2" />
              {t.admin.teamDetail.viewStats}
            </Button>
          </div>
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t.admin.teamDetail.membersTitle.replace("{{count}}", String(members.length))}
            </h2>
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={handleOpenAddAthlete}>
              <UserPlus className="h-3.5 w-3.5" />
              {t.admin.teamDetail.addAthlete}
            </Button>
          </div>
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

      {/* Add Athlete Modal */}
      <ResponsiveModal
        open={addAthleteOpen}
        onOpenChange={setAddAthleteOpen}
        title={t.admin.teamDetail.addAthleteTitle}
      >
        <div className="space-y-3 p-1">
          <Input
            placeholder={t.admin.teamDetail.searchAthletes}
            value={athleteSearch}
            onChange={(e) => setAthleteSearch(e.target.value)}
            autoFocus
          />
          {loadingAthletes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAthletes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t.admin.teamDetail.noAthletesAvailable}
            </p>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-1 pr-1">
                {filteredAthletes.map((athlete) => (
                  <div
                    key={athlete.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs">
                          {athlete.displayName?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{athlete.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{athlete.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-7"
                      disabled={addingAthlete === athlete.id}
                      onClick={() => handleAddAthlete(athlete)}
                    >
                      {addingAthlete === athlete.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </ResponsiveModal>

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
