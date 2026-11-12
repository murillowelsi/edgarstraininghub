import { useEffect, useState } from 'react';

interface YouTubeVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnail?: string;
}

interface LatestVideoResponse {
  video?: { id: string; title: string; publishedAt: string; thumbnail?: string };
}

// Served by api/youtube-latest.js (Vercel function, CDN-cached). The function
// only accepts the coach's channel; the channel ID lives there.
const ENDPOINT = '/api/youtube-latest';

export const useLatestYouTubeVideo = () => {
  const [video, setVideo] = useState<YouTubeVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestVideo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });

      // In plain `vite` dev there is no /api: the SPA fallback returns HTML.
      const isJson = response.headers.get('content-type')?.includes('application/json');
      if (!response.ok || !isJson) {
        throw new Error(`Failed to fetch latest video (${response.status})`);
      }

      const data = (await response.json()) as LatestVideoResponse;
      if (!data.video?.id) {
        throw new Error('No video in response');
      }

      setVideo({
        videoId: data.video.id,
        title: data.video.title,
        publishedAt: data.video.publishedAt,
        thumbnail: data.video.thumbnail,
      });
    } catch (err) {
      // The UI shows a friendly fallback (link to the channel + retry)
      console.error('useLatestYouTubeVideo:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestVideo();
    // eslint-disable-next-line
  }, []);

  return { video, loading, error, retry: fetchLatestVideo };
};
