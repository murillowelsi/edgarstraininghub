import { Button } from "@/components/ui/button";
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
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { auth, db } from "../../lib/firebase";

interface Article {
  id: string;
  title_pt: string;
  title_en: string;
  published_at: any;
  author?: {
    uid: string;
    name: string;
  };
}

const Dashboard = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isEditor, isAuthor } = useUserRole();

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "articles"));
      const fetchedArticles = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Article[];

      // Filter articles based on role
      let filteredArticles = fetchedArticles;
      if (isAuthor && user) {
        // Authors only see their own articles
        filteredArticles = fetchedArticles.filter(
          (article) => article.author?.uid === user.uid
        );
      }
      // Editors and Admins see all articles

      setArticles(filteredArticles);
    } catch (error) {
      console.error("Error fetching articles:", error);
      toast.error("Failed to load articles");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this article?"))
      return;

    try {
      await deleteDoc(doc(db, "articles", id));
      toast.success("Article deleted");
      fetchArticles();
    } catch (error) {
      toast.error("Failed to delete article");
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/admin/login");
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Blog Dashboard</h1>
        <div className="flex gap-4">
          <Link to="/admin/editor">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Article
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title (PT)</TableHead>
              <TableHead>Title (EN)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  No articles found.
                </TableCell>
              </TableRow>
            ) : (
              articles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell className="font-medium">
                    {article.title_pt}
                  </TableCell>
                  <TableCell>{article.title_en}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link to={`/admin/editor/${article.id}`}>
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      {(isEditor || isAdmin) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(article.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
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

export default Dashboard;
