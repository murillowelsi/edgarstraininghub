import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <div className="p-4 md:p-8">
        <AdminPageHeader
          title="Users"
          action={{ label: "New User", icon: Plus, onClick: () => navigate("/admin/users/new") }}
        />

        <ResponsiveTable
          loading={loading}
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role" },
            { key: "created", label: "Created" },
          ]}
          rows={users.map((u) => ({
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
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={u.id === user?.uid}
                    >
                      {deleting === u.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete User</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{u.displayName}"?
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(u.id)}
                        className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
    </AdminLayout>
  );
};

export default AdminUsers;
