import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BlogCard from "@/components/BlogCard";
import { Helmet } from "react-helmet";

const BlogPage = () => {
  const { t } = useLanguage();

  const blogArticles = [
    {
      id: "strengthForRunners",
      slug: "dicas-de-forca-para-corredores",
      data: t.blog.articles.strengthForRunners,
      image: "/lovable-uploads/bg-1.png"
    },
    {
      id: "triathletesMobility",
      slug: "mobilidade-para-triatletas",
      data: t.blog.articles.triathletesMobility,
      image: "/lovable-uploads/murillo.png"
    },
    {
      id: "injuryPrevention",
      slug: "como-evitar-lesoes",
      data: t.blog.articles.injuryPrevention,
      image: "/lovable-uploads/ba2184b9-65d7-4393-87da-9d1999bc5169.png"
    },
    {
      id: "cyclingPower",
      slug: "como-aumentar-potencia-no-pedal",
      data: t.blog.articles.cyclingPower,
      image: "/lovable-uploads/c2022b01-82d4-4894-b5f3-eba98aebfd4e.png"
    },
    {
      id: "swimmingProgress",
      slug: "como-evoluir-na-natacao",
      data: t.blog.articles.swimmingProgress,
      image: "/lovable-uploads/bg-1.png"
    }
  ];

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
              {blogArticles.map((article, index) => (
                <div 
                  key={article.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <BlogCard
                    title={article.data.title}
                    excerpt={article.data.excerpt}
                    category={article.data.category}
                    readTime={article.data.readTime}
                    image={article.image}
                    slug={article.slug}
                  />
                </div>
              ))}
            </div>

            {/* SEO Content Section */}
            <article className="mt-16 prose prose-lg max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-6">Por que Treino de Qualidade Importa?</h2>
              <p className="text-muted-foreground">
                Como Ironman Finisher e Personal Trainer certificado, compartilho conhecimento prático 
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