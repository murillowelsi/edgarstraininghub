/**
 * Vercel Serverless Function: GET /api/youtube-latest
 *
 * Fetches the public YouTube RSS feed of the coach's channel server-side (no CORS
 * proxy) and returns a small JSON payload for the public site:
 *   { video: { id, title, publishedAt, thumbnail } }
 *
 * - No API keys or secrets: the RSS feed is public.
 * - Only allow-listed channel IDs are fetched, so this is not an open proxy.
 * - Responses are cached on the Vercel CDN (s-maxage + stale-while-revalidate),
 *   so YouTube is hit at most a few times per hour.
 *
 * Optional query: ?channel_id=<id> (must be in ALLOWED_CHANNEL_IDS).
 */

export const DEFAULT_CHANNEL_ID = 'UCfraTOODwkSAJSWz1R47g_g';
const ALLOWED_CHANNEL_IDS = new Set([DEFAULT_CHANNEL_ID]);

const FEED_URL = 'https://www.youtube.com/feeds/videos.xml?channel_id=';
const UPSTREAM_TIMEOUT_MS = 5000;

// CDN: fresh for 15 min, then serve stale for up to 1 day while revalidating.
const CACHE_OK = 'public, max-age=0, s-maxage=900, stale-while-revalidate=86400';
// Short CDN cache on upstream failure so a YouTube hiccup does not hammer the feed.
const CACHE_ERROR = 'public, max-age=0, s-maxage=60';

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

const decodeXml = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();

const firstTag = (xml, tag) => {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  return m ? decodeXml(m[1]) : '';
};

/** Parse the latest entry of a YouTube Atom feed. Returns null when none is usable. */
export function parseLatestVideo(xml) {
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/);
  if (!entry) return null;
  const body = entry[1];

  const id = firstTag(body, 'yt:videoId');
  if (!VIDEO_ID_RE.test(id)) return null;

  const thumbMatch = body.match(/<media:thumbnail[^>]*\surl="([^"]+)"/);
  const thumbnail =
    thumbMatch && /^https:\/\/i\d?\.ytimg\.com\//.test(thumbMatch[1])
      ? thumbMatch[1]
      : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return {
    id,
    title: firstTag(body, 'title'),
    publishedAt: firstTag(body, 'published'),
    thumbnail,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const channelId = (req.query && req.query.channel_id) || DEFAULT_CHANNEL_ID;
  if (typeof channelId !== 'string' || !ALLOWED_CHANNEL_IDS.has(channelId)) {
    return res.status(400).json({ error: 'Channel not allowed' });
  }

  try {
    const upstream = await fetch(FEED_URL + encodeURIComponent(channelId), {
      headers: { Accept: 'application/atom+xml, application/xml;q=0.9' },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!upstream.ok) throw new Error(`Upstream status ${upstream.status}`);

    const video = parseLatestVideo(await upstream.text());
    if (!video) throw new Error('No usable entry in feed');

    res.setHeader('Cache-Control', CACHE_OK);
    return res.status(200).json({ video });
  } catch (err) {
    console.error('youtube-latest error:', err);
    res.setHeader('Cache-Control', CACHE_ERROR);
    return res.status(502).json({ error: 'Feed unavailable' });
  }
}
