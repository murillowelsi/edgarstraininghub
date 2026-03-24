import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getTeamByInviteToken, addMemberToTeam } from "@/services/teamsService";
import { useAuth } from "@/contexts/AuthContext";
import type { Team } from "@/types/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function JoinTeam() {
  const { inviteToken } = useParams<{ inviteToken: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isEditor, isAthlete, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [team, setTeam] = useState<Team | null>(null);
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
      setTeamError("Invalid invite link.");
      setLoadingTeam(false);
      return;
    }
    getTeamByInviteToken(inviteToken)
      .then((t) => {
        if (!t) {
          setTeamError("Invite link is invalid or the team no longer exists.");
        } else {
          setTeam(t);
        }
      })
      .catch(() => setTeamError("Failed to load team. Try again."))
      .finally(() => setLoadingTeam(false));
  }, [inviteToken]);

  // Once team + auth state are known, handle auto-join for logged-in athletes
  useEffect(() => {
    if (loadingTeam || authLoading || !team || !user) return;
    if (isAthlete) {
      if (team.memberIds.includes(user.uid)) return; // will show "already a member" below
      // Athlete is logged in but not yet a member — join automatically
      addMemberToTeam(team.id, user.uid)
        .then(() => {
          toast({ title: `You joined ${team.name}!` });
          navigate("/athlete");
        })
        .catch((err: Error) => {
          toast({ title: "Error", description: err.message || "Failed to join team.", variant: "destructive" });
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

      // Create Firestore user document
      await setDoc(doc(db, "users", uid), {
        displayName: name,
        email,
        role: "athlete",
        subscriptionStatus: "inactive",
        subscriptionPlan: "none",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Join the team
      await addMemberToTeam(team.id, uid);

      toast({ title: `Welcome! You joined ${team.name}.` });
      navigate("/athlete");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed.";
      toast({ title: "Error", description: msg, variant: "destructive" });
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
      await addMemberToTeam(team.id, cred.user.uid);
      toast({ title: `You joined ${team.name}!` });
      navigate("/athlete");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render states ---

  if (loadingTeam || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (teamError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold text-destructive mb-2">Invalid Invite</p>
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
          <p className="text-lg font-semibold mb-2">Invite for Athletes Only</p>
          <p className="text-muted-foreground">This invite is for athletes only.</p>
        </div>
      </div>
    );
  }

  // Guard: athlete already a member
  if (isAthlete && user && team.memberIds.includes(user.uid)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold mb-2">Already a Member</p>
          <p className="text-muted-foreground">You are already a member of this team.</p>
          <Button className="mt-4" onClick={() => navigate("/athlete")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Guard: authenticated athlete being processed (auto-join in useEffect)
  if (isAthlete && user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Join {team.name}</h1>
          <p className="text-muted-foreground mt-1">
            {mode === "register"
              ? "Create an account to join this team."
              : "Log in to join this team."}
          </p>
        </div>

        {mode === "register" ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account & Join
            </Button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log In & Join
            </Button>
          </form>
        )}

        <div className="text-center text-sm">
          {mode === "register" ? (
            <span>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-primary underline"
              >
                Log in
              </button>
            </span>
          ) : (
            <span>
              New here?{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="text-primary underline"
              >
                Create account
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
