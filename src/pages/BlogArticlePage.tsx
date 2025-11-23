import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, Clock } from "lucide-react";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "react-router-dom";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

const BlogArticlePage = () => {
  const { slug } = useParams();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [article, setArticle] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;

      try {
        const q = query(collection(db, "articles"), where("slug", "==", slug));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          setArticle(docData);
        } else {
          // Fallback to hardcoded articles if not found in DB (optional, or just redirect)
          // For now, let's just redirect if not found in DB
          navigate("/blog");
        }
      } catch (error) {
        console.error("Error fetching article:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!article) {
    return null;
  }

  const currentLangContent = {
    title: language === "pt" ? article.title_pt : article.title_en,
    content: language === "pt" ? article.content_pt : article.content_en,
    image: article.image_url,
    category:
      language === "pt"
        ? article.category_pt || "Treino"
        : article.category_en || "Training",
    readTime:
      language === "pt"
        ? article.read_time_pt || "5 min"
        : article.read_time_en || "5 min",
  };

  return (
    <>
      <Helmet>
        <title>{currentLangContent.title} - Edgar Zanin</title>
        <meta
          name="description"
          content={currentLangContent.content.substring(0, 160)}
        />
        <link rel="canonical" href={window.location.href} />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-1 pt-24 pb-16">
          <article className="container mx-auto px-4 md:px-6 max-w-4xl">
            <Button
              variant="ghost"
              onClick={() => navigate("/blog")}
              className="mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.blog.backToBlog}
            </Button>

            {currentLangContent.image && (
              <img
                src={currentLangContent.image}
                alt={currentLangContent.title}
                className="w-full h-[400px] object-cover rounded-lg mb-8"
              />
            )}

            <div className="flex items-center gap-3 mb-6">
              <Badge variant="secondary" className="font-semibold text-base">
                {currentLangContent.category}
              </Badge>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{currentLangContent.readTime}</span>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              {currentLangContent.title}
            </h1>

            {article.author?.name && (
              <p className="text-lg text-muted-foreground mb-8">
                By {article.author.name}
              </p>
            )}

            <div
              className="prose prose-lg max-w-none prose-headings:font-display prose-headings:font-bold prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-strong:text-foreground"
              dangerouslySetInnerHTML={{ __html: currentLangContent.content }}
            />

            <div className="mt-16 p-8 bg-primary/5 rounded-lg border border-primary/10">
              <h3 className="text-2xl font-display font-bold mb-4">
                Quer Levar Seu Treino ao Próximo Nível?
              </h3>
              <p className="text-muted-foreground mb-6">
                Entre em contato para treino personalizado focado nos seus
                objetivos específicos.
              </p>
              <Button size="lg" onClick={() => navigate("/#contact")}>
                Agende uma Consulta
              </Button>
            </div>
          </article>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default BlogArticlePage;
