import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createUser, deleteUser, getAllUsers, getUserById, updateUser } from "@/services/usersService";
import type { User, UserFormData, UserRole } from "@/types/user";
import { format } from "date-fns";
import { Edit, Loader2, Plus, Save, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { AdminEmptyState } from "../../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../../components/admin/AdminPageHeader";
import { ResponsiveTable } from "../../components/admin/ResponsiveTable";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

const roleBadgeColors: Record<UserRole, string> = {
  admin: "bg-red-500/10 text-red-600 hover:bg-red-500/20",
  editor: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20",
  athlete: "bg-green-500/10 text-green-600 hover:bg-green-500/20",
};

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<Pick<UserFormData, "displayName" | "role">>({ displayName: "", role: "athlete" });
  const [saving, setSaving] = useState(false);
  const [newUserForm, setNewUserForm] = useState<UserFormData>({
    email: "",
    displayName: "",
    role: "athlete",
    password: "",
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: t.common.error,
        description: t.admin.users.toast.loadError,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.displayName.trim() || !newUserForm.email.trim()) return;
    if (!newUserForm.password || newUserForm.password.length < 6) {
      toast({ title: t.common.error, description: t.admin.userForm.toast.passwordTooShort, variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await createUser(newUserForm);
      toast({ title: t.admin.userForm.toast.created, description: t.admin.userForm.toast.createdDescription });
      setIsNewUserOpen(false);
      setNewUserForm({ email: "", displayName: "", role: "athlete", password: "" });
      loadUsers();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t.common.error;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = async (u: User) => {
    setEditForm({ displayName: u.displayName, role: u.role });
    setEditingUser(u);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      await updateUser(editingUser.id, { displayName: editForm.displayName, role: editForm.role });
      toast({ title: t.admin.userForm.toast.updated, description: t.admin.userForm.toast.updatedDescription });
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      const msg = error instanceof Error ? error.message : t.common.error;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === user?.uid) {
      toast({
        title: t.common.error,
        description: t.admin.users.delete.selfDeleteError,
        variant: "destructive",
      });
      return;
    }

    setDeleting(id);
    try {
      await deleteUser(id);
      setUsers(users.filter((u) => u.id !== id));
      toast({
        title: t.admin.users.toast.deleted,
        description: t.admin.users.toast.deletedDescription,
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: t.common.error,
        description: t.admin.users.toast.deleteError,
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 pb-24 md:pb-8">
        <AdminPageHeader
          title={t.admin.users.title}
          action={{ label: t.admin.users.newUser, icon: Plus, onClick: () => setIsNewUserOpen(true) }}
        />

        <ResponsiveTable
          loading={loading}
          rowKey="_id"
          columns={[
            { key: "name", label: t.admin.users.columns.name },
            { key: "email", label: t.admin.users.columns.email },
            { key: "role", label: t.admin.users.columns.role, mobilePrimaryBadge: true },
            { key: "created", label: t.admin.users.columns.created, mobileHidden: true },
          ]}
          rows={users.map((u) => ({
            _id: u.id,
            name: (
              <span className="font-medium">
                {u.displayName}
                {u.id === user?.uid && (
                  <span className="ml-2 text-xs text-muted-foreground">({t.admin.users.you})</span>
                )}
              </span>
            ),
            email: u.email,
            role: (
              <Badge className={roleBadgeColors[u.role]}>
                {t.admin.users.roles[u.role]}
              </Badge>
            ),
            created: format(u.createdAt, "MMM d, yyyy"),
            _user: u,
          }))}
          actions={(row) => {
            const u = row._user as User;
            return (
              <>
                <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(u)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={u.id === user?.uid}
                  onClick={() => setConfirmUser(u)}
                >
                  {deleting === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </>
            );
          }}
          emptyState={
            <AdminEmptyState
              icon={Users}
              title={t.admin.users.empty.title}
              description={t.admin.users.empty.description}
              action={{ label: t.admin.users.newUser, onClick: () => setIsNewUserOpen(true) }}
            />
          }
        />
      </div>
      <ResponsiveConfirm
        open={confirmUser !== null}
        onOpenChange={(open) => { if (!open) setConfirmUser(null); }}
        title={t.admin.users.delete.title}
        description={<>{t.admin.users.delete.description.replace("{{name}}", confirmUser?.displayName || "")}</>}
        confirmLabel={t.common.delete}
        destructive
        loading={deleting !== null}
        onConfirm={() => { if (confirmUser) handleDelete(confirmUser.id); setConfirmUser(null); }}
      />

      <ResponsiveModal
        open={isNewUserOpen}
        onOpenChange={(open) => {
          setIsNewUserOpen(open);
          if (!open) setNewUserForm({ email: "", displayName: "", role: "athlete", password: "" });
        }}
        title={t.admin.userForm.createTitle}
        className="max-w-md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 p-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-displayName">{t.admin.userForm.displayName} *</Label>
            <Input
              id="new-displayName"
              placeholder={t.admin.userForm.displayNamePlaceholder}
              value={newUserForm.displayName}
              onChange={(e) => setNewUserForm((prev) => ({ ...prev, displayName: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-email">{t.common.email} *</Label>
            <Input
              id="new-email"
              type="email"
              placeholder={t.admin.userForm.emailPlaceholder}
              value={newUserForm.email}
              onChange={(e) => setNewUserForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">{t.admin.userForm.password} *</Label>
            <Input
              id="new-password"
              type="password"
              placeholder={t.admin.userForm.passwordPlaceholder}
              value={newUserForm.password}
              onChange={(e) => setNewUserForm((prev) => ({ ...prev, password: e.target.value }))}
              minLength={6}
              required
            />
            <p className="text-xs text-muted-foreground">{t.admin.userForm.passwordHint}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-role">{t.common.role} *</Label>
            <Select
              value={newUserForm.role}
              onValueChange={(value: UserRole) => setNewUserForm((prev) => ({ ...prev, role: value }))}
            >
              <SelectTrigger id="new-role">
                <SelectValue placeholder={t.admin.userForm.rolePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t.admin.users.roles.admin}</SelectItem>
                <SelectItem value="editor">{t.admin.users.roles.editor}</SelectItem>
                <SelectItem value="athlete">{t.admin.users.roles.athlete}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={creating || !newUserForm.displayName.trim() || !newUserForm.email.trim() || !newUserForm.password}
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t.admin.userForm.createButton}
          </Button>
        </form>
      </ResponsiveModal>
      <ResponsiveModal
        open={editingUser !== null}
        onOpenChange={(open) => { if (!open) setEditingUser(null); }}
        title={t.admin.userForm.editTitle}
        description={t.admin.userForm.editDescription}
        className="max-w-md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 p-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-displayName">{t.admin.userForm.displayName} *</Label>
            <Input
              id="edit-displayName"
              placeholder={t.admin.userForm.displayNamePlaceholder}
              value={editForm.displayName}
              onChange={(e) => setEditForm((prev) => ({ ...prev, displayName: e.target.value }))}
              required
              autoFocus
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-role">{t.common.role} *</Label>
            <Select
              value={editForm.role}
              onValueChange={(value: UserRole) => setEditForm((prev) => ({ ...prev, role: value }))}
              disabled={saving}
            >
              <SelectTrigger id="edit-role">
                <SelectValue placeholder={t.admin.userForm.rolePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t.admin.users.roles.admin}</SelectItem>
                <SelectItem value="editor">{t.admin.users.roles.editor}</SelectItem>
                <SelectItem value="athlete">{t.admin.users.roles.athlete}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">{t.admin.userForm.editNote}</p>
          </div>
          <Button
            type="submit"
            className="w-full gap-2"
            disabled={saving || !editForm.displayName.trim()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t.admin.userForm.updateButton}
          </Button>
        </form>
      </ResponsiveModal>
    </AdminLayout>
  );
};

export default AdminUsers;
