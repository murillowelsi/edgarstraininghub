import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { signInWithEmailAndPassword } from "firebase/auth";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { auth } from "../../lib/firebase";
import { getErrorMessage } from "../../lib/errors";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set after a successful sign-in; AuthContext then reads the role
  const [justSignedIn, setJustSignedIn] = useState(false);
  const { user, isAdmin, isAthlete, userRole, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  // The role is read by AuthContext once the auth state is ready (no race with
  // the sign-in). Here we only react to the result.
  useEffect(() => {
    if (!justSignedIn || authLoading || !user) return;
    setJustSignedIn(false);
    if (userRole) {
      toast({ title: t.auth.welcomeBack, description: t.auth.loggedIn });
    } else {
      // Signed in to Firebase, but there is no profile with a role in the app
      setError(t.auth.accountNotSetUp);
      auth.signOut();
    }
  }, [justSignedIn, authLoading, user, userRole, toast, t]);

  if (!authLoading && user && userRole) {
    if (isAthlete) return <Navigate to="/athlete" replace />;
    return <Navigate to={from || "/admin"} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setJustSignedIn(true);
    } catch (err: unknown) {
      console.error("Login error:", err);
      setError(getErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero / Brand section */}
      <div className="relative flex flex-col items-center justify-end bg-gradient-to-b from-primary/10 via-primary/5 to-background pt-16 pb-10 px-6 overflow-hidden">
        {/* Decorative circle behind logo */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-primary/8 blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="relative mb-4 w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center shadow-lg">
          <span className="font-display font-black text-4xl tracking-tighter text-primary leading-none">
            EZ
          </span>
        </div>

        {/* Brand name */}
        <h1 className="font-display font-extrabold text-2xl tracking-tight text-foreground text-center leading-tight">
          EZ Training Hub
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground font-medium text-center">
          {t.auth.signInDescription}
        </p>
      </div>

      {/* Form section */}
      <div className="flex-1 flex flex-col px-5 pt-6 pb-10 max-w-md w-full mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-foreground">
              {t.common.email}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={t.auth.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
              className="h-13 text-base rounded-xl border-border/70 focus-visible:ring-primary/50 bg-card px-4"
              style={{ height: "52px" }}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-foreground">
              {t.admin.userForm.password}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t.auth.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
                className="h-13 text-base rounded-xl border-border/70 focus-visible:ring-primary/50 bg-card px-4 pr-12"
                style={{ height: "52px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                tabIndex={-1}
                aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error stays in the form until the next attempt (design system 8.4) */}
          {error && (
            <p
              id="login-error"
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive-ink"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="h-13 w-full rounded-xl font-bold text-sm tracking-wide mt-2 btn-primary"
            style={{ height: "52px" }}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.auth.signingIn}
              </>
            ) : (
              t.auth.signIn
            )}
          </Button>
        </form>

        {/* Decorative divider */}
        <div className="flex items-center gap-3 mt-8">
          <div className="flex-1 h-px bg-border/50" />
          <span className="text-xs text-muted-foreground font-medium px-1">EZ Training Hub</span>
          <div className="flex-1 h-px bg-border/50" />
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
