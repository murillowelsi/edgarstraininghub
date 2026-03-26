import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { auth, db } from "../../lib/firebase";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user, isAdmin, isAthlete, userRole, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  if (!authLoading && user && userRole) {
    if (isAdmin) return <Navigate to={from || "/admin"} replace />;
    if (isAthlete) return <Navigate to="/athlete" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (!userDoc.exists()) {
        toast({
          title: t.auth.accessDenied,
          description: t.auth.userNotFound,
          variant: "destructive",
        });
        await auth.signOut();
        setLoading(false);
        return;
      }

      const role = userDoc.data()?.role;

      toast({
        title: t.auth.welcomeBack,
        description: t.auth.loggedIn,
      });

      if (role === "admin") {
        navigate(from || "/admin", { replace: true });
      } else if (role === "athlete") {
        navigate("/athlete", { replace: true });
      } else {
        navigate(from || "/admin", { replace: true });
      }
    } catch (error: unknown) {
      console.error("Login error:", error);
      toast({
        title: t.auth.loginFailed,
        description: error instanceof Error ? error.message : t.auth.invalidCredentials,
        variant: "destructive",
      });
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
              disabled={loading}
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
                disabled={loading}
                className="h-13 text-base rounded-xl border-border/70 focus-visible:ring-primary/50 bg-card px-4 pr-12"
                style={{ height: "52px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

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
