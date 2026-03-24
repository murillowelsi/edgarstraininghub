import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { createPost, deletePost, generateSlug, getAllPosts } from "@/services/postsService";
import type { Post, PostFormData } from "@/types/post";
import { format } from "date-fns";
import { Edit, FileText, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { AdminEmptyState } from "../../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../../components/admin/AdminPageHeader";
import { ResponsiveTable } from "../../components/admin/ResponsiveTable";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

const emptyForm = (): PostFormData => ({
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  featuredImage: "",
  published: false,
});

const AdminPosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmPost, setConfirmPost] = useState<Post | null>(null);
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newPostForm, setNewPostForm] = useState<PostFormData>(emptyForm());
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();

  const quillModules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["blockquote", "code-block"],
      ["link"],
      ["clean"],
    ],
  }), []);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const allPosts = await getAllPosts();
      setPosts(allPosts);
    } catch (error) {
      console.error("Error loading posts:", error);
      toast({
        title: t.common.error,
        description: t.admin.posts.toast.loadError,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setNewPostForm((prev) => ({
      ...prev,
      title,
      slug: prev.slug === generateSlug(prev.title) || !prev.slug
        ? generateSlug(title)
        : prev.slug,
    }));
  };

  const handleFeaturedImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: t.common.error, description: t.admin.postForm.toast.invalidFile, variant: "destructive" });
      return;
    }
    setUploadingImage(true);
    try {
      const imageUrl = await uploadImageToCloudinary(file);
      setNewPostForm((prev) => ({ ...prev, featuredImage: imageUrl }));
      toast({ title: t.admin.postForm.toast.imageUploaded, description: t.admin.postForm.toast.imageUploadedDescription });
    } catch {
      toast({ title: t.admin.postForm.toast.uploadFailed, description: t.admin.postForm.toast.uploadFailedDescription, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostForm.title.trim()) {
      toast({ title: t.common.error, description: t.admin.postForm.toast.titleRequired, variant: "destructive" });
      return;
    }
    if (!newPostForm.content.trim()) {
      toast({ title: t.common.error, description: t.admin.postForm.toast.contentRequired, variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await createPost(newPostForm, user?.uid || "", user?.displayName || user?.email || "Admin");
      toast({
        title: "Post created",
        description: newPostForm.published ? t.admin.postForm.toast.createdPublished : t.admin.postForm.toast.createdDraft,
      });
      setIsNewPostOpen(false);
      setNewPostForm(emptyForm());
      loadPosts();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t.common.error;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deletePost(id);
      setPosts(posts.filter((p) => p.id !== id));
      toast({
        title: t.admin.posts.toast.deleted,
        description: t.admin.posts.toast.deletedDescription,
      });
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: t.common.error,
        description: t.admin.posts.toast.deleteError,
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
          title={t.admin.posts.title}
          action={{ label: t.admin.posts.newPost, icon: Plus, onClick: () => setIsNewPostOpen(true) }}
        />

        <ResponsiveTable
          loading={loading}
          rowKey="_id"
          columns={[
            { key: "title", label: t.admin.posts.columns.title },
            { key: "status", label: t.admin.posts.columns.status },
            { key: "created", label: t.admin.posts.columns.created },
          ]}
          rows={posts.map((post) => ({
            _id: post.id,
            title: (
              <div>
                <p className="font-medium">{post.title}</p>
                <p className="text-sm text-muted-foreground break-all">/blog/{post.slug}</p>
              </div>
            ),
            status: post.published ? (
              <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">{t.admin.posts.published}</Badge>
            ) : (
              <Badge variant="secondary">{t.admin.posts.draft}</Badge>
            ),
            created: format(post.createdAt, "MMM d, yyyy"),
            _post: post,
          }))}
          actions={(row) => {
            const post = row._post as Post;
            return (
              <>
                <Link to={`/admin/posts/${post.id}/edit`}>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmPost(post)}
                >
                  {deleting === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </>
            );
          }}
          emptyState={
            <AdminEmptyState
              icon={FileText}
              title={t.admin.posts.empty.title}
              description={t.admin.posts.empty.description}
              action={{ label: t.admin.posts.newPost, onClick: () => setIsNewPostOpen(true) }}
            />
          }
        />
      </div>

      <ResponsiveConfirm
        open={confirmPost !== null}
        onOpenChange={(open) => { if (!open) setConfirmPost(null); }}
        title={t.admin.posts.delete.title}
        description={<>{t.admin.posts.delete.description.replace("{{name}}", confirmPost?.title || "")}</>}
        confirmLabel={t.common.delete}
        destructive
        loading={deleting !== null}
        onConfirm={() => { if (confirmPost) handleDelete(confirmPost.id); setConfirmPost(null); }}
      />

      <ResponsiveModal
        open={isNewPostOpen}
        onOpenChange={(open) => {
          setIsNewPostOpen(open);
          if (!open) setNewPostForm(emptyForm());
        }}
        title={t.admin.postForm.createTitle}
        className="max-w-3xl"
      >
        <form onSubmit={handleCreatePost} className="space-y-4 p-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="new-title">{t.admin.postForm.titleLabel}</Label>
            <Input
              id="new-title"
              placeholder={t.admin.postForm.titlePlaceholder}
              value={newPostForm.title}
              onChange={handleTitleChange}
              autoFocus
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="new-slug">Slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm shrink-0">/blog/</span>
              <Input
                id="new-slug"
                placeholder="post-url-slug"
                value={newPostForm.slug}
                onChange={(e) => setNewPostForm((prev) => ({ ...prev, slug: e.target.value }))}
              />
            </div>
          </div>

          {/* Excerpt */}
          <div className="space-y-1.5">
            <Label htmlFor="new-excerpt">{t.admin.postForm.excerptLabel}</Label>
            <Textarea
              id="new-excerpt"
              placeholder={t.admin.postForm.excerptPlaceholder}
              value={newPostForm.excerpt}
              onChange={(e) => setNewPostForm((prev) => ({ ...prev, excerpt: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Featured Image */}
          <div className="space-y-1.5">
            <Label>{t.admin.postForm.featuredImage}</Label>
            {newPostForm.featuredImage ? (
              <div className="relative">
                <img src={newPostForm.featuredImage} alt="Featured" className="w-full rounded-lg border max-h-40 object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => setNewPostForm((prev) => ({ ...prev, featuredImage: "" }))}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => document.getElementById("new-featuredImageInput")?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "bg-primary/5"); }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-primary", "bg-primary/5"); }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFeaturedImageUpload(file);
                }}
              >
                <input
                  id="new-featuredImageInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFeaturedImageUpload(f); }}
                />
                {uploadingImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Drop or click to upload</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label>Content *</Label>
            <div className="border rounded-lg overflow-hidden bg-card" style={{ height: 280 }}>
              <ReactQuill
                theme="snow"
                value={newPostForm.content}
                onChange={(content) => setNewPostForm((prev) => ({ ...prev, content }))}
                modules={quillModules}
                placeholder="Write your post content here..."
                className="h-full"
              />
            </div>
          </div>

          {/* Published */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="new-published"
              checked={newPostForm.published}
              onCheckedChange={(checked) => setNewPostForm((prev) => ({ ...prev, published: checked === true }))}
            />
            <Label htmlFor="new-published" className="cursor-pointer">{t.admin.postForm.publishLabel}</Label>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={creating || !newPostForm.title.trim() || !newPostForm.content.trim()}
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {newPostForm.published ? t.admin.postForm.savePublish : t.admin.postForm.saveDraft}
          </Button>
        </form>
      </ResponsiveModal>
    </AdminLayout>
  );
};

export default AdminPosts;
