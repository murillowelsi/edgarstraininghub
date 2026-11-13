import { Play } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface YouTubeFacadeProps {
  videoId: string;
  title: string;
  /** From /api/youtube-latest when available; otherwise YouTube's static thumbnail. */
  thumbnail?: string;
  /** Playlist id: the player opens this playlist starting at `videoId` */
  list?: string;
}

/**
 * Click-to-load YouTube player: shows only the thumbnail (a static image, no
 * cookies) until the visitor presses play. Then it loads the player from
 * youtube-nocookie.com, which doesn't set tracking cookies before playback.
 */
const YouTubeFacade = ({ videoId, title, thumbnail, list }: YouTubeFacadeProps) => {
  const { t } = useLanguage();
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <iframe
        className="h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${list ? `list=${encodeURIComponent(list)}&` : ""}autoplay=1&rel=0`}
        title={title || t.youtube.playerTitle}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={t.youtube.play.replace("{{title}}", title || t.youtube.playerTitle)}
      className="group relative block h-full w-full overflow-hidden bg-black focus-visible:outline-none"
    >
      <img
        src={thumbnail || `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity duration-150 group-hover:opacity-100"
      />
      {title && (
        <span className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-4 text-left text-sm font-semibold text-white md:text-base">
          <span className="line-clamp-2">{title}</span>
        </span>
      )}
      <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-150 group-hover:scale-105 group-focus-visible:ring-4 group-focus-visible:ring-primary/50">
        <Play className="h-7 w-7 translate-x-0.5 fill-current" aria-hidden="true" />
      </span>
    </button>
  );
};

export default YouTubeFacade;
