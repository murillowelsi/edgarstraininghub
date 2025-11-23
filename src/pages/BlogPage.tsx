import BlogCard from "@/components/BlogCard";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";

const BlogPage = () => {
  const { t, language } = useLanguage();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const q = query(collection(db, "articles"), orderBy("published_at", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedArticles = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setArticles(fetchedArticles);
      } catch (error: any) {
        console.error("Error fetching articles:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  return (
    <>
      <Helmet>
        <title>Blog - Edgar Zanin | Dicas de Treino e Performance Atlética</title>
        <meta 
          name="description" 
          content="Artigos sobre treino de força, mobilidade, prevenção de lesões, ciclismo e natação. Dicas práticas de um Ironman Finisher e Personal Trainer profissional." 
        />
        <meta name="keywords" content="treino força corredores, mobilidade triatletas, prevenção lesões, potência ciclismo, natação técnica, performance atlética" />
        <link rel="canonical" href={window.location.href} />
      </Helmet>

      <div className="min-h-screen">
        <Navbar />
        
        <main className="pt-24 pb-16">
          <section className="container mx-auto px-4 md:px-6">
            {/* Hero Section */}
            <div className="text-center mb-16 animate-fade-in">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-4">
                {t.blog.title}{" "}
                <span className="text-primary">{t.blog.titleHighlight}</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                {t.blog.subtitle}
              </p>
            </div>

            {/* Blog Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {loading ? (
                <div className="col-span-full text-center py-12">Loading articles...</div>
              ) : error ? (
                <div className="col-span-full text-center py-12 text-destructive">Error: {error}</div>
              ) : articles.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">No articles found.</div>
              ) : (
                articles.map((article, index) => (
                  <div 
                    key={article.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <BlogCard
                      title={language === 'pt' ? article.title_pt : article.title_en}
                      excerpt={language === 'pt' ? article.excerpt_pt : article.excerpt_en}
                      category={language === 'pt' ? (article.category_pt || "Treino") : (article.category_en || "Training")}
                      readTime={language === 'pt' ? (article.read_time_pt || "5 min") : (article.read_time_en || "5 min")}
                      image={article.image_url || "/lovable-uploads/bg-1.png"}
                      slug={article.slug}
                      author={article.author?.name}
                    />
                  </div>
                ))
              )}
            </div>

            {/* SEO Content Section */}
            <article className="mt-16 prose prose-lg max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-6">Por que Treino de Qualidade Importa?</h2>
              <p className="text-muted-foreground">
                Como Triatleta e Personal Trainer, compartilho conhecimento prático 
                baseado em anos de experiência no alto rendimento esportivo. Cada artigo é criado para 
                fornecer insights acionáveis que você pode aplicar imediatamente no seu treino.
              </p>
              <p className="text-muted-foreground mt-4">
                Seja você um corredor buscando melhorar performance, um triatleta em preparação para 
                sua próxima prova, ou alguém que quer treinar com mais segurança e eficiência, este 
                conteúdo foi desenvolvido pensando em você.
              </p>
            </article>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default BlogPage;