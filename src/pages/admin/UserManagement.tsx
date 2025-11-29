import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { Dumbbell, Pencil, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { db } from "../../lib/firebase";

interface User {
  uid: string;
  name: string;
  email: string;
  role: string;
  createdAt: any;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "author",
  });

  // Redirect non-admins
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/admin/articles");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const fetchedUsers = querySnapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      })) as User[];
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value }));
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "", // Don't pre-fill password for security
      role: user.role,
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (userId: string, userName: string) => {
    // Prevent self-deletion
    if (currentUser && userId === currentUser.uid) {
      toast.error("You cannot delete your own account");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete user "${userName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      // Delete user document from Firestore
      await deleteDoc(doc(db, "users", userId));
      toast.success("User deleted from Firestore");
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(`Failed to delete user: ${error.message}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      if (editingUser) {
        // Update existing user
        await setDoc(
          doc(db, "users", editingUser.uid),
          {
            name: formData.name,
            role: formData.role,
            email: formData.email,
            updatedAt: new Date(),
          },
          { merge: true }
        );

        toast.success("User updated successfully");
      } else {
        // Create new user
        const secondaryApp = initializeApp(
          {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          },
          "Secondary"
        );

        const secondaryAuth = getAuth(secondaryApp);

        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth,
          formData.email,
          formData.password
        );

        await setDoc(doc(db, "users", userCredential.user.uid), {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          createdAt: new Date(),
        });

        await secondaryAuth.signOut();
        toast.success("User created successfully");
      }

      setFormData({ name: "", email: "", password: "", role: "author" });
      setEditingUser(null);
      setShowCreateForm(false); // Close modal on success
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(`Failed to create user: ${error.message}`);
      // Clear form on error but keep modal open
      setFormData({ name: "", email: "", password: "", role: "author" });
      setEditingUser(null);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
        <div className="flex gap-4">
          <Button
            onClick={() => {
              setEditingUser(null);
              setFormData({
                name: "",
                email: "",
                password: "",
                role: "author",
              });
              setShowCreateForm(!showCreateForm);
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {showCreateForm ? "Cancel" : "New User"}
          </Button>
        </div>
      </div>

      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl">
              {editingUser ? "Edit User" : "Create New User"}
            </DialogTitle>
            <DialogDescription className="text-base">
              {editingUser
                ? "Update user information. Email cannot be changed for security reasons."
                : "Add a new user to the system. They will be able to log in and create articles."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleCreateUser}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                disabled={!!editingUser}
                required={!editingUser}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Password {editingUser && "(leave blank to keep current)"}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={
                  editingUser
                    ? "Leave blank to keep current"
                    : "Min. 6 characters"
                }
                required={!editingUser}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={handleRoleChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="author">Author</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="athlete">Athlete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                <UserPlus className="mr-2 h-4 w-4" />
                {creating
                  ? editingUser
                    ? "Updating..."
                    : "Creating..."
                  : editingUser
                  ? "Update User"
                  : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {user.role === "athlete" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            navigate(`/admin/users/${user.uid}/workouts`)
                          }
                          title="Manage Workouts"
                        >
                          <Dumbbell className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(user.uid, user.name)}
                        disabled={user.uid === currentUser?.uid}
                      >
                        <Trash2 className="h-4 w-4 text-yellow-500 hover:text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UserManagement;
