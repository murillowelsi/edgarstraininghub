import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { ListItemCard } from "@/components/shared/ListItemCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getTeamById,
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
  UserMinus,
  EllipsisVertical,
  BarChart2,
  UserPlus,
  MessageSquare,
  QrCode,
  Settings2,
  ChevronLeft,
} from "lucide-react";

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function AdminTeamDetail() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);


  // Copy link
  const [copied, setCopied] = useState(false);

  // Speed dial FAB
  const [fabOpen, setFabOpen] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Remove member
  const [confirmMember, setConfirmMember] = useState<User | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [actionMember, setActionMember] = useState<User | null>(null);

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
        const memberUsers = await Promise.all(
          team.memberIds.map((uid) => getUserById(uid))
        );
        if (cancelled) return;
        setMembers(memberUsers.filter((u): u is User => u !== null));
        // Silently sync group chat so all members see it without needing to click the button
        if (user) {
          ChatService.createOrGetGroupChat(team.id, team.name, user.uid, team.memberIds).catch(() => {});
        }
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
      toast({ title: t.admin.teamDetail.toast.linkCopied, description: t.admin.teamDetail.toast.linkCopiedDescription });
    }).catch(() => {
      toast({ title: t.common.error, description: "Could not copy to clipboard.", variant: "destructive" });
    });
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
      const updatedMemberIds = [...team.memberIds, athlete.id];
      setTeam((prev) => prev ? { ...prev, memberIds: updatedMemberIds } : prev);
      setMembers((prev) => [...prev, athlete]);
      // Sync new member into the group chat
      if (user) {
        ChatService.createOrGetGroupChat(team.id, team.name, user.uid, updatedMemberIds).catch(() => {});
      }
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
      <div className="p-4 md:p-8 space-y-6">
        {/* Header — back button + centered name + action buttons */}
        <div className="relative flex items-center md:mb-8">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => navigate("/admin/teams")}
            aria-label="Voltar"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg md:text-xl font-bold truncate max-w-[60%] text-center">
            {team.name}
          </h1>
          <div className="hidden sm:flex items-center gap-2 shrink-0 ml-auto">
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

        {/* Speed dial FAB — mobile only */}
        {fabOpen && (
          <div
            className="fixed inset-0 z-20 sm:hidden"
            onClick={() => setFabOpen(false)}
          />
        )}
        <div
          className="fixed right-4 z-30 sm:hidden flex flex-col items-end gap-3"
          style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
        >
          {/* Speed dial items */}
          {fabOpen && (
            <div className="flex flex-col items-end gap-2">
              {[
                {
                  icon: BarChart2,
                  label: t.admin.teamDetail.viewStats,
                  onClick: () => { navigate(`/admin/teams/${team.id}/stats`); setFabOpen(false); },
                },
                {
                  icon: openingChat ? Loader2 : MessageSquare,
                  label: t.admin.teamDetail.groupChat,
                  onClick: () => { handleOpenGroupChat(); setFabOpen(false); },
                },
                {
                  icon: UserPlus,
                  label: t.admin.teamDetail.addAthlete,
                  onClick: () => { handleOpenAddAthlete(); setFabOpen(false); },
                },
                {
                  icon: QrCode,
                  label: t.admin.teamDetail.qrCode,
                  onClick: () => { setShowQRModal(true); setFabOpen(false); },
                },
              ].map(({ icon: Icon, label, onClick }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className="flex items-center gap-2.5 bg-card border shadow-md rounded-full pl-3 pr-3.5 py-2 text-sm font-medium hover:bg-accent transition-colors active:scale-95"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
          {/* Main FAB */}
          <button
            onClick={() => setFabOpen((v) => !v)}
            className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
            aria-label={t.admin.teamDetail.fabAriaLabel}
          >
            <Settings2 className={`h-6 w-6 transition-transform duration-300 ${fabOpen ? "rotate-90" : ""}`} />
          </button>
        </div>

        {/* Members */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <Button size="sm" variant="outline" className="hidden sm:flex h-7 gap-1.5 text-xs" onClick={handleOpenAddAthlete}>
              <UserPlus className="h-3.5 w-3.5" />
              {t.admin.teamDetail.addAthlete}
            </Button>
          </div>
          {members.length === 0 ? (
            <AdminEmptyState
              illustration="/undraw_team.svg"
              title={t.admin.teamDetail.noMembers}
              description={t.admin.teamDetail.noMembersDescription}
            />
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <ListItemCard
                  key={member.id}
                  icon={
                    <Avatar className="h-9 w-9 ring-2 ring-white">
                      {member.photoURL && <AvatarImage src={member.photoURL} alt={member.displayName} className="object-cover" />}
                      <AvatarFallback className="text-xs font-semibold" style={{ backgroundColor: "#e0b50718", color: "#e0b507" }}>
                        {getInitials(member.displayName || "?")}
                      </AvatarFallback>
                    </Avatar>
                  }
                  iconClassName="p-0"
                  title={member.displayName}
                  subtitle={member.email}
                  right={
                    <Badge variant="outline" className="text-xs font-normal border-transparent" style={{ backgroundColor: "#e0b50718", color: "#e0b507" }}>
                      {member.role}
                    </Badge>
                  }
                  actions={
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setActionMember(member)}>
                      {removingMember === member.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <EllipsisVertical className="h-4 w-4" />}
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </section>

      </div>

      {/* QR Code Modal — mobile FAB action */}
      <ResponsiveModal
        open={showQRModal}
        onOpenChange={setShowQRModal}
        title={t.admin.teamDetail.qrCode}
      >
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="p-4 bg-white rounded-lg border">
            {inviteUrl && <QRCodeSVG value={inviteUrl} size={200} />}
          </div>
          <Button variant="outline" className="w-full" onClick={() => { handleCopyLink(); setShowQRModal(false); }}>
            {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
            {t.admin.teamDetail.copyLink}
          </Button>
        </div>
      </ResponsiveModal>

      {/* Add Athlete Modal */}
      <ResponsiveModal
        open={addAthleteOpen}
        onOpenChange={setAddAthleteOpen}
        title={t.admin.teamDetail.addAthleteTitle}
      >
        <div className="flex flex-col gap-3 p-1 min-h-0">
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
            <ScrollArea className="h-[50dvh] md:h-64">
              <div className="space-y-1 pr-1">
                {filteredAthletes.map((athlete) => (
                  <div
                    key={athlete.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0 ring-2 ring-white">
                        {athlete.photoURL && <AvatarImage src={athlete.photoURL} alt={athlete.displayName} className="object-cover" />}
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

      {/* Member action drawer */}
      <Drawer open={!!actionMember} onOpenChange={(open) => { if (!open) setActionMember(null); }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="truncate">{actionMember?.displayName}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-2">
            <button
              className="flex items-center gap-3 w-full p-4 rounded-lg border bg-card hover:bg-muted transition-colors text-sm font-medium"
              onClick={() => { setConfirmMember(actionMember); setActionMember(null); }}
            >
              <UserMinus className="h-5 w-5" />
              {t.admin.teamDetail.removeMember.confirm}
            </button>
          </div>
        </DrawerContent>
      </Drawer>

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

    </AdminLayout>
  );
}
