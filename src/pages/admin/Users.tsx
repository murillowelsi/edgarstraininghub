import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { useToast } from "@/hooks/use-toast";
import { deleteUser, getAllUsers } from "@/services/usersService";
import type { User, UserRole } from "@/types/user";
import { format } from "date-fns";
import { Edit, Loader2, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { AdminEmptyState } from "../../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../../components/admin/AdminPageHeader";
import { ResponsiveTable } from "../../components/admin/ResponsiveTable";
import { useAuth } from "../../contexts/AuthContext";

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
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === user?.uid) {
      toast({
        title: "Error",
        description: "You cannot delete your own account.",
        variant: "destructive",
      });
      return;
    }

    setDeleting(id);
    try {
      await deleteUser(id);
      setUsers(users.filter((u) => u.id !== id));
      toast({
        title: "User deleted",
        description: "The user has been removed.",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Failed to delete user.",
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
          title="Users"
          action={{ label: "New User", icon: Plus, onClick: () => navigate("/admin/users/new") }}
        />

        <ResponsiveTable
          loading={loading}
          rowKey="_id"
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role", mobilePrimaryBadge: true },
            { key: "created", label: "Created", mobileHidden: true },
          ]}
          rows={users.map((u) => ({
            _id: u.id,
            name: (
              <span className="font-medium">
                {u.displayName}
                {u.id === user?.uid && (
                  <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                )}
              </span>
            ),
            email: u.email,
            role: (
              <Badge className={roleBadgeColors[u.role]}>
                {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
              </Badge>
            ),
            created: format(u.createdAt, "MMM d, yyyy"),
            _user: u,
          }))}
          actions={(row) => {
            const u = row._user as User;
            return (
              <>
                <Link to={`/admin/users/${u.id}/edit`}>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
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
              title="No users yet"
              description="Add your first user to get started."
              action={{ label: "New User", onClick: () => navigate("/admin/users/new") }}
            />
          }
        />
      </div>
      <ResponsiveConfirm
        open={confirmUser !== null}
        onOpenChange={(open) => { if (!open) setConfirmUser(null); }}
        title="Delete User"
        description={<>Are you sure you want to delete "<strong>{confirmUser?.displayName}</strong>"? This action cannot be undone.</>}
        confirmLabel="Delete"
        destructive
        loading={deleting !== null}
        onConfirm={() => { if (confirmUser) handleDelete(confirmUser.id); setConfirmUser(null); }}
      />
    </AdminLayout>
  );
};

export default AdminUsers;
