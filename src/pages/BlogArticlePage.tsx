import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPostBySlug } from "@/services/postsService";
import type { Post } from "@/types/post";
import { format } from "date-fns";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

// Calculate reading time based on word count
const calculateReadingTime = (content: string): number => {
  const text = content.replace(/<[^>]*>/g, ""); // Strip HTML tags
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = 200;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

const BlogArticlePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (slug) {
      loadPost(slug);
    }
  }, [slug]);

  useEffect(() => {
    // Scroll to top when post loads
    window.scrollTo(0, 0);
  }, [post]);

  const loadPost = async (postSlug: string) => {
    setLoading(true);
    setNotFound(false);

    try {
      const fetchedPost = await getPostBySlug(postSlug);
      if (!fetchedPost) {
        setNotFound(true);
      } else {
        setPost(fetchedPost);
      }
    } catch (error) {
      console.error("Error loading post:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-20">
          <article className="container mx-auto px-4 max-w-3xl">
            <Skeleton className="h-8 w-32 mb-8" />
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-12 w-3/4 mb-8" />
            <div className="flex gap-4 mb-8">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
            </div>
          </article>
        </main>
        <Footer />
      </div>
    );
  }

  // 404 state
  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-20 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
            <h2 className="text-2xl font-bold mb-4">Post Not Found</h2>
            <p className="text-muted-foreground mb-8 max-w-md">
              The article you're looking for doesn't exist or has been removed.
            </p>
            <Link to="/blog">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Blog
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const readingTime = post ? calculateReadingTime(post.content) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        {/* Hero Section with Featured Image */}
        {post?.featuredImage && (
          <div className="w-full h-[40vh] md:h-[50vh] relative mb-8 md:mb-12">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background z-10" />
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <article className={`container mx-auto px-4 max-w-3xl ${!post?.featuredImage ? 'pt-4' : '-mt-20 relative z-20'}`}>
          {/* Back link */}
          <Link
            to="/blog"
            className={`inline-flex items-center transition-colors mb-8 ${
              post?.featuredImage
                ? 'text-white/80 hover:text-white bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full'
                : 'text-muted-foreground hover:text-primary'
            }`}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Blog
          </Link>

          {/* Article Card */}
          <div className={`${post?.featuredImage ? 'bg-card rounded-2xl shadow-xl p-6 md:p-10' : ''}`}>
            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight text-foreground">
              {post?.title}
            </h1>

            {/* Excerpt */}
            {post?.excerpt && (
              <p className="text-lg md:text-xl text-muted-foreground mb-6 leading-relaxed">
                {post.excerpt}
              </p>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-muted-foreground mb-8 pb-8 border-b border-border">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <time dateTime={post?.createdAt.toISOString()}>
                  {post && format(post.createdAt, "MMMM d, yyyy")}
                </time>
              </div>
              {post?.authorName && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{post.authorName}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{readingTime} min read</span>
              </div>
            </div>

            {/* Content */}
            <div
              className="article-content"
              dangerouslySetInnerHTML={{ __html: post?.content || "" }}
            />
          </div>

          {/* CTA Section */}
          <div className="mt-16 mb-12 p-8 md:p-10 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 text-center">
            <h3 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Want to Take Your Training to the Next Level?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto text-lg">
              Get in touch for personalized coaching focused on your specific
              goals.
            </p>
            <Link to="/contact">
              <Button size="lg" className="btn-primary text-lg px-8">
                Schedule a Consultation
              </Button>
            </Link>
          </div>
        </article>
      </main>

      {/* Article Styles */}
      <style>{`
        .article-content {
          font-size: 1.125rem;
          line-height: 1.8;
          color: hsl(var(--muted-foreground));
        }

        .article-content > *:first-child {
          margin-top: 0;
        }

        .article-content h1,
        .article-content h2,
        .article-content h3,
        .article-content h4 {
          color: hsl(var(--foreground));
          font-weight: 700;
          line-height: 1.3;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
        }

        .article-content h1 {
          font-size: 2rem;
        }

        .article-content h2 {
          font-size: 1.625rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid hsl(var(--border));
        }

        .article-content h3 {
          font-size: 1.375rem;
        }

        .article-content h4 {
          font-size: 1.125rem;
        }

        .article-content p {
          margin-bottom: 1.5rem;
        }

        .article-content a {
          color: hsl(var(--primary));
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: opacity 0.2s;
        }

        .article-content a:hover {
          opacity: 0.8;
        }

        .article-content strong {
          color: hsl(var(--foreground));
          font-weight: 600;
        }

        .article-content em {
          font-style: italic;
        }

        .article-content ul,
        .article-content ol {
          margin: 1.5rem 0;
          padding-left: 1.5rem;
        }

        .article-content ul {
          list-style-type: disc;
        }

        .article-content ol {
          list-style-type: decimal;
        }

        .article-content li {
          margin-bottom: 0.5rem;
          padding-left: 0.5rem;
        }

        .article-content li::marker {
          color: hsl(var(--primary));
        }

        .article-content blockquote {
          margin: 2rem 0;
          padding: 1.5rem 1.5rem 1.5rem 2rem;
          border-left: 4px solid hsl(var(--primary));
          background: hsl(var(--muted) / 0.5);
          border-radius: 0 0.5rem 0.5rem 0;
          font-style: italic;
        }

        .article-content blockquote p:last-child {
          margin-bottom: 0;
        }

        .article-content code {
          background: hsl(var(--muted));
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.9em;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .article-content pre {
          background: hsl(var(--muted));
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          padding: 1.5rem;
          overflow-x: auto;
          margin: 2rem 0;
        }

        .article-content pre code {
          background: none;
          padding: 0;
          font-size: 0.875rem;
        }

        .article-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin: 2rem auto;
          display: block;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }

        .article-content hr {
          border: none;
          border-top: 2px solid hsl(var(--border));
          margin: 3rem 0;
        }

        .article-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 2rem 0;
        }

        .article-content th,
        .article-content td {
          border: 1px solid hsl(var(--border));
          padding: 0.75rem 1rem;
          text-align: left;
        }

        .article-content th {
          background: hsl(var(--muted));
          font-weight: 600;
          color: hsl(var(--foreground));
        }

        .article-content tr:nth-child(even) {
          background: hsl(var(--muted) / 0.3);
        }
      `}</style>

      <Footer />
    </div>
  );
};

export default BlogArticlePage;
