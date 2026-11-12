import { useCallback, useEffect, useRef, useState } from 'react';

export interface YouTubeVideo {
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
// Last good answer, so the preview shows at once and survives a YouTube hiccup.
export const VIDEO_CACHE_KEY = 'ez-latest-video-v1';
const RETRY_DELAY_MS = 1500;

export const readCachedVideo = (): YouTubeVideo | null => {
  try {
    const raw = localStorage.getItem(VIDEO_CACHE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as YouTubeVideo;
    return v && typeof v.videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(v.videoId) ? v : null;
  } catch {
    return null;
  }
};

const writeCachedVideo = (v: YouTubeVideo) => {
  try {
    localStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify(v));
  } catch {
    // storage full or blocked: the preview still works without the cache
  }
};

async function requestLatest(): Promise<YouTubeVideo> {
  const response = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
  // In plain `vite` dev there is no /api: the SPA fallback returns HTML.
  const isJson = response.headers.get('content-type')?.includes('application/json');
  if (!response.ok || !isJson) throw new Error(`Failed to fetch latest video (${response.status})`);
  const data = (await response.json()) as LatestVideoResponse;
  if (!data.video?.id) throw new Error('No video in response');
  return {
    videoId: data.video.id,
    title: data.video.title,
    publishedAt: data.video.publishedAt,
    thumbnail: data.video.thumbnail,
  };
}

export const useLatestYouTubeVideo = () => {
  const cached = useRef(readCachedVideo());
  const [video, setVideo] = useState<YouTubeVideo | null>(cached.current);
  // With a cached video there is nothing to wait for: refresh quietly
  const [loading, setLoading] = useState(!cached.current);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestVideo = useCallback(async () => {
    setError(null);
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      try {
        const latest = await requestLatest();
        setVideo(latest);
        writeCachedVideo(latest);
        setLoading(false);
        return;
      } catch (err) {
        if (attempt === 1) {
          console.error('useLatestYouTubeVideo:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      }
    }
    // Keep showing the cached video, if any; the UI falls back to the channel link otherwise
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLatestVideo();
  }, [fetchLatestVideo]);

  return { video, loading, error, retry: fetchLatestVideo };
};
