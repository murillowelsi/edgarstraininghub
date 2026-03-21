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
import { Check, Loader2, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

  const handleCancel = () => {
    navigate("/admin/users");
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
      <div className="h-full overflow-y-auto pb-24">
        <div className="p-6 md:p-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>{isEditing ? "Edit User" : "Create New User"}</CardTitle>
                <CardDescription>
                  {isEditing
                    ? "Update user information and role."
                    : "Add a new user to the system with email and password."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Display Name */}
                  <div className="space-y-2">
                    <Label htmlFor="displayName">
                      Display Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="displayName"
                      placeholder="John Doe"
                      value={formData.displayName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, displayName: e.target.value }))
                      }
                      disabled={saving}
                      required
                    />
                  </div>

                  {/* Email - only for new users */}
                  {!isEditing && (
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, email: e.target.value }))
                        }
                        disabled={saving}
                        required
                      />
                    </div>
                  )}

                  {/* Password - only for new users */}
                  {!isEditing && (
                    <div className="space-y-2">
                      <Label htmlFor="password">
                        Password <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Minimum 6 characters"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, password: e.target.value }))
                        }
                        disabled={saving}
                        minLength={6}
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        Must be at least 6 characters long.
                      </p>
                    </div>
                  )}

                  {/* Role */}
                  <div className="space-y-2">
                    <Label htmlFor="role">
                      Role <span className="text-destructive">*</span>
                    </Label>
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
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="athlete">Athlete</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {formData.role === "admin" && "Full access to manage users and posts"}
                      {formData.role === "editor" && "Can create and edit blog posts"}
                      {formData.role === "athlete" && "Access to athlete dashboard"}
                    </p>
                  </div>

                  {isEditing && (
                    <div className="rounded-lg bg-muted p-4">
                      <p className="text-sm text-muted-foreground">
                        <strong>Note:</strong> Email and password cannot be changed here. Contact
                        the system administrator for those changes.
                      </p>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-background border-t p-4 -mx-4 mt-6 md:static md:border-0 md:p-0 md:mx-0">
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={saving}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {isEditing ? (
                    <>
                      <Save className="h-4 w-4" />
                      Update User
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Create User
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUserForm;
