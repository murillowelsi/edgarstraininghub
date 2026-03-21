import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  createPost,
  generateSlug,
  getPostById,
  updatePost,
} from "@/services/postsService";
import type { PostFormData } from "@/types/post";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { ArrowLeft, Loader2, Minus, Save, X, Check, Upload, Image as ImageIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { useAuth } from "../../contexts/AuthContext";

// Custom horizontal rule blot
const BlockEmbed = Quill.import('blots/block/embed');
class DividerBlot extends BlockEmbed {
  static blotName = 'divider';
  static tagName = 'hr';
}
Quill.register(DividerBlot);

const AdminPostForm = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState<PostFormData>({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    featuredImage: "",
    published: false,
  });

  // Rich text editor modules configuration
  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["blockquote", "code-block"],
        ["link", "image"],
        ["divider"],
        ["clean"],
      ],
      handlers: {
        image: function() {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.click();

          input.onchange = async () => {
            const file = input.files?.[0];
            if (file) {
              const quill = (this as any).quill;
              const range = quill.getSelection();
              
              // Show loading state
              quill.enable(false);
              
              try {
                const imageUrl = await uploadImageToCloudinary(file);
                quill.insertEmbed(range.index, 'image', imageUrl);
                quill.setSelection(range.index + 1);
                
                toast({
                  title: "Image uploaded",
                  description: "Your image has been successfully uploaded.",
                });
              } catch (error) {
                console.error('Error uploading image:', error);
                toast({
                  title: "Upload failed",
                  description: "Failed to upload image. Please try again.",
                  variant: "destructive",
                });
              } finally {
                quill.enable(true);
              }
            }
          };
        },
        divider: function() {
          const quill = (this as any).quill;
          if (quill) {
            const range = quill.getSelection();
            if (range) {
              quill.insertEmbed(range.index, 'divider', true, 'user');
              quill.setSelection(range.index + 1, 0);
            }
          }
        },
      },
    },
  }), [toast]);

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
        featuredImage: post.featuredImage || "",
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
      <div className="h-full overflow-y-auto pb-24">
        <div className="p-6 md:p-8">
          <div className="max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>{isEditing ? "Edit Post" : "Create New Post"}</CardTitle>
                <CardDescription>
                  {isEditing
                    ? "Update your blog post content and settings."
                    : "Write and publish a new blog post."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
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

                  {/* Featured Image */}
                  <div className="space-y-2">
                    <Label>Featured Image</Label>
                    <div className="space-y-3">
                      {!formData.featuredImage ? (
                        <div
                          className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.add('border-primary', 'bg-primary/5');
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                          }}
                          onDrop={async (e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                            const file = e.dataTransfer.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                              setUploadingImage(true);
                              try {
                                const imageUrl = await uploadImageToCloudinary(file);
                                setFormData((prev) => ({ ...prev, featuredImage: imageUrl }));
                                toast({
                                  title: "Image uploaded",
                                  description: "Featured image has been uploaded successfully.",
                                });
                              } catch (error) {
                                console.error('Error uploading image:', error);
                                toast({
                                  title: "Upload failed",
                                  description: "Failed to upload image. Please try again.",
                                  variant: "destructive",
                                });
                              } finally {
                                setUploadingImage(false);
                              }
                            } else {
                              toast({
                                title: "Invalid file",
                                description: "Please upload an image file.",
                                variant: "destructive",
                              });
                            }
                          }}
                          onClick={() => document.getElementById('featuredImageInput')?.click()}
                        >
                          <input
                            id="featuredImageInput"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setUploadingImage(true);
                                try {
                                  const imageUrl = await uploadImageToCloudinary(file);
                                  setFormData((prev) => ({ ...prev, featuredImage: imageUrl }));
                                  toast({
                                    title: "Image uploaded",
                                    description: "Featured image has been uploaded successfully.",
                                  });
                                } catch (error) {
                                  console.error('Error uploading image:', error);
                                  toast({
                                    title: "Upload failed",
                                    description: "Failed to upload image. Please try again.",
                                    variant: "destructive",
                                  });
                                } finally {
                                  setUploadingImage(false);
                                }
                              }
                            }}
                            disabled={saving || uploadingImage}
                          />
                          {uploadingImage ? (
                            <div className="flex flex-col items-center gap-3">
                              <Loader2 className="h-12 w-12 animate-spin text-primary" />
                              <p className="text-sm text-muted-foreground">Uploading image...</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-3">
                              <div className="rounded-full bg-primary/10 p-4">
                                <Upload className="h-8 w-8 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Drop your image here or click to browse</p>
                                <p className="text-xs text-muted-foreground mt-1">Recommended: 1200x630px</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative inline-block">
                          <img
                            src={formData.featuredImage}
                            alt="Featured image preview"
                            className="max-w-full rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => setFormData((prev) => ({ ...prev, featuredImage: "" }))}
                            disabled={saving}
                          >
                            <X className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Image displayed in blog cards
                    </p>
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <div className="border rounded-lg overflow-hidden bg-card h-[500px]">
                      <ReactQuill
                        theme="snow"
                        value={formData.content}
                        onChange={(content) =>
                          setFormData((prev) => ({ ...prev, content }))
                        }
                        modules={quillModules}
                        placeholder="Write your post content here..."
                        className="h-full"
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
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={cn(
          "sticky bottom-0 bg-background border-t p-4 -mx-4 mt-6",
          "md:static md:border-0 md:p-0 md:mx-0"
        )}>
          <div className="flex sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admin/posts")}
              disabled={saving}
              className="gap-2 flex-1 sm:flex-none"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="gap-2 flex-1 sm:flex-none"
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
                      Update Post
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Create Post
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Custom styles for Quill editor */}
        <style>{`
        .ql-container {
          font-size: 16px;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .ql-editor {
          height: 100%;
          overflow-y: auto;
        }
        .ql-editor ul,
        .ql-editor ol {
          padding-left: 1.5em;
        }
        .ql-editor ul {
          list-style-type: disc;
        }
        .ql-editor ol {
          list-style-type: decimal;
        }
        .ql-editor li {
          padding-left: 0.5em;
        }
        .ql-editor hr {
          border: none;
          border-top: 2px solid hsl(var(--border));
          margin: 1.5em 0;
        }
        button.ql-divider::after {
          content: '—';
          font-size: 18px;
          font-weight: bold;
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
