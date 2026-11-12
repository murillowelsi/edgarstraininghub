import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Image, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { FeedSkeleton } from "@/components/feedback/skeletons";
import { cn } from "@/lib/utils";

const PULL_THRESHOLD = 72;

export function TimelineFeed() {
  const { user, photoURL, isAdmin } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const location = useLocation();
  const scrollToPostId = (location.state as { scrollToPostId?: string })?.scrollToPostId;
  const [realtimePosts, setRealtimePosts] = useState<TimelinePost[]>([]);
  const [extraPosts, setExtraPosts] = useState<TimelinePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  // Posts that arrived in real time while the person was scrolled down
  const [newPosts, setNewPosts] = useState<TimelinePost[]>([]);
  const seenIds = useRef<Set<string> | null>(null);
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
    setLoadError(false);
    const unsubscribe = subscribeToTimelinePosts(
      ({ posts, hasMore: more, lastTimestamp: lastTs }) => {
        // After the first page, anything unseen is new; keep it for the pill
        // when the list is scrolled (the browser keeps the scroll position)
        if (seenIds.current) {
          const fresh = posts.filter((p) => !seenIds.current!.has(p.id));
          if (fresh.length && (scrollRef.current?.scrollTop ?? 0) > 120) {
            setNewPosts((prev) => [...fresh, ...prev]);
          }
        }
        seenIds.current = new Set([...(seenIds.current ?? []), ...posts.map((p) => p.id)]);
        setRealtimePosts(posts);
        setHasMore(more);
        setLastTimestamp(lastTs);
        setLoading(false);
      },
      () => {
        setLoadError(true);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [retryKey]);

  // Reaching the top clears the "new posts" pill
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop < 40) setNewPosts((prev) => (prev.length ? [] : prev));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [loading]);

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
    return <FeedSkeleton className="h-full bg-feed-canvas py-4" />;
  }

  const authorName = user?.email || "User";
  const realtimeIds = new Set(realtimePosts.map((p) => p.id));
  const posts = [...realtimePosts, ...extraPosts.filter((p) => !realtimeIds.has(p.id))];

  return (
    <div className="flex flex-col h-full bg-feed-canvas">
      {/* Create post prompt — pinned, never scrolls; a card in the same column as the posts */}
      <div className="shrink-0 px-2 pt-2 pb-1 md:px-4 md:pt-4">
      <div className="mx-auto max-w-[600px] rounded-2xl border bg-card px-3 py-2.5 flex items-center gap-3 shadow-sm dark:shadow-none">
        <CachedAvatar
          src={photoURL}
          alt={t.common.profilePhoto}
          fallback={authorName.charAt(0).toUpperCase()}
          className={cn("h-10 w-10 shrink-0", isAdmin && "ring-2 ring-primary ring-offset-2 ring-offset-card")}
          fallbackClassName={isAdmin ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-foreground font-bold"}
        />
        <button
          onClick={() => setCreateOpen(true)}
          className="flex-1 text-left text-muted-foreground text-base py-1 hover:text-foreground transition-colors"
        >
          {isAdmin ? t.timeline.coach.composerPlaceholder : t.timeline.create.placeholder}
        </button>
        <button
          onClick={() => setCreateOpen(true)}
          aria-label={t.timeline.create.addPhoto}
          className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0"
        >
          <Image className="h-6 w-6" aria-hidden />
        </button>
      </div>
      </div>

      {/* Scrollable feed */}
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
        {/* New posts arrived while scrolled down: one tap goes back to the top */}
        {newPosts.length > 0 && (
          <div className="pointer-events-none sticky top-2 z-sticky flex justify-center">
            <button
              onClick={() => {
                scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                setNewPosts([]);
              }}
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-primary py-1.5 pl-1.5 pr-3.5 text-body-sm font-semibold text-primary-foreground shadow-lg"
            >
              <span className="flex">
                {newPosts.slice(0, 3).map((p, i) => (
                  <CachedAvatar
                    key={p.id}
                    src={p.authorPhotoURL}
                    alt=""
                    fallback={p.authorName.charAt(0).toUpperCase()}
                    className={cn("h-6 w-6 ring-2 ring-primary", i > 0 && "-ml-1.5")}
                    fallbackClassName="bg-muted text-foreground text-[11px] font-bold"
                  />
                ))}
              </span>
              {(newPosts.length === 1 ? t.timeline.state.newPostOne : t.timeline.state.newPosts.replace("{{n}}", String(newPosts.length)))}
              <ArrowUp className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
        {/* Pull-to-refresh indicator */}
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-200"
          style={{ height: refreshing ? 48 : pullY > 0 ? pullY : 0 }}
        >
          {/* No spinner: the arrow turns as you pull and pulses while refreshing */}
          <ArrowDown
            className={`h-5 w-5 text-muted-foreground transition-transform ${refreshing ? "motion-safe:animate-pulse" : ""}`}
            style={{ transform: `rotate(${refreshing ? 180 : Math.min((pullY / PULL_THRESHOLD) * 180, 180)}deg)` }}
          />
        </div>

        {/* 600px column; 8px gutters on phones so each card keeps its rounded edge */}
        <div className="max-w-[600px] mx-auto px-2 md:px-0 pt-2 pb-8">
          {loadError && posts.length === 0 ? (
            <div role="alert" className="mt-2 flex flex-col items-center rounded-2xl border bg-card px-6 py-10 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-destructive/15 text-destructive-ink">
                <AlertTriangle className="h-6 w-6" aria-hidden />
              </span>
              <p className="mt-3 text-title-sm">{t.timeline.state.errorTitle}</p>
              <p className="mt-1 text-body-sm text-muted-foreground">{t.timeline.state.errorDescription}</p>
              <Button className="mt-4" onClick={() => { setLoading(true); setRetryKey((k) => k + 1); }}>
                {t.timeline.state.retry}
              </Button>
            </div>
          ) : posts.length === 0 ? (
            <div className="mt-2 flex flex-col items-center rounded-2xl border-2 border-dashed bg-card/60 px-6 py-10 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
                <Newspaper className="h-6 w-6" aria-hidden />
              </span>
              <p className="mt-3 text-title-sm">{t.timeline.state.emptyTitle}</p>
              <p className="mt-1 text-body-sm text-muted-foreground">{t.timeline.state.emptyDescription}</p>
              <Button variant="outline" className="mt-4" onClick={() => setCreateOpen(true)}>
                {t.timeline.state.emptyAction}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {posts.map((post) => (
                <div key={post.id} data-post-id={post.id}>
                  <TimelinePostCard post={post} onDeleted={handleDeleted} />
                </div>
              ))}
            </div>
          )}

          <div ref={sentinelRef} className="h-1" />

          {/* Next page: one post-shaped placeholder at the end of the list */}
          {loadingMore && <FeedSkeleton posts={1} className="pt-3 [&_.max-w-\[600px\]]:px-0" />}
        </div>
      </div>

    </div>
  );
}
