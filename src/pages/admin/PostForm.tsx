import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  createPost,
  generateSlug,
  getPostById,
  updatePost,
} from "@/services/postsService";
import type { PostFormData } from "@/types/post";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { useAuth } from "../../contexts/AuthContext";

const AdminPostForm = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<PostFormData>({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    published: false,
  });

  // Rich text editor modules configuration
  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["blockquote", "code-block"],
      ["link", "image"],
      ["clean"],
    ],
  };

  useEffect(() => {
    if (isEditing && id) {
      loadPost(id);
    }
  }, [id, isEditing]);

  const loadPost = async (postId: string) => {
    try {
      const post = await getPostById(postId);
      if (!post) {
        toast({
          title: "Post not found",
          description: "The post you're trying to edit doesn't exist.",
          variant: "destructive",
        });
        navigate("/admin/posts");
        return;
      }
      setFormData({
        title: post.title,
        slug: post.slug,
        content: post.content,
        excerpt: post.excerpt,
        published: post.published,
      });
    } catch (error) {
      console.error("Error loading post:", error);
      toast({
        title: "Error",
        description: "Failed to load post.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title,
      // Auto-generate slug only if it's empty or was auto-generated before
      slug: prev.slug === generateSlug(prev.title) || !prev.slug
        ? generateSlug(title)
        : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Title is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Content is required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      if (isEditing && id) {
        await updatePost(id, formData);
        toast({
          title: "Post updated",
          description: "Your changes have been saved.",
        });
      } else {
        await createPost(
          formData,
          user?.uid || "",
          user?.displayName || user?.email || "Admin"
        );
        toast({
          title: "Post created",
          description: formData.published
            ? "Your post has been published."
            : "Your post has been saved as a draft.",
        });
      }
      navigate("/admin/posts");
    } catch (error: unknown) {
      console.error("Error saving post:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save post.";
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
        <header className="border-b bg-card sticky top-0 z-10 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/posts">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-bold">
              {isEditing ? "Edit Post" : "New Post"}
            </h1>
          </div>
          <Button onClick={handleSubmit} disabled={saving}>
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
        <div className="flex-1 overflow-auto p-8">
          <form onSubmit={handleSubmit} className="max-w-4xl space-y-8">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter post title"
                value={formData.title}
                onChange={handleTitleChange}
                className="text-lg"
                disabled={saving}
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">/blog/</span>
                <Input
                  id="slug"
                  placeholder="post-url-slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                URL-friendly identifier for this post
              </p>
            </div>

            {/* Excerpt */}
            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                placeholder="Brief summary of the post (displayed in blog listings)"
                value={formData.excerpt}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, excerpt: e.target.value }))
                }
                rows={3}
                disabled={saving}
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label>Content</Label>
              <div className="border rounded-lg overflow-hidden bg-card">
                <ReactQuill
                  theme="snow"
                  value={formData.content}
                  onChange={(content) =>
                    setFormData((prev) => ({ ...prev, content }))
                  }
                  modules={quillModules}
                  placeholder="Write your post content here..."
                  className="min-h-[400px]"
                />
              </div>
            </div>

            {/* Published */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    published: checked === true,
                  }))
                }
                disabled={saving}
              />
              <Label htmlFor="published" className="cursor-pointer">
                Publish this post (visible on public blog)
              </Label>
            </div>
          </form>
        </div>

        {/* Custom styles for Quill editor */}
        <style>{`
          .ql-container {
            font-size: 16px;
            min-height: 350px;
          }
          .ql-editor {
            min-height: 350px;
          }
          .dark .ql-toolbar {
            border-color: hsl(var(--border));
            background: hsl(var(--muted));
          }
          .dark .ql-container {
            border-color: hsl(var(--border));
          }
          .dark .ql-editor {
            color: hsl(var(--foreground));
          }
          .dark .ql-editor.ql-blank::before {
            color: hsl(var(--muted-foreground));
          }
          .dark .ql-stroke {
            stroke: hsl(var(--foreground));
          }
          .dark .ql-fill {
            fill: hsl(var(--foreground));
          }
          .dark .ql-picker-label {
            color: hsl(var(--foreground));
          }
          .dark .ql-picker-options {
            background: hsl(var(--card));
            border-color: hsl(var(--border));
          }
          .dark .ql-picker-item {
            color: hsl(var(--foreground));
          }
        `}</style>
      </div>
    </AdminLayout>
  );
};

export default AdminPostForm;
