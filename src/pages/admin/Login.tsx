import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { auth, db } from "../../lib/firebase";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, isAdmin, isAthlete, userRole, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get the redirect path from state
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  // If already logged in, redirect based on role
  if (!authLoading && user && userRole) {
    if (isAdmin) {
      return <Navigate to={from || "/admin"} replace />;
    }
    if (isAthlete) {
      return <Navigate to="/athlete" replace />;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Check user role
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

      // Redirect based on role
      if (role === "admin") {
        navigate(from || "/admin", { replace: true });
      } else if (role === "athlete") {
        navigate("/athlete", { replace: true });
      } else {
        // Editor or other roles go to admin
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
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center bg-muted p-4 pt-24">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold">{t.auth.login}</CardTitle>
            <CardDescription>
              {t.auth.signInDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t.common.email}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t.auth.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t.admin.userForm.password}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t.auth.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminLogin;
