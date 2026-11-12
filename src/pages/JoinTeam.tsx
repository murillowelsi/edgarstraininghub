import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getTeamById, getTeamInvite, joinTeamWithInvite } from "@/services/teamsService";
import { createOwnAthleteProfile } from "@/services/usersService";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TeamInvite } from "@/types/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FormSkeleton, SkeletonFrame } from "@/components/feedback/skeletons";


/** Invite card placeholder: team photo, title, form (loading the team or auto-joining). */
const InviteCardSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center p-4 bg-background">
    <div className="w-full max-w-sm space-y-6">
      <SkeletonFrame className="flex flex-col items-center gap-3">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </SkeletonFrame>
      <FormSkeleton fields={3} />
    </div>
  </div>
);

export default function JoinTeam() {
  const { inviteToken } = useParams<{ inviteToken: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isEditor, isAthlete, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  // Before login only the invite (name, photo) is readable; the team itself is read by id after login
  const [team, setTeam] = useState<TeamInvite | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [teamError, setTeamError] = useState("");

  // "register" | "login"
  const [mode, setMode] = useState<"register" | "login">("register");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch team by invite token
  useEffect(() => {
    if (!inviteToken) {
      setTeamError(t.joinTeam.invalidLink);
      setLoadingTeam(false);
      return;
    }
    getTeamInvite(inviteToken)
      .then((team) => {
        if (!team) {
          setTeamError(t.joinTeam.teamNotFound);
        } else {
          setTeam(team);
        }
      })
      .catch(() => setTeamError(t.joinTeam.loadError))
      .finally(() => setLoadingTeam(false));
  }, [inviteToken]);

  // Once team + auth state are known, handle auto-join for logged-in athletes
  useEffect(() => {
    if (loadingTeam || authLoading || !team || !user) return;
    if (isAthlete) {
      getTeamById(team.teamId)
        .then(async (full) => {
          if (!full) throw new Error(t.joinTeam.teamNotFound);
          if (full.memberIds.includes(user.uid)) {
            setAlreadyMember(true); // shows "already a member" below
            return;
          }
          // Athlete is logged in but not yet a member — join automatically
          await joinTeamWithInvite(team, user.uid);
          toast({ title: t.joinTeam.joined.replace("{{name}}", team.teamName) });
          navigate("/athlete");
        })
        .catch((err: Error) => {
          toast({ title: t.common.error, description: err.message || t.joinTeam.joinError, variant: "destructive" });
        });
    }
  }, [loadingTeam, authLoading, team, user, isAthlete, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    setSubmitting(true);
    try {
      // Create Firebase Auth account (primary auth — auto-sign-in is intentional)
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // Create the users doc and its public profile (one batch)
      await createOwnAthleteProfile(uid, name, email);

      // Join the team, auto-assign upcoming team workouts, sync the group chat
      await joinTeamWithInvite(team, uid);

      toast({ title: t.joinTeam.welcome.replace("{{name}}", team.teamName) });
      navigate("/athlete");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.joinTeam.registrationFailed;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
      // Roll back the Firebase Auth account so the user can retry cleanly
      if (auth.currentUser) await auth.currentUser.delete().catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    setSubmitting(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await joinTeamWithInvite(team, cred.user.uid);
      toast({ title: t.joinTeam.joined.replace("{{name}}", team.teamName) });
      navigate("/athlete");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.joinTeam.loginFailed;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render states ---

  if (loadingTeam || authLoading) {
    // Same shape as the invite card below: team photo, title, form
    return (
      <InviteCardSkeleton />
    );
  }

  if (teamError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold text-destructive mb-2">{t.joinTeam.invalidInvite}</p>
          <p className="text-muted-foreground">{teamError}</p>
        </div>
      </div>
    );
  }

  if (!team) return null;

  // Guard: admin/editor visiting join page
  if (isAdmin || isEditor) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold mb-2">{t.joinTeam.athletesOnly}</p>
          <p className="text-muted-foreground">{t.joinTeam.athletesOnlyDesc}</p>
        </div>
      </div>
    );
  }

  // Guard: athlete already a member
  if (isAthlete && user && alreadyMember) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold mb-2">{t.joinTeam.alreadyMember}</p>
          <p className="text-muted-foreground">{t.joinTeam.alreadyMemberDesc}</p>
          <Button className="mt-4" onClick={() => navigate("/athlete")}>
            {t.joinTeam.goToDashboard}
          </Button>
        </div>
      </div>
    );
  }

  // Guard: authenticated athlete being processed (auto-join in useEffect)
  if (isAthlete && user) {
    return (
      // Joining in the background: same invite-card skeleton, no spinner
      <InviteCardSkeleton />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          {team.teamPhotoURL && (
            <img src={team.teamPhotoURL} alt={team.teamName} className="h-16 w-16 object-cover rounded-full mx-auto mb-3" />
          )}
          <h1 className="text-2xl font-bold">{t.joinTeam.joinTitle.replace("{{name}}", team.teamName)}</h1>
          <p className="text-muted-foreground mt-1">
            {mode === "register" ? t.joinTeam.registerSubtitle : t.joinTeam.loginSubtitle}
          </p>
        </div>

        {mode === "register" ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t.joinTeam.name}</Label>
              <Input
                id="name"
                placeholder={t.joinTeam.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">{t.common.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t.joinTeam.password}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t.joinTeam.createPasswordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.joinTeam.createAccountJoin}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t.common.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t.joinTeam.password}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t.joinTeam.yourPasswordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.joinTeam.logInJoin}
            </Button>
          </form>
        )}

        <div className="text-center text-sm">
          {mode === "register" ? (
            <span>
              {t.joinTeam.alreadyHaveAccount}{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-primary underline"
              >
                {t.joinTeam.logIn}
              </button>
            </span>
          ) : (
            <span>
              {t.joinTeam.newHere}{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="text-primary underline"
              >
                {t.joinTeam.createAccount}
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
