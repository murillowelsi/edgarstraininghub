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
                <p className="text-muted-foreground">{t.youtube.loading}</p>
              </div>
            ) : error ? (
              // Friendly fallback; the technical error stays in the console, not on the page
              <div className="w-full h-full flex flex-col items-center justify-center bg-background/60 gap-3 p-6 text-center">
                <p className="font-semibold">{t.youtube.unavailable}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <a
                    href="https://www.youtube.com/@edgarzanin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 px-4 inline-flex items-center rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition"
                  >
                    {t.youtube.watchOnYouTube}
                  </a>
                  <button
                    onClick={retry}
                    className="h-10 px-4 rounded-md border border-border font-medium hover:bg-accent transition"
                  >
                    {t.youtube.retry}
                  </button>
                </div>
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
                <p className="text-muted-foreground">{t.youtube.noVideo}</p>
              </div>
            )}
          </div>
          <p className="mt-6 text-center text-muted-foreground">
            {t.youtube.moreVideos}{" "}
            <a
              href="https://www.youtube.com/@edgarzanin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {t.youtube.channel}
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
};

export default YouTubeSection;
