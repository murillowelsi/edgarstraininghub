import { useEffect, useState } from 'react';

interface YouTubeVideo {
  videoId: string;
  title: string;
  publishedAt: string;
}

const CHANNEL_ID = 'UCfraTOODwkSAJSWz1R47g_g'; // Edgar Zanin's channel ID

export const useLatestYouTubeVideo = () => {
  const [video, setVideo] = useState<YouTubeVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestVideo = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use a CORS proxy to fetch the RSS feed
      const response = await fetch(
        `https://api.allorigins.win/raw?url=${encodeURIComponent(
          `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`
        )}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch YouTube feed');
      }

      const xmlText = await response.text();

      // Parse XML to get the latest video
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      // Get the first entry (latest video)
      const entry = xmlDoc.querySelector('entry');

      if (entry) {
        // YouTube RSS uses yt:videoId tag
        const videoIdElement = entry.querySelector('videoId') ||
          entry.getElementsByTagNameNS('http://www.youtube.com/xml/schemas/2015', 'videoId')[0];
        const videoId = videoIdElement?.textContent || '';

        const title = entry.querySelector('title')?.textContent || '';
        const publishedAt = entry.querySelector('published')?.textContent || '';

        if (videoId) {
          setVideo({ videoId, title, publishedAt });
        } else {
          throw new Error('Could not extract video ID from feed');
        }
      } else {
        throw new Error('No entries found in feed');
      }
    } catch (err) {
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
