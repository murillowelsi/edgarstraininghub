import { Moon, Sun, LogOut, MessageSquare, Camera, X, Flame, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { auth, db } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { uploadImageToCloudinary } from "../lib/cloudinary";
import GB from "country-flag-icons/react/3x2/GB";
import PT from "country-flag-icons/react/3x2/PT";
import { useRef, useState } from "react";
import { useTopBarMenu } from "../contexts/TopBarMenuContext";
import { useTimelineActions } from "../contexts/TimelineActionsContext";

interface AdminTopBarProps {
  chatUnreadCount?: number;
  pageTitle?: string;
}

const AdminTopBar = ({ chatUnreadCount = 0, pageTitle }: AdminTopBarProps) => {
  const { theme, toggleTheme } = useTheme();
  const { user, photoURL, setPhotoURL } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const { isMenuOpen, setIsMenuOpen } = useTopBarMenu();
  const { setCreateOpen, setActivityOpen, activityUnreadCount } = useTimelineActions();

  const navItems = [
    { href: "/admin", label: t.admin.nav.home, exact: true },
    { href: "/admin/posts", label: t.admin.nav.posts },
    { href: "/admin/users", label: t.admin.nav.users },
    { href: "/admin/workouts", label: t.admin.nav.workouts },
    { href: "/admin/teams", label: t.admin.nav.teams },
    { href: "/admin/calendar", label: t.admin.nav.calendar },
    { href: "/admin/subscriptions", label: t.admin.nav.subscriptions },
    { href: "/admin/chat", label: t.admin.nav.chat },
    { href: "/admin/timeline", label: t.admin.nav.timeline },
  ];

  const currentTitle = pageTitle ?? navItems.find((item) =>
    item.exact ? location.pathname === item.href : location.pathname.startsWith(item.href)
  )?.label ?? "";

  const getInitials = (email?: string | null) => {
    if (!email) return "A";
    return email.charAt(0).toUpperCase();
  };

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await signOut(auth);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploadingPhoto(true);
    try {
      const url = await uploadImageToCloudinary(file, "profile-photos");
      await updateDoc(doc(db, "users", user.uid), { photoURL: url });
      setPhotoURL(url);
    } catch (err) {
      console.error("Error uploading photo:", err);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePhotoRemove = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { photoURL: null });
      setPhotoURL(null);
    } catch (err) {
      console.error("Error removing photo:", err);
    }
  };

  return (
    <>
    <header className="bg-background/80 backdrop-blur-lg fixed w-full z-50 border-b border-border/50">
      <div className="px-4 py-4 flex items-center justify-between">
        <Link
          to="/admin"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="text-primary font-display font-extrabold text-3xl tracking-tighter">
            EZ
          </span>
        </Link>

        {currentTitle && (
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold">
            {currentTitle}
          </h1>
        )}

        <div className="flex items-center">
          <button
            onClick={() => setCreateOpen(true)}
            className="p-2 rounded-full hover:bg-accent transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>

          <button
            onClick={() => setActivityOpen(true)}
            className="relative p-2 rounded-full hover:bg-accent transition-colors"
          >
            <Flame className="h-5 w-5" />
            {activityUnreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
            )}
          </button>

          <Link
            to="/admin/chat"
            className={cn(
              "relative p-2 rounded-full transition-colors",
              location.pathname.startsWith("/admin/chat")
                ? "text-primary bg-primary/10"
                : "hover:bg-accent"
            )}
          >
            <MessageSquare className="h-5 w-5" />
            {chatUnreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>

      <Drawer open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DrawerContent>
          <DrawerTitle className="sr-only">Menu</DrawerTitle>
          <div className="px-4 pb-8 pt-2 space-y-4">
            {/* Profile info */}
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="relative group rounded-full focus:outline-none"
                >
                  <CachedAvatar
                    src={photoURL}
                    alt="Profile"
                    fallback={getInitials(user?.email)}
                    className="h-14 w-14 ring-2 ring-[#e1b506]"
                    fallbackClassName="bg-primary text-primary-foreground text-lg font-semibold"
                  />
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                      <Spinner size="xs" className="text-white" />
                    </div>
                  )}
                </button>
                {photoURL && !isUploadingPhoto && (
                  <button
                    onClick={handlePhotoRemove}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive flex items-center justify-center"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{user?.email}</p>
                <p className="text-sm text-muted-foreground capitalize">{t.admin.panel}</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />

            <div className="border-t pt-4 space-y-2">
              {/* Language */}
              <div className="flex gap-2">
                <button
                  onClick={() => changeLanguage("en")}
                  className={`flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${language === "en" ? "bg-accent border-primary/30" : "border-border text-muted-foreground hover:bg-accent/50"}`}
                >
                  <GB className="w-5 h-4 rounded-sm shrink-0" />
                  English
                </button>
                <button
                  onClick={() => changeLanguage("pt")}
                  className={`flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${language === "pt" ? "bg-accent border-primary/30" : "border-border text-muted-foreground hover:bg-accent/50"}`}
                >
                  <PT className="w-5 h-4 rounded-sm shrink-0" />
                  Português
                </button>
              </div>

              {/* Theme */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border hover:bg-accent/50 transition-colors text-sm"
              >
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
                <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
              >
                <LogOut size={18} />
                {t.athlete.logout}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default AdminTopBar;
