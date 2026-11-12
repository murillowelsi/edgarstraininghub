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
import type QuillInstance from "quill";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { useAuth } from "../../contexts/AuthContext";
import { FormSkeleton } from "@/components/feedback/skeletons";
import { useLanguage } from "../../contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";

// Custom horizontal rule blot
const BlockEmbed = Quill.import('blots/block/embed');
class DividerBlot extends BlockEmbed {
  static blotName = 'divider';
  static tagName = 'hr';
}
Quill.register(DividerBlot);

// Quill calls toolbar handlers with the toolbar module as `this`
type QuillToolbar = { quill: QuillInstance };

const AdminPostForm = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { user, displayName } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

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
        image: function(this: QuillToolbar) {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.click();

          input.onchange = async () => {
            const file = input.files?.[0];
            if (file) {
              const quill = this.quill;
              const range = quill.getSelection();

              // Show loading state
              quill.enable(false);

              try {
                const imageUrl = await uploadImageToCloudinary(file);
                quill.insertEmbed(range.index, 'image', imageUrl);
                quill.setSelection(range.index + 1, 0);

                toast({
                  title: t.admin.postForm.toast.imageUploaded,
                  description: t.admin.postForm.toast.imageUploadedDescription,
                });
              } catch (error) {
                console.error('Error uploading image:', error);
                toast({
                  title: t.admin.postForm.toast.uploadFailed,
                  description: t.admin.postForm.toast.uploadFailedDescription,
                  variant: "destructive",
                });
              } finally {
                quill.enable(true);
              }
            }
          };
        },
        divider: function(this: QuillToolbar) {
          const quill = this.quill;
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
          title: t.admin.postForm.toast.notFound,
          description: t.admin.postForm.toast.notFoundDescription,
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
        title: t.common.error,
        description: t.admin.postForm.toast.loadError,
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
        title: t.admin.postForm.toast.validationError,
        description: t.admin.postForm.toast.titleRequired,
        variant: "destructive",
      });
      return;
    }

    if (!formData.content.trim()) {
      toast({
        title: t.admin.postForm.toast.validationError,
        description: t.admin.postForm.toast.contentRequired,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      if (isEditing && id) {
        await updatePost(id, formData);
        toast({
          title: t.admin.postForm.toast.updated,
          description: t.admin.postForm.toast.updatedDescription,
        });
      } else {
        await createPost(
          formData,
          user?.uid || "",
          // Public byline: the profile name, never the e-mail
          [displayName, user?.displayName].find((n) => n && !n.includes("@")) || t.about.name
        );
        toast({
          title: t.admin.postForm.toast.created,
          description: formData.published
            ? t.admin.postForm.toast.createdPublished
            : t.admin.postForm.toast.createdDraft,
        });
      }
      navigate("/admin/posts");
    } catch (error: unknown) {
      console.error("Error saving post:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save post.";
      toast({
        title: t.common.error,
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
        <FormSkeleton className="p-4 md:p-8 max-w-3xl" />
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
                <CardTitle>{isEditing ? t.admin.postForm.editTitle : t.admin.postForm.createTitle}</CardTitle>
                <CardDescription>
                  {isEditing ? t.admin.postForm.editDescription : t.admin.postForm.createDescription}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">{t.admin.postForm.titleLabel}</Label>
                    <Input
                      id="title"
                      placeholder={t.admin.postForm.titlePlaceholder}
                      value={formData.title}
                      onChange={handleTitleChange}
                      className="text-lg"
                      disabled={saving}
                    />
                  </div>

                  {/* Slug */}
                  <div className="space-y-2">
                    <Label htmlFor="slug">{t.admin.postForm.slugLabel}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">/blog/</span>
                      <Input
                        id="slug"
                        placeholder={t.admin.postForm.slugPlaceholder}
                        value={formData.slug}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, slug: e.target.value }))
                        }
                        disabled={saving}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t.admin.postForm.slugHint}
                    </p>
                  </div>

                  {/* Excerpt */}
                  <div className="space-y-2">
                    <Label htmlFor="excerpt">{t.admin.postForm.excerptLabel}</Label>
                    <Textarea
                      id="excerpt"
                      placeholder={t.admin.postForm.excerptPlaceholder}
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
                    <Label>{t.admin.postForm.featuredImage}</Label>
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
                                  title: t.admin.postForm.toast.imageUploaded,
                                  description: t.admin.postForm.toast.imageUploadedDescription,
                                });
                              } catch (error) {
                                console.error('Error uploading image:', error);
                                toast({
                                  title: t.admin.postForm.toast.uploadFailed,
                                  description: t.admin.postForm.toast.uploadFailedDescription,
                                  variant: "destructive",
                                });
                              } finally {
                                setUploadingImage(false);
                              }
                            } else {
                              toast({
                                title: t.admin.postForm.toast.invalidFileTitle,
                                description: t.admin.postForm.toast.invalidFile,
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
                                    title: t.admin.postForm.toast.imageUploaded,
                                    description: t.admin.postForm.toast.imageUploadedDescription,
                                  });
                                } catch (error) {
                                  console.error('Error uploading image:', error);
                                  toast({
                                    title: t.admin.postForm.toast.uploadFailed,
                                    description: t.admin.postForm.toast.uploadFailedDescription,
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
                            // Uploading: skeleton where the featured image will appear
                            <div role="status" className="flex w-full flex-col items-center gap-3">
                              <Skeleton className="aspect-[1200/630] w-full max-w-md rounded-lg" />
                              <p className="text-sm text-muted-foreground">{t.admin.postForm.uploadingImage}</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-3">
                              <div className="rounded-full bg-primary/10 p-4">
                                <Upload className="h-8 w-8 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{t.admin.postForm.dropImage}</p>
                                <p className="text-xs text-muted-foreground mt-1">{t.admin.postForm.recommendedSize}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative inline-block">
                          <img
                            src={formData.featuredImage}
                            alt={t.admin.postForm.imagePreviewAlt}
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
                            {t.common.remove}
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t.admin.postForm.imageHint}
                    </p>
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <Label>{t.admin.postForm.contentLabel}</Label>
                    <div className="border rounded-lg overflow-hidden bg-card h-[500px]">
                      <ReactQuill
                        theme="snow"
                        value={formData.content}
                        onChange={(content) =>
                          setFormData((prev) => ({ ...prev, content }))
                        }
                        modules={quillModules}
                        placeholder={t.admin.postForm.contentPlaceholder}
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
                      {t.admin.postForm.publishLabel}
                    </Label>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={cn(
          "fixed bottom-16 left-0 right-0 z-20 bg-background border-t p-4",
          "md:static md:bottom-auto md:border-0 md:p-0"
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
              {t.common.cancel}
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
                  {t.common.saving}
                </>
              ) : (
                <>
                  {formData.published ? (
                    <>
                      <Check className="h-4 w-4" />
                      {t.admin.postForm.savePublish}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {t.admin.postForm.saveDraft}
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
