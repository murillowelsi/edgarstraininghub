import { describe, expect, it, vi } from "vitest";
import { fetchLatestVideo, parseLatestVideo, UPSTREAM_ATTEMPTS } from "../../api/youtube-latest.js";

const FEED = `<?xml version="1.0"?><feed>
<entry><yt:videoId>abcdefghijk</yt:videoId><title>Treino &amp; prova</title>
<published>2026-11-10T10:00:00+00:00</published>
<media:thumbnail url="https://i1.ytimg.com/vi/abcdefghijk/hqdefault.jpg" width="480" height="360"/></entry>
</feed>`;

const ok = (body: string) => ({ ok: true, status: 200, text: async () => body });
const fail = (status: number) => ({ ok: false, status, text: async () => "" });

describe("youtube-latest", () => {
  it("parses the newest entry", () => {
    expect(parseLatestVideo(FEED)).toEqual({
      id: "abcdefghijk",
      title: "Treino & prova",
      publishedAt: "2026-11-10T10:00:00+00:00",
      thumbnail: "https://i1.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
    });
  });

  it("retries a flaky feed and returns the video", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn().mockResolvedValueOnce(fail(500)).mockResolvedValueOnce(ok(FEED));
    const p = fetchLatestVideo("UC", fetchImpl);
    await vi.runAllTimersAsync();
    await expect(p).resolves.toMatchObject({ id: "abcdefghijk" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("gives up after all attempts", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn().mockResolvedValue(fail(404));
    const p = fetchLatestVideo("UC", fetchImpl);
    const assertion = expect(p).rejects.toThrow("Upstream status 404");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchImpl).toHaveBeenCalledTimes(UPSTREAM_ATTEMPTS);
    vi.useRealTimers();
  });
});
