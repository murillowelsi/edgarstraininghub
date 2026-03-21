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
import { useLanguage } from "../../contexts/LanguageContext";

const AdminUserForm = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

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
          title: t.admin.userForm.toast.notFound,
          description: t.admin.userForm.toast.notFoundDescription,
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
        title: t.common.error,
        description: t.admin.userForm.toast.loadError,
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
        description: t.admin.userForm.toast.displayNameRequired,
        variant: "destructive",
      });
      return;
    }

    if (!isEditing) {
      if (!formData.email.trim()) {
        toast({
          title: "Validation Error",
          description: t.admin.userForm.toast.emailRequired,
          variant: "destructive",
        });
        return;
      }

      if (!formData.password || formData.password.length < 6) {
        toast({
          title: "Validation Error",
          description: t.admin.userForm.toast.passwordTooShort,
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
          title: t.admin.userForm.toast.updated,
          description: t.admin.userForm.toast.updatedDescription,
        });
      } else {
        await createUser(formData);
        toast({
          title: t.admin.userForm.toast.created,
          description: t.admin.userForm.toast.createdDescription,
        });
      }
      navigate("/admin/users");
    } catch (error: unknown) {
      console.error("Error saving user:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save user.";
      toast({
        title: t.common.error,
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
                <CardTitle>{isEditing ? t.admin.userForm.editTitle : t.admin.userForm.createTitle}</CardTitle>
                <CardDescription>
                  {isEditing ? t.admin.userForm.editDescription : t.admin.userForm.createDescription}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Display Name */}
                  <div className="space-y-2">
                    <Label htmlFor="displayName">
                      {t.admin.userForm.displayName} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="displayName"
                      placeholder={t.admin.userForm.displayNamePlaceholder}
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
                        {t.common.email} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t.admin.userForm.emailPlaceholder}
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
                        {t.admin.userForm.password} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder={t.admin.userForm.passwordPlaceholder}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, password: e.target.value }))
                        }
                        disabled={saving}
                        minLength={6}
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        {t.admin.userForm.passwordHint}
                      </p>
                    </div>
                  )}

                  {/* Role */}
                  <div className="space-y-2">
                    <Label htmlFor="role">
                      {t.common.role} <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: UserRole) =>
                        setFormData((prev) => ({ ...prev, role: value }))
                      }
                      disabled={saving}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.admin.userForm.rolePlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">{t.admin.users.roles.admin}</SelectItem>
                        <SelectItem value="editor">{t.admin.users.roles.editor}</SelectItem>
                        <SelectItem value="athlete">{t.admin.users.roles.athlete}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {formData.role === "admin" && t.admin.userForm.roleDescriptions.admin}
                      {formData.role === "editor" && t.admin.userForm.roleDescriptions.editor}
                      {formData.role === "athlete" && t.admin.userForm.roleDescriptions.athlete}
                    </p>
                  </div>

                  {isEditing && (
                    <div className="rounded-lg bg-muted p-4">
                      <p className="text-sm text-muted-foreground">
                        <strong>Note:</strong> {t.admin.userForm.editNote}
                      </p>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="fixed bottom-16 left-0 right-0 z-20 bg-background border-t p-4 md:static md:bottom-auto md:border-0 md:p-0">
          <div className="flex sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={saving}
              className="gap-2 flex-1 sm:flex-none"
            >
              <X className="h-4 w-4" />
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={saving}
              className="gap-2 flex-1 sm:flex-none"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.common.saving}
                </>
              ) : (
                <>
                  {isEditing ? (
                    <>
                      <Save className="h-4 w-4" />
                      {t.admin.userForm.updateButton}
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {t.admin.userForm.createButton}
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
