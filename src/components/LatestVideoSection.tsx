import { Youtube } from "lucide-react";
import YouTubeFacade from "@/components/YouTubeFacade";
import { SectionHeading } from "@/components/SectionHeading";
import { SkeletonFrame } from "@/components/feedback/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLatestYouTubeVideo } from "@/hooks/useLatestYouTubeVideo";

const CHANNEL_URL = "https://www.youtube.com/@edgarzanin";

/**
 * Home: preview of the latest video on the coach's channel (thumbnail only;
 * the player loads on tap, via youtube-nocookie). Falls back to the channel link.
 */
const LatestVideoSection = () => {
  const { t } = useLanguage();
  const { video, loading } = useLatestYouTubeVideo();

  const channelLine = (
    <p className="mt-4 flex items-center justify-center gap-2 text-center text-muted-foreground">
      <Youtube className="h-5 w-5 shrink-0 text-destructive-ink" aria-hidden />
      <span>
        {t.youtube.moreVideos}{" "}
        <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-ink hover:underline">
          {t.youtube.channel}
        </a>
        .
      </span>
    </p>
  );

  // No video to show (feed down or empty channel): keep just the channel link
  if (!loading && !video?.videoId) {
    return <section className="container mx-auto px-4 pb-12">{channelLine}</section>;
  }

  return (
    <section className="container mx-auto px-4 py-12 md:py-16" aria-labelledby="latest-video-title">
      <SectionHeading id="latest-video-title" title={t.youtube.title} highlight={t.youtube.titleHighlight} subtitle={t.youtube.subtitle} />
      <div className="mx-auto max-w-3xl">
        <div className="aspect-video w-full overflow-hidden rounded-2xl border bg-card shadow-sm">
          {loading || !video?.videoId ? (
            <SkeletonFrame className="h-full w-full" label={t.youtube.loading}>
              <Skeleton className="aspect-video w-full rounded-none" />
            </SkeletonFrame>
          ) : (
            <YouTubeFacade videoId={video.videoId} title={video.title} thumbnail={video.thumbnail} />
          )}
        </div>
        {channelLine}
      </div>
    </section>
  );
};

export default LatestVideoSection;
