import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Loader2 } from "lucide-react";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { TimelinePostCard } from "./TimelinePostCard";
import { getTimelinePosts, subscribeToMentionCount, subscribeToTimelinePosts } from "@/services/timelineService";
import { useAuth } from "@/contexts/AuthContext";
import type { TimelinePost } from "@/types/timeline";
import { Timestamp } from "firebase/firestore";
import { useTimelineActions } from "@/contexts/TimelineActionsContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";

const PULL_THRESHOLD = 72;

export function TimelineFeed() {
  const { user, photoURL } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const location = useLocation();
  const scrollToPostId = (location.state as { scrollToPostId?: string })?.scrollToPostId;
  const [realtimePosts, setRealtimePosts] = useState<TimelinePost[]>([]);
  const [extraPosts, setExtraPosts] = useState<TimelinePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastTimestamp, setLastTimestamp] = useState<Timestamp | undefined>();
  const { createOpen, setCreateOpen, activityOpen, setActivityOpen, setActivityUnreadCount } = useTimelineActions();
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const pullYRef = useRef(0);
  const refreshingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !lastTimestamp) return;
    setLoadingMore(true);
    try {
      const result = await getTimelinePosts(lastTimestamp);
      setExtraPosts((prev) => [...prev, ...result.posts]);
      setHasMore(result.hasMore);
      setLastTimestamp(result.lastTimestamp);
    } catch {
      toast({ title: t.common.error, description: t.timeline.post.loadMoreError, variant: "destructive" });
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, lastTimestamp]);

  // Real-time subscription for the first page
  useEffect(() => {
    const unsubscribe = subscribeToTimelinePosts(({ posts, hasMore: more, lastTimestamp: lastTs }) => {
      setRealtimePosts(posts);
      setHasMore(more);
      setLastTimestamp(lastTs);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    return subscribeToMentionCount(user.uid, setActivityUnreadCount);
  }, [user, setActivityUnreadCount]);

  // Pull-to-refresh via document-level touch events
  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      if ((e.currentTarget as HTMLElement).scrollTop > 0) return;
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!isPulling.current || refreshingRef.current) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0) {
        e.preventDefault();
        const newY = Math.min(delta * 0.45, PULL_THRESHOLD + 20);
        pullYRef.current = newY;
        setPullY(newY);
      } else {
        isPulling.current = false;
        pullYRef.current = 0;
        setPullY(0);
      }
    };

    const onEnd = () => {
      if (!isPulling.current) return;
      isPulling.current = false;
      if (pullYRef.current >= PULL_THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        pullYRef.current = 0;
        setPullY(0);
        // Reset extra pages — real-time subscription keeps first page live
        setExtraPosts([]);
        setTimeout(() => {
          refreshingRef.current = false;
          setRefreshing(false);
        }, 600);
      } else {
        pullYRef.current = 0;
        setPullY(0);
      }
    };

    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, []);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  useEffect(() => {
    if (!scrollToPostId || loading) return;
    const el = document.querySelector(`[data-post-id="${scrollToPostId}"]`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
      window.history.replaceState({}, "");
    }
  }, [scrollToPostId, loading]);

  const handleDeleted = (postId: string) => {
    setExtraPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const authorName = user?.email || "User";
  const realtimeIds = new Set(realtimePosts.map((p) => p.id));
  const posts = [...realtimePosts, ...extraPosts.filter((p) => !realtimeIds.has(p.id))];

  return (
    <div className="flex flex-col h-full">
      {/* Create post prompt — pinned, never scrolls */}
      <div className="shrink-0 border-b border-border/50 px-4 py-3 flex items-center gap-3 bg-background">
        <CachedAvatar
          src={photoURL}
          alt="Profile"
          fallback={authorName.charAt(0).toUpperCase()}
          className="h-10 w-10 shrink-0 ring-2 ring-[#e1b506]"
          fallbackClassName="bg-primary text-primary-foreground font-bold"
        />
        <button
          onClick={() => setCreateOpen(true)}
          className="flex-1 text-left text-muted-foreground text-base py-1 hover:text-foreground transition-colors"
        >
          {t.timeline.create.placeholder}
        </button>
        <button
          onClick={() => setCreateOpen(true)}
          className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0"
        >
          <Image className="h-6 w-6" />
        </button>
      </div>

      {/* Scrollable feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Pull-to-refresh indicator */}
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-200"
          style={{ height: refreshing ? 48 : pullY > 0 ? pullY : 0 }}
        >
          <Loader2
            className="h-5 w-5 text-muted-foreground transition-transform"
            style={{
              animation: refreshing ? "spin 1s linear infinite" : "none",
              transform: `rotate(${Math.min((pullY / PULL_THRESHOLD) * 360, 360)}deg)`,
            }}
          />
        </div>

        <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
          {posts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg font-semibold mb-1">{t.timeline.empty.noPosts}</p>
              <p className="text-sm">{t.timeline.empty.beFirst}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <div key={post.id} data-post-id={post.id}>
                  <TimelinePostCard post={post} onDeleted={handleDeleted} />
                </div>
              ))}
            </div>
          )}

          <div ref={sentinelRef} className="h-1" />

          {loadingMore && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
