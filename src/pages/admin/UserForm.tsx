import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createUser, getUserById, updateUser } from "@/services/usersService";
import type { UserFormData, UserRole } from "@/types/user";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";

const AdminUserForm = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    email: "",
    displayName: "",
    role: "athlete",
    password: "",
  });

  useEffect(() => {
    if (isEditing && id) {
      loadUser(id);
    }
  }, [id, isEditing]);

  const loadUser = async (userId: string) => {
    try {
      const user = await getUserById(userId);
      if (!user) {
        toast({
          title: "User not found",
          description: "The user you're trying to edit doesn't exist.",
          variant: "destructive",
        });
        navigate("/admin/users");
        return;
      }
      setFormData({
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        password: "",
      });
    } catch (error) {
      console.error("Error loading user:", error);
      toast({
        title: "Error",
        description: "Failed to load user.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.displayName.trim()) {
      toast({
        title: "Validation Error",
        description: "Display name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!isEditing) {
      if (!formData.email.trim()) {
        toast({
          title: "Validation Error",
          description: "Email is required.",
          variant: "destructive",
        });
        return;
      }

      if (!formData.password || formData.password.length < 6) {
        toast({
          title: "Validation Error",
          description: "Password must be at least 6 characters.",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);

    try {
      if (isEditing && id) {
        await updateUser(id, {
          displayName: formData.displayName,
          role: formData.role,
        });
        toast({
          title: "User updated",
          description: "User details have been saved.",
        });
      } else {
        await createUser(formData);
        toast({
          title: "User created",
          description: "New user has been created successfully.",
        });
      }
      navigate("/admin/users");
    } catch (error: unknown) {
      console.error("Error saving user:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save user.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="border-b bg-card sticky top-0 z-10 px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/admin/users">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
            <h1 className="text-lg sm:text-xl font-bold">
              {isEditing ? "Edit User" : "New User"}
            </h1>
          </div>
          <Button onClick={handleSubmit} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? "Update" : "Create"}
              </>
            )}
          </Button>
        </header>

        {/* Form */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="John Doe"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, displayName: e.target.value }))
                }
                disabled={saving}
              />
            </div>

            {/* Email - only for new users */}
            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>
            )}

            {/* Password - only for new users */}
            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>
            )}

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) =>
                  setFormData((prev) => ({ ...prev, role: value }))
                }
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex flex-col">
                      <span className="font-medium">Admin</span>
                      <span className="text-xs text-muted-foreground">
                        Full access to manage users and posts
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex flex-col">
                      <span className="font-medium">Editor</span>
                      <span className="text-xs text-muted-foreground">
                        Can create and edit blog posts
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="athlete">
                    <div className="flex flex-col">
                      <span className="font-medium">Athlete</span>
                      <span className="text-xs text-muted-foreground">
                        Access to athlete dashboard
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isEditing && (
              <p className="text-sm text-muted-foreground">
                Note: Email and password cannot be changed here. Contact the system administrator for those changes.
              </p>
            )}
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUserForm;
