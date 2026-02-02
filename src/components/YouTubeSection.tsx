import { useLanguage } from "@/contexts/LanguageContext";
import { useLatestYouTubeVideo } from "@/hooks/useLatestYouTubeVideo";

const YouTubeSection = () => {
  const { t } = useLanguage();
  const { video, loading, error, retry } = useLatestYouTubeVideo();

  return (
    <section id="youtube" className="section bg-muted">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t.youtube.title}{" "}
            <span className="text-primary">{t.youtube.titleHighlight}</span>
          </h2>
          <div className="h-1 w-20 bg-secondary mx-auto mb-6"></div>
          <p className="max-w-2xl mx-auto text-muted-foreground">
            {t.youtube.subtitle}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="aspect-video w-full rounded-xl overflow-hidden shadow-lg">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <p className="text-muted-foreground">Loading latest video...</p>
              </div>
            ) : error ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted gap-2">
                <p className="text-red-500 font-semibold">Could not load the latest YouTube video.</p>
                <p className="text-xs text-muted-foreground">{error}</p>
                <button
                  onClick={retry}
                  className="mt-2 px-4 py-2 rounded bg-primary text-white hover:bg-primary/90 transition"
                >
                  Retry
                </button>
              </div>
            ) : video?.videoId ? (
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${video.videoId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              ></iframe>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <p className="text-red-500">No video found.</p>
              </div>
            )}
          </div>
          <p className="mt-6 text-center text-muted-foreground">
            Check out more videos on my{" "}
            <a
              href="https://www.youtube.com/@edgarzanin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              YouTube channel
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
};

export default YouTubeSection;
