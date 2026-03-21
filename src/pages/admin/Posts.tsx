import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { useToast } from "@/hooks/use-toast";
import { deletePost, getAllPosts } from "@/services/postsService";
import type { Post } from "@/types/post";
import { format } from "date-fns";
import { Edit, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { AdminEmptyState } from "../../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../../components/admin/AdminPageHeader";
import { ResponsiveTable } from "../../components/admin/ResponsiveTable";
import { useLanguage } from "../../contexts/LanguageContext";

const AdminPosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmPost, setConfirmPost] = useState<Post | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

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
          action={{ label: t.admin.posts.newPost, icon: Plus, onClick: () => navigate("/admin/posts/new") }}
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
              action={{ label: t.admin.posts.newPost, onClick: () => navigate("/admin/posts/new") }}
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
    </AdminLayout>
  );
};

export default AdminPosts;
