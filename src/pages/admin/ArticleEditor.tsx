import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { auth, db } from "../../lib/firebase";

const ArticleEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [authorName, setAuthorName] = useState("");

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike", "blockquote"],
      [
        { list: "ordered" },
        { list: "bullet" },
        { indent: "-1" },
        { indent: "+1" },
      ],
      ["link", "clean"],
    ],
  };

  const [formData, setFormData] = useState({
    slug: "",
    image_url: "",
    title_pt: "",
    excerpt_pt: "",
    content_pt: "",
    category_pt: "",
    read_time_pt: "",
    title_en: "",
    excerpt_en: "",
    content_en: "",
    category_en: "",
    read_time_en: "",
  });

  useEffect(() => {
    if (id) {
      fetchArticle(id);
    }
    fetchAuthorProfile();
  }, [id]);

  const fetchAuthorProfile = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setAuthorName(userDoc.data().name || user.email || "Unknown");
        } else {
          setAuthorName(user.email || "Unknown");
        }
      }
    } catch (error) {
      console.error("Error fetching author profile:", error);
    }
  };

  const fetchArticle = async (articleId: string) => {
    try {
      const docRef = doc(db, "articles", articleId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        // Remove "min" from read time fields for editing
        const processedData = {
          ...data,
          read_time_pt:
            data.read_time_pt?.replace(/\s*min\s*$/i, "").trim() || "",
          read_time_en:
            data.read_time_en?.replace(/\s*min\s*$/i, "").trim() || "",
        };
        setFormData(processedData);
      }
    } catch (error) {
      toast.error("Failed to load article");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleReadTimeChange = (
    field: "read_time_pt" | "read_time_en",
    value: string
  ) => {
    // Only allow numbers and empty string
    const numericValue = value.replace(/[^0-9]/g, "");
    setFormData((prev) => ({ ...prev, [field]: numericValue }));
  };

  const handleContentChange = (
    field: "content_pt" | "content_en",
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("You must be logged in to save articles");
        return;
      }

      const articleData = {
        ...formData,
        read_time_pt:
          formData.read_time_pt && formData.read_time_pt.trim()
            ? `${formData.read_time_pt.trim()} min`
            : "",
        read_time_en:
          formData.read_time_en && formData.read_time_en.trim()
            ? `${formData.read_time_en.trim()} min`
            : "",
        author: {
          uid: user.uid,
          name: authorName,
        },
        updated_at: serverTimestamp(),
      };

      if (id) {
        console.log("Updating article...", id);
        await setDoc(doc(db, "articles", id), articleData, { merge: true });
        toast.success("Article updated");
      } else {
        console.log("Creating new article...");
        await addDoc(collection(db, "articles"), {
          ...articleData,
          published_at: serverTimestamp(),
        });
        toast.success("Article created");
      }
      navigate("/admin/dashboard");
    } catch (error: any) {
      console.error("Error saving article:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <div className="container mx-auto py-10 px-4 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/dashboard")}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>

          <h1 className="text-3xl font-bold mb-8">
            {id ? "Edit Article" : "New Article"}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug (URL)</Label>
                    <Input
                      name="slug"
                      value={formData.slug}
                      onChange={handleChange}
                      placeholder="my-article-url"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image_url">Image URL</Label>
                    <Input
                      name="image_url"
                      value={formData.image_url}
                      onChange={handleChange}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6">
              {/* Portuguese Content */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <h3 className="font-bold text-lg">Portuguese (PT)</h3>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      name="title_pt"
                      value={formData.title_pt}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Short Description</Label>
                    <Textarea
                      name="excerpt_pt"
                      value={formData.excerpt_pt}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category (Badge)</Label>
                      <Input
                        name="category_pt"
                        value={formData.category_pt}
                        onChange={handleChange}
                        placeholder="e.g. Treino"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Read Time</Label>
                      <Input
                        name="read_time_pt"
                        value={formData.read_time_pt}
                        onChange={(e) =>
                          handleReadTimeChange("read_time_pt", e.target.value)
                        }
                        placeholder="e.g. 5"
                        type="number"
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <ReactQuill
                      theme="snow"
                      value={formData.content_pt}
                      onChange={(value) =>
                        handleContentChange("content_pt", value)
                      }
                      modules={modules}
                      className="mb-12 min-h-[200px]"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* English Content */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <h3 className="font-bold text-lg">English (EN)</h3>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      name="title_en"
                      value={formData.title_en}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Short Description</Label>
                    <Textarea
                      name="excerpt_en"
                      value={formData.excerpt_en}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category (Badge)</Label>
                      <Input
                        name="category_en"
                        value={formData.category_en}
                        onChange={handleChange}
                        placeholder="e.g. Training"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Read Time</Label>
                      <Input
                        name="read_time_en"
                        value={formData.read_time_en}
                        onChange={(e) =>
                          handleReadTimeChange("read_time_en", e.target.value)
                        }
                        placeholder="e.g. 5"
                        type="number"
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <ReactQuill
                      theme="snow"
                      value={formData.content_en}
                      onChange={(value) =>
                        handleContentChange("content_en", value)
                      }
                      modules={modules}
                      className="mb-12 min-h-[200px]"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? "Saving..." : "Save Article"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ArticleEditor;
